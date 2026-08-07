import { describe, it, expect, vi } from 'vitest';

// Stub vscode so models.ts (→ i18n → vscode.env) resolves under vitest.
vi.mock('vscode', () => ({ env: { language: 'en' } }));

import { toChatInfo } from './models';
import type { KimiModel, ThinkingEffortSpec } from '../types';

const EFFORT_ALWAYS_ON: ThinkingEffortSpec = {
	levels: ['low', 'high', 'max'],
	default: 'high',
	canDisable: false,
};

const EFFORT_TOGGLEABLE: ThinkingEffortSpec = {
	levels: ['low', 'high', 'max'],
	default: 'high',
	canDisable: true,
};

function model(spec: ThinkingEffortSpec | undefined, thinking = true): KimiModel {
	return {
		id: 'test-model',
		name: 'Test',
		family: 'kimi',
		version: '1',
		detail: 'test',
		maxInputTokens: 1000,
		maxOutputTokens: 1000,
		capabilities: { toolCalling: true, imageInput: false, thinking, thinkingStyle: 'effort', thinkingEffort: spec },
		availableIn: ['standard', 'membership'],
	};
}

describe('toChatInfo configurationSchema', () => {
	it('offers off + low + high + max for toggleable models', () => {
		const info = toChatInfo(model(EFFORT_TOGGLEABLE), true) as { configurationSchema?: { properties: { reasoningEffort: { enum: string[] } } } };
		expect(info.configurationSchema?.properties?.reasoningEffort?.enum).toEqual(['off', 'low', 'high', 'max']);
	});

	it('offers off + low + high + max for always-on models (off is shown but marked unavailable)', () => {
		const info = toChatInfo(model(EFFORT_ALWAYS_ON), true) as { configurationSchema?: { properties: { reasoningEffort: { enum: string[]; enumDescriptions: string[] } } } };
		expect(info.configurationSchema?.properties?.reasoningEffort?.enum).toEqual(['off', 'low', 'high', 'max']);
		// The "off" description must explain why it's unavailable.
		const disabledDesc = info.configurationSchema?.properties?.reasoningEffort?.enumDescriptions?.[0];
		expect(disabledDesc).toContain('Not available');
	});

	it('uses the normal "disable" description for toggleable models', () => {
		const info = toChatInfo(model(EFFORT_TOGGLEABLE), true) as { configurationSchema?: { properties: { reasoningEffort: { enumDescriptions: string[] } } } };
		const disabledDesc = info.configurationSchema?.properties?.reasoningEffort?.enumDescriptions?.[0];
		expect(disabledDesc).toContain('Disable');
		expect(disabledDesc).not.toContain('Not available');
	});

	it('omits the picker for non-thinking models', () => {
		const info = toChatInfo(model(undefined, false), true) as { configurationSchema?: unknown };
		expect(info.configurationSchema).toBeUndefined();
	});
});
