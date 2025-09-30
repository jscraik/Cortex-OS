import { beforeEach, describe, expect, it } from 'vitest';
import { PlanningPhase, type PromptContext } from '../../prompts';
import { PromptTemplateManager } from '../prompt-template-manager';

const buildContext = (overrides: Partial<PromptContext> = {}): PromptContext => ({
	taskId: 'task-base',
	agentId: 'agent-alpha',
	complexity: 6,
	priority: 5,
	capabilities: ['analysis'],
	tools: ['workspace.read'],
	nOArchitecture: true,
	taskDescription: 'Base task description',
	contextIsolation: 'light',
	agentCount: 1,
	...overrides,
});

describe('PromptTemplateManager', () => {
	let manager: PromptTemplateManager;

	beforeEach(() => {
		manager = new PromptTemplateManager();
	});

	it('initializes the catalog and exposes filtering capabilities', () => {
		const templates = manager.listTemplates();
		expect(templates.length).toBeGreaterThanOrEqual(6);

		const complianceTemplates = manager.listTemplates({ tags: ['compliance'] });
		expect(complianceTemplates.length).toBeGreaterThanOrEqual(1);
		expect(complianceTemplates.every((template) => template.tags?.includes('compliance'))).toBe(
			true,
		);
	});

	it('selects planning coordination template for multi-agent strategy contexts', () => {
		const context = buildContext({
			taskId: 'coordination-task',
			complexity: 7,
			priority: 6,
			capabilities: ['analysis', 'coordination'],
			tools: ['workspace.read', 'workspace.write'],
			currentPhase: PlanningPhase.STRATEGY,
			agentCount: 3,
			contextIsolation: 'strict',
			taskDescription: 'Coordinate deployment planning across release teams',
			contextTags: ['coordination', 'multi-agent'],
			compliance: {
				standards: ['ISO27001'],
				riskScore: 0.45,
				outstandingViolations: [],
			},
		});

		const selection = manager.selectTemplate(context);
		expect(selection.template.id).toBe('planning-coordination');

		const prompt = manager.generatePrompt(selection, context);
		expect(prompt).toContain('brAInwav nO Planning Coordination');
		expect(prompt).toContain('Available Agents: 3');
	});

	it('injects compliance posture details into generated prompts', () => {
		const context = buildContext({
			taskId: 'compliance-review',
			complexity: 5,
			priority: 5,
			capabilities: ['analysis', 'compliance'],
			tools: ['workspace.read', 'workspace.write'],
			currentPhase: PlanningPhase.VALIDATION,
			agentCount: 2,
			contextIsolation: 'strict',
			taskDescription: 'Summarize compliance status ahead of deployment',
			compliance: {
				standards: ['ISO27001', 'SOC2'],
				riskScore: 0.75,
				outstandingViolations: [
					{ id: 'SEC-9', severity: 'high', description: 'Pending semgrep remediation' },
				],
			},
		});

		const selection = manager.selectTemplate(context);
		const prompt = manager.generatePrompt(selection, context);

		expect(prompt).toContain('High (0.75)');
		expect(prompt).toContain('security.run_semgrep_scan');
	});

	it('tracks effectiveness metrics for templates', () => {
		const usageContextA = buildContext({
			taskId: 'usage-a',
			currentPhase: PlanningPhase.INITIALIZATION,
			compliance: { standards: ['ISO27001'], riskScore: 0.2, outstandingViolations: [] },
		});
		const usageContextB = buildContext({
			taskId: 'usage-b',
			currentPhase: PlanningPhase.EXECUTION,
			agentCount: 2,
			compliance: { standards: ['ISO27001'], riskScore: 0.2, outstandingViolations: [] },
		});

		manager.recordUsage('long-horizon-system', usageContextA, 0.8);
		manager.recordUsage('long-horizon-system', usageContextB, 0.6);

		const snapshot = manager.getPerformanceSnapshot();
		const entry = snapshot.find((item) => item.templateId === 'long-horizon-system');
		expect(entry).toBeDefined();
		expect(entry?.totalUses).toBe(2);
		expect(entry?.averageEffectiveness).toBeCloseTo(0.7, 1);
		expect(entry?.multiAgentUsageRate).toBeCloseTo(0.5, 1);
		expect(entry?.phasePerformance?.[PlanningPhase.INITIALIZATION]?.total).toBe(1);

		const stats = manager.getStats();
		expect(stats.totalTemplates).toBeGreaterThanOrEqual(snapshot.length);
		expect(stats.mostUsedTemplate).toBe('long-horizon-system');
	});
});
