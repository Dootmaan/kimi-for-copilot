import type { UsageBalance, UsageMetric, UsageSnapshot, UsageStatus } from '../types';
import { formatAmount } from './format';

/** Render-ready metric row (session / weekly / web-searches) for the detail panel. */
export interface UsageMetricView {
	kind: UsageMetric['kind'];
	label: string;
	window: string;
	used: number;
	limit: number;
	isPercent: boolean;
	resetsAt?: number;
}

/** Render-ready cash balance section (all amounts are pre-formatted strings with currency). */
export interface UsageBalanceView {
	availableBalance?: string;
	voucherBalance?: string;
	cashBalance?: string;
	/** Booster (Extra Usage) wallet remaining, when populated from the membership API. */
	booster?: string;
}

export interface UsagePanelMessage {
	status: UsageStatus;
	planName?: string;
	renewsAt?: string;
	metrics: UsageMetricView[];
	balance?: UsageBalanceView;
	/** Currency symbol for balance amounts: `$` (international) or `¥` (china). */
	currency: string;
	lastUpdated?: number;
	offline: boolean;
	theme: 'dark' | 'light';
	strings: UsagePanelStrings;
}

export interface UsagePanelStrings {
	title: string;
	refresh: string;
	setKey: string;
	offline: string;
	unavailable: string;
	lastUpdated: string;
	resetsIn: string;
	plan: string;
	renewsAt: string;
	window: Record<UsageMetric['kind'], string>;
	label: Record<UsageMetric['kind'], string>;
	status: Record<UsageStatus, string>;
	balanceSection: string;
	balanceAvailable: string;
	balanceVoucher: string;
	balanceCash: string;
	balanceBooster: string;
	exhausted: string;
}

/**
 * Convert a UsageSnapshot (the bar's effective state) into the render-ready view model that the
 * detail panel bakes into its HTML server-side. Returns null when there is no snapshot to show
 * (gate failed while pane is open). Pure: no VS Code dependency.
 */
export function buildUsageMessage(
	snapshot: UsageSnapshot | null,
	offline: boolean,
	strings: UsagePanelStrings,
	theme: 'dark' | 'light',
	currency: string,
): UsagePanelMessage | null {
	if (snapshot === null) {
		return null;
	}
	return {
		status: snapshot.status,
		planName: snapshot.planName,
		renewsAt: snapshot.renewsAt,
		metrics: (snapshot.metrics ?? [])
			.filter((m) => m.kind === 'session' || m.kind === 'weekly')
			.map(toMetricView, strings),
		balance: snapshot.balance ? toBalanceView(snapshot.balance) : undefined,
		currency,
		lastUpdated: snapshot.status === 'ok' ? snapshot.fetchedAt : undefined,
		offline,
		theme,
		strings,
	};
}

/** Map a {@link UsageMetric} to a {@link UsageMetricView}, pulling labels from `this` (the strings bag). */
function toMetricView(this: UsagePanelStrings, metric: UsageMetric): UsageMetricView {
	return {
		kind: metric.kind,
		label: this.label[metric.kind],
		window: this.window[metric.kind],
		used: metric.used,
		limit: metric.limit,
		isPercent: true,
		resetsAt: metric.resetsAt,
	};
}

/** Map a {@link UsageBalance} to a {@link UsageBalanceView} with formatted amounts. */
function toBalanceView(balance: UsageBalance): UsageBalanceView {
	return {
		availableBalance: formatAmount(balance.availableBalance),
		voucherBalance: formatAmount(balance.voucherBalance),
		cashBalance: formatAmount(balance.cashBalance),
		booster: formatAmount(balance.availableBalance),
	};
}

/** Bar fill width for a metric, as a clamped 0..100 integer percent. */
export function metricPercent(view: UsageMetricView): number {
	return Math.min(Math.max(view.isPercent ? view.used : Math.round((view.used / Math.max(view.limit, 1)) * 100), 0), 100);
}

/** CSS rules that size each bar fill, one `#fill-<kind>{width:N%}` per metric. */
export function barWidthCss(metrics: UsageMetricView[]): string {
	return metrics.map((m) => `#fill-${m.kind}{width:${metricPercent(m)}%}`).join('\n');
}

