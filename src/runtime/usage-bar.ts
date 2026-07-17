import * as vscode from 'vscode';
import { getApiMode, getBaseUrlOverride, getRegion, getShowUsageStatusBar, getUsageRefreshIntervalMinutes } from '../config';
import { API_KEY_SECRET, USAGE_CACHE_STALE_MS, USAGE_MANUAL_DEBOUNCE_MS } from '../consts';
import { isAbortError } from '../client/errors';
import type { IUsageClient } from '../client/usage';
import { t } from '../i18n';
import { logger } from '../logger';
import type { IAuthManager, UsageSnapshot } from '../types';
import { formatAmount } from './format';
import { buildUsageMessage, type UsagePanelMessage } from './usage-detail-html';
import { UsageDetailPanel } from './usage-detail-panel';
import { usagePanelStrings } from './usage-strings';

/**
 * Status-bar item showing Kimi usage. Membership mode shows weekly/5h quota % + booster balance;
 * Standard API mode shows cash + voucher balance. Both apiModes × both regions are supported.
 * Constructed inside `registerProvider` (where AuthManager lives). Registers its own refresh command.
 *
 * Gate: the item shows AND fetches only when no `baseUrl` override is set, a credential is present,
 * and the user has not opted out via `showUsageStatusBar`.
 */
export class UsageStatusBar implements vscode.Disposable {
	private readonly item: vscode.StatusBarItem;
	private readonly client: IUsageClient;
	private readonly auth: IAuthManager;

	private refreshPromise: Promise<void> | null = null;
	private lastFetchAt = 0;
	private lastOk: UsageSnapshot | null = null;
	private intervalHandle: ReturnType<typeof setInterval> | null = null;
	private controller: AbortController | null = null;
	private readonly _onDidChange = new vscode.EventEmitter<UsagePanelMessage | null>();
	readonly onDidChangeSnapshot = this._onDidChange.event;
	private lastRendered: UsagePanelMessage | null = null;

	constructor(
		context: vscode.ExtensionContext,
		auth: IAuthManager,
		client: IUsageClient,
	) {
		this.auth = auth;
		this.client = client;
		this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 50);
		this.item.command = 'kimi-copilot.openUsageDetail';
		this.item.name = 'Kimi Usage';

		context.subscriptions.push(
			this.item,
			vscode.commands.registerCommand('kimi-copilot.refreshUsage', () => {
				void this.refresh();
			}),
			vscode.commands.registerCommand('kimi-copilot.openUsageDetail', () => {
				UsageDetailPanel.createOrShow(context, this);
			}),
			vscode.workspace.onDidChangeConfiguration((event) => {
				if (event.affectsConfiguration('kimi-copilot')) {
					void this.onConfigOrKeyChange().catch((error) => logger.warn('Usage gate check failed', error));
				}
			}),
			context.secrets.onDidChange((event) => {
				if (event.key === API_KEY_SECRET) {
					void this.onConfigOrKeyChange().catch((error) => logger.warn('Usage gate check failed', error));
				}
			}),
		);

		// Initial gate evaluation: show + first fetch + arm interval if gate passes.
		void this.onConfigOrKeyChange().catch((error) => logger.warn('Usage gate check failed', error));
	}

	/** Manual + interval entry point. Serialized + debounced. */
	refresh(): Promise<void> {
		if (this.refreshPromise) {
			return this.refreshPromise;
		}
		const now = Date.now();
		if (now - this.lastFetchAt < USAGE_MANUAL_DEBOUNCE_MS) {
			return Promise.resolve();
		}
		const refresh = this.runRefresh()
			.catch((error) => logger.warn('Usage refresh failed', error))
			.finally(() => {
				if (this.refreshPromise !== refresh) {
					return;
				}
				this.refreshPromise = null;
			});
		this.refreshPromise = refresh;
		return this.refreshPromise;
	}

	/**
	 * Evaluate the gate, fetch balance, and render the result. Aborts any in-flight fetch.
	 * On gate failure: hide the bar + stop the interval. On fetch error: render a network-error
	 * snapshot (unless the error is an abort, which is expected during cancellation).
	 */
	private async runRefresh(): Promise<void> {
		const gate = await this.evaluateGate();
		if (!gate.passed) {
			this.item.hide();
			this.stopInterval();
			this.lastRendered = null;
			this._onDidChange.fire(null);
			return;
		}
		this.lastFetchAt = Date.now();
		this.render({ status: 'loading', metrics: [], fetchedAt: Date.now() });
		this.controller?.abort();
		const controller = new AbortController();
		this.controller = controller;
		try {
			const snapshot = await this.fetchUsage(gate.apiKey, controller.signal);
			if (snapshot.status === 'ok') {
				this.lastOk = snapshot;
			}
			this.render(snapshot);
		} catch (error) {
			if (isAbortError(error)) {
				logger.warn('Usage fetch aborted');
				return;
			}
			logger.warn('Usage fetch threw', error);
			this.render({ status: 'network-error', metrics: [], fetchedAt: Date.now() });
		}
	}

	/**
	 * Decide whether the status bar should be visible. Passes when no `baseUrl` override is set,
	 * the user has opted in (`showUsageStatusBar`), and a credential is present. Both apiModes ×
	 * both regions are eligible — the usage endpoints exist on all stations.
	 */
	private async evaluateGate(): Promise<{ passed: true; apiKey: string } | { passed: false }> {
		if (getBaseUrlOverride() !== '' || !getShowUsageStatusBar()) {
			return { passed: false };
		}
		const apiKey = await this.auth.getApiKey();
		if (!apiKey) {
			return { passed: false };
		}
		return { passed: true, apiKey };
	}

	/** Route to fetchMembershipUsage (membership) or fetchBalance (standard) based on apiMode. */
	private fetchUsage(apiKey: string, signal: AbortSignal): Promise<UsageSnapshot> {
		return getApiMode() === 'membership'
			? this.client.fetchMembershipUsage(apiKey, signal)
			: this.client.fetchBalance(apiKey, signal);
	}

	/**
	 * Render a snapshot to the status bar (text + tooltip + background) and fire the panel message.
	 * On network/server error with a fresh cache (< 1h), falls back to the last `ok` snapshot
	 * marked `offline`. Resets the warning background; ok-state renderers may set it.
	 */
	private render(snapshot: UsageSnapshot): void {
		const now = Date.now();
		const cacheUsable = this.lastOk && now - this.lastOk.fetchedAt < USAGE_CACHE_STALE_MS;
		let offline = false;

		// Reset warning background by default; ok-state renderer may set it for exhausted balance.
		this.item.backgroundColor = undefined;

		let effective: UsageSnapshot = snapshot;
		if ((snapshot.status === 'network-error' || snapshot.status === 'server-error') && cacheUsable) {
			effective = { ...this.lastOk! };
			offline = true;
		}

		switch (effective.status) {
			case 'loading':
				this.item.text = '$(pulse) Kimi';
				this.item.tooltip = t('usage.status.loading');
				this.item.show();
				break;
			case 'ok':
				this.renderOkBar(effective, offline);
				break;
			case 'no-data':
				this.item.text = '$(dash) Kimi';
				this.item.tooltip = t('usage.status.no-data');
				this.item.show();
				break;
			case 'auth-error':
				this.item.text = '$(warning) Kimi';
				this.item.tooltip = t('usage.status.auth-error');
				this.item.show();
				break;
			case 'network-error':
			case 'server-error':
				this.item.text = snapshot.status === 'network-error' ? '$(plug) Kimi' : '$(warning) Kimi';
				this.item.tooltip =
					snapshot.status === 'network-error' ? t('usage.status.network-error') : t('usage.status.server-error');
				this.item.show();
				break;
		}

		this.fireEffective(effective, offline);
	}

	/** Status-bar rendering for the ok state (text + tooltip). Pane gets the structured message via fireEffective. */
	private renderOkBar(snapshot: UsageSnapshot, offline: boolean): void {
		// Membership quota (metrics present) renders as a percentage; Standard API renders as a balance.
		if (snapshot.metrics.length > 0) {
			this.renderOkBarMetrics(snapshot, offline);
			return;
		}
		this.renderOkBarBalance(snapshot, offline);
	}

	/** Status-bar rendering for the membership quota (weekly/5h metrics). */
	private renderOkBarMetrics(snapshot: UsageSnapshot, offline: boolean): void {
		const primary = snapshot.metrics.find((m) => m.kind === 'session') ?? snapshot.metrics[0];
		this.item.text = primary ? t('usage.status.ok.short', String(primary.used)) : '$(sparkle) Kimi';
		const lines: string[] = [];
		if (snapshot.planName) {
			lines.push(t('usage.plan.label', snapshot.planName));
		}
		if (snapshot.renewsAt) {
			lines.push(t('usage.plan.renewsAt', snapshot.renewsAt));
		}
		for (const metric of snapshot.metrics) {
			const label = metric.kind === 'session' ? t('usage.metric.weekly') : t('usage.metric.session');
			lines.push(`${label}: ${metric.used}%`);
			if (metric.resetsAt) {
				lines.push('  ' + t('usage.metric.resetsAt', new Date(metric.resetsAt).toLocaleString()));
			}
		}
		if (snapshot.balance) {
			lines.push(`${t('usage.balance.booster')}: $${formatAmount(snapshot.balance.availableBalance)}`);
		}
		lines.push(t('usage.tooltip.lastUpdated', new Date(snapshot.fetchedAt).toLocaleTimeString()));
		if (offline) {
			lines.push(t('usage.tooltip.offline'));
		}
		this.item.tooltip = lines.join('\n');
		// Critical: weekly quota at 100% → error background.
		const exhausted = snapshot.metrics.some((m) => m.limit > 0 && m.used >= m.limit);
		this.item.backgroundColor = exhausted
			? new vscode.ThemeColor('statusBarItem.errorBackground')
			: undefined;
		this.item.show();
	}

	/** Status-bar rendering for the Standard API balance (available + voucher + cash). */
	private renderOkBarBalance(snapshot: UsageSnapshot, offline: boolean): void {
		const bal = snapshot.balance;
		const currency = getRegion() === 'china' ? '¥' : '$';

		if (bal) {
			this.item.text = t('usage.status.balance.short', currency, formatAmount(bal.availableBalance));
		} else {
			this.item.text = '$(sparkle) Kimi';
		}

		const lines: string[] = [];
		if (bal) {
			lines.push(`${t('usage.balance.available')}: ${currency}${formatAmount(bal.availableBalance)}`);
			lines.push(`${t('usage.balance.voucher')}: ${currency}${formatAmount(bal.voucherBalance)}`);
			lines.push(`${t('usage.balance.cash')}: ${currency}${formatAmount(bal.cashBalance)}`);
			if (bal.availableBalance <= 0) {
				lines.push(t('usage.tooltip.exhausted'));
			}
		}
		lines.push(t('usage.tooltip.lastUpdated', new Date(snapshot.fetchedAt).toLocaleTimeString()));
		if (offline) {
			lines.push(t('usage.tooltip.offline'));
		}
		this.item.tooltip = lines.join('\n');
		// Critical: no usable balance (available ≤ 0) → error background.
		const broke = bal ? bal.availableBalance <= 0 : false;
		this.item.backgroundColor = broke
			? new vscode.ThemeColor('statusBarItem.errorBackground')
			: undefined;
		this.item.show();
	}

	/**
	 * Re-evaluate the gate after settings or the stored key change. Aborts any in-flight fetch,
	 * drops the cached snapshot from the previous key/region, and bypasses the manual debounce so
	 * the next render reflects the new configuration immediately.
	 */
	private async onConfigOrKeyChange(): Promise<void> {
		this.controller?.abort();
		this.refreshPromise = null;
		this.lastOk = null;
		const gate = await this.evaluateGate();
		if (!gate.passed) {
			this.item.hide();
			this.stopInterval();
			this.lastRendered = null;
			this._onDidChange.fire(null);
			return;
		}
		this.stopInterval();
		this.startInterval();
		this.lastFetchAt = 0;
		void this.refresh();
	}

	/** Arm the auto-refresh interval from `getUsageRefreshIntervalMinutes`; replaces any existing handle. */
	private startInterval(): void {
		const minutes = getUsageRefreshIntervalMinutes();
		this.intervalHandle = setInterval(() => {
			void this.refresh();
		}, minutes * 60_000);
	}

	/** Clear the auto-refresh interval if armed. */
	private stopInterval(): void {
		if (this.intervalHandle !== null) {
			clearInterval(this.intervalHandle);
			this.intervalHandle = null;
		}
	}

	/** Dispose the status bar item, abort any in-flight fetch, and stop auto-refresh. */
	dispose(): void {
		this.stopInterval();
		this.controller?.abort();
		this.item.dispose();
		this._onDidChange.dispose();
	}

	/** Latest effective snapshot message (post-cache-fallback), or null before first render / after gate fail. */
	getSnapshot(): UsagePanelMessage | null {
		return this.lastRendered;
	}

	/** Build a UsagePanelMessage from the effective state and fire the emitter + cache it. */
	private fireEffective(snapshot: UsageSnapshot, offline: boolean): void {
		const currency = getRegion() === 'china' ? '¥' : '$';
		const message = buildUsageMessage(snapshot, offline, usagePanelStrings(), currentThemeKind(), currency);
		this.lastRendered = message;
		this._onDidChange.fire(message);
	}
}

/** Map the active VS Code color theme to a light/dark token for the detail panel. */
function currentThemeKind(): 'dark' | 'light' {
	return vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ? 'dark' : 'light';
}
