import { beforeEach, describe, expect, it } from 'vitest';
import {
	PlanningPhase,
	type PromptContext,
	PromptTemplateManager,
} from '../../src/lib/prompt-template-manager.js';

describe('PromptTemplateManager - effectiveness tracking', () => {
	let manager: PromptTemplateManager;

	beforeEach(() => {
		manager = new PromptTemplateManager();
	});

	it('boosts confidence with effective history and trims usage logs', () => {
		const context: PromptContext = {
			taskId: 'analysis-task',
			agentId: 'agent-analytics',
			complexity: 7,
			priority: 6,
			capabilities: ['analysis', 'planning'],
			tools: ['read', 'grep', 'workspace-write'],
			currentPhase: PlanningPhase.ANALYSIS,
			nOArchitecture: true,
			contextTags: ['code-analysis', 'long-horizon'],
			objectives: ['ship review summary'],
		};

		const baseline = manager.selectTemplate(context);

		for (let index = 0; index < 105; index += 1) {
			manager.recordUsage('code-analysis-task', context, 0.9);
		}

		const boosted = manager.selectTemplate(context);

		expect(boosted.template.id).toBe('code-analysis-task');
		expect(boosted.confidence).toBeGreaterThan(baseline.confidence);
		expect(boosted.confidence).toBeGreaterThanOrEqual(0.9);

		const stats = manager.getStats();
		expect(stats.mostUsedTemplate).toBe('code-analysis-task');
		expect(stats.totalUsageEntries).toBeLessThanOrEqual(100);
		expect(stats.averageEffectiveness).toBeGreaterThan(0.85);
	});
});
