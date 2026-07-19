import { describe, it, expect, vi } from 'vitest';

// Stub vscode so models.ts (→ i18n → vscode.env) resolves under vitest.
vi.mock('vscode', () => ({ env: { language: 'en' } }));

import { canDisableThinking, thinkingDefault, toChatInfo } from './models';
import type { KimiModel } from '../types';

function model(style: KimiModel['capabilities']['thinkingStyle'], thinking = true): KimiModel {
	return {
		id: 'test-model',
		name: 'Test',
		family: 'kimi',
		version: '1',
		detail: 'test',
		maxInputTokens: 1000,
		maxOutputTokens: 1000,
		capabilities: { toolCalling: true, imageInput: false, thinking, thinkingStyle: style },
		availableIn: ['standard', 'membership'],
	};
}

describe('canDisableThinking', () => {
	it('returns true for toggleable models', () => {
		expect(canDisableThinking('toggle')).toBe(true);
	});

	it('returns false for always-on models (k3)', () => {
		expect(canDisableThinking('k3')).toBe(false);
	});

	it('returns false for always-on models (code)', () => {
		expect(canDisableThinking('code')).toBe(false);
	});

	it('returns true for custom models (undefined style)', () => {
		expect(canDisableThinking(undefined)).toBe(true);
	});
});

describe('thinkingDefault', () => {
	it('defaults to enabled for all thinking styles', () => {
		expect(thinkingDefault('toggle')).toBe('enabled');
		expect(thinkingDefault('k3')).toBe('enabled');
		expect(thinkingDefault('code')).toBe('enabled');
		expect(thinkingDefault(undefined)).toBe('enabled');
	});
});

describe('toChatInfo configurationSchema', () => {
	it('always offers both enabled + disabled in the enum (even for always-on models)', () => {
		const info = toChatInfo(model('toggle'), true) as { configurationSchema?: { properties: { thinking: { enum: string[] } } } };
		expect(info.configurationSchema?.properties?.thinking?.enum).toEqual(['enabled', 'disabled']);
	});

	it('still shows both options for always-on models (k3) so the user sees Off exists', () => {
		const info = toChatInfo(model('k3'), true) as { configurationSchema?: { properties: { thinking: { enum: string[]; enumDescriptions: string[] } } } };
		expect(info.configurationSchema?.properties?.thinking?.enum).toEqual(['enabled', 'disabled']);
		// The "disabled" description must explain why it's unavailable.
		const disabledDesc = info.configurationSchema?.properties?.thinking?.enumDescriptions?.[1];
		expect(disabledDesc).toContain('Not available');
	});

	it('uses the normal "disable" description for toggleable models', () => {
		const info = toChatInfo(model('toggle'), true) as { configurationSchema?: { properties: { thinking: { enumDescriptions: string[] } } } };
		const disabledDesc = info.configurationSchema?.properties?.thinking?.enumDescriptions?.[1];
		expect(disabledDesc).toContain('Disable');
		expect(disabledDesc).not.toContain('Not available');
	});

	it('omits the toggle for non-thinking models', () => {
		const info = toChatInfo(model(undefined, false), true) as { configurationSchema?: unknown };
		expect(info.configurationSchema).toBeUndefined();
	});
});
