import * as vscode from 'vscode';
import { KimiClient } from '../client';
import { findModelDefinition, getApiModelId, getMaxRetries, getMaxTokens } from '../config';
import { DEFAULT_TOOLS_LIMIT } from '../consts';
import { resolveBaseUrl } from '../endpoint';
import { t } from '../i18n';
import type {
	IAuthManager,
	IKimiClient,
	KimiChatRequest,
	KimiTool,
	ThinkingEffort,
	ThinkingEffortSpec,
} from '../types';
import { convertMessages, convertTools, countMessageChars } from './convert';

interface PrepareChatRequestArgs {
	authManager: IAuthManager;
	extensionVersion: string;
	modelInfo: vscode.LanguageModelChatInformation;
	messages: readonly vscode.LanguageModelChatRequestMessage[];
	options: vscode.ProvideLanguageModelChatResponseOptions;
	token: vscode.CancellationToken;
}

export interface PreparedChatRequest {
	client: IKimiClient;
	request: KimiChatRequest;
	totalRequestChars: number;
	isThinkingModel: boolean;
}

/** Build the Kimi client and request body for one Copilot Chat turn. */
export async function prepareChatRequest({
	authManager,
	extensionVersion,
	modelInfo,
	messages,
	options,
}: PrepareChatRequestArgs): Promise<PreparedChatRequest> {
	const apiKey = await authManager.getApiKey();
	if (!apiKey) {
		throw new Error(t('auth.notConfigured'));
	}
	const baseUrl = resolveBaseUrl();
	const client = new KimiClient(baseUrl, apiKey, extensionVersion, getMaxRetries());
	const modelDef = findModelDefinition(modelInfo.id);
	const isThinkingModel = modelDef?.capabilities.thinking ?? false;
	const toolCalling = modelDef?.capabilities.toolCalling ?? false;
	const toolLimit = typeof toolCalling === 'number' ? toolCalling : DEFAULT_TOOLS_LIMIT;
	const kimiMessages = convertMessages(messages, isThinkingModel);
	const tools: KimiTool[] | undefined = toolCalling ? convertTools(options.tools ?? []) : undefined;
	if (tools && tools.length > toolLimit) {
		throw new Error(t('request.toolsLimitExceeded', String(toolLimit), String(tools.length)));
	}
	const hasTools = !!(tools && tools.length > 0);
	const effortSpec = modelDef?.capabilities.thinkingEffort;
	const thinkingFields = resolveThinkingFields(effortSpec, modelInfo.id, options);
	const request: KimiChatRequest = {
		model: getApiModelId(modelInfo.id),
		messages: kimiMessages,
		stream: true,
		tools: hasTools ? tools : undefined,
		tool_choice: hasTools ? 'auto' : undefined,
		max_tokens: getMaxTokens(),
		...thinkingFields,
	};
	const totalRequestChars = countMessageChars(kimiMessages);
	return { client, request, totalRequestChars, isThinkingModel };
}

/**
 * Resolve the model-specific thinking request fields from the picker's `reasoningEffort` selection.
 *
 * Wire format differs by model family (confirmed from the official OpenAPI spec + MoonshotAI/kimi-code source):
 * - Open Platform `kimi-k3`: top-level `reasoning_effort: "low"|"high"|"max"` (no `thinking` object).
 * - Kimi Code `k3`, `k3-256k`, `kimi-for-coding`: `thinking: { type: "enabled", effort: "low"|"high"|"max" }`.
 *   When `off` is selected, Kimi Code routes K3/K2.8 to the K2.8 no-thinking backend.
 * - `kimi-k2.7-code` / `kimi-k2.7-code-highspeed` / `kimi-for-coding-highspeed`: `thinking: { type: "enabled", keep: "all" }`
 *   or `thinking: { type: "enabled", effort: "low"|"high"|"max", keep: "all" }` when the backend supports effort.
 *   In this extension, `kimi-k2.7-code*` stays always-on with preserved thinking; `kimi-for-coding-highspeed` is exposed
 *   as a boolean always-on model with no effort picker.
 * - `kimi-k2.6`: `thinking: { type: "enabled", effort: "low"|"high"|"max" }` — NO `keep` field
 *   (K2.6 default keep is null = not preserved).
 *   "off" → `thinking: { type: "disabled" }`.
 */
function resolveThinkingFields(
	spec: ThinkingEffortSpec | undefined,
	modelId: string,
	options: ProvideChatResponseOptions,
): Pick<KimiChatRequest, 'thinking' | 'reasoning_effort'> {
	if (modelId === 'kimi-for-coding-highspeed') {
		return { thinking: { type: 'enabled', keep: 'all' } };
	}
	if (!spec) {
		return {};
	}
	const picked = resolveEffort(options, spec);
	// K3-family models and Kimi Code's K2.8 Preview expose effort via top-level reasoning_effort.
	if (
		modelId === 'kimi-k3' ||
		modelId === 'k3' ||
		modelId === 'k3-256k' ||
		modelId === 'kimi-for-coding'
	) {
		return picked === 'off' ? { thinking: { type: 'disabled' } } : { reasoning_effort: picked };
	}
	if (picked === 'off') {
		return { thinking: { type: 'disabled' } };
	}
	// Only K2.7-family / highspeed membership models force preserved thinking by default.
	// K3/K2.8 in Kimi Code and K2.6 in Open Platform must NOT send keep unless explicitly supported.
	const isAlwaysKeep =
		modelId === 'kimi-k2.7-code' ||
		modelId === 'kimi-k2.7-code-highspeed';
	const thinking: { type: 'enabled'; effort: ThinkingEffort; keep?: 'all' } = {
		type: 'enabled',
		effort: picked,
	};
	if (isAlwaysKeep) {
		thinking.keep = 'all';
	}
	return { thinking };
}

/** Resolve the thinking effort from the picker override, else the model's default. */
function resolveEffort(options: ProvideChatResponseOptions, spec: ThinkingEffortSpec): ThinkingEffort | 'off' {
	const picked = options.modelConfiguration?.reasoningEffort ?? options.configuration?.reasoningEffort;
	if (picked === 'off' && spec.canDisable) {
		return 'off';
	}
	if (picked && spec.levels.includes(picked as ThinkingEffort)) {
		return picked as ThinkingEffort;
	}
	return spec.default;
}

/** Augmented options type carrying the picker's `reasoningEffort` field set via `configurationSchema`. */
type ProvideChatResponseOptions = vscode.ProvideLanguageModelChatResponseOptions & {
	readonly modelConfiguration?: { readonly reasoningEffort?: string };
	readonly configuration?: { readonly reasoningEffort?: string };
};
