import { describe, it, expect, beforeEach, vi } from 'vitest';

// usage.ts imports errors.ts, which transitively imports endpoint.ts → config.ts → 'vscode'.
// Stub the vscode surface so module resolution succeeds under vitest.
vi.mock('vscode', () => ({
	workspace: { getConfiguration: () => ({ get: () => undefined }) },
	env: { language: 'en' },
}));

import { UsageClient } from './usage';

const BALANCE_OK = JSON.stringify({
	code: 0,
	status: true,
	data: { available_balance: 49.58894, voucher_balance: 46.58893, cash_balance: 3.00001 },
});
const BALANCE_NO_DATA = JSON.stringify({ code: 0, status: true, data: null });
const BALANCE_NEGATIVE_CASH = JSON.stringify({
	code: 0,
	data: { available_balance: 5, voucher_balance: 5, cash_balance: -2 },
});
const BALANCE_NON_NUMERIC = JSON.stringify({
	code: 0,
	data: { available_balance: 'oops', voucher_balance: null, cash_balance: '3.5' },
});

function mockFetch(response: { status: number; body: string }): typeof fetch {
	return vi.fn(async () => {
		return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'application/json' } });
	}) as unknown as typeof fetch;
}

describe('UsageClient.fetchBalance', () => {
	beforeEach(() => vi.useRealTimers());

	it('maps a successful balance response to ok', async () => {
		const client = new UsageClient('https://api.moonshot.ai', mockFetch({ status: 200, body: BALANCE_OK }));
		const snap = await client.fetchBalance('k');
		expect(snap.status).toBe('ok');
		expect(snap.balance).toMatchObject({ availableBalance: 49.58894, voucherBalance: 46.58893, cashBalance: 3.00001 });
		expect(snap.fetchedAt).toBeGreaterThan(0);
	});

	it('preserves negative cash balance', async () => {
		const client = new UsageClient('https://api.moonshot.ai', mockFetch({ status: 200, body: BALANCE_NEGATIVE_CASH }));
		const snap = await client.fetchBalance('k');
		expect(snap.status).toBe('ok');
		expect(snap.balance?.cashBalance).toBe(-2);
		expect(snap.balance?.availableBalance).toBe(5);
	});

	it('coerces non-numeric fields to 0 (except valid numeric strings)', async () => {
		const client = new UsageClient('https://api.moonshot.ai', mockFetch({ status: 200, body: BALANCE_NON_NUMERIC }));
		const snap = await client.fetchBalance('k');
		expect(snap.balance?.availableBalance).toBe(0); // 'oops' → 0
		expect(snap.balance?.voucherBalance).toBe(0); // null → 0
		expect(snap.balance?.cashBalance).toBe(3.5); // '3.5' → 3.5
	});

	it('returns no-data when data is absent', async () => {
		const client = new UsageClient('https://api.moonshot.ai', mockFetch({ status: 200, body: BALANCE_NO_DATA }));
		const snap = await client.fetchBalance('k');
		expect(snap.status).toBe('no-data');
		expect(snap.balance).toBeUndefined();
	});

	it('maps HTTP 401 to auth-error', async () => {
		const client = new UsageClient('https://api.moonshot.ai', mockFetch({ status: 401, body: '' }));
		const snap = await client.fetchBalance('k');
		expect(snap.status).toBe('auth-error');
	});

	it('maps HTTP 403 to auth-error', async () => {
		const client = new UsageClient('https://api.moonshot.ai', mockFetch({ status: 403, body: '' }));
		const snap = await client.fetchBalance('k');
		expect(snap.status).toBe('auth-error');
	});

	it('maps HTTP 500 to server-error', async () => {
		const client = new UsageClient('https://api.moonshot.ai', mockFetch({ status: 500, body: '' }));
		const snap = await client.fetchBalance('k');
		expect(snap.status).toBe('server-error');
	});

	it('maps a non-JSON 200 body to server-error', async () => {
		const client = new UsageClient('https://api.moonshot.ai', mockFetch({ status: 200, body: 'not-json' }));
		const snap = await client.fetchBalance('k');
		expect(snap.status).toBe('server-error');
	});

	it('maps network exception to network-error', async () => {
		// Real undici fetch failures carry a `.cause` with a recognized `code` (ENOTFOUND, ECONNRESET, …).
		const networkError = Object.assign(new TypeError('fetch failed'), {
			cause: { code: 'ENOTFOUND', name: 'Error', message: 'getaddrinfo ENOTFOUND api.moonshot.ai' },
		});
		const failing = vi.fn(async () => { throw networkError; }) as unknown as typeof fetch;
		const client = new UsageClient('https://api.moonshot.ai', failing);
		const snap = await client.fetchBalance('k');
		expect(snap.status).toBe('network-error');
	});

	it('uses a host resolver so the host can change between calls', async () => {
		let host = 'https://api.moonshot.ai';
		const fetchImpl = vi.fn(async (url: URL | string) => {
			const target = typeof url === 'string' ? url : url.toString();
			expect(target.startsWith(host)).toBe(true);
			return new Response(BALANCE_OK, { status: 200, headers: { 'Content-Type': 'application/json' } });
		}) as unknown as typeof fetch;
		const client = new UsageClient(() => host, fetchImpl);
		await client.fetchBalance('k');
		host = 'https://api.moonshot.cn';
		await client.fetchBalance('k');
		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});
});
