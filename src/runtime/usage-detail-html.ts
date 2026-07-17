import type { UsageBalance, UsageSnapshot, UsageStatus } from '../types';
import { formatAmount } from './format';

/** Render-ready cash balance section (all amounts are pre-formatted strings with currency). */
export interface UsageBalanceView {
	availableBalance?: string;
	voucherBalance?: string;
	cashBalance?: string;
}

export interface UsagePanelMessage {
	status: UsageStatus;
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
	exhausted: string;
	balanceSection: string;
	balanceAvailable: string;
	balanceVoucher: string;
	balanceCash: string;
	status: Record<UsageStatus, string>;
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
		balance: snapshot.balance ? toBalanceView(snapshot.balance) : undefined,
		currency,
		lastUpdated: snapshot.status === 'ok' ? snapshot.fetchedAt : undefined,
		offline,
		theme,
		strings,
	};
}

/** Map a {@link UsageBalance} to a {@link UsageBalanceView} with formatted amounts. */
function toBalanceView(balance: UsageBalance): UsageBalanceView {
	return {
		availableBalance: formatAmount(balance.availableBalance),
		voucherBalance: formatAmount(balance.voucherBalance),
		cashBalance: formatAmount(balance.cashBalance),
	};
}
