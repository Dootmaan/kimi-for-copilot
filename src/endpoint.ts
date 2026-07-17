import { ENDPOINTS, EXTERNAL_URLS, USAGE_HOSTS, USAGE_PATHS } from './consts';
import { getApiMode, getBaseUrlOverride, getRegion } from './config';

/** Trim and strip trailing slashes from a URL. */
export function normalizeBaseUrl(url: string): string {
	return url.trim().replace(/\/+$/, '');
}

/**
 * Resolve the chat-completions base URL from settings.
 * Override wins; otherwise derive from apiMode (+ region for standard mode).
 */
export function resolveBaseUrl(): string {
	const override = getBaseUrlOverride();
	if (override) {
		return normalizeBaseUrl(override);
	}
	if (getApiMode() === 'membership') {
		return ENDPOINTS.membership;
	}
	return getRegion() === 'china' ? ENDPOINTS.standardChina : ENDPOINTS.standardInternational;
}

/** The API-key / subscription management page that matches the current apiMode / region. */
export function resolveKeyPageUrl(): string {
	if (getApiMode() === 'membership') {
		return EXTERNAL_URLS.membershipSubscription;
	}
	return getRegion() === 'china' ? EXTERNAL_URLS.keysChina : EXTERNAL_URLS.keysInternational;
}

/** The usage-API path for the current apiMode. */
export function resolveUsagePath(): string {
	return getApiMode() === 'membership' ? USAGE_PATHS.membership : USAGE_PATHS.balance;
}

/**
 * Host root for the usage API. Standard mode routes by region; membership mode uses the
 * global Kimi Code host. This does not derive from `resolveBaseUrl()` so a `baseUrl` override
 * pointing at a chat-only proxy does not break usage tracking.
 */
export function resolveUsageHost(): string {
	if (getApiMode() === 'membership') {
		return USAGE_HOSTS.membership;
	}
	return getRegion() === 'china' ? USAGE_HOSTS.standardChina : USAGE_HOSTS.standardInternational;
}
