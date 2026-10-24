import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
	apiMode: 'membership',
	baseUrl: '',
	customModels: [] as Array<string | { id: string; name?: string }>,
	modelIdOverrides: {} as Record<string, string>,
	maxTokens: 0,
	thinking: 'enabled',
	debugLogging: false,
	usageRefreshIntervalMinutes: 5,
	showUsageStatusBar: true,
	maxRetries: 3,
	apiKey: '',
	region: 'international',
}));

vi.mock('vscode', () => ({
	env: { language: 'en' },
	workspace: {
		getConfiguration: () => ({
			get: <T>(key: string, defaultValue?: T): T => {
				return (state as Record<string, unknown>)[key] as T ?? (defaultValue as T);
			},
		}),
	},
}));

import { listProviderModels } from './config';

describe('listProviderModels', () => {
	beforeEach(() => {
		state.apiMode = 'membership';
		state.baseUrl = '';
		state.customModels = [];
	});

	it('shows the latest Kimi Code lineup in membership mode', () => {
		expect(listProviderModels().map((model) => model.id)).toEqual([
			'k3.1-pro',
			'k3.1-pro-highspeed',
			'k3',
			'k3-256k',
			'kimi-for-coding',
			'kimi-for-coding-highspeed',
		]);
	});

	it('shows the latest Standard API lineup without retired kimi-k2.5', () => {
		state.apiMode = 'standard';

		expect(listProviderModels().map((model) => model.id)).toEqual([
			'kimi-k3.1-pro',
			'kimi-k3.1-pro-highspeed',
			'kimi-k3',
			'kimi-k2.7-code',
			'kimi-k2.7-code-highspeed',
			'kimi-k2.6',
		]);
	});

	it('shows all built-in models when a custom base URL disables mode filtering', () => {
		state.baseUrl = 'https://proxy.example/v1';

		expect(listProviderModels().map((model) => model.id)).toEqual([
			'k3.1-pro',
			'k3.1-pro-highspeed',
			'k3',
			'k3-256k',
			'kimi-for-coding',
			'kimi-for-coding-highspeed',
			'kimi-k3.1-pro',
			'kimi-k3.1-pro-highspeed',
			'kimi-k3',
			'kimi-k2.7-code',
			'kimi-k2.7-code-highspeed',
			'kimi-k2.6',
		]);
	});
});