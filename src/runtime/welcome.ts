import * as vscode from 'vscode';
import { WALKTHROUGH_ID, WELCOME_SHOWN_KEY } from '../consts';
import { KimiChatProvider } from '../provider';

export async function showWelcomeIfNeeded(
	context: vscode.ExtensionContext,
	provider: KimiChatProvider,
): Promise<void> {
	if (context.globalState.get(WELCOME_SHOWN_KEY)) {
		return;
	}
	if (await provider.hasApiKey()) {
		await context.globalState.update(WELCOME_SHOWN_KEY, true);
		return;
	}
	await vscode.commands.executeCommand(
		'workbench.action.openWalkthrough',
		`${context.extension.id}#${WALKTHROUGH_ID}`,
		false,
	);
	await context.globalState.update(WELCOME_SHOWN_KEY, true);
}
