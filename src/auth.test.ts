import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
	mode: 'membership' as 'membership' | 'standard',
	settingsApiKey: '',
	stores: new Map<string, string>(),
	deletes: [] as string[],
	updates: [] as Array<{ key: string; value: string }>,
	quickPick: undefined as { value: 'oauth' | 'apikey' } | { value: 'membership' | 'standard' } | undefined,
	input: undefined as string | undefined,
	info: [] as string[],
	warnings: [] as string[],
}));

vi.mock('vscode', () => ({
	ProgressLocation: { Notification: 15 },
	ConfigurationTarget: { Global: 1 },
	env: { language: 'en' },
	workspace: {
		getConfiguration: () => ({
			get: <T>(key: string, defaultValue?: T): T => {
				if (key === 'apiMode') {
					return state.mode as T;
				}
				if (key === 'apiKey') {
					return (state.settingsApiKey as unknown as T) ?? (defaultValue as T);
				}
				return defaultValue as T;
			},
			update: async (key: string, value: string) => {
				state.updates.push({ key, value });
				if (key === 'apiMode') {
					state.mode = value as typeof state.mode;
				}
			},
		}),
	},
	window: {
		showInputBox: vi.fn(async () => state.input),
		showQuickPick: vi.fn(async () => state.quickPick),
		showInformationMessage: vi.fn((message: string) => {
			state.info.push(message);
			return Promise.resolve(undefined);
		}),
		showWarningMessage: vi.fn((message: string) => {
			state.warnings.push(message);
			return Promise.resolve(undefined);
		}),
		withProgress: vi.fn(async (_options, task: () => Promise<unknown>) => task()),
	},
}));

const oauthState = vi.hoisted(() => ({
	accessToken: undefined as string | undefined,
	loginResult: true,
}));

import { AuthManager } from './auth';
import { MEMBERSHIP_API_KEY_SECRET, STANDARD_API_KEY_SECRET } from './consts';

function context() {
	return {
		secrets: {
			get: vi.fn(async (key: string) => state.stores.get(key)),
			store: vi.fn(async (key: string, value: string) => {
				state.stores.set(key, value);
			}),
			delete: vi.fn(async (key: string) => {
				state.deletes.push(key);
				state.stores.delete(key);
			}),
		},
	} as never;
}

function oauthManager() {
	return {
		getAccessToken: vi.fn(async () => oauthState.accessToken),
		hasToken: vi.fn(async () => !!oauthState.accessToken),
		login: vi.fn(async () => oauthState.loginResult),
		logout: vi.fn(async () => undefined),
	} as never;
}

describe('AuthManager API key detection', () => {
	beforeEach(() => {
		state.mode = 'membership';
		state.settingsApiKey = '';
		state.stores = new Map();
		state.deletes = [];
		state.updates = [];
		state.quickPick = undefined;
		state.input = undefined;
		state.info = [];
		state.warnings = [];
		oauthState.accessToken = undefined;
		oauthState.loginResult = true;
	});

	it('auto-switches to standard and sets region when a Standard API key is entered without membership access', async () => {
		state.mode = 'membership';
		state.quickPick = { value: 'apikey' };
		state.input = 'sk-standard';
		const auth = new AuthManager(context(), {
			oauthManager: oauthManager(),
			probeApiKey: vi.fn(async () => ({
				membership: { status: 'auth-error', metrics: [], fetchedAt: 1 },
				standard: {
					international: { status: 'auth-error', metrics: [], fetchedAt: 1 },
					china: {
						status: 'ok',
						metrics: [],
						fetchedAt: 1,
						balance: { availableBalance: 5, voucherBalance: 2, cashBalance: 3 },
					},
				},
			})),
		});

		await expect(auth.promptForApiKey()).resolves.toBe(true);
		expect(state.stores.get(STANDARD_API_KEY_SECRET)).toBe('sk-standard');
		expect(state.updates).toContainEqual({ key: 'region', value: 'china' });
		expect(state.updates).toContainEqual({ key: 'apiMode', value: 'standard' });
	});

	it('keeps membership mode when adding a standard fallback while OAuth membership is active', async () => {
		state.mode = 'membership';
		state.quickPick = { value: 'apikey' };
		state.input = 'sk-standard';
		oauthState.accessToken = 'oauth-token';
		const auth = new AuthManager(context(), {
			oauthManager: oauthManager(),
			probeApiKey: vi.fn(async () => ({
				membership: { status: 'auth-error', metrics: [], fetchedAt: 1 },
				standard: {
					international: {
						status: 'ok',
						metrics: [],
						fetchedAt: 1,
						balance: { availableBalance: 5, voucherBalance: 2, cashBalance: 3 },
					},
					china: { status: 'auth-error', metrics: [], fetchedAt: 1 },
				},
			})),
		});

		await expect(auth.promptForApiKey()).resolves.toBe(true);
		expect(state.stores.get(STANDARD_API_KEY_SECRET)).toBe('sk-standard');
		expect(state.updates).toContainEqual({ key: 'region', value: 'international' });
		expect(state.updates).not.toContainEqual({ key: 'apiMode', value: 'standard' });
	});

	it('switches to membership mode when a membership key is entered from standard mode', async () => {
		state.mode = 'standard';
		state.input = 'sk-membership';
		const auth = new AuthManager(context(), {
			oauthManager: oauthManager(),
			probeApiKey: vi.fn(async () => ({
				membership: { status: 'ok', metrics: [{ kind: 'session', used: 5, limit: 100 }], fetchedAt: 1 },
				standard: {
					international: { status: 'auth-error', metrics: [], fetchedAt: 1 },
					china: { status: 'auth-error', metrics: [], fetchedAt: 1 },
				},
			})),
		});

		await expect(auth.promptForApiKey()).resolves.toBe(true);
		expect(state.stores.get(MEMBERSHIP_API_KEY_SECRET)).toBe('sk-membership');
		expect(state.updates).toContainEqual({ key: 'apiMode', value: 'membership' });
	});
});