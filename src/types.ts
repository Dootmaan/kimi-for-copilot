import type * as vscode from 'vscode';

export type ThinkingMode = 'enabled' | 'disabled';
export type Region = 'international' | 'china';

/**
 * How a model controls thinking:
 * - `toggle` — `kimi-k2.6` / `kimi-k2.5`: `thinking.type` is enabled/disabled by the setting.
 * - `code` — `kimi-k2.7-code` series: thinking always on, `thinking: { type: "enabled", keep: "all" }`.
 * - `k3` — `kimi-k3`: always reasons via top-level `reasoning_effort: "max"`.
 */
export type ThinkingStyle = 'toggle' | 'code' | 'k3';

export interface KimiModelCapabilities {
	/** `true` enables tool calling with the default cap; a number sets a custom cap. */
	toolCalling: number | boolean;
	imageInput: boolean;
	thinking: boolean;
	/** Present ⇒ model-specific thinking control. Absent ⇒ treated as not thinking-capable. */
	thinkingStyle?: ThinkingStyle;
}

/** A Kimi model exposed in the Copilot Chat picker. */
export interface KimiModel {
	id: string;
	name: string;
	family: string;
	version: string;
	detail: string;
	maxInputTokens: number;
	maxOutputTokens: number;
	capabilities: KimiModelCapabilities;
}

/** A user-defined model from the `customModels` setting (string id or object). */
export interface CustomModelConfig {
	id: string;
	name?: string;
	maxInputTokens?: number;
	maxOutputTokens?: number;
	toolCalling?: boolean;
	vision?: boolean;
	thinking?: boolean;
}

// ---- Balance tracking (Kimi Open Platform) ----

/** Cash + voucher balance returned by `GET /v1/users/me/balance`. */
export interface UsageBalance {
	/** Available balance (cash + voucher). ≤0 means inference is blocked. */
	availableBalance: number;
	/** Voucher (promotional) balance; cannot be negative. */
	voucherBalance: number;
	/** Cash balance; can be negative (the user owes money). */
	cashBalance: number;
}

export type UsageStatus =
	| 'ok'
	| 'no-data'
	| 'auth-error'
	| 'network-error'
	| 'server-error'
	| 'loading';

export interface UsageSnapshot {
	status: UsageStatus;
	/** Cash + voucher balance. Populated on the `ok` status. */
	balance?: UsageBalance;
	/** Epoch-ms of the fetch that produced this snapshot. */
	fetchedAt: number;
}

// ---- OpenAI-compatible wire types ----

export interface KimiToolFunction {
	name: string;
	description?: string;
	parameters?: unknown;
}

export interface KimiTool {
	type: 'function';
	function: KimiToolFunction;
}

export interface KimiToolCall {
	id: string;
	type: 'function';
	function: { name: string; arguments: string };
}

export interface KimiMessage {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string;
	tool_calls?: KimiToolCall[];
	tool_call_id?: string;
	reasoning_content?: string;
}

export interface KimiChatRequest {
	model: string;
	messages: KimiMessage[];
	stream: boolean;
	tools?: KimiTool[];
	tool_choice?: 'auto' | 'none';
	max_tokens?: number;
	thinking?: { type: ThinkingMode; keep?: 'all' };
	reasoning_effort?: 'max';
	stream_options?: { include_usage: boolean };
}

/**
 * Token usage reported by Kimi. NOTE: Kimi returns `cached_tokens` flat
 * (not nested under `prompt_tokens_details` like some OpenAI deployments).
 */
export interface KimiUsage {
	prompt_tokens?: number;
	completion_tokens?: number;
	total_tokens?: number;
	cached_tokens?: number;
}

// ---- Streaming delta shapes ----

export interface KimiDeltaToolCall {
	index: number;
	id?: string;
	type?: 'function';
	function?: { name?: string; arguments?: string };
}

export interface KimiDelta {
	content?: string;
	reasoning_content?: string;
	tool_calls?: KimiDeltaToolCall[];
}

export interface KimiChoice {
	delta?: KimiDelta;
	finish_reason?: string | null;
}

export interface KimiStreamChunk {
	choices?: KimiChoice[];
	usage?: KimiUsage;
}

// ---- Callback + collaborator contracts ----

export interface RetryBackoffInfo {
	status: number;
	nextAttempt: number;
	maxAttempts: number;
	delayMs: number;
}

export interface StreamCallbacks {
	onContent: (content: string) => void;
	onThinking: (text: string) => void;
	onToolCall: (toolCall: KimiToolCall) => void;
	onUsage?: (usage: KimiUsage) => void;
	onRetryBackoff?: (info: RetryBackoffInfo) => void;
	onDone: () => void;
	onError: (error: unknown) => void;
}

/** Streaming Kimi chat client. Implemented by `client/core.ts`. */
export interface IKimiClient {
	streamChatCompletion(
		request: KimiChatRequest,
		callbacks: StreamCallbacks,
		cancellationToken?: vscode.CancellationToken,
	): Promise<void>;
}

/** API-key manager. Implemented by `auth.ts`. */
export interface IAuthManager {
	getApiKey(): Promise<string | undefined>;
	hasApiKey(): Promise<boolean>;
	promptForApiKey(): Promise<boolean>;
	deleteApiKey(): Promise<void>;
}
