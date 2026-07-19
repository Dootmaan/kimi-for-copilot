import * as vscode from 'vscode';
import { t } from '../i18n';
import type { KimiModel, ThinkingStyle } from '../types';

/** Whether a model allows turning thinking OFF (toggle) or forces it always ON (k3, code). */
export function canDisableThinking(style: ThinkingStyle | undefined): boolean {
	return style !== 'k3' && style !== 'code';
}

/** Default thinking level for a model's toggle. Always-on models default to enabled. */
export function thinkingDefault(_style: ThinkingStyle | undefined): 'enabled' | 'disabled' {
	return 'enabled';
}

/**
 * Build the per-model `configurationSchema` that renders the thinking toggle next to the model picker.
 *
 * Both "On" and "Off" are always offered so users see the option exists. For always-on models
 * (`k3`, `code`), the "Off" entry's description explains the model doesn't support disabling
 * thinking, and `request.ts` defensively ignores any "disabled" selection for those models —
 * effectively keeping it always on.
 */
function buildThinkingSchema(style: ThinkingStyle | undefined) {
	const disableable = canDisableThinking(style);
	return {
		properties: {
			thinking: {
				type: 'string',
				title: t('thinking.title'),
				enum: ['enabled', 'disabled'] as const,
				enumItemLabels: [
					t('thinking.toggle.enabled.label'),
					t('thinking.toggle.disabled.label'),
				],
				enumDescriptions: [
					t('thinking.toggle.enabled.desc'),
					disableable
						? t('thinking.toggle.disabled.desc')
						: t('thinking.toggle.disabled.unavailable'),
				],
				default: 'enabled',
				group: 'navigation',
			},
		},
	} as const;
}

/** Non-public `configurationSchema` field the Copilot host reads at runtime (intersection type). */
type ThinkingChatInformation = vscode.LanguageModelChatInformation & {
	readonly configurationSchema?: ReturnType<typeof buildThinkingSchema>;
};

/** Build the Copilot Chat model picker entry for a Kimi model. */
export function toChatInfo(model: KimiModel, hasApiKey: boolean): ThinkingChatInformation {
	const detail = resolveModelText(model, 'detail') ?? model.detail;
	const tooltip = resolveModelText(model, 'tooltip');
	const style = model.capabilities.thinking ? model.capabilities.thinkingStyle : undefined;
	return {
		id: model.id,
		name: model.name,
		family: model.family,
		version: model.version,
		detail: hasApiKey ? detail : t('auth.apiKeyRequiredDetail'),
		tooltip: hasApiKey ? tooltip : t('auth.apiKeyRequiredDetail'),
		maxInputTokens: model.maxInputTokens,
		maxOutputTokens: model.maxOutputTokens,
		capabilities: {
			toolCalling: model.capabilities.toolCalling,
			imageInput: model.capabilities.imageInput,
		},
		// Only thinking-capable models get the toggle.
		...(model.capabilities.thinking ? { configurationSchema: buildThinkingSchema(style) } : {}),
	};
}

function resolveModelText(model: KimiModel, field: string): string | undefined {
	const key = `model.${model.id}.${field}`;
	const translated = t(key);
	return translated !== key ? translated : undefined;
}
