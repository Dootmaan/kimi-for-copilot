import type * as vscode from 'vscode';

export type ThinkingMode = 'enabled' | 'disabled';
export type Region = 'international' | 'china';

/** API access mode: `standard` (Kimi Open Platform, static API key + balance) or `membership` (Kimi Code, OAuth + quota). */
export type ApiMode = 'standard' | 'membership';

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
	/** API modes that expose this model. The picker filters built-ins by the active mode. */
	availableIn: ApiMode[];
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

// ---- Usage tracking (membership quota + Standard API balance) ----

export type UsageMetricKind = 'session' | 'weekly' | 'web-searches';

export interface UsageMetric {
	kind: UsageMetricKind;
	/** Percentage (0-100) for session/weekly; count used for web-searches. */
	used: number;
	/** 100 for session/weekly; monthly total for web-searches. */
	limit: number;
	/** Epoch-ms when the window resets. */
	resetsAt?: number;
}

/** Cash + voucher balance returned by `GET /v1/users/me/balance` (Standard API). */
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
	/** Membership plan/tier name (membership mode only). */
	planName?: string;
	/** ISO date string when the membership renews (membership mode only). */
	renewsAt?: string;
	/** 0..2 metrics, ordered session (weekly quota %), weekly (5h window %). Membership mode only. */
	metrics: UsageMetric[];
	/** Cash + voucher balance. Standard API mode only. */
	balance?: UsageBalance;
	/** Epoch-ms of the fetch that produced this snapshot. */
	fetchedAt: number;
}

// ---- OAuth (Kimi Code membership) ----

/** A persisted OAuth token bundle from the Kimi Code device-code flow. */
export interface OAuthToken {
	accessToken: string;
	refreshToken: string;
	/** Epoch-ms when the access token expires. */
	expiresAt: number;
	scope: string;
	tokenType: string;
}

/** Result of requesting a device authorization (RFC 8628 §3.2). */
export interface DeviceAuthorization {
	userCode: string;
	deviceCode: string;
	verificationUri: string;
	verificationUriComplete?: string;
	expiresIn: number;
	interval: number;
}

/** Token manager for the membership (OAuth) API mode. Implemented by `oauth.ts`. */
export interface ITokenManager {
	getToken(): Promise<OAuthToken | undefined>;
	/** Resolve a valid (non-expired, auto-refreshing) access token, or undefined when not logged in. */
	getAccessToken(): Promise<string | undefined>;
	hasToken(): Promise<boolean>;
	login(): Promise<boolean>;
	logout(): Promise<void>;
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
