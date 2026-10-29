import type { KimiModel, ThinkingEffortSpec } from './types';

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

/** SecretStorage key for a Standard API (Open Platform) key. */
export const STANDARD_API_KEY_SECRET = 'kimi-copilot.standardApiKey';

/** SecretStorage key for a Kimi Code membership API key. */
export const MEMBERSHIP_API_KEY_SECRET = 'kimi-copilot.membershipApiKey';

/** Memento key tracking whether the welcome walkthrough has been shown. */
export const WELCOME_SHOWN_KEY = 'kimi-copilot.welcomeShown';

/** Walkthrough contribution id (without the publisher.extension prefix). */
export const WALKTHROUGH_ID = 'kimiGettingStarted';

/** VS Code's internal LanguageModelChatMessageRole.System (not in @types/vscode). */
export const LANGUAGE_MODEL_CHAT_SYSTEM_ROLE = 3;

/** Default maximum number of tools accepted in one request (Kimi API maxItems is 128). */
export const DEFAULT_TOOLS_LIMIT = 128;

/**
 * Chat-completions base URLs per API mode × region. The Kimi (Moonshot) API is
 * OpenAI-compatible: `POST {baseUrl}/chat/completions`.
 *
 * Keys from `platform.kimi.ai` and `platform.kimi.com` are independent; the host
 * must match where the key was created. The membership (Kimi Code) mode uses a
 * single global OAuth-authenticated endpoint.
 */
export const ENDPOINTS = {
	standardInternational: 'https://api.moonshot.ai/v1',
	standardChina: 'https://api.moonshot.cn/v1',
	membership: 'https://api.kimi.com/coding/v1',
} as const;

/**
 * Host roots for the usage APIs.
 * - `standard` stations expose `GET /v1/users/me/balance` (cash + voucher + cash balance).
 * - `membership` station exposes `GET /coding/v1/usages` (quota + booster wallet).
 *
 * Auth scheme: all stations use `Authorization: Bearer {token}`.
 */
export const USAGE_HOSTS = {
	standardInternational: 'https://api.moonshot.ai',
	standardChina: 'https://api.moonshot.cn',
	membership: 'https://api.kimi.com',
} as const;

/** Paths for the usage APIs. Standard mode uses the balance path; membership mode uses the usages path. */
export const USAGE_PATHS = {
	balance: '/v1/users/me/balance',
	membership: '/coding/v1/usages',
} as const;

/** Kimi Code OAuth (RFC 8628 device-code flow) configuration. */
export const OAUTH = {
	host: 'https://auth.kimi.com',
	clientId: '17e5f671-d194-4dfb-9706-5516cb48c098',
	deviceAuthorizationPath: '/api/oauth/device_authorization',
	tokenPath: '/api/oauth/token',
} as const;

/** SecretStorage key for the Kimi Code OAuth token bundle. */
export const OAUTH_TOKEN_SECRET = 'kimi-copilot.oauthToken';

/** External URLs the extension links to. */
export const EXTERNAL_URLS = {
	keysInternational: 'https://platform.kimi.ai/console/api-keys',
	keysChina: 'https://platform.kimi.com/console/api-keys',
	membershipPricing: 'https://www.kimi.com/membership/pricing',
	membershipSubscription: 'https://www.kimi.com/membership/subscription',
	codeConsole: 'https://www.kimi.com/code/console',
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

/** Effort spec for always-on models (k3, k2.7-code): low/high/max, no "off". */
const EFFORT_ALWAYS_ON: ThinkingEffortSpec = {
	levels: ['low', 'high', 'max'],
	default: 'high',
	canDisable: false,
};

/** Effort spec for membership models that support no-thinking routing plus low/high/max. */
const EFFORT_MEMBERSHIP_TOGGLEABLE: ThinkingEffortSpec = {
	levels: ['low', 'high', 'max'],
	default: 'high',
	canDisable: true,
};

/** Effort spec for toggleable Open Platform models (k2.6): off/low/high/max. */
const EFFORT_TOGGLEABLE: ThinkingEffortSpec = {
	levels: ['low', 'high', 'max'],
	default: 'high',
	canDisable: true,
};

/** Built-in Kimi models exposed through the language model provider. */
export const MODELS: KimiModel[] = [
	{
		id: 'k3.1-pro',
		name: 'K3.1 Pro',
		family: 'kimi',
		version: 'K3.1 Pro',
		detail: 'Newest flagship model, up to 1M context, thinking only',
		maxInputTokens: 1_048_576,
		maxOutputTokens: 131_072,
		capabilities: { toolCalling: DEFAULT_TOOLS_LIMIT, imageInput: true, thinking: true, thinkingStyle: 'effort', thinkingEffort: EFFORT_ALWAYS_ON },
		availableIn: ['membership'],
	},
	{
		id: 'k3.1-pro-highspeed',
		name: 'K3.1 Pro Highspeed',
		family: 'kimi',
		version: 'K3.1 Pro',
		detail: 'High-speed K3.1 Pro (~2-3x faster), up to 1M context',
		maxInputTokens: 1_048_576,
		maxOutputTokens: 131_072,
		capabilities: { toolCalling: DEFAULT_TOOLS_LIMIT, imageInput: true, thinking: true, thinkingStyle: 'effort', thinkingEffort: EFFORT_ALWAYS_ON },
		availableIn: ['membership'],
	},
	{
		id: 'k3',
		name: 'K3',
		family: 'kimi',
		version: 'K3',
		detail: 'Kimi Code flagship model, 1M context',
		maxInputTokens: 1_048_576,
		maxOutputTokens: 131_072,
		capabilities: {
			toolCalling: DEFAULT_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
			thinkingStyle: 'effort',
			thinkingEffort: EFFORT_MEMBERSHIP_TOGGLEABLE,
		},
		availableIn: ['membership'],
	},
	{
		id: 'k3-256k',
		name: 'K3 256K',
		family: 'kimi',
		version: 'K3',
		detail: 'Kimi Code flagship model, 256K context',
		maxInputTokens: 262_144,
		maxOutputTokens: 131_072,
		capabilities: {
			toolCalling: DEFAULT_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
			thinkingStyle: 'effort',
			thinkingEffort: EFFORT_MEMBERSHIP_TOGGLEABLE,
		},
		availableIn: ['membership'],
	},
	{
		id: 'kimi-for-coding',
		name: 'Kimi for Coding',
		family: 'kimi',
		version: 'K2.8 Preview',
		detail: 'K2.8 Preview in Kimi Code, 1M context',
		maxInputTokens: 1_048_576,
		maxOutputTokens: 131_072,
		capabilities: {
			toolCalling: DEFAULT_TOOLS_LIMIT,
			imageInput: true,
			thinking: true,
			thinkingStyle: 'effort',
			thinkingEffort: { levels: ['low', 'high', 'max'], default: 'max', canDisable: true },
		},
		availableIn: ['membership'],
	},
	{
		id: 'kimi-for-coding-highspeed',
		name: 'Kimi for Coding HighSpeed',
		family: 'kimi',
		version: 'K2.7 Code HighSpeed',
		detail: 'High-speed Kimi Code model, 256K context',
		maxInputTokens: 262_144,
		maxOutputTokens: 131_072,
		capabilities: { toolCalling: DEFAULT_TOOLS_LIMIT, imageInput: true, thinking: true, thinkingStyle: 'code' },
		availableIn: ['membership'],
	},
	{
		id: 'kimi-k3.1-pro',
		name: 'Kimi K3.1 Pro',
		family: 'kimi',
		version: 'K3.1 Pro',
		detail: 'Newest flagship model, 1M context, thinking only',
		maxInputTokens: 1_048_576,
		maxOutputTokens: 131_072,
		capabilities: { toolCalling: DEFAULT_TOOLS_LIMIT, imageInput: true, thinking: true, thinkingStyle: 'effort', thinkingEffort: EFFORT_ALWAYS_ON },
		availableIn: ['standard'],
	},
	{
		id: 'kimi-k3.1-pro-highspeed',
		name: 'Kimi K3.1 Pro HighSpeed',
		family: 'kimi',
		version: 'K3.1 Pro',
		detail: 'High-speed flagship (~2-3x faster), 1M context',
		maxInputTokens: 1_048_576,
		maxOutputTokens: 131_072,
		capabilities: { toolCalling: DEFAULT_TOOLS_LIMIT, imageInput: true, thinking: true, thinkingStyle: 'effort', thinkingEffort: EFFORT_ALWAYS_ON },
		availableIn: ['standard'],
	},
	{
		id: 'kimi-k3',
		name: 'Kimi K3',
		family: 'kimi',
		version: 'K3',
		detail: 'Flagship model, 1M context, always reasons',
		maxInputTokens: 1_000_000,
		maxOutputTokens: 131_072,
		/** The only Kimi model whose API accepts `tool_choice: "required"` (Copilot harness Required). */
		capabilities: { toolCalling: DEFAULT_TOOLS_LIMIT, imageInput: true, thinking: true, thinkingStyle: 'effort', thinkingEffort: EFFORT_ALWAYS_ON, requiredToolChoice: true },
		availableIn: ['standard'],
	},
	{
		id: 'kimi-k2.7-code',
		name: 'Kimi K2.7 Code',
		family: 'kimi',
		version: 'K2.7 Code',
		detail: 'Coding model, 256K context, always reasons',
		maxInputTokens: 262_144,
		maxOutputTokens: 131_072,
		capabilities: { toolCalling: DEFAULT_TOOLS_LIMIT, imageInput: true, thinking: true, thinkingStyle: 'effort', thinkingEffort: EFFORT_ALWAYS_ON },
		availableIn: ['standard'],
	},
	{
		id: 'kimi-k2.7-code-highspeed',
		name: 'Kimi K2.7 Code HighSpeed',
		family: 'kimi',
		version: 'K2.7 Code',
		detail: 'High-speed coding model (~180 tokens/s)',
		maxInputTokens: 262_144,
		maxOutputTokens: 131_072,
		capabilities: { toolCalling: DEFAULT_TOOLS_LIMIT, imageInput: true, thinking: true, thinkingStyle: 'effort', thinkingEffort: EFFORT_ALWAYS_ON },
		availableIn: ['standard'],
	},
	{
		id: 'kimi-k2.6',
		name: 'Kimi K2.6',
		family: 'kimi',
		version: 'K2.6',
		detail: 'General model, 256K context',
		maxInputTokens: 262_144,
		maxOutputTokens: 131_072,
		capabilities: { toolCalling: DEFAULT_TOOLS_LIMIT, imageInput: true, thinking: true, thinkingStyle: 'effort', thinkingEffort: EFFORT_TOGGLEABLE },
		availableIn: ['standard'],
	},
];
