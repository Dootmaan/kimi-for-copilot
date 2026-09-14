import * as vscode from 'vscode';
import { classifyApiKeyProbe, probeApiKey } from './access';
import { getApiMode, getSettingsApiKey, updateApiMode, updateRegion } from './config';
import { API_KEY_SECRET, MEMBERSHIP_API_KEY_SECRET, OAUTH_TOKEN_SECRET, STANDARD_API_KEY_SECRET } from './consts';
import { OAuthManager } from './oauth';
import { t } from './i18n';
import type { ApiKeyClassification, ApiMode, ApiKeyProbeResult, IAuthManager, Region } from './types';

interface AuthManagerServices {
	oauthManager?: OAuthManager;
	probeApiKey?: (apiKey: string, fetchImpl?: typeof fetch, signal?: AbortSignal) => Promise<ApiKeyProbeResult>;
}

/**
 * Manages credentials for the Kimi API. In `standard` mode it stores a static API key via VS Code
 * SecretStorage (secure), falling back to the extension settings value. In `membership` mode it
 * delegates to {@link OAuthManager} for the Kimi Code device-code OAuth flow.
 */
export class AuthManager implements IAuthManager {
	private readonly oauth: OAuthManager;
	private readonly probeApiKeyImpl: NonNullable<AuthManagerServices['probeApiKey']>;

	constructor(
		private context: vscode.ExtensionContext,
		services: AuthManagerServices = {},
	) {
		this.oauth = services.oauthManager ?? new OAuthManager(context);
		this.probeApiKeyImpl = services.probeApiKey ?? probeApiKey;
	}

	async getApiKey(): Promise<string | undefined> {
		return this.getApiKeyForMode(getApiMode());
	}

	async getApiKeyForMode(mode: ApiMode): Promise<string | undefined> {
		if (mode === 'membership') {
			return (await this.oauth.getAccessToken()) ?? (await this.getStoredMembershipApiKey());
		}
		return await this.getStoredStandardApiKey();
	}

	/** Read the Standard API key, falling back to the legacy shared slot and settings fallback. */
	private async getStoredStandardApiKey(): Promise<string | undefined> {
		return (
			(await this.context.secrets.get(STANDARD_API_KEY_SECRET))
			|| (await this.context.secrets.get(API_KEY_SECRET))
			|| (getSettingsApiKey() || undefined)
		);
	}

	/** Read the membership API key, falling back to the legacy shared slot and settings fallback. */
	private async getStoredMembershipApiKey(): Promise<string | undefined> {
		return (
			(await this.context.secrets.get(MEMBERSHIP_API_KEY_SECRET))
			|| (await this.context.secrets.get(API_KEY_SECRET))
			|| (getSettingsApiKey() || undefined)
		);
	}

	async hasApiKey(): Promise<boolean> {
		return !!(await this.getApiKey());
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
			return this.saveApiKeyWithDetection(value.trim(), 'standard');
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
			return this.loginOAuth();
		}
		return this.promptForMembershipApiKey();
	}

	/** Run the OAuth device-code login flow directly (used by the Kimi: OAuth Login command). */
	async loginOAuth(): Promise<boolean> {
		const saved = await this.oauth.login();
		if (saved) {
			await updateApiMode('membership');
		}
		return saved;
	}

	/** Prompt for and store a Kimi Code membership API key (from kimi.com/code/console). */
	private async promptForMembershipApiKey(): Promise<boolean> {
		const value = await vscode.window.showInputBox({
			prompt: t('auth.promptMembership'),
			placeHolder: t('auth.placeholder'),
			password: true,
			ignoreFocusOut: true,
			validateInput: (v) => (v?.trim() ? undefined : t('auth.emptyValidation')),
		});
		if (value) {
			return this.saveApiKeyWithDetection(value.trim(), 'membership');
		}
		return false;
	}

	private async saveApiKeyWithDetection(apiKey: string, preferredMode: ApiMode): Promise<boolean> {
		const currentMode = getApiMode();
		const classification = await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: t('auth.detecting'),
				cancellable: false,
			},
			async () => classifyApiKeyProbe(await this.probeApiKeyImpl(apiKey)),
		);

		switch (classification.kind) {
			case 'membership':
				await this.context.secrets.store(MEMBERSHIP_API_KEY_SECRET, apiKey);
				await updateApiMode('membership');
				vscode.window.showInformationMessage(t('auth.saved.membershipDetected'));
				return true;
			case 'standard': {
				await this.context.secrets.store(STANDARD_API_KEY_SECRET, apiKey);
				if (classification.detectedRegion) {
					await updateRegion(classification.detectedRegion);
				}
				const keepMembership = currentMode === 'membership' && await this.hasAnotherValidMembership(apiKey);
				const regionLabel = classifyRegionLabel(classification.detectedRegion);
				if (keepMembership) {
					vscode.window.showInformationMessage(t('auth.saved.standardFallback', regionLabel));
				} else {
					await updateApiMode('standard');
					vscode.window.showInformationMessage(t('auth.saved.standardDetected', regionLabel));
				}
				return true;
			}
			case 'invalid':
				vscode.window.showWarningMessage(t('auth.invalid'));
				return false;
			case 'unknown': {
				const targetMode = await this.promptTargetMode(preferredMode, classification);
				if (!targetMode) {
					return false;
				}
				await this.storeKeyForMode(targetMode, apiKey);
				if (targetMode === 'standard' && classification.detectedRegion) {
					await updateRegion(classification.detectedRegion);
				}
				vscode.window.showInformationMessage(t('auth.saved.unknown'));
				return true;
			}
		}
	}

	private async promptTargetMode(
		preferredMode: ApiMode,
		classification: ApiKeyClassification,
	): Promise<ApiMode | undefined> {
		const choice = await vscode.window.showQuickPick(
			[
				{
					label: t('auth.detect.membership'),
					detail: t('auth.detect.membershipDetail'),
					picked: preferredMode === 'membership',
					value: 'membership' as const,
				},
				{
					label: t('auth.detect.standard'),
					detail:
						classification.detectedRegion
							? t('auth.detect.standardDetailWithRegion', classifyRegionLabel(classification.detectedRegion))
							: t('auth.detect.standardDetail'),
					picked: preferredMode === 'standard',
					value: 'standard' as const,
				},
			],
			{ placeHolder: t('auth.detect.placeHolder'), ignoreFocusOut: true },
		);
		return choice?.value;
	}

	private async storeKeyForMode(mode: ApiMode, apiKey: string): Promise<void> {
		if (mode === 'membership') {
			await this.context.secrets.store(MEMBERSHIP_API_KEY_SECRET, apiKey);
			return;
		}
		await this.context.secrets.store(STANDARD_API_KEY_SECRET, apiKey);
	}

	private async hasAnotherValidMembership(excludingApiKey: string): Promise<boolean> {
		const oauthToken = await this.oauth.getAccessToken();
		if (oauthToken && oauthToken !== excludingApiKey) {
			return true;
		}
		const storedMembership = await this.getStoredMembershipApiKey();
		if (!storedMembership || storedMembership === excludingApiKey) {
			return false;
		}
		const classification = classifyApiKeyProbe(await this.probeApiKeyImpl(storedMembership));
		return classification.membershipAccepted;
	}

	async deleteApiKey(): Promise<void> {
		// Clear both credential slots so switching modes never leaves stale credentials.
		await this.context.secrets.delete(STANDARD_API_KEY_SECRET);
		await this.context.secrets.delete(MEMBERSHIP_API_KEY_SECRET);
		await this.context.secrets.delete(API_KEY_SECRET);
		await this.context.secrets.delete(OAUTH_TOKEN_SECRET);
	}

	/** The OAuth token manager (used by the membership usage client + chat auth). */
	getOAuthManager(): OAuthManager {
		return this.oauth;
	}
}

function classifyRegionLabel(region: Region | undefined): string {
	return region === 'china' ? t('region.china') : t('region.international');
}
