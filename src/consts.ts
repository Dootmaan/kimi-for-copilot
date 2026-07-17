import type { KimiModel } from './types';

/**
 * Compile-time constants shared across the extension. These do not depend on
 * the VS Code runtime. For run-time settings reads see `config.ts`.
 */

/** VS Code configuration section prefix for all extension settings. */
export const CONFIG_SECTION = 'kimi-copilot';

/** Provider vendor id, must match `contributes.languageModelChatProviders`. */
export const VENDOR_ID = 'kimi';

/** SecretStorage key for the Kimi (Moonshot) API key. */
export const API_KEY_SECRET = 'kimi-copilot.apiKey';

/** Memento key tracking whether the welcome walkthrough has been shown. */
export const WELCOME_SHOWN_KEY = 'kimi-copilot.welcomeShown';

/** Walkthrough contribution id (without the publisher.extension prefix). */
export const WALKTHROUGH_ID = 'kimiGettingStarted';

/** VS Code's internal LanguageModelChatMessageRole.System (not in @types/vscode). */
export const LANGUAGE_MODEL_CHAT_SYSTEM_ROLE = 3;

/** Default maximum number of tools accepted in one request (Kimi API maxItems is 128). */
export const DEFAULT_TOOLS_LIMIT = 128;

/**
 * Chat-completions base URLs per region. The Kimi (Moonshot) API is
 * OpenAI-compatible: `POST {baseUrl}/chat/completions`.
 *
 * Keys from `platform.kimi.ai` and `platform.kimi.com` are independent; the host
 * must match where the key was created.
 */
export const ENDPOINTS = {
	international: 'https://api.moonshot.ai/v1',
	china: 'https://api.moonshot.cn/v1',
} as const;

/**
 * Host roots for the balance API. Both platforms expose `GET /v1/users/me/balance`
 * with the same JSON shape; only the host differs.
 *
 * Auth scheme: both stations use `Authorization: Bearer {apiKey}`.
 */
export const USAGE_HOSTS = {
	international: 'https://api.moonshot.ai',
	china: 'https://api.moonshot.cn',
} as const;

/** Path for the balance query (available + voucher + cash balance). Shared by both platforms. */
export const BALANCE_PATH = '/v1/users/me/balance';

/** External URLs the extension links to. */
export const EXTERNAL_URLS = {
	keysInternational: 'https://platform.kimi.ai/console/api-keys',
	keysChina: 'https://platform.kimi.com/console/api-keys',
	docs: 'https://platform.kimi.ai/docs',
	platformInternational: 'https://platform.kimi.ai',
	platformChina: 'https://platform.kimi.com',
} as const;

export const USAGE_MIN_REFRESH_MINUTES = 1;
export const USAGE_DEFAULT_REFRESH_MINUTES = 5;
export const USAGE_MAX_REFRESH_MINUTES = 1440;
export const USAGE_CACHE_STALE_MS = 60 * 60 * 1000;
export const USAGE_MANUAL_DEBOUNCE_MS = 30 * 1000;
export const USAGE_REQUEST_TIMEOUT_MS = 10_000;

/** Default automatic retries (after the initial attempt) for transient Kimi API failures (429 / 5xx). */
export const RETRY_DEFAULT_MAX_RETRIES = 3;
/** Highest value accepted from the `maxRetries` setting. */
export const RETRY_MAX_RETRIES_CEILING = 10;
/** Base delay (ms) for the first retry; doubles each attempt up to RETRY_MAX_DELAY_MS. */
export const RETRY_BASE_DELAY_MS = 1000;
/** Upper bound (ms) for a single backoff sleep, even when Retry-After is larger. */
export const RETRY_MAX_DELAY_MS = 10_000;

/** URI paths handled by this extension (onUri activation). */
export const URI_PATHS = {
	setApiKey: '/setApiKey',
	showLogs: '/showLogs',
} as const;

/** Built-in Kimi models exposed through the language model provider. */
export const MODELS: KimiModel[] = [
	{
		id: 'kimi-k3',
		name: 'Kimi K3',
		family: 'kimi',
		version: 'K3',
		detail: 'Flagship model, 1M context, always reasons',
		maxInputTokens: 1_000_000,
		maxOutputTokens: 131_072,
		capabilities: { toolCalling: DEFAULT_TOOLS_LIMIT, imageInput: true, thinking: true, thinkingStyle: 'k3' },
	},
	{
		id: 'kimi-k2.7-code',
		name: 'Kimi K2.7 Code',
		family: 'kimi',
		version: 'K2.7 Code',
		detail: 'Coding model, 256K context, always reasons',
		maxInputTokens: 262_144,
		maxOutputTokens: 131_072,
		capabilities: { toolCalling: DEFAULT_TOOLS_LIMIT, imageInput: true, thinking: true, thinkingStyle: 'code' },
	},
	{
		id: 'kimi-k2.7-code-highspeed',
		name: 'Kimi K2.7 Code HighSpeed',
		family: 'kimi',
		version: 'K2.7 Code',
		detail: 'High-speed coding model (~180 tokens/s)',
		maxInputTokens: 262_144,
		maxOutputTokens: 131_072,
		capabilities: { toolCalling: DEFAULT_TOOLS_LIMIT, imageInput: true, thinking: true, thinkingStyle: 'code' },
	},
	{
		id: 'kimi-k2.6',
		name: 'Kimi K2.6',
		family: 'kimi',
		version: 'K2.6',
		detail: 'General model, 256K context',
		maxInputTokens: 262_144,
		maxOutputTokens: 131_072,
		capabilities: { toolCalling: DEFAULT_TOOLS_LIMIT, imageInput: true, thinking: true, thinkingStyle: 'toggle' },
	},
	{
		id: 'kimi-k2.5',
		name: 'Kimi K2.5',
		family: 'kimi',
		version: 'K2.5',
		detail: 'General model, 256K context',
		maxInputTokens: 262_144,
		maxOutputTokens: 131_072,
		capabilities: { toolCalling: DEFAULT_TOOLS_LIMIT, imageInput: true, thinking: true, thinkingStyle: 'toggle' },
	},
];
