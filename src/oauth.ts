import * as vscode from 'vscode';
import { OAUTH, OAUTH_TOKEN_SECRET } from './consts';
import { t } from './i18n';
import { logger } from './logger';
import { safeStringify } from './json';
import type { DeviceAuthorization, ITokenManager, OAuthToken } from './types';

/** Refresh tokens a bit before they actually expire, to avoid a failed request mid-stream. */
const REFRESH_LEEWAY_MS = 60_000;
/** Poll interval floor (ms); honors the server's `interval` when larger. */
const POLL_MIN_INTERVAL_MS = 5_000;

/**
 * Manages the Kimi Code OAuth device-code flow (RFC 8628) against `https://auth.kimi.com`.
 * Tokens are persisted in VS Code SecretStorage. `getAccessToken()` returns a valid (auto-refreshing)
 * access token, or `undefined` when not logged in — callers treat that as "needs login".
 */
export class OAuthManager implements ITokenManager {
	constructor(private context: vscode.ExtensionContext) {}

	async getToken(): Promise<OAuthToken | undefined> {
		const raw = await this.context.secrets.get(OAUTH_TOKEN_SECRET);
		if (!raw) {
			return undefined;
		}
		try {
			return this.parseToken(raw);
		} catch (error) {
			logger.warn('Failed to parse stored OAuth token; clearing', error);
			await this.context.secrets.delete(OAUTH_TOKEN_SECRET);
			return undefined;
		}
	}

	async hasToken(): Promise<boolean> {
		return !!(await this.getToken());
	}

	/**
	 * Resolve a valid (non-expired, auto-refreshing) access token, or `undefined` when not logged in.
	 * If the token is expired or near-expiry, refreshes it transparently before returning.
	 */
	async getAccessToken(): Promise<string | undefined> {
		const token = await this.getToken();
		if (!token) {
			return undefined;
		}
		if (Date.now() < token.expiresAt - REFRESH_LEEWAY_MS) {
			return token.accessToken;
		}
		const refreshed = await this.refresh(token);
		return refreshed?.accessToken;
	}

	/** Run the device-code login flow: request a device code, prompt the user, poll for completion. */
	async login(): Promise<boolean> {
		let auth: DeviceAuthorization;
		try {
			auth = await this.requestDeviceAuthorization();
		} catch (error) {
			logger.error('OAuth device authorization failed', error);
			vscode.window.showErrorMessage(t('oauth.startFailed'));
			return false;
		}
		const opened = await this.presentUserCode(auth);
		const token = await this.pollForToken(auth);
		opened.dispose?.();
		if (!token) {
			return false;
		}
		await this.storeToken(token);
		vscode.window.showInformationMessage(t('oauth.loginSuccess'));
		return true;
	}

	async logout(): Promise<void> {
		await this.context.secrets.delete(OAUTH_TOKEN_SECRET);
	}

	/** Request a device authorization from the OAuth host. Throws on HTTP/parse error. */
	private async requestDeviceAuthorization(): Promise<DeviceAuthorization> {
		const body = new URLSearchParams({
			client_id: OAUTH.clientId,
		});
		const response = await fetch(`${OAUTH.host}${OAUTH.deviceAuthorizationPath}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
			body,
		});
		if (!response.ok) {
			throw await this.httpError(response, 'device authorization');
		}
		const json = (await response.json()) as Record<string, unknown>;
		const expiresIn = toFiniteNumber(json['expires_in']) ?? 900;
		return {
			userCode: toStringRequired(json['user_code'], 'user_code'),
			deviceCode: toStringRequired(json['device_code'], 'device_code'),
			verificationUri: toStringRequired(json['verification_uri'], 'verification_uri'),
			verificationUriComplete: toStringOptional(json['verification_uri_complete']),
			expiresIn,
			interval: toFiniteNumber(json['interval']) ?? Math.round(POLL_MIN_INTERVAL_MS / 1000),
		};
	}

	/** Show the user code + verification URL and open the browser. Returns a disposable (quick pick). */
	private async presentUserCode(auth: DeviceAuthorization): Promise<{ dispose?(): void }> {
		const url = auth.verificationUriComplete ?? auth.verificationUri;
		void vscode.env.openExternal(vscode.Uri.parse(url)).then(undefined, () => {});
		const minutes = Math.ceil(auth.expiresIn / 60);
		const choice = await vscode.window.showInformationMessage(
			t('oauth.prompt', auth.userCode, String(minutes)),
			t('oauth.copyCode'),
			t('oauth.openUrl'),
		);
		if (choice === t('oauth.copyCode')) {
			await vscode.env.clipboard.writeText(auth.userCode);
		} else if (choice === t('oauth.openUrl')) {
			await vscode.env.openExternal(vscode.Uri.parse(url));
		}
		return {};
	}

	/** Poll the token endpoint until the user authorizes, the flow expires, or is cancelled. */
	private async pollForToken(auth: DeviceAuthorization): Promise<OAuthToken | undefined> {
		const body = new URLSearchParams({
			grant_type: 'device_code',
			client_id: OAUTH.clientId,
			device_code: auth.deviceCode,
		});
		const deadline = Date.now() + auth.expiresIn * 1000;
		const intervalMs = Math.max(auth.interval * 1000, POLL_MIN_INTERVAL_MS);
		const status = vscode.window.setStatusBarMessage(t('oauth.waiting'));
		try {
			while (Date.now() < deadline) {
				await sleep(intervalMs);
				let response: Response;
				try {
					response = await fetch(`${OAUTH.host}${OAUTH.tokenPath}`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
						body,
					});
				} catch (error) {
					logger.warn('OAuth token poll network error, retrying', error);
					continue;
				}
				const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
				if (response.ok && typeof json['access_token'] === 'string') {
					return this.parseTokenResponse(json);
				}
				const errorCode = toStringOptional(json['error']);
				if (errorCode === 'authorization_pending' || errorCode === 'slow_down') {
					continue;
				}
				if (errorCode === 'expired_token') {
					vscode.window.showWarningMessage(t('oauth.expired'));
					return undefined;
				}
				if (errorCode === 'access_denied') {
					vscode.window.showWarningMessage(t('oauth.denied'));
					return undefined;
				}
				const message = toStringOptional(json['error_description']) ?? errorCode ?? `HTTP ${response.status}`;
				logger.error('OAuth token poll failed', message);
				vscode.window.showErrorMessage(t('oauth.tokenFailed', message));
				return undefined;
			}
			vscode.window.showWarningMessage(t('oauth.expired'));
			return undefined;
		} finally {
			status.dispose();
		}
	}

	/** Exchange a refresh token for a fresh access token. Returns undefined on failure. */
	private async refresh(token: OAuthToken): Promise<OAuthToken | undefined> {
		const body = new URLSearchParams({
			grant_type: 'refresh_token',
			client_id: OAUTH.clientId,
			refresh_token: token.refreshToken,
		});
		try {
			const response = await fetch(`${OAUTH.host}${OAUTH.tokenPath}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
				body,
			});
			if (!response.ok) {
				const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
				logger.warn('OAuth refresh failed', toStringOptional(json['error']) ?? `HTTP ${response.status}`);
				return undefined;
			}
			const json = (await response.json()) as Record<string, unknown>;
			const refreshed = this.parseTokenResponse(json);
			await this.storeToken(refreshed);
			return refreshed;
		} catch (error) {
			logger.warn('OAuth refresh threw', error);
			return undefined;
		}
	}

	/** Map a token-endpoint JSON response to an {@link OAuthToken}, computing the expiry timestamp. */
	private parseTokenResponse(json: Record<string, unknown>): OAuthToken {
		const expiresIn = toFiniteNumber(json['expires_in']) ?? 3600;
		return {
			accessToken: toStringRequired(json['access_token'], 'access_token'),
			refreshToken: toStringRequired(json['refresh_token'], 'refresh_token'),
			expiresAt: Date.now() + expiresIn * 1000,
			scope: toStringOptional(json['scope']) ?? '',
			tokenType: toStringOptional(json['token_type']) ?? 'Bearer',
		};
	}

	private async storeToken(token: OAuthToken): Promise<void> {
		await this.context.secrets.store(OAUTH_TOKEN_SECRET, safeStringify(token));
	}

	private parseToken(raw: string): OAuthToken {
		const parsed = JSON.parse(raw) as Partial<OAuthToken>;
		const accessToken = toStringRequired(parsed['accessToken'], 'accessToken');
		const refreshToken = toStringRequired(parsed['refreshToken'], 'refreshToken');
		const expiresAt = toFiniteNumber(parsed['expiresAt']) ?? 0;
		return {
			accessToken,
			refreshToken,
			expiresAt,
			scope: parsed['scope'] ?? '',
			tokenType: parsed['tokenType'] ?? 'Bearer',
		};
	}

	private async httpError(response: Response, what: string): Promise<Error> {
		const text = await response.text();
		return new Error(`OAuth ${what} failed: HTTP ${response.status} ${text.slice(0, 200)}`);
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function toStringRequired(value: unknown, field: string): string {
	if (typeof value === 'string' && value.length > 0) {
		return value;
	}
	throw new Error(`OAuth response missing required field: ${field}`);
}

function toStringOptional(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function toFiniteNumber(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value)
		? value
		: typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))
			? Number(value)
			: undefined;
}
