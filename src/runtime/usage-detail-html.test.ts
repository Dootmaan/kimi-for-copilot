import { describe, it, expect } from 'vitest';
import { buildUsageMessage, metricPercent, barWidthCss } from './usage-detail-html';
import type { UsageSnapshot } from '../types';
import type { UsageMetricView, UsagePanelStrings } from './usage-detail-html';

function view(m: Omit<UsageMetricView, 'label' | 'window' | 'resetsAt'>): UsageMetricView {
	return { label: '', window: '', ...m };
}

const strings: UsagePanelStrings = {
	title: 'Kimi Usage',
	refresh: 'Refresh',
	setKey: 'Set API Key',
	offline: 'Offline · showing last data',
	unavailable: 'Usage unavailable.',
	lastUpdated: 'Last updated: {0}',
	resetsIn: 'Resets in {0}',
	plan: 'Plan: {0}',
	renewsAt: 'Renews: {0}',
	window: { session: '5h rolling', weekly: '7-day rolling', 'web-searches': 'Monthly' },
	label: { session: '5h window', weekly: 'Weekly quota', 'web-searches': 'Web Searches' },
	status: {
		ok: '', loading: 'Refreshing…', 'no-data': 'No usage data.',
		'auth-error': 'API key invalid.', 'network-error': 'Usage unavailable (offline).',
		'server-error': 'Usage request failed.',
	},
	balanceSection: 'Account Balance',
	balanceAvailable: 'Available',
	balanceVoucher: 'Voucher',
	balanceCash: 'Cash',
	balanceBooster: 'Booster',
	exhausted: 'Balance exhausted.',
};

describe('buildUsageMessage', () => {
	it('returns null for gate-failed (no snapshot)', () => {
		expect(buildUsageMessage(null, false, strings, 'dark', '$')).toBeNull();
	});

	it('maps ok with membership metrics (session + weekly)', () => {
		const snap: UsageSnapshot = {
			status: 'ok', fetchedAt: 1_000_000, planName: 'Moderato', renewsAt: '2026-08-01',
			metrics: [
				{ kind: 'session', used: 40, limit: 100, resetsAt: 2_000_000 },
				{ kind: 'weekly', used: 15, limit: 100, resetsAt: 3_000_000 },
			],
		};
		const msg = buildUsageMessage(snap, false, strings, 'dark', '$');
		expect(msg?.status).toBe('ok');
		expect(msg?.planName).toBe('Moderato');
		expect(msg?.renewsAt).toBe('2026-08-01');
		expect(msg?.metrics).toHaveLength(2);
		expect(msg?.metrics[0]).toMatchObject({ kind: 'session', label: '5h window', used: 40, limit: 100, isPercent: true });
		expect(msg?.metrics[1]).toMatchObject({ kind: 'weekly', label: 'Weekly quota', used: 15, limit: 100 });
	});

	it('maps ok with balance only (standard API)', () => {
		const snap: UsageSnapshot = {
			status: 'ok', fetchedAt: 1_000_000, metrics: [],
			balance: { availableBalance: 49.58894, voucherBalance: 46.58893, cashBalance: 3.00001 },
		};
		const msg = buildUsageMessage(snap, false, strings, 'dark', '$');
		expect(msg?.balance).toMatchObject({ availableBalance: '49.59', voucherBalance: '46.59', cashBalance: '3' });
		expect(msg?.metrics).toEqual([]);
	});

	it('marks offline true when cache-fallback flag is set', () => {
		const snap: UsageSnapshot = {
			status: 'ok', fetchedAt: 1, metrics: [],
			balance: { availableBalance: 5, voucherBalance: 5, cashBalance: 0 },
		};
		const msg = buildUsageMessage(snap, true, strings, 'dark', '¥');
		expect(msg?.offline).toBe(true);
		expect(msg?.currency).toBe('¥');
	});

	it('maps loading status with no balance and no lastUpdated', () => {
		const snap: UsageSnapshot = { status: 'loading', fetchedAt: 1, metrics: [] };
		const msg = buildUsageMessage(snap, false, strings, 'dark', '$');
		expect(msg?.status).toBe('loading');
		expect(msg?.balance).toBeUndefined();
		expect(msg?.lastUpdated).toBeUndefined();
	});

	it('maps error statuses with no balance', () => {
		for (const status of ['no-data', 'auth-error', 'network-error', 'server-error'] as const) {
			const snap: UsageSnapshot = { status, fetchedAt: 1, metrics: [] };
			const msg = buildUsageMessage(snap, false, strings, 'dark', '$');
			expect(msg?.status).toBe(status);
			expect(msg?.balance).toBeUndefined();
		}
	});

	it('forwards the currency symbol for china region', () => {
		const snap: UsageSnapshot = {
			status: 'ok', fetchedAt: 1, metrics: [],
			balance: { availableBalance: 0, voucherBalance: 0, cashBalance: 0 },
		};
		const msg = buildUsageMessage(snap, false, strings, 'light', '¥');
		expect(msg?.currency).toBe('¥');
		expect(msg?.theme).toBe('light');
	});
});

describe('metricPercent', () => {
	it('passes percent metrics through unchanged', () => {
		expect(metricPercent(view({ kind: 'session', used: 28, limit: 100, isPercent: true }))).toBe(28);
	});

	it('clamps percent metrics to 0..100', () => {
		expect(metricPercent(view({ kind: 'session', used: 150, limit: 100, isPercent: true }))).toBe(100);
		expect(metricPercent(view({ kind: 'weekly', used: -5, limit: 100, isPercent: true }))).toBe(0);
	});
});

describe('barWidthCss', () => {
	it('emits one width rule per metric keyed by fill id', () => {
		const css = barWidthCss([
			view({ kind: 'session', used: 28, limit: 100, isPercent: true }),
			view({ kind: 'weekly', used: 20, limit: 100, isPercent: true }),
		]);
		expect(css).toContain('#fill-session{width:28%}');
		expect(css).toContain('#fill-weekly{width:20%}');
	});

	it('returns an empty string when there are no metrics', () => {
		expect(barWidthCss([])).toBe('');
	});
});
