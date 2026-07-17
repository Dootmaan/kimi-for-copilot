import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { IAuthManager } from '../types';
import type { IUsageClient } from '../client/usage';
import type { UsageSnapshot } from '../types';

// VS Code API is not available in unit tests; stub only the surface UsageStatusBar touches.
const statusBar = { text: '', tooltip: '', command: '', name: 'kimi', backgroundColor: undefined as unknown, color: undefined as unknown, show: vi.fn(), hide: vi.fn(), dispose: vi.fn() };
const subscriptions: { dispose(): void }[] = [];

vi.mock('vscode', () => ({
	StatusBarAlignment: { Right: 2 },
	ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 },
	ThemeColor: class { constructor(public id: string) {} },
	EventEmitter: class<T> {
		private listeners: ((e: T) => void)[] = [];
		get event() {
			return (listener: (e: T) => void) => {
				this.listeners.push(listener);
				return { dispose: () => {
					this.listeners = this.listeners.filter((l) => l !== listener);
				} };
			};
		}
		fire(data: T): void {
			for (const listener of this.listeners) {
				listener(data);
			}
		}
		dispose(): void {
			this.listeners = [];
		}
	},
	window: {
		createStatusBarItem: vi.fn(() => statusBar),
		createOutputChannel: vi.fn(() => ({ appendLine: vi.fn(), dispose: vi.fn() })),
		activeColorTheme: { kind: 1 },
	},
	workspace: {
		onDidChangeConfiguration: vi.fn(() => ({ dispose: () => undefined })),
		getConfiguration: vi.fn(() => ({ get: () => undefined })),
	},
	commands: { registerCommand: vi.fn(() => ({ dispose: () => undefined })) },
	env: { language: 'en' },
}));

// config getters must be mocked HOISTED (before usage-bar.ts is imported) so setConfig mutations
// are visible to the module under test.
const cfg = vi.hoisted(() => ({
	region: 'international' as 'international' | 'china',
	baseUrl: '',
	show: true,
	interval: 5,
}));
vi.mock('../config', () => ({
	getRegion: () => cfg.region,
	getBaseUrlOverride: () => cfg.baseUrl,
	getShowUsageStatusBar: () => cfg.show,
	getUsageRefreshIntervalMinutes: () => cfg.interval,
}));

import { UsageStatusBar } from './usage-bar';

function setConfig(region: 'international' | 'china' = 'international', baseUrl = '', show = true): void {
	cfg.region = region;
	cfg.baseUrl = baseUrl;
	cfg.show = show;
}

function makeAuth(hasKey: boolean): IAuthManager {
	return {
		getApiKey: vi.fn(async () => (hasKey ? 'sk-test-key' : undefined)),
		hasApiKey: vi.fn(async () => hasKey),
		promptForApiKey: vi.fn(),
		deleteApiKey: vi.fn(),
	};
}

function okSnapshot(): UsageSnapshot {
	return {
		status: 'ok',
		fetchedAt: Date.now(),
		balance: { availableBalance: 42.5, voucherBalance: 12, cashBalance: 30.5 },
	};
}

function client(): IUsageClient {
	return { fetchBalance: vi.fn(async () => okSnapshot()) };
}

describe('UsageStatusBar gate + balance rendering', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		subscriptions.length = 0;
		vi.useRealTimers();
		setConfig('international');
		statusBar.text = '';
		statusBar.backgroundColor = undefined;
	});

	it('fetches balance and shows when gate passes (international → $)', async () => {
		setConfig('international');
		const c = client();
		const bar = new UsageStatusBar(
			{ subscriptions, secrets: { onDidChange: vi.fn(() => ({ dispose: () => undefined })) } } as unknown as Parameters<typeof UsageStatusBar>[0],
			makeAuth(true),
			c,
		);
		await bar.refresh();
		expect(c.fetchBalance).toHaveBeenCalledTimes(1);
		expect(statusBar.show).toHaveBeenCalled();
		expect(statusBar.text).toContain('$42.5');
		expect(statusBar.text).not.toContain('¥');
		bar.dispose();
	});

	it('uses ¥ currency in the china region', async () => {
		setConfig('china');
		const c = client();
		const bar = new UsageStatusBar(
			{ subscriptions, secrets: { onDidChange: vi.fn(() => ({ dispose: () => undefined })) } } as unknown as Parameters<typeof UsageStatusBar>[0],
			makeAuth(true),
			c,
		);
		await bar.refresh();
		expect(statusBar.text).toContain('¥42.5');
		bar.dispose();
	});

	it('hides and does not fetch when baseUrl is overridden', async () => {
		setConfig('international', 'https://proxy.example');
		const c = client();
		const bar = new UsageStatusBar(
			{ subscriptions, secrets: { onDidChange: vi.fn(() => ({ dispose: () => undefined })) } } as unknown as Parameters<typeof UsageStatusBar>[0],
			makeAuth(true),
			c,
		);
		await bar.refresh();
		expect(c.fetchBalance).not.toHaveBeenCalled();
		bar.dispose();
	});

	it('hides and does not fetch when there is no API key', async () => {
		setConfig('international');
		const c = client();
		const bar = new UsageStatusBar(
			{ subscriptions, secrets: { onDidChange: vi.fn(() => ({ dispose: () => undefined })) } } as unknown as Parameters<typeof UsageStatusBar>[0],
			makeAuth(false),
			c,
		);
		await bar.refresh();
		expect(c.fetchBalance).not.toHaveBeenCalled();
		bar.dispose();
	});

	it('sets error background when available balance is 0', async () => {
		setConfig('international');
		const c: IUsageClient = {
			fetchBalance: vi.fn(async () => ({
				status: 'ok',
				fetchedAt: Date.now(),
				balance: { availableBalance: 0, voucherBalance: 0, cashBalance: 0 },
			})),
		};
		const bar = new UsageStatusBar(
			{ subscriptions, secrets: { onDidChange: vi.fn(() => ({ dispose: () => undefined })) } } as unknown as Parameters<typeof UsageStatusBar>[0],
			makeAuth(true),
			c,
		);
		await bar.refresh();
		expect(statusBar.backgroundColor).toBeDefined();
		bar.dispose();
	});

	it('keeps normal background when balance is positive', async () => {
		setConfig('international');
		const c = client();
		const bar = new UsageStatusBar(
			{ subscriptions, secrets: { onDidChange: vi.fn(() => ({ dispose: () => undefined })) } } as unknown as Parameters<typeof UsageStatusBar>[0],
			makeAuth(true),
			c,
		);
		await bar.refresh();
		expect(statusBar.backgroundColor).toBeUndefined();
		bar.dispose();
	});
});

describe('UsageStatusBar debounce', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		subscriptions.length = 0;
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-17T00:00:00Z'));
		setConfig('international');
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('second refresh within 30s does not fetch again', async () => {
		const c = client();
		const bar = new UsageStatusBar(
			{ subscriptions, secrets: { onDidChange: vi.fn(() => ({ dispose: () => undefined })) } } as unknown as Parameters<typeof UsageStatusBar>[0],
			makeAuth(true),
			c,
		);
		await bar.refresh();
		await bar.refresh();
		expect(c.fetchBalance).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(31_000);
		await bar.refresh();
		expect(c.fetchBalance).toHaveBeenCalledTimes(2);
		bar.dispose();
	});
});

describe('UsageStatusBar cache-stale rendering', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		subscriptions.length = 0;
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-17T00:00:00Z'));
		setConfig('international');
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows cached balance on network error when cache < 1h old', async () => {
		const ok = okSnapshot();
		const networkError: UsageSnapshot = { status: 'network-error', fetchedAt: Date.now() };
		const c: IUsageClient = {
			fetchBalance: vi.fn(async () => ok).mockResolvedValueOnce(ok).mockResolvedValueOnce(networkError),
		};
		const bar = new UsageStatusBar(
			{ subscriptions, secrets: { onDidChange: vi.fn(() => ({ dispose: () => undefined })) } } as unknown as Parameters<typeof UsageStatusBar>[0],
			makeAuth(true),
			c,
		);
		await bar.refresh();
		vi.advanceTimersByTime(31_000);
		await bar.refresh();
		expect(statusBar.text).toContain('42.5');
		bar.dispose();
	});
});

describe('UsageStatusBar snapshot emitter', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		subscriptions.length = 0;
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-17T00:00:00Z'));
		setConfig('international');
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('fires a message on ok render and getSnapshot returns it', async () => {
		const c = client();
		const bar = new UsageStatusBar(
			{ subscriptions, secrets: { onDidChange: vi.fn(() => ({ dispose: () => undefined })) } } as unknown as Parameters<typeof UsageStatusBar>[0],
			makeAuth(true),
			c,
		);
		const seen: unknown[] = [];
		const sub = bar.onDidChangeSnapshot((m) => seen.push(m));
		await bar.refresh();
		expect(seen.length).toBeGreaterThan(0);
		expect((seen[seen.length - 1] as { status: string }).status).toBe('ok');
		expect(bar.getSnapshot()?.status).toBe('ok');
		sub.dispose();
		bar.dispose();
	});

	it('fires null when gate fails', async () => {
		setConfig('international', 'https://proxy.example');
		const c = client();
		const bar = new UsageStatusBar(
			{ subscriptions, secrets: { onDidChange: vi.fn(() => ({ dispose: () => undefined })) } } as unknown as Parameters<typeof UsageStatusBar>[0],
			makeAuth(true),
			c,
		);
		const seen: unknown[] = [];
		const sub = bar.onDidChangeSnapshot((m) => seen.push(m));
		await bar.refresh();
		expect(seen).toContain(null);
		sub.dispose();
		bar.dispose();
	});

	it('fires effective message with offline true on cache-fallback network error', async () => {
		setConfig('international');
		const ok = okSnapshot();
		const networkError: UsageSnapshot = { status: 'network-error', fetchedAt: Date.now() };
		const c: IUsageClient = {
			fetchBalance: vi.fn().mockResolvedValueOnce(ok).mockResolvedValueOnce(networkError),
		};
		const bar = new UsageStatusBar(
			{ subscriptions, secrets: { onDidChange: vi.fn(() => ({ dispose: () => undefined })) } } as unknown as Parameters<typeof UsageStatusBar>[0],
			makeAuth(true),
			c,
		);
		const seen: ({ offline: boolean; status: string } | null)[] = [];
		const sub = bar.onDidChangeSnapshot((m) => seen.push(m as typeof seen[number]));
		await bar.refresh();
		seen.length = 0;
		vi.advanceTimersByTime(31_000);
		await bar.refresh();
		const last = seen[seen.length - 1];
		expect(last?.status).toBe('ok');
		expect(last?.offline).toBe(true);
		sub.dispose();
		bar.dispose();
	});
});
