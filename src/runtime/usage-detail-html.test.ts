import { describe, it, expect } from 'vitest';
import { buildUsageMessage } from './usage-detail-html';
import type { UsageSnapshot } from '../types';
import type { UsagePanelStrings } from './usage-detail-html';

const strings: UsagePanelStrings = {
	title: 'Kimi Balance',
	refresh: 'Refresh',
	setKey: 'Set API Key',
	offline: 'Offline · showing last data',
	unavailable: 'Balance unavailable.',
	lastUpdated: 'Last updated: {0}',
	exhausted: 'Balance exhausted.',
	balanceSection: 'Account Balance',
	balanceAvailable: 'Available',
	balanceVoucher: 'Voucher',
	balanceCash: 'Cash',
	status: {
		ok: '', loading: 'Refreshing…', 'no-data': 'No balance data.',
		'auth-error': 'API key invalid.', 'network-error': 'Balance unavailable (offline).',
		'server-error': 'Balance request failed.',
	},
};

describe('buildUsageMessage', () => {
	it('returns null for gate-failed (no snapshot)', () => {
		expect(buildUsageMessage(null, false, strings, 'dark', '$')).toBeNull();
	});

	it('maps an ok balance to a formatted view', () => {
		const snap: UsageSnapshot = {
			status: 'ok',
			fetchedAt: 1_000_000,
			balance: { availableBalance: 49.58894, voucherBalance: 46.58893, cashBalance: 3.00001 },
		};
		const msg = buildUsageMessage(snap, false, strings, 'dark', '$');
		expect(msg?.status).toBe('ok');
		expect(msg?.balance).toMatchObject({ availableBalance: '49.59', voucherBalance: '46.59', cashBalance: '3' });
		expect(msg?.currency).toBe('$');
		expect(msg?.offline).toBe(false);
		expect(msg?.theme).toBe('dark');
		expect(msg?.lastUpdated).toBe(1_000_000);
	});

	it('marks offline true when cache-fallback flag is set', () => {
		const snap: UsageSnapshot = {
			status: 'ok',
			fetchedAt: 1,
			balance: { availableBalance: 5, voucherBalance: 5, cashBalance: 0 },
		};
		const msg = buildUsageMessage(snap, true, strings, 'dark', '¥');
		expect(msg?.offline).toBe(true);
		expect(msg?.currency).toBe('¥');
	});

	it('maps loading status with no balance and no lastUpdated', () => {
		const snap: UsageSnapshot = { status: 'loading', fetchedAt: 1 };
		const msg = buildUsageMessage(snap, false, strings, 'dark', '$');
		expect(msg?.status).toBe('loading');
		expect(msg?.balance).toBeUndefined();
		expect(msg?.lastUpdated).toBeUndefined();
	});

	it('maps error statuses with no balance', () => {
		for (const status of ['no-data', 'auth-error', 'network-error', 'server-error'] as const) {
			const snap: UsageSnapshot = { status, fetchedAt: 1 };
			const msg = buildUsageMessage(snap, false, strings, 'dark', '$');
			expect(msg?.status).toBe(status);
			expect(msg?.balance).toBeUndefined();
		}
	});

	it('forwards the currency symbol for china region', () => {
		const snap: UsageSnapshot = {
			status: 'ok',
			fetchedAt: 1,
			balance: { availableBalance: 0, voucherBalance: 0, cashBalance: 0 },
		};
		const msg = buildUsageMessage(snap, false, strings, 'light', '¥');
		expect(msg?.currency).toBe('¥');
		expect(msg?.theme).toBe('light');
	});
});
