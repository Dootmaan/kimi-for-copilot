import { randomBytes } from 'node:crypto';
import * as vscode from 'vscode';
import { getRegion } from '../config';
import { t } from '../i18n';
import type { UsagePanelMessage } from './usage-detail-html';
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

/** Render the HTML body for the `ok` status: balance section + footer. */
function renderOkBody(msg: UsagePanelMessage): string {
	const s = msg.strings;
	const lines: string[] = [];
	if (msg.balance) {
		lines.push(renderBalanceBody(msg));
	}
	if (msg.balance && msg.balance.availableBalance !== undefined && Number(msg.balance.availableBalance) <= 0) {
		lines.push(`<div class="exhausted">${escapeHtml(s.exhausted)}</div>`);
	}
	if (msg.lastUpdated !== undefined) {
		lines.push(`<div class="last-updated">${escapeHtml(s.lastUpdated.replace('{0}', new Date(msg.lastUpdated).toLocaleTimeString()))}</div>`);
	}
	if (msg.offline) {
		lines.push(`<div class="offline">${escapeHtml(s.offline)}</div>`);
	}
	return lines.join('');
}

/** Render the HTML for the balance section: available / voucher / cash rows. */
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
		.balance-section { margin-top: 8px; padding-top: 8px; border-top: 1px solid ${barBg}; }
		.balance-section h2 { font-size: 1rem; margin-bottom: 12px; color: ${fg}; }
		.balance-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.95rem; border-bottom: 1px solid ${border}; }
		.balance-available { font-size: 1.15rem; font-weight: 600; border-bottom: 2px solid ${accent}; padding: 10px 0; }
		.balance-value { font-weight: 600; }
		.exhausted { color: #f14c4c; font-size: 0.85rem; font-weight: 600; margin-top: 12px; }
		.last-updated { color: ${muted}; font-size: 0.8rem; margin-top: 12px; }
		.offline { color: ${muted}; font-size: 0.8rem; font-style: italic; margin-top: 4px; }
		.status-message { text-align: center; padding: 40px 16px; color: ${muted}; }
		.status-message p { margin-bottom: 16px; }
	`;
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
