import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({
	workspace: { getConfiguration: () => ({ get: () => undefined }) },
	env: { language: 'en' },
}));

import { classifyApiKeyProbe, findPositiveStandardBalance, probeApiKey } from './access';

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('classifyApiKeyProbe', () => {
	beforeEach(() => vi.useRealTimers());

	it('classifies a membership key', () => {
		const classification = classifyApiKeyProbe({
			membership: { status: 'ok', metrics: [{ kind: 'session', used: 10, limit: 100 }], fetchedAt: 1 },
			standard: {
				international: { status: 'auth-error', metrics: [], fetchedAt: 1 },
				china: { status: 'auth-error', metrics: [], fetchedAt: 1 },
			},
		});
		expect(classification.kind).toBe('membership');
	});

	it('classifies a standard key and captures its region', () => {
		const classification = classifyApiKeyProbe({
			membership: { status: 'auth-error', metrics: [], fetchedAt: 1 },
			standard: {
				international: { status: 'ok', metrics: [], fetchedAt: 1, balance: { availableBalance: 8, voucherBalance: 3, cashBalance: 5 } },
				china: { status: 'auth-error', metrics: [], fetchedAt: 1 },
			},
		});
		expect(classification.kind).toBe('standard');
		expect(classification.detectedRegion).toBe('international');
	});
});

describe('probeApiKey and findPositiveStandardBalance', () => {
	beforeEach(() => vi.useRealTimers());

	it('probes membership and both standard regions', async () => {
		const fetchImpl = vi.fn(async (url: URL | string) => {
			const target = typeof url === 'string' ? url : url.toString();
			if (target.includes('api.kimi.com/coding/v1/usages')) {
				return json({ usage: { name: 'Weekly limit', used: 1, limit: 100 } });
			}
			if (target.includes('api.moonshot.ai/v1/users/me/balance')) {
				return json({ code: 0, status: true, data: { available_balance: 0, voucher_balance: 0, cash_balance: 0 } });
			}
			return json({}, 401);
		}) as unknown as typeof fetch;

		const probe = await probeApiKey('sk-test', fetchImpl);
		expect(fetchImpl).toHaveBeenCalledTimes(3);
		expect(probe.membership.status).toBe('ok');
		expect(probe.standard.international.status).toBe('ok');
		expect(probe.standard.china.status).toBe('auth-error');
	});

	it('finds the first standard region with positive balance', async () => {
		const fetchImpl = vi.fn(async (url: URL | string) => {
			const target = typeof url === 'string' ? url : url.toString();
			if (target.includes('api.kimi.com/coding/v1/usages')) {
				return json({}, 401);
			}
			if (target.includes('api.moonshot.ai/v1/users/me/balance')) {
				return json({ code: 0, status: true, data: { available_balance: 12.5, voucher_balance: 2.5, cash_balance: 10 } });
			}
			return json({}, 401);
		}) as unknown as typeof fetch;

		const found = await findPositiveStandardBalance('sk-test', fetchImpl);
		expect(found?.region).toBe('international');
		expect(found?.snapshot.balance?.availableBalance).toBe(12.5);
	});
});