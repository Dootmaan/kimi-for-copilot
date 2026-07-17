import * as vscode from 'vscode';
import { KimiClient } from '../client';
import { findModelDefinition, getApiModelId, getMaxRetries, getMaxTokens, getThinking } from '../config';
import { DEFAULT_TOOLS_LIMIT } from '../consts';
import { resolveBaseUrl } from '../endpoint';
import { t } from '../i18n';
import type {
	IAuthManager,
	IKimiClient,
	KimiChatRequest,
	KimiTool,
	ThinkingMode,
	ThinkingStyle,
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
	const thinkingStyle: ThinkingStyle | undefined = modelDef?.capabilities.thinkingStyle;
	const toolCalling = modelDef?.capabilities.toolCalling ?? false;
	const toolLimit = typeof toolCalling === 'number' ? toolCalling : DEFAULT_TOOLS_LIMIT;
	const kimiMessages = convertMessages(messages, isThinkingModel);
	const tools: KimiTool[] | undefined = toolCalling ? convertTools(options.tools ?? []) : undefined;
	if (tools && tools.length > toolLimit) {
		throw new Error(t('request.toolsLimitExceeded', String(toolLimit), String(tools.length)));
	}
	const hasTools = !!(tools && tools.length > 0);
	const thinkingFields = resolveThinkingFields(thinkingStyle, isThinkingModel, options);
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
 * Resolve the model-specific thinking request fields:
 * - `k3`          → always `reasoning_effort: "max"` (top-level).
 * - `code`        → always `thinking: { type: "enabled", keep: "all" }`.
 * - `toggle`      → `thinking: { type: enabled|disabled }` from per-request override or setting.
 * - no style      → none if the model is non-thinking; otherwise treated as toggle.
 */
function resolveThinkingFields(
	style: ThinkingStyle | undefined,
	isThinkingModel: boolean,
	options: vscode.ProvideLanguageModelChatResponseOptions,
): Pick<KimiChatRequest, 'thinking' | 'reasoning_effort'> {
	if (style === 'k3') {
		return { reasoning_effort: 'max' };
	}
	if (style === 'code') {
		return { thinking: { type: 'enabled', keep: 'all' } };
	}
	if (style === 'toggle' || (isThinkingModel && !style)) {
		return { thinking: { type: resolveThinking(options) } };
	}
	return {};
}

/** Thinking mode from a per-request override (modelOptions), else the setting. */
function resolveThinking(options: vscode.ProvideLanguageModelChatResponseOptions): ThinkingMode {
	const modelOptions = options.modelOptions as Record<string, unknown> | undefined;
	const override = modelOptions?.['thinking'];
	if (override === 'disabled') {
		return 'disabled';
	}
	if (override === 'enabled') {
		return 'enabled';
	}
	return getThinking();
}
