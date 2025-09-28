import { beforeEach, describe, expect, it } from 'vitest';
import {
	PlanningPhase,
	type PromptContext,
	PromptTemplateManager,
} from '../../src/lib/prompt-template-manager.js';

describe('PromptTemplateManager - context-aware adaptations', () => {
	let manager: PromptTemplateManager;

	beforeEach(() => {
		manager = new PromptTemplateManager();
	});

	it('respects planning context, capabilities, and objectives when generating prompts', () => {
		const context: PromptContext = {
			taskId: 'coordination-task',
			agentId: 'agent-coord',
			complexity: 8,
			priority: 9,
			capabilities: ['coordination', 'planning'],
			tools: ['workspace-write', 'coordination-bus'],
			planningContext: {
				id: 'plan-123',
				workspaceId: 'workspace-main',
				currentPhase: PlanningPhase.EXECUTION,
				objectives: ['sync releases', 'verify docs'],
				contextTags: ['multi-agent', 'coordination'],
			},
			nOArchitecture: true,
			contextTags: ['multi-agent', 'coordination'],
			objectives: ['deliver release checklist'],
		};

		const selection = manager.selectTemplate(context);

		expect(selection.template.id).toBe('planning-coordination');
		expect(selection.adaptations).toEqual(
			expect.arrayContaining([
				'enhanced error handling guidance',
				'additional validation steps',
				'expedited execution protocols',
				'simplified decision making',
				'optimized for execution phase',
				'leverage capabilities: coordination, planning',
				'align with planning context plan-123',
				'preserve workspace continuity for workspace-main',
				'track planning objectives: sync releases, verify docs',
				'maintain context tags: multi-agent, coordination',
				'focus on objectives: deliver release checklist',
			]),
		);

		const prompt = manager.generatePrompt(selection, context);

		expect(prompt).toContain('**Context Adaptations for brAInwav nO Architecture');
		expect(prompt).toContain('- align with planning context plan-123');
		expect(prompt).toContain('- leverage capabilities: coordination, planning');
		expect(prompt).toContain('- preserve workspace continuity for workspace-main');
		expect(prompt).toMatch(/\*\*Powered by brAInwav\*\*/);
	});
});
