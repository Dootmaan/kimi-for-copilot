import * as vscode from 'vscode';
import { getApiMode, getSettingsApiKey } from './config';
import { API_KEY_SECRET, OAUTH_TOKEN_SECRET } from './consts';
import { OAuthManager } from './oauth';
import { t } from './i18n';
import type { IAuthManager } from './types';

/**
 * Manages credentials for the Kimi API. In `standard` mode it stores a static API key via VS Code
 * SecretStorage (secure), falling back to the extension settings value. In `membership` mode it
 * delegates to {@link OAuthManager} for the Kimi Code device-code OAuth flow.
 */
export class AuthManager implements IAuthManager {
	private readonly oauth: OAuthManager;

	constructor(private context: vscode.ExtensionContext) {
		this.oauth = new OAuthManager(context);
	}

	async getApiKey(): Promise<string | undefined> {
		// Membership mode: prefer an OAuth access token; fall back to a Kimi Code Console API key.
		// Both authenticate against api.kimi.com/coding/v1 as `Bearer {token}`.
		if (getApiMode() === 'membership') {
			return (await this.oauth.getAccessToken()) ?? (await this.getStoredApiKey());
		}
		return await this.getStoredApiKey();
	}

	/** Read the static API key from SecretStorage, then the settings fallback. */
	private async getStoredApiKey(): Promise<string | undefined> {
		return (await this.context.secrets.get(API_KEY_SECRET)) || (getSettingsApiKey() || undefined);
	}

	async hasApiKey(): Promise<boolean> {
		if (getApiMode() === 'membership') {
			return (await this.oauth.hasToken()) || !!(await this.getStoredApiKey());
		}
		return !!(await this.getStoredApiKey());
	}

	async promptForApiKey(): Promise<boolean> {
		// Membership mode: offer a choice between OAuth device-code login and pasting an API key.
		if (getApiMode() === 'membership') {
			return this.promptForMembershipCredentials();
		}
		return this.promptForStandardApiKey();
	}

	/** Standard API mode: prompt for a static API key. */
	private async promptForStandardApiKey(): Promise<boolean> {
		const value = await vscode.window.showInputBox({
			prompt: t('auth.prompt'),
			placeHolder: t('auth.placeholder'),
			password: true,
			ignoreFocusOut: true,
			validateInput: (v) => (v?.trim() ? undefined : t('auth.emptyValidation')),
		});
		if (value) {
			await this.context.secrets.store(API_KEY_SECRET, value.trim());
			vscode.window.showInformationMessage(t('auth.saved'));
			return true;
		}
		return false;
	}

	/** Membership mode: let the user choose OAuth login or pasting a Kimi Code API key. */
	private async promptForMembershipCredentials(): Promise<boolean> {
		const choice = await vscode.window.showQuickPick(
			[
				{ label: t('auth.login.oauth'), detail: t('auth.login.oauthDetail'), value: 'oauth' as const },
				{ label: t('auth.login.apiKey'), detail: t('auth.login.apiKeyDetail'), value: 'apikey' as const },
			],
			{ placeHolder: t('auth.login.placeHolder'), ignoreFocusOut: true },
		);
		if (!choice) {
			return false;
		}
		if (choice.value === 'oauth') {
			return this.oauth.login();
		}
		const value = await vscode.window.showInputBox({
			prompt: t('auth.promptMembership'),
			placeHolder: t('auth.placeholder'),
			password: true,
			ignoreFocusOut: true,
			validateInput: (v) => (v?.trim() ? undefined : t('auth.emptyValidation')),
		});
		if (value) {
			await this.context.secrets.store(API_KEY_SECRET, value.trim());
			vscode.window.showInformationMessage(t('auth.saved'));
			return true;
		}
		return false;
	}

	async deleteApiKey(): Promise<void> {
		// Clear both credential slots so switching modes never leaves stale credentials.
		await this.context.secrets.delete(API_KEY_SECRET);
		await this.context.secrets.delete(OAUTH_TOKEN_SECRET);
	}

	/** The OAuth token manager (used by the membership usage client + chat auth). */
	getOAuthManager(): OAuthManager {
		return this.oauth;
	}
}
