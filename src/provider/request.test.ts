import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({}));

vi.mock('../client', () => ({
	KimiClient: class {
		async streamChatCompletion() {}
	},
}));

vi.mock('../endpoint', () => ({
	resolveBaseUrl: () => 'https://api.kimi.com/coding/v1',
}));

vi.mock('../i18n', () => ({
	t: (key: string) => key,
}));

vi.mock('./convert', () => ({
	convertMessages: () => [],
	convertTools: () => [],
	countMessageChars: () => 0,
}));

vi.mock('../config', async () => {
	const { MODELS } = await vi.importActual<typeof import('../consts')>('../consts');
	return {
		findModelDefinition: (id: string) => MODELS.find((model) => model.id === id),
		getApiModelId: (id: string) => id,
		getMaxRetries: () => 3,
		getMaxTokens: () => undefined,
	};
});

import { prepareChatRequest } from './request';

function modelInfo(id: string) {
	return {
		id,
		name: id,
		family: 'kimi',
		version: 'test',
		detail: 'test',
		maxInputTokens: 0,
		maxOutputTokens: 0,
		capabilities: { toolCalling: false, imageInput: false },
	} as never;
}

function options(reasoningEffort?: string) {
	return {
		modelConfiguration: reasoningEffort ? { reasoningEffort } : undefined,
		tools: [],
	} as never;
}

const authManager = {
	getApiKey: vi.fn(async () => 'sk-test'),
	getApiKeyForMode: vi.fn(async () => 'sk-test'),
	hasApiKey: vi.fn(),
	promptForApiKey: vi.fn(),
	loginOAuth: vi.fn(),
	deleteApiKey: vi.fn(),
};

describe('prepareChatRequest thinking routing', () => {
	it('defaults Kimi Code k3.1-pro to reasoning_effort high', async () => {
		const prepared = await prepareChatRequest({
			authManager,
			extensionVersion: '1.0.7',
			modelInfo: modelInfo('k3.1-pro'),
			messages: [],
			options: options(),
			token: {} as never,
		});

		expect(prepared.request.reasoning_effort).toBe('high');
		expect(prepared.request.thinking).toBeUndefined();
	});

	it('falls back to high instead of disabling thinking on k3.1-pro (thinking-only model)', async () => {
		const prepared = await prepareChatRequest({
			authManager,
			extensionVersion: '1.0.7',
			modelInfo: modelInfo('k3.1-pro'),
			messages: [],
			options: options('off'),
			token: {} as never,
		});

		// K3.1 Pro rejects disabled thinking with HTTP 400, so "off" must never reach the wire.
		expect(prepared.request.reasoning_effort).toBe('high');
		expect(prepared.request.thinking).toBeUndefined();
	});

	it('uses reasoning_effort max for kimi-k3.1-pro-highspeed when picked', async () => {
		const prepared = await prepareChatRequest({
			authManager,
			extensionVersion: '1.0.7',
			modelInfo: modelInfo('kimi-k3.1-pro-highspeed'),
			messages: [],
			options: options('max'),
			token: {} as never,
		});

		expect(prepared.request.reasoning_effort).toBe('max');
		expect(prepared.request.thinking).toBeUndefined();
	});

	it('uses reasoning_effort for Kimi Code k3', async () => {
		const prepared = await prepareChatRequest({
			authManager,
			extensionVersion: '1.0.4',
			modelInfo: modelInfo('k3'),
			messages: [],
			options: options('low'),
			token: {} as never,
		});

		expect(prepared.request.reasoning_effort).toBe('low');
		expect(prepared.request.thinking).toBeUndefined();
	});

	it('routes Kimi Code k3 off mode to thinking disabled', async () => {
		const prepared = await prepareChatRequest({
			authManager,
			extensionVersion: '1.0.4',
			modelInfo: modelInfo('k3'),
			messages: [],
			options: options('off'),
			token: {} as never,
		});

		expect(prepared.request.reasoning_effort).toBeUndefined();
		expect(prepared.request.thinking).toEqual({ type: 'disabled' });
	});

	it('defaults kimi-for-coding to max reasoning_effort', async () => {
		const prepared = await prepareChatRequest({
			authManager,
			extensionVersion: '1.0.4',
			modelInfo: modelInfo('kimi-for-coding'),
			messages: [],
			options: options(),
			token: {} as never,
		});

		expect(prepared.request.reasoning_effort).toBe('max');
		expect(prepared.request.thinking).toBeUndefined();
	});

	it('keeps kimi-for-coding-highspeed always-on without an effort picker', async () => {
		const prepared = await prepareChatRequest({
			authManager,
			extensionVersion: '1.0.4',
			modelInfo: modelInfo('kimi-for-coding-highspeed'),
			messages: [],
			options: options('max'),
			token: {} as never,
		});

		expect(prepared.request.reasoning_effort).toBeUndefined();
		expect(prepared.request.thinking).toEqual({ type: 'enabled', keep: 'all' });
	});

	it('does not send keep for kimi-k2.6', async () => {
		const prepared = await prepareChatRequest({
			authManager,
			extensionVersion: '1.0.4',
			modelInfo: modelInfo('kimi-k2.6'),
			messages: [],
			options: options('high'),
			token: {} as never,
		});

		expect(prepared.request.thinking).toEqual({ type: 'enabled', effort: 'high' });
	});
});