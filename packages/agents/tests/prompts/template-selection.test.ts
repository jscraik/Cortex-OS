import { beforeEach, describe, expect, it } from 'vitest';
import {
	PlanningPhase,
	type PromptContext,
	PromptTemplateManager,
} from '../../src/lib/prompt-template-manager.js';

describe('PromptTemplateManager - template selection', () => {
	let manager: PromptTemplateManager;

	beforeEach(() => {
		manager = new PromptTemplateManager();
	});

	it('selects contextually aligned template and provides reasoning', () => {
		const context: PromptContext = {
			taskId: 'task-123',
			agentId: 'agent-007',
			complexity: 6,
			priority: 7,
			capabilities: ['analysis', 'planning', 'code-review'],
			tools: ['read', 'grep', 'workspace-write'],
			currentPhase: PlanningPhase.ANALYSIS,
			nOArchitecture: true,
			contextTags: ['code-analysis', 'long-horizon'],
			objectives: ['summarize findings', 'recommend fixes'],
		};

		const selection = manager.selectTemplate(context);

		expect(selection.template.id).toBe('code-analysis-task');
		expect(selection.confidence).toBeGreaterThan(0);
		expect(selection.reasoning).toContain('Phase: analysis');
		expect(selection.reasoning).toContain('Context tags: code-analysis, long-horizon');
		expect(selection.reasoning).toContain('Capability alignment: 100%');
	});
});
