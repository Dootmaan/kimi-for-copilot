import * as vscode from 'vscode';
import { CONFIG_SECTION } from '../consts';
import { resolveKeyPageUrl } from '../endpoint';
import { logger } from '../logger';

export function registerCommands(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('kimi-copilot.getApiKey', () =>
			vscode.env.openExternal(vscode.Uri.parse(resolveKeyPageUrl())),
		),
		vscode.commands.registerCommand('kimi-copilot.openSettings', () =>
			vscode.commands.executeCommand('workbench.action.openSettings', CONFIG_SECTION),
		),
		vscode.commands.registerCommand('kimi-copilot.showLogs', () => logger.show()),
	);
}
