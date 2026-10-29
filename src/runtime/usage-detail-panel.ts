import { randomBytes } from 'node:crypto';
import * as vscode from 'vscode';
import { getRegion } from '../config';
import { t } from '../i18n';
import { barWidthCss, type UsagePanelMessage } from './usage-detail-html';
import type { UsageStatusBar } from './usage-bar';
import { usagePanelStrings } from './usage-strings';

/**
 * Singleton webview panel showing Kimi account balance detail. Clicking the Kimi Balance
 * status bar opens (or reveals) this pane. It never fetches on its own: it renders the
 * effective snapshot pushed by UsageStatusBar via onDidChangeSnapshot.
 */
export class UsageDetailPanel {
	private static currentPanel: UsageDetailPanel | undefined;

	private readonly panel: vscode.WebviewPanel;
	private readonly bar: UsageStatusBar;
	private subscription: vscode.Disposable | undefined;
	private themeSub: vscode.Disposable | undefined;
	private lastMessage: UsagePanelMessage | null | undefined;

	private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext, bar: UsageStatusBar) {
		this.panel = panel;
		this.bar = bar;

		this.render(this.bar.getSnapshot());

		this.subscription = bar.onDidChangeSnapshot((message) => this.render(message));

		this.themeSub = vscode.window.onDidChangeActiveColorTheme(() => this.render(this.bar.getSnapshot()));

		this.panel.webview.onDidReceiveMessage(
			(message: { type: string }) => this.onMessage(message),
			undefined,
			context.subscriptions,
		);

		this.panel.onDidDispose(() => this.dispose(), undefined, context.subscriptions);
	}

	/**
	 * Reveal the singleton panel if it exists, otherwise create one bound to `bar`.
	 * The panel subscribes to `bar.onDidChangeSnapshot` and re-renders on every push.
	 */
	static createOrShow(context: vscode.ExtensionContext, bar: UsageStatusBar): void {
		if (UsageDetailPanel.currentPanel) {
			UsageDetailPanel.currentPanel.panel.reveal(vscode.ViewColumn.Active, false);
			return;
		}
		const panel = vscode.window.createWebviewPanel(
			'kimiUsageDetail',
			t('usage.panel.title'),
			vscode.ViewColumn.Active,
			{
				enableScripts: true,
				retainContextWhenHidden: false,
			},
		);
		UsageDetailPanel.currentPanel = new UsageDetailPanel(panel, context, bar);
	}

	/** Handle a webview post-message: `refresh` triggers a bar refresh, `setKey` opens the key prompt. */
	private async onMessage(message: { type: string }): Promise<void> {
		if (message.type === 'refresh') {
			await this.bar.refresh();
		} else if (message.type === 'setKey') {
			await vscode.commands.executeCommand('kimi-copilot.setApiKey');
		}
	}

	/**
	 * Re-render the panel HTML. Suppresses the transition to `loading` when a non-loading snapshot
	 * is already showing (avoids flicker on background refresh). Caches the last message.
	 */
	private render(message: UsagePanelMessage | null): void {
		if (message?.status === 'loading' && this.lastMessage != null && this.lastMessage.status !== 'loading') {
			return;
		}
		this.lastMessage = message;
		this.panel.title = t('usage.panel.title');
		this.panel.webview.html = this.buildHtml(message);
	}

	/**
	 * Build the full panel HTML document. Uses a gate-failed fallback message when `message` is null.
	 * Inline scripts run under a nonce CSP; reset-countdown timers are hydrated via `resetsAtMap`.
	 */
	private buildHtml(message: UsagePanelMessage | null): string {
		const nonce = getNonce();
		const theme = themeKind();
		const gateFailed = message === null;
		const effective: UsagePanelMessage = message ?? {
			status: 'no-data',
			metrics: [],
			currency: getRegion() === 'china' ? '¥' : '$',
			offline: false,
			theme,
			strings: usagePanelStrings(),
		};
		const body = gateFailed
			? `<div class="status-message"><p>${escapeHtml(effective.strings.unavailable)}</p></div>`
			: effective.status === 'ok'
				? renderOkBody(effective)
				: renderStatusBody(effective);

		return /* html */ `<!DOCTYPE html>
<html lang="${escapeHtml(vscode.env.language)}">
<head>
	<meta charset="UTF-8" />
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>${escapeHtml(effective.strings.title)}</title>
	<style nonce="${nonce}">
		${themeCss(theme)}
		${barWidthCss(effective.metrics)}
	</style>
</head>
<body>
	<main class="page">
		<header class="header">
			<div class="heading"><h1>${escapeHtml(effective.strings.title)}</h1></div>
			<button id="refresh" class="btn btn-secondary"><span aria-hidden="true">↻</span> ${escapeHtml(effective.strings.refresh)}</button>
		</header>
		<div id="content">${body}</div>
		${renderFooter(effective)}
	</main>
	<script nonce="${nonce}">
		const vscode = acquireVsCodeApi();
		document.getElementById('refresh').addEventListener('click', () => vscode.postMessage({ type: 'refresh' }));
		const setKeyBtn = document.getElementById('setKey');
		if (setKeyBtn) setKeyBtn.addEventListener('click', () => vscode.postMessage({ type: 'setKey' }));
		const resetsAtTimes = ${jsonForScript(resetsAtMap(effective))};
		if (resetsAtTimes && Object.keys(resetsAtTimes).length > 0) {
			const fmt = (ms) => {
				if (ms <= 0) return '0m';
				const d = Math.floor(ms / 86400000);
				const h = Math.floor((ms % 86400000) / 3600000);
				const m = Math.round((ms % 3600000) / 60000);
				if (d > 0) return d + 'd ' + h + 'h';
				if (h > 0 && m > 0) return h + 'h ' + m + 'm';
				if (h > 0) return h + 'h';
				return m + 'm';
			};
			const tick = () => {
				const now = Date.now();
				for (const [key, ts] of Object.entries(resetsAtTimes)) {
					const el = document.getElementById('resets-' + key);
					if (el) el.textContent = ${jsonForScript(effective.strings.resetsIn)}.replace('{0}', fmt(ts - now));
				}
			};
			tick();
			setInterval(tick, 1000);
		}
	</script>
</body>
</html>`;
	}

	/** Dispose subscriptions, theme listener, and the webview panel; clear the singleton reference. */
	dispose(): void {
		this.subscription?.dispose();
		this.themeSub?.dispose();
		this.panel.dispose();
		UsageDetailPanel.currentPanel = undefined;
	}
}

/** Render the HTML body for the `ok` status: plan meta, metric cards, optional balance hero. */
function renderOkBody(msg: UsagePanelMessage): string {
	const s = msg.strings;
	const lines: string[] = [];
	if (msg.planName || msg.renewsAt) {
		const meta: string[] = [];
		if (msg.planName) {
			meta.push(escapeHtml(s.plan.replace('{0}', msg.planName)));
		}
		if (msg.renewsAt) {
			meta.push(escapeHtml(s.renewsAt.replace('{0}', msg.renewsAt)));
		}
		lines.push(`<div class="plan-meta">${meta.join('<span class="meta-sep">·</span>')}</div>`);
	}
	if (msg.metrics.length > 0) {
		lines.push(`<section class="metrics-section"><div class="metrics-grid">`);
		for (const metric of msg.metrics) {
			const exhausted = metricPercentOf(metric) >= 100;
			const note = exhausted ? `<span class="used-label">${escapeHtml(s.exhausted)}</span>` : '';
			lines.push(`<article class="metric-card${exhausted ? ' metric-warning' : ''}">
				<div class="metric-head"><span class="metric-label">${escapeHtml(metric.label)}</span><span class="metric-window">${escapeHtml(metric.window)}</span></div>
				<div class="bar"><div class="bar-fill" id="fill-${escapeHtml(metric.kind)}"></div></div>
				<div class="metric-value">${escapeHtml(`${metric.used}%`)}${note}</div>
				${metric.resetsAt ? `<div id="resets-${escapeHtml(metric.kind)}" class="resets"></div>` : ''}
			</article>`);
		}
		lines.push(`</div></section>`);
	}
	if (msg.balance) {
		lines.push(renderBalanceBody(msg));
	}
	return lines.join('');
}

/** Clamped 0..100 percent for a metric view (mirrors `metricPercent` in usage-detail-html). */
function metricPercentOf(metric: UsagePanelMessage['metrics'][number]): number {
	const raw = metric.isPercent ? metric.used : Math.round((metric.used / Math.max(metric.limit, 1)) * 100);
	return Math.min(Math.max(raw, 0), 100);
}

/**
 * Render the HTML for the balance section: one hero card with the available amount plus a
 * separated supporting-rows block for voucher and cash.
 */
function renderBalanceBody(msg: UsagePanelMessage): string {
	const s = msg.strings;
	const b = msg.balance!;
	const c = msg.currency;
	const exhausted = b.availableBalance !== undefined && Number.parseFloat(b.availableBalance) <= 0;
	const lines: string[] = [
		`<section class="balance-section"><h2>${escapeHtml(s.balanceSection)}</h2>`,
	];
	if (exhausted) {
		lines.push(`<div class="insufficient">${escapeHtml(s.exhausted)}</div>`);
	}
	const meta: string[] = [];
	if (b.voucherBalance !== undefined) {
		meta.push(renderBalanceRow(s.balanceVoucher, `${escapeHtml(c)}${escapeHtml(b.voucherBalance)}`));
	}
	if (b.cashBalance !== undefined) {
		meta.push(renderBalanceRow(s.balanceCash, `${escapeHtml(c)}${escapeHtml(b.cashBalance)}`));
	}
	const hero =
		b.availableBalance !== undefined
			? `<div class="metric-value"><span class="hero-currency">${escapeHtml(c)}</span>${escapeHtml(b.availableBalance)}<span class="used-label">${escapeHtml(s.balanceAvailable)}</span></div>`
			: `<div class="metric-value muted-value">—</div>`;
	lines.push(`<article class="balance-card">
		<div class="balance-head"><h3>${escapeHtml(s.balanceAvailable)}</h3></div>
		${hero}
		${meta.length > 0 ? `<div class="balance-meta">${meta.join('')}</div>` : ''}
	</article>
	</section>`);
	return lines.join('');
}

/** Render one supporting balance row (label left, formatted value right). */
function renderBalanceRow(label: string, value: string): string {
	return `<div class="balance-row"><span>${escapeHtml(label)}</span><span class="balance-value">${value}</span></div>`;
}

/** Render the page footer: offline badge and last-updated timestamp. */
function renderFooter(msg: UsagePanelMessage): string {
	const parts: string[] = [];
	if (msg.offline) {
		parts.push(`<span class="offline">${escapeHtml(msg.strings.offline)}</span>`);
	}
	if (msg.lastUpdated !== undefined) {
		parts.push(
			`<span class="last-updated">${escapeHtml(
				msg.strings.lastUpdated.replace('{0}', new Date(msg.lastUpdated).toLocaleTimeString()),
			)}</span>`,
		);
	}
	return parts.length > 0 ? `<footer class="page-footer">${parts.join('')}</footer>` : '';
}

/** Render the HTML body for non-ok statuses: a centered message, plus a Set-Key button on auth errors. */
function renderStatusBody(msg: UsagePanelMessage): string {
	const s = msg.strings;
	if (msg.status === 'auth-error') {
		return `<div class="status-message">
			<p>${escapeHtml(s.status['auth-error'])}</p>
			<button id="setKey" class="btn">${escapeHtml(s.setKey)}</button>
		</div>`;
	}
	const text = msg.status === 'no-data' ? (s.status['no-data']) : (s.status[msg.status] || s.status['no-data']);
	return `<div class="status-message"><p>${escapeHtml(text)}</p></div>`;
}

/** Generate the panel's theme CSS string, switching colors by dark/light token. */
function themeCss(theme: 'dark' | 'light'): string {
	const dark = theme === 'dark';
	return `
		:root { color-scheme: ${dark ? 'dark' : 'light'}; --fg: var(--vscode-foreground, ${dark ? '#d4d4d4' : '#252526'}); --muted: var(--vscode-descriptionForeground, ${dark ? '#a1a1aa' : '#66666f'}); --accent: var(--vscode-textLink-foreground, ${dark ? '#75beff' : '#006ab1'}); --border: var(--vscode-widget-border, ${dark ? '#3b3b3f' : '#dedee3'}); --surface: var(--vscode-sideBar-background, ${dark ? '#252526' : '#f8f8fa'}); --warn: var(--vscode-notificationsWarningIcon-foreground, ${dark ? '#d7ba7d' : '#986800'}); }
		* { box-sizing: border-box; }
		body { margin: 0; color: var(--fg); background: var(--vscode-editor-background, ${dark ? '#1f1f1f' : '#ffffff'}); font-family: var(--vscode-font-family, system-ui, sans-serif); font-size: 13px; line-height: 1.5; }
		.page { max-width: 960px; margin: 0 auto; padding: 28px; }
		.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 24px; }
		.heading { min-width: 0; }
		h1 { margin: 0; font-size: 22px; line-height: 1.3; font-weight: 600; letter-spacing: -0.4px; }
		h2 { margin: 0 0 12px; font-size: 14px; }
		.btn { display: inline-flex; justify-content: center; align-items: center; gap: 6px; flex-shrink: 0; min-height: 34px; padding: 6px 12px; font: inherit; font-weight: 500; border: 1px solid transparent; border-radius: 5px; cursor: pointer; background: var(--vscode-button-background, #0078d4); color: var(--vscode-button-foreground, #ffffff); transition: background 0.15s; }
		.btn:hover { filter: brightness(1.08); }
		.btn-secondary { color: var(--fg); border-color: var(--border); background: transparent; }
		.btn-secondary:hover { background: var(--vscode-toolbar-hoverBackground, ${dark ? '#ffffff0d' : '#00000008'}); }
		.btn:focus-visible { outline: 2px solid var(--vscode-focusBorder, #007fd4); outline-offset: 3px; }
		.plan-meta { color: var(--muted); font-size: 12px; margin-bottom: 16px; }
		.meta-sep { margin: 0 6px; opacity: 0.6; }
		.metrics-section, .balance-section { margin-top: 20px; }
		.metrics-section:first-child, .balance-section:first-child { margin-top: 0; }
		.metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
		.metric-card { min-width: 0; padding: 18px 20px; border: 1px solid var(--border); border-radius: 9px; background: var(--surface); }
		.metric-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 10px; }
		.metric-label { font-weight: 600; font-size: 13px; }
		.metric-window { color: var(--muted); font-size: 11px; }
		.bar { height: 6px; border-radius: 4px; overflow: hidden; background: var(--vscode-progressBar-background, ${dark ? '#75beff' : '#0078d4'}); background: color-mix(in srgb, var(--fg) 12%, transparent); }
		.bar-fill { height: 100%; width: 0; border-radius: inherit; background: var(--accent); transition: width 0.2s; }
		.metric-warning .bar-fill { background: var(--warn); }
		.metric-value { display: flex; align-items: baseline; flex-wrap: wrap; margin: 12px 0 4px; font-size: 26px; font-weight: 600; line-height: 1.1; letter-spacing: -0.5px; font-variant-numeric: tabular-nums; }
		.metric-value.muted-value { color: var(--muted); }
		.hero-currency { font-size: 19px; color: var(--muted); margin-right: 6px; letter-spacing: 0; }
		.used-label { font-size: 11px; font-weight: 400; color: var(--warn); margin-left: 8px; letter-spacing: 0; }
		.resets { color: var(--muted); font-size: 11px; margin-top: 6px; }
		.balance-card { min-width: 0; padding: 22px; border: 1px solid var(--border); border-radius: 9px; background: var(--surface); }
		.balance-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
		.balance-head h3 { margin: 0; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
		.balance-meta { margin-top: 14px; padding-top: 8px; border-top: 1px solid var(--border); }
		.balance-row { display: flex; justify-content: space-between; gap: 16px; padding: 6px 0; font-size: 13px; }
		.balance-value { font-weight: 600; font-variant-numeric: tabular-nums; }
		.insufficient { margin-bottom: 12px; padding: 10px 14px; border: 1px solid var(--border); border-radius: 7px; color: var(--warn); background: color-mix(in srgb, var(--warn) 10%, transparent); }
		.page-footer { display: flex; flex-wrap: wrap; gap: 6px 20px; color: var(--muted); font-size: 11px; margin-top: 18px; }
		.last-updated { margin-left: auto; }
		.offline { color: var(--warn); }
		.status-message { text-align: center; padding: 40px 20px; color: var(--muted); border: 1px solid var(--border); border-radius: 9px; }
		.status-message p { margin: 0 0 16px; }
		@media (max-width: 720px) { .metrics-grid { grid-template-columns: 1fr; } }
		@media (max-width: 480px) { .page { padding: 20px 16px; } .header { gap: 12px; } .metric-card, .balance-card { padding: 18px; } .last-updated { margin-left: 0; } }
		@media (prefers-reduced-motion: reduce) { .bar-fill, .btn { transition: none; } }
	`;
}

/** Collect `{ kind: resetsAt }` for metrics that have a reset time, to hydrate the client-side countdown. */
function resetsAtMap(msg: UsagePanelMessage): Record<string, number> {
	const map: Record<string, number> = {};
	for (const m of msg.metrics) {
		if (m.resetsAt !== undefined) {
			map[m.kind] = m.resetsAt;
		}
	}
	return map;
}

/** JSON-stringify a value for inline `<script>` interpolation, escaping `<` to prevent tag-break-out. */
function jsonForScript(value: unknown): string {
	return JSON.stringify(value).replace(/</g, '\\u003c');
}

/** Map the VS Code color theme to a dark/light token (high-contrast counted as dark). */
function themeKind(): 'dark' | 'light' {
	const kind = vscode.window.activeColorTheme.kind;
	return kind === vscode.ColorThemeKind.Dark || kind === vscode.ColorThemeKind.HighContrast ? 'dark' : 'light';
}

/** Generate a CSP nonce for the panel's `<style>` / `<script>` elements. */
function getNonce(): string {
	return randomBytes(16).toString('base64');
}

/** Escape `& < > " '` for safe interpolation into HTML. */
function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
