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
	 * Inline scripts run under a nonce CSP.
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
<html lang="en">
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
	<div class="header">
		<h1>${escapeHtml(effective.strings.title)}</h1>
		<button id="refresh" class="btn">${escapeHtml(effective.strings.refresh)}</button>
	</div>
	<div id="content">${body}</div>
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

/** Render the HTML body for the `ok` status: plan header, metric bars, optional balance section, footer. */
function renderOkBody(msg: UsagePanelMessage): string {
	const s = msg.strings;
	const lines: string[] = [];
	if (msg.planName) {
		lines.push(`<div class="plan">${escapeHtml(s.plan.replace('{0}', msg.planName))}</div>`);
	}
	if (msg.renewsAt) {
		lines.push(`<div class="plan">${escapeHtml(s.renewsAt.replace('{0}', msg.renewsAt))}</div>`);
	}
	for (const metric of msg.metrics) {
		const valueLabel = `${metric.used}%`;
		lines.push(`<div class="metric">
			<div class="metric-head"><span class="metric-label">${escapeHtml(metric.label)}</span><span class="metric-window">${escapeHtml(metric.window)}</span></div>
			<div class="bar"><div class="bar-fill" id="fill-${escapeHtml(metric.kind)}"></div></div>
			<div class="metric-value">${escapeHtml(valueLabel)}</div>
			${metric.resetsAt ? `<div id="resets-${escapeHtml(metric.kind)}" class="resets"></div>` : ''}
		</div>`);
	}
	if (msg.balance) {
		lines.push(renderBalanceBody(msg));
	}
	if (msg.lastUpdated !== undefined) {
		lines.push(`<div class="last-updated">${escapeHtml(s.lastUpdated.replace('{0}', new Date(msg.lastUpdated).toLocaleTimeString()))}</div>`);
	}
	if (msg.offline) {
		lines.push(`<div class="offline">${escapeHtml(s.offline)}</div>`);
	}
	return lines.join('');
}

/** Render the HTML for the balance section: available / voucher / cash / booster rows. */
function renderBalanceBody(msg: UsagePanelMessage): string {
	const s = msg.strings;
	const b = msg.balance!;
	const c = msg.currency;
	const lines: string[] = [`<div class="balance-section"><h2>${escapeHtml(s.balanceSection)}</h2>`];
	if (b.availableBalance !== undefined) {
		lines.push(`<div class="balance-row balance-available"><span>${escapeHtml(s.balanceAvailable)}</span><span class="balance-value">${escapeHtml(c)}${escapeHtml(b.availableBalance)}</span></div>`);
	}
	if (b.voucherBalance !== undefined) {
		lines.push(`<div class="balance-row"><span>${escapeHtml(s.balanceVoucher)}</span><span class="balance-value">${escapeHtml(c)}${escapeHtml(b.voucherBalance)}</span></div>`);
	}
	if (b.cashBalance !== undefined) {
		lines.push(`<div class="balance-row"><span>${escapeHtml(s.balanceCash)}</span><span class="balance-value">${escapeHtml(c)}${escapeHtml(b.cashBalance)}</span></div>`);
	}
	if (b.booster !== undefined) {
		lines.push(`<div class="balance-row"><span>${escapeHtml(s.balanceBooster)}</span><span class="balance-value">${escapeHtml(c)}${escapeHtml(b.booster)}</span></div>`);
	}
	lines.push('</div>');
	return lines.join('');
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
	const fg = dark ? '#cccccc' : '#313033';
	const muted = dark ? '#9d9d9d' : '#6d6d6d';
	const accent = dark ? '#3794ff' : '#0066b8';
	const barBg = dark ? '#3a3d41' : '#d4d4d4';
	const border = dark ? '#2d2d2d' : '#e5e5e5';
	return `
		body { font-family: var(--vscode-font-family, sans-serif); color: ${fg}; padding: 16px 20px; margin: 0; }
		.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
		h1 { font-size: 1.1rem; margin: 0; font-weight: 600; }
		.btn { background: var(--vscode-button-background, ${accent}); color: var(--vscode-button-foreground, #fff); border: none; padding: 4px 12px; border-radius: 2px; cursor: pointer; font-size: 0.85rem; }
		.btn:hover { opacity: 0.9; }
		.plan { color: ${muted}; font-size: 0.9rem; margin-bottom: 2px; }
		.metric { margin: 14px 0; padding-bottom: 14px; border-bottom: 1px solid ${border}; }
		.metric-head { display: flex; justify-content: space-between; margin-bottom: 6px; }
		.metric-label { font-weight: 600; }
		.metric-window { color: ${muted}; font-size: 0.85rem; }
		.bar { background: ${barBg}; border-radius: 2px; height: 8px; overflow: hidden; }
		.bar-fill { background: ${accent}; height: 100%; width: 0; transition: width 0.2s; }
		.metric-value { margin-top: 4px; font-size: 0.9rem; }
		.resets { color: ${muted}; font-size: 0.8rem; margin-top: 2px; }
		.balance-section { margin-top: 8px; padding-top: 8px; border-top: 1px solid ${barBg}; }
		.balance-section h2 { font-size: 1rem; margin-bottom: 12px; color: ${fg}; }
		.balance-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.95rem; border-bottom: 1px solid ${border}; }
		.balance-available { font-size: 1.15rem; font-weight: 600; border-bottom: 2px solid ${accent}; padding: 10px 0; }
		.balance-value { font-weight: 600; }
		.last-updated { color: ${muted}; font-size: 0.8rem; margin-top: 12px; }
		.offline { color: ${muted}; font-size: 0.8rem; font-style: italic; margin-top: 4px; }
		.status-message { text-align: center; padding: 40px 16px; color: ${muted}; }
		.status-message p { margin-bottom: 16px; }
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
