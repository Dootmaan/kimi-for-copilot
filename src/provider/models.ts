import * as vscode from 'vscode';
import { t } from '../i18n';
import type { KimiModel, ThinkingEffortSpec } from '../types';

/** Build the per-model `configurationSchema` that renders the thinking effort picker. */
function buildThinkingSchema(spec: ThinkingEffortSpec) {
	// Always include "off" in the enum so Copilot Chat's persisted value is always valid.
	// For always-on models, the "off" entry's description explains it's unavailable.
	const enumValues: string[] = ['off', ...spec.levels];
	const enumLabels = enumValues.map((level) =>
		level === 'off' ? t('effort.off.label') : t(`effort.${level}.label`),
	);
	const enumDescs = enumValues.map((level) => {
		if (level === 'off') {
			return spec.canDisable ? t('effort.off.desc') : t('effort.off.unavailable');
		}
		return t(`effort.${level}.desc`);
	});
	return {
		properties: {
			reasoningEffort: {
				type: 'string',
				title: t('effort.title'),
				enum: enumValues,
				enumItemLabels: enumLabels,
				enumDescriptions: enumDescs,
				default: spec.default,
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
	const spec = model.capabilities.thinkingEffort;
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
		// Only thinking-capable models with an effort spec get the picker.
		...(spec ? { configurationSchema: buildThinkingSchema(spec) } : {}),
	};
}

function resolveModelText(model: KimiModel, field: string): string | undefined {
	const key = `model.${model.id}.${field}`;
	const translated = t(key);
	return translated !== key ? translated : undefined;
}
