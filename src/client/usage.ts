import { USAGE_PATHS, USAGE_REQUEST_TIMEOUT_MS } from '../consts';
import type { UsageBalance, UsageMetric, UsageSnapshot, UsageStatus } from '../types';
import { createHttpError, isAbortError, normalizeRequestError } from './errors';

interface KimiBalanceResponse {
	code?: number;
	status?: boolean;
	data?: {
		available_balance?: number;
		voucher_balance?: number;
		cash_balance?: number;
	};
}

/** Raw shape of the membership `/usages` response. Intentionally loose — field names drift. */
interface KimiMembershipUsageResponse {
	usage?: RawUsageRow;
	limits?: RawUsageLimit[];
	boosterWallet?: RawBoosterWallet;
}

interface RawUsageRow {
	name?: string;
	used?: number;
	limit?: number;
	remaining?: number;
	resetAt?: string;
	reset_at?: string;
}

interface RawUsageLimit {
	detail?: RawUsageRow;
	window?: Record<string, unknown>;
}

interface RawBoosterWallet {
	balance?: { amount?: string; amountLeft?: string; amount_left?: string; unit?: string };
	monthlyChargeLimitEnabled?: boolean;
	monthlyChargeLimit?: { currency?: string; priceInCents?: string };
	monthlyUsed?: { currency?: string; priceInCents?: string };
}

/** Contract for the usage client used by {@link UsageStatusBar}. */
export interface IUsageClient {
	/** Fetch Standard API balance (available + voucher + cash) as a {@link UsageSnapshot}. */
	fetchBalance(apiKey: string, signal?: AbortSignal): Promise<UsageSnapshot>;
	/** Fetch Kimi Code membership quota (weekly/5h windows + booster wallet) as a {@link UsageSnapshot}. */
	fetchMembershipUsage(apiKey: string, signal?: AbortSignal): Promise<UsageSnapshot>;
}

/**
 * Kimi usage client. `fetchBalance` queries the Standard API `GET /v1/users/me/balance`; the status bar
 * routes by `apiMode`. Both stations share the same JSON shapes; only the host + auth token differ.
 *
 * The host is resolved on EVERY call (via `resolveHost`) so the bar follows `kimi-copilot.region` /
 * `apiMode` changes without recreating the client. A static string is accepted (normalized to a constant
 * resolver) for convenience in tests. Auth scheme: `Authorization: Bearer {token}` on all stations.
 */
export class UsageClient implements IUsageClient {
	private readonly resolveHost: () => string;

	constructor(
		hostOrResolver: string | (() => string),
		_pathOrResolver?: string | (() => string),
		private readonly fetchImpl: typeof fetch = fetch,
	) {
		this.resolveHost = typeof hostOrResolver === 'string' ? () => hostOrResolver : hostOrResolver;
	}

	/**
	 * Fetch account balance. Throws aborts so the caller can swallow them; maps HTTP/parse/network
	 * failures to error statuses. A successful response with a `data` object yields the `ok` status.
	 */
	async fetchBalance(apiKey: string, signal?: AbortSignal): Promise<UsageSnapshot> {
		const host = this.resolveHost();
		const fetchedAt = Date.now();
		let response: Response;
		try {
			response = await this.get(`${host}${USAGE_PATHS.balance}`, apiKey, signal);
		} catch (error) {
			// Re-throw aborts so the caller (UsageStatusBar) can swallow+log them per spec
			// instead of rendering a server-error snapshot for a cancellation it caused.
			if (isAbortError(error)) {
				throw error;
			}
			return this.toErrorSnapshot(error, host, fetchedAt);
		}
		if (!response.ok) {
			const error = await createHttpError(response, { baseUrl: host });
			return this.toErrorSnapshot(error, host, fetchedAt);
		}
		let parsed: KimiBalanceResponse;
		try {
			parsed = (await response.json()) as KimiBalanceResponse;
		} catch {
			return { status: 'server-error', metrics: [], fetchedAt };
		}
		// Some gateways signal failure with a non-zero code / status=false while returning 200.
		if (parsed.code !== undefined && parsed.code !== 0 && parsed.status !== true) {
			return { status: 'server-error', metrics: [], fetchedAt };
		}
		const data = parsed.data;
		if (!data) {
			return { status: 'no-data', metrics: [], fetchedAt };
		}
		const balance: UsageBalance = {
			availableBalance: finiteOr(data.available_balance),
			voucherBalance: finiteOr(data.voucher_balance),
			cashBalance: finiteOr(data.cash_balance),
		};
		return { status: 'ok', metrics: [], balance, fetchedAt };
	}

	/**
	 * Fetch Kimi Code membership usage (weekly quota + 5h window + booster wallet). The membership
	 * endpoint returns `usage` (summary) + `limits` (detailed windows) + `boosterWallet` (Extra Usage).
	 * The summary maps to a `session` metric (weekly %), the 5h-style limit to a `weekly` metric, and
	 * the booster wallet balance to `balance`. Throws aborts; maps failures to error statuses.
	 */
	async fetchMembershipUsage(apiKey: string, signal?: AbortSignal): Promise<UsageSnapshot> {
		const host = this.resolveHost();
		const fetchedAt = Date.now();
		let response: Response;
		try {
			response = await this.get(`${host}${USAGE_PATHS.membership}`, apiKey, signal);
		} catch (error) {
			if (isAbortError(error)) {
				throw error;
			}
			return this.toErrorSnapshot(error, host, fetchedAt);
		}
		if (!response.ok) {
			const error = await createHttpError(response, { baseUrl: host });
			return this.toErrorSnapshot(error, host, fetchedAt);
		}
		let parsed: KimiMembershipUsageResponse;
		try {
			parsed = (await response.json()) as KimiMembershipUsageResponse;
		} catch {
			return { status: 'server-error', metrics: [], fetchedAt };
		}
		const metrics = buildMembershipMetrics(parsed);
		if (metrics.length === 0 && !parsed.boosterWallet) {
			return { status: 'no-data', metrics: [], fetchedAt };
		}
		const balance = parsed.boosterWallet ? toBoosterBalance(parsed.boosterWallet) : undefined;
		return { status: 'ok', metrics, balance, fetchedAt };
	}

	/**
	 * GET a URL with the `Authorization: Bearer {token}` header, a {@link USAGE_REQUEST_TIMEOUT_MS}
	 * timeout, and caller-signal forwarding. Re-throws aborts; converts timeout aborts to a TypeError.
	 */
	private async get(url: string, apiKey: string, signal?: AbortSignal): Promise<Response> {
		const controller = new AbortController();
		let didTimeout = false;
		if (signal?.aborted) {
			controller.abort();
		}
		const timer = setTimeout(() => {
			didTimeout = true;
			controller.abort();
		}, USAGE_REQUEST_TIMEOUT_MS);
		timer.unref?.();
		const onCallerAbort = () => controller.abort();
		signal?.addEventListener('abort', onCallerAbort, { once: true });
		try {
			return await this.fetchImpl(url, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${apiKey}`,
					Accept: 'application/json',
				},
				signal: controller.signal,
			});
		} catch (error) {
			if (didTimeout && isAbortError(error)) {
				throw Object.assign(new TypeError('fetch timed out'), {
					cause: { code: 'UND_ERR_CONNECT_TIMEOUT' },
				});
			}
			throw error;
		} finally {
			clearTimeout(timer);
			signal?.removeEventListener('abort', onCallerAbort);
		}
	}

	/**
	 * Map a fetch error to a {@link UsageSnapshot} error status: 401/403 → `auth-error`,
	 * network → `network-error`, everything else → `server-error`.
	 */
	private toErrorSnapshot(error: unknown, host: string, fetchedAt: number): UsageSnapshot {
		const normalized = normalizeRequestError(error, { baseUrl: host });
		let status: UsageStatus;
		if (normalized instanceof Error && 'kind' in normalized) {
			const kind = (normalized as { kind: string }).kind;
			const httpStatus = (normalized as { status?: number }).status;
			if (kind === 'http' && (httpStatus === 401 || httpStatus === 403)) {
				status = 'auth-error';
			} else if (kind === 'http') {
				status = 'server-error';
			} else if (kind === 'network') {
				status = 'network-error';
			} else {
				status = 'server-error';
			}
		} else {
			status = 'server-error';
		}
		return { status, metrics: [], fetchedAt };
	}
}

/** Coerce to a finite number, returning 0 when not numeric. Accepts numeric strings. */
function finiteOr(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === 'string' && value.trim() !== '') {
		const n = Number(value);
		if (Number.isFinite(n)) {
			return n;
		}
	}
	return 0;
}

/** Map the membership `usage` summary + `limits` array to ordered {@link UsageMetric}s. */
function buildMembershipMetrics(response: KimiMembershipUsageResponse): UsageMetric[] {
	const metrics: UsageMetric[] = [];
	const summary = response.usage;
	if (summary) {
		const used = finiteOr(summary.used);
		const limit = finiteOr(summary.limit);
		const resetsAt = parseResetMs(summary.resetAt ?? summary.reset_at);
		// The summary carries the weekly quota as a percentage (used/limit).
		metrics.push({
			kind: 'session',
			used: limit > 0 ? Math.round((used / limit) * 100) : used,
			limit: 100,
			resetsAt,
		});
	}
	const fiveHour = findLimitByName(response.limits, ['5h limit', '5h', '5-hour']);
	if (fiveHour) {
		const used = finiteOr(fiveHour.used);
		const limit = finiteOr(fiveHour.limit);
		metrics.push({
			kind: 'weekly',
			used: limit > 0 ? Math.round((used / limit) * 100) : used,
			limit: 100,
			resetsAt: parseResetMs(fiveHour.resetAt ?? fiveHour.reset_at),
		});
	}
	return metrics;
}

/** Find the first limit whose detail name matches one of `names` (case-insensitive, substring). */
function findLimitByName(
	limits: RawUsageLimit[] | undefined,
	names: readonly string[],
): RawUsageRow | undefined {
	if (!Array.isArray(limits)) {
		return undefined;
	}
	const lowered = names.map((n) => n.toLowerCase());
	for (const limit of limits) {
		const name = limit.detail?.name?.toLowerCase();
		if (name && lowered.some((n) => name.includes(n))) {
			return limit.detail;
		}
	}
	return undefined;
}

/** Map the booster wallet (Extra Usage) to a balance-like view (currency-agnostic; USD for membership). */
function toBoosterBalance(wallet: RawBoosterWallet): UsageBalance {
	const cents = fixedPointToCents(wallet.balance?.amountLeft ?? wallet.balance?.amount_left);
	const totalCents = fixedPointToCents(wallet.balance?.amount);
	// The booster wallet only reports a remaining balance; voucher/cash map to remaining/total for display.
	return {
		availableBalance: cents / 100,
		voucherBalance: 0,
		cashBalance: totalCents / 100,
	};
}

/** Kimi stores money as fixed-point cents (FIXED_POINT_CENTS = 1_000_000). Convert to whole cents. */
function fixedPointToCents(value: unknown): number {
	const raw = typeof value === 'string' ? Number(value) : value;
	if (typeof raw !== 'number' || !Number.isFinite(raw)) {
		return 0;
	}
	const cents = raw / 1_000_000;
	return cents > 0 && cents < 1 ? 1 : Math.round(cents);
}

/** Parse a reset timestamp (ISO string or epoch-ms) to epoch-ms. */
function parseResetMs(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) {
		// Values under ~1e12 are seconds; above are milliseconds.
		return value < 1e12 ? value * 1000 : value;
	}
	if (typeof value === 'string' && value.trim() !== '') {
		const ms = Date.parse(value);
		if (!Number.isNaN(ms)) {
			return ms;
		}
	}
	return undefined;
}
