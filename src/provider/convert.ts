import * as vscode from 'vscode';
import { LANGUAGE_MODEL_CHAT_SYSTEM_ROLE } from '../consts';
import { t } from '../i18n';
import { safeStringify } from '../json';
import type { KimiMessage, KimiTool, KimiToolCall } from '../types';

/**
 * A `LanguageModelThinkingPart`-shaped value. The thinking part is a proposed
 * VS Code API, so it is feature-detected and read through this narrow shape
 * instead of importing the type directly.
 */
interface ThinkingPartLike {
	value: string | string[];
}

interface PendingToolResult {
	callId: string;
	content: string;
}

/** Kimi function names must match [a-zA-Z0-9_-] and be at most 128 chars. */
const TOOL_NAME_MAX_LENGTH = 128;
const TOOL_NAME_FALLBACK = 'tool';

/** Rewrite a VS Code tool name into a Kimi-safe wire name (deterministic). */
export function sanitizeToolName(name: string): string {
	const cleaned = name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, TOOL_NAME_MAX_LENGTH);
	return cleaned || TOOL_NAME_FALLBACK;
}

/** Converted tool set plus the bidirectional name maps for history replay and call-back. */
export interface ConvertedTools {
	tools: KimiTool[];
	/** wire (sanitized) name → original VS Code tool name, used when reporting tool calls back. */
	nameMap: Map<string, string>;
	/** original VS Code tool name → wire name, used when replaying history tool calls. */
	wireNames: Map<string, string>;
}

/** Convert VS Code chat messages to Kimi (OpenAI-compatible) wire messages. */
export function convertMessages(
	messages: readonly vscode.LanguageModelChatRequestMessage[],
	isThinkingModel: boolean,
	wireNameOf?: (name: string) => string,
): KimiMessage[] {
	const result: KimiMessage[] = [];
	for (const message of messages) {
		const role = mapRole(message.role);
		let content = '';
		let thinkingContent = '';
		const toolCalls: KimiToolCall[] = [];
		const toolResults: PendingToolResult[] = [];
		for (const part of message.content) {
			if (part instanceof vscode.LanguageModelTextPart) {
				content += part.value;
			} else if (isThinkingPart(part)) {
				thinkingContent += normalizeThinkingText(part.value);
			} else if (part instanceof vscode.LanguageModelToolCallPart) {
				toolCalls.push({
					id: part.callId,
					type: 'function',
					function: {
						/** History tool calls are replayed under the same wire name the model saw. */
						name: wireNameOf ? wireNameOf(part.name) : part.name,
						arguments: safeStringify(part.input),
					},
				});
			} else if (part instanceof vscode.LanguageModelToolResultPart) {
				let toolContent = '';
				let imageCount = 0;
				for (const item of part.content) {
					if (item instanceof vscode.LanguageModelTextPart) {
						toolContent += item.value;
					} else if (
						item instanceof vscode.LanguageModelDataPart &&
						item.mimeType.startsWith('image/')
					) {
						imageCount++;
					}
				}
				/** Kimi tool results are text-only; note dropped images (e.g. subagent screenshots). */
				if (imageCount > 0) {
					const note = t('request.imageToolResultOmitted', String(imageCount));
					toolContent = toolContent ? `${toolContent}\n${note}` : note;
				}
				toolResults.push({
					callId: part.callId,
					content: toolContent || safeStringify(part.content),
				});
			}
		}
		if (role === 'assistant') {
			if (content || toolCalls.length > 0) {
				const msg: KimiMessage = {
					role: 'assistant',
					content: content || '',
				};
				if (toolCalls.length > 0) {
					msg.tool_calls = toolCalls;
				}
				// Preserve historical reasoning_content for thinking models. Kimi's
				// Preserved Thinking (kimi-k2.7-code, kimi-k2.6 with keep:"all") requires
				// the prior reasoning to be sent back across turns.
				if (isThinkingModel && thinkingContent) {
					msg.reasoning_content = thinkingContent;
				}
				result.push(msg);
			}
		} else if (content) {
			result.push({
				role,
				content,
			});
		}
		for (const toolResult of toolResults) {
			result.push({
				role: 'tool',
				content: toolResult.content,
				tool_call_id: toolResult.callId,
			});
		}
	}
	return result;
}

/** Map a VS Code message role to a Kimi role. Kimi is OpenAI-compatible, so
 * the system role maps to `'system'`. */
export function mapRole(role: vscode.LanguageModelChatMessageRole): 'system' | 'user' | 'assistant' {
	const value = role as number;
	if (value === vscode.LanguageModelChatMessageRole.Assistant) {
		return 'assistant';
	}
	if (value === LANGUAGE_MODEL_CHAT_SYSTEM_ROLE) {
		return 'system';
	}
	return 'user';
}

/** Convert VS Code tool definitions to Kimi tool definitions with name sanitization. */
export function convertTools(tools: readonly vscode.LanguageModelChatTool[]): ConvertedTools {
	const result: KimiTool[] = [];
	const nameMap = new Map<string, string>();
	const wireNames = new Map<string, string>();
	const used = new Set<string>();
	for (const tool of tools) {
		let wire = sanitizeToolName(tool.name);
		if (used.has(wire)) {
			let n = 2;
			let candidate = wire;
			while (used.has(candidate)) {
				const suffix = `_${n}`;
				candidate = `${wire.slice(0, TOOL_NAME_MAX_LENGTH - suffix.length)}${suffix}`;
				n++;
			}
			wire = candidate;
		}
		used.add(wire);
		nameMap.set(wire, tool.name);
		wireNames.set(tool.name, wire);
		result.push({
			type: 'function',
			function: {
				name: wire,
				description: tool.description,
				parameters: tool.inputSchema,
			},
		});
	}
	return { tools: result, nameMap, wireNames };
}

/** Sum content, reasoning, and tool-call chars to calibrate chars-per-token. */
export function countMessageChars(messages: KimiMessage[]): number {
	let total = 0;
	for (const message of messages) {
		total += message.content?.length ?? 0;
		total += message.reasoning_content?.length ?? 0;
		if (message.tool_calls) {
			for (const toolCall of message.tool_calls) {
				total += toolCall.function?.name?.length ?? 0;
				total += toolCall.function?.arguments?.length ?? 0;
			}
		}
	}
	return total;
}

function isThinkingPart(part: unknown): part is ThinkingPartLike {
	const ctor = (vscode as { LanguageModelThinkingPart?: unknown }).LanguageModelThinkingPart;
	return typeof ctor === 'function' && part instanceof (ctor as new (...args: never[]) => object);
}

function normalizeThinkingText(value: string | string[]): string {
	return Array.isArray(value) ? value.join('') : value;
}
