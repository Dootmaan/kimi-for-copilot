import * as vscode from 'vscode';
import { URI_PATHS } from '../consts';
import { logger } from '../logger';

export function registerActionUrls(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.window.registerUriHandler({
			handleUri(uri) {
				switch (uri.path) {
					case URI_PATHS.setApiKey:
						void vscode.commands.executeCommand('kimi-copilot.setApiKey');
						break;
					case URI_PATHS.showLogs:
						logger.show();
						break;
				}
			},
		}),
	);
}
