import { ENDPOINTS, EXTERNAL_URLS, USAGE_HOSTS } from './consts';
import { getBaseUrlOverride, getRegion } from './config';

/** Trim and strip trailing slashes from a URL. */
export function normalizeBaseUrl(url: string): string {
	return url.trim().replace(/\/+$/, '');
}

/**
 * Resolve the chat-completions base URL from settings.
 * Override wins; otherwise derive from region.
 */
export function resolveBaseUrl(): string {
	const override = getBaseUrlOverride();
	if (override) {
		return normalizeBaseUrl(override);
	}
	return getRegion() === 'china' ? ENDPOINTS.china : ENDPOINTS.international;
}

/** The API-key management page that matches the current region. */
export function resolveKeyPageUrl(): string {
	return getRegion() === 'china' ? EXTERNAL_URLS.keysChina : EXTERNAL_URLS.keysInternational;
}

/**
 * Host root for the balance API. Both platforms expose `GET /v1/users/me/balance`
 * with the same JSON shape; only the host differs.
 *
 * The balance host is a DIFFERENT root path than chat if a `baseUrl` override points at a proxy
 * that exposes only `/chat/completions`, so this does not derive from `resolveBaseUrl()`. Routing is
 * by region: china → api.moonshot.cn, else → api.moonshot.ai.
 */
export function resolveUsageHost(): string {
	return getRegion() === 'china' ? USAGE_HOSTS.china : USAGE_HOSTS.international;
}
