import { BALANCE_PATH, USAGE_REQUEST_TIMEOUT_MS } from '../consts';
import type { UsageBalance, UsageSnapshot, UsageStatus } from '../types';
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

/** Contract for the balance client used by {@link UsageStatusBar}. */
export interface IUsageClient {
	/** Fetch account balance (available + voucher + cash) as a {@link UsageSnapshot}. */
	fetchBalance(apiKey: string, signal?: AbortSignal): Promise<UsageSnapshot>;
}

/**
 * Kimi balance client. Queries `GET /v1/users/me/balance`, which returns the available,
 * voucher, and cash balances on the Kimi Open Platform. `code === 0` (or `status === true`)
 * is success; HTTP 401/403 → `auth-error`, network → `network-error`, everything else →
 * `server-error`.
 *
 * The host is resolved on EVERY `fetchBalance` call (via `resolveHost`) rather than captured at
 * construction, so the bar follows `kimi-copilot.region` changes without recreating the client. A
 * static string is still accepted (normalized to a constant resolver) for convenience in tests.
 *
 * Auth scheme: both stations (api.moonshot.ai + api.moonshot.cn) use `Authorization: Bearer {key}`.
 */
export class UsageClient implements IUsageClient {
	private readonly resolveHost: () => string;

	constructor(
		hostOrResolver: string | (() => string),
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
			response = await this.get(`${host}${BALANCE_PATH}`, apiKey, signal);
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
			return { status: 'server-error', fetchedAt };
		}
		// Some gateways signal failure with a non-zero code / status=false while returning 200.
		if (parsed.code !== undefined && parsed.code !== 0 && parsed.status !== true) {
			return { status: 'server-error', fetchedAt };
		}
		const data = parsed.data;
		if (!data) {
			return { status: 'no-data', fetchedAt };
		}
		const balance: UsageBalance = {
			availableBalance: finiteOr(data.available_balance),
			voucherBalance: finiteOr(data.voucher_balance),
			cashBalance: finiteOr(data.cash_balance),
		};
		return { status: 'ok', balance, fetchedAt };
	}

	/**
	 * GET a URL with the `Authorization: Bearer {key}` header, a {@link USAGE_REQUEST_TIMEOUT_MS}
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
		return { status, fetchedAt };
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
