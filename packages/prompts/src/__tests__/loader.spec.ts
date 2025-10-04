import { describe, expect, it } from 'vitest';
import { capturePromptUsage, getPrompt, registerPrompt, renderPrompt } from '../index.js';

describe('Prompt loader', () => {
	it('registers, fetches latest, renders and captures usage', () => {
		registerPrompt({
			id: 'sys.base',
			name: 'Base',
			version: '1',
			role: 'system',
			template: 'Hello {{user}}',
			variables: ['user'],
			riskLevel: 'L2',
			owners: ['owner@example.com'],
		} as any);
		const p = getPrompt('sys.base');
		expect(p).toBeTruthy();
		const msg = renderPrompt(p!, { user: 'Jamie' });
		expect(msg).toContain('Jamie');
		const cap = capturePromptUsage(p!);
		expect(cap.id).toBe('sys.base');
		expect(cap.sha256).toHaveLength(64);
	});
});
