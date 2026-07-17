import { describe, it, expect, vi } from 'vitest';
import type { IKimiClient, StreamCallbacks } from '../types';

const vscodeMock = vi.hoisted(() => {
	const state: {
		textParts: string[];
		thinkingParts: string[];
		dataParts: Array<{ data: Uint8Array; mimeType: string }>;
		LanguageModelThinkingPart?: new (value: string) => unknown;
	} = {
		textParts: [],
		thinkingParts: [],
		dataParts: [],
		LanguageModelThinkingPart: undefined,
	};
	state.LanguageModelThinkingPart = class {
		constructor(public value: string) {
			state.thinkingParts.push(value);
		}
	};
	return state;
});

const { textParts, thinkingParts, dataParts } = vscodeMock;

vi.mock('vscode', () => ({
	LanguageModelTextPart: class {
		constructor(public value: string) {
			vscodeMock.textParts.push(value);
		}
	},
	get LanguageModelThinkingPart() {
		return vscodeMock.LanguageModelThinkingPart;
	},
	LanguageModelDataPart: class {
		constructor(public data: Uint8Array, public mimeType: string) {
			vscodeMock.dataParts.push({ data, mimeType });
		}
	},
	LanguageModelToolCallPart: class {
		constructor(
			public id: string,
			public name: string,
			public args: object,
		) {}
	},
}));

vi.mock('../i18n', () => ({
	t: (key: string, ...args: string[]) => {
		const strings: Record<string, string> = {
			'request.retry.rateLimited': `Kimi is rate limited. Retrying in ${args[0]}s (${args[1]}/${args[2]}).`,
			'request.retry.busy': `Kimi is busy. Retrying in ${args[0]}s (${args[1]}/${args[2]}).`,
		};
		return strings[key] ?? key;
	},
}));

vi.mock('../client', () => ({
	createUserFacingError: (error: unknown) => error,
}));

vi.mock('../logger', () => ({
	logger: { warn: vi.fn() },
}));

import { streamChatCompletion } from './stream';

const token = { isCancellationRequested: false, onCancellationRequested: vi.fn() };

function clientWith(callback: (callbacks: StreamCallbacks) => void): IKimiClient {
	return {
		streamChatCompletion: vi.fn(async (_request, callbacks) => {
			callback(callbacks);
		}),
	};
}

function args(client: IKimiClient): Parameters<typeof streamChatCompletion>[0] {
	return {
		prepared: {
			client,
			request: { model: 'kimi', messages: [], stream: true },
			totalRequestChars: 0,
			isThinkingModel: true,
		},
		progress: { report: vi.fn() },
		token: token as never,
		getCharsPerToken: () => 4,
		setCharsPerToken: vi.fn(),
	};
}

describe('streamChatCompletion retry backoff progress', () => {
	it('reports rate-limit retry as a thinking part', async () => {
		textParts.length = 0;
		thinkingParts.length = 0;
		dataParts.length = 0;
		const client = clientWith((callbacks) => {
			callbacks.onRetryBackoff?.({ status: 429, nextAttempt: 2, maxAttempts: 4, delayMs: 1500 });
		});
		await streamChatCompletion(args(client));
		expect(thinkingParts).toEqual(['Kimi is rate limited. Retrying in 2s (2/4).']);
	});

	it('reports busy retry as a thinking part', async () => {
		textParts.length = 0;
		thinkingParts.length = 0;
		const client = clientWith((callbacks) => {
			callbacks.onRetryBackoff?.({ status: 503, nextAttempt: 3, maxAttempts: 4, delayMs: 1500 });
		});
		await streamChatCompletion(args(client));
		expect(thinkingParts).toEqual(['Kimi is busy. Retrying in 2s (3/4).']);
	});
});

describe('streamChatCompletion usage reporting', () => {
	it('maps Kimi flat cached_tokens into prompt_tokens_details', async () => {
		textParts.length = 0;
		dataParts.length = 0;
		const client = clientWith((callbacks) => {
			callbacks.onUsage?.({ prompt_tokens: 19, completion_tokens: 13, total_tokens: 32, cached_tokens: 12 });
		});
		await streamChatCompletion(args(client));
		expect(dataParts).toHaveLength(1);
		expect(dataParts[0].mimeType).toBe('usage');
		const decoded = JSON.parse(new TextDecoder().decode(dataParts[0].data));
		expect(decoded).toMatchObject({
			prompt_tokens: 19,
			completion_tokens: 13,
			total_tokens: 32,
			prompt_tokens_details: { cached_tokens: 12 },
		});
	});

	it('defaults cached_tokens to 0 when absent', async () => {
		dataParts.length = 0;
		const client = clientWith((callbacks) => {
			callbacks.onUsage?.({ prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 });
		});
		await streamChatCompletion(args(client));
		const decoded = JSON.parse(new TextDecoder().decode(dataParts[0].data));
		expect(decoded.prompt_tokens_details.cached_tokens).toBe(0);
	});
});
