import { createMemoryProviderFromEnv } from '@cortex-os/memory-core';
import { describe, expect, it } from 'vitest';
import {
	createPlanningSessionTool,
	executePlanningPhaseTool,
	getPlanningStatusTool,
	type PlanningPhase as McpPlanningPhase,
} from '../../packages/mcp-core/src/tools/planning-tools.js';
import { executePlannedWorkflow } from '../../packages/orchestration/src/langgraph/planning-orchestrator.js';

function createEphemeralProvider() {
	process.env.MEMORY_DB_PATH = ':memory:';
	process.env.MEMORY_DEFAULT_LIMIT = process.env.MEMORY_DEFAULT_LIMIT || '10';
	process.env.MEMORY_MAX_LIMIT = process.env.MEMORY_MAX_LIMIT || '25';
	process.env.MEMORY_DEFAULT_THRESHOLD = process.env.MEMORY_DEFAULT_THRESHOLD || '0.2';
	return createMemoryProviderFromEnv();
}

describe('Cross-cutting workflow integration', () => {
	it('runs the brAInwav planning pipeline end-to-end with memory persistence', async () => {
		const anchor = new Date('2025-01-01T00:00:00.000Z').getTime();
		let tick = 0;
		const clock = () => new Date(anchor + tick++ * 1000);

		const workflow = await executePlannedWorkflow({
			input: 'Run enhanced DSP orchestration with memory + security validation.',
			task: {
				description:
					'Execute brAInwav end-to-end workflow covering DSP, coordination, and persistence.',
				complexity: 7,
				priority: 6,
				metadata: { capabilities: ['analysis', 'security', 'memory'] },
			},
			session: {
				id: 'integration-session',
				model: 'mlx-brainwav',
				user: 'qa-integration',
				cwd: '/workspace/tests',
				brainwavSession: 'integration-e2e',
			},
			clock,
		});

		expect(workflow.planningResult.success).toBe(true);
		expect(workflow.planningResult.phases.length).toBeGreaterThan(0);
		expect(workflow.coordinationDecision.assignments.length).toBeGreaterThan(0);
		expect(workflow.stateTransitions.every((transition) => transition.status === 'completed')).toBe(
			true,
		);
		expect(
			workflow.coordinationDecision.telemetry.every((entry) => entry.branding === 'brAInwav'),
		).toBe(true);

		const planningCtx = (workflow.state.ctx as { planning?: { phases?: unknown[] } } | undefined)
			?.planning;
		expect(Array.isArray(planningCtx?.phases)).toBe(true);

		const sessionResult = await createPlanningSessionTool.execute({
			name: 'brAInwav integration session',
			description: 'Tracks the orchestrated run for verification',
			workspaceId: 'workspace-integration',
			agentId: workflow.coordinationDecision.assignments[0]?.agentId,
			complexity: 6,
			priority: 6,
		});

		const memoryProvider = createEphemeralProvider();

		for (const phase of workflow.planningResult.phases) {
			const result = await executePlanningPhaseTool.execute({
				sessionId: sessionResult.sessionId,
				phase: phase.phase as unknown as McpPlanningPhase,
				action: `brAInwav phase alignment: ${phase.phase}`,
				metadata: { duration: phase.duration },
			});
			expect(result.status).toBe('completed');
			expect(result.brainwavMetadata.dspOptimized).toBe(true);
		}

		const status = await getPlanningStatusTool.execute({
			sessionId: sessionResult.sessionId,
			includeHistory: true,
			includeSteps: true,
		});

		expect(status.status).toBe('completed');
		expect(status.context.metadata.createdBy).toBe('brAInwav');
		expect(status.context.steps.length).toBe(workflow.planningResult.phases.length);
		expect(status.context.history.length).toBeGreaterThan(0);

		const nowIso = new Date().toISOString();
		const stored = await memoryProvider.store({
			content: `brAInwav orchestration summary: ${workflow.output ?? 'no output generated'}`,
			tags: ['brAInwav', 'orchestration', workflow.coordinationDecision.strategy],
			domain: 'integration-session',
			importance: 6,
			metadata: {
				source: 'system',
				actor: 'brAInwav-integration-suite',
				recordedAt: nowIso,
			},
		});

		expect(stored.vectorIndexed).toBeDefined();

		const searchResults = await memoryProvider.search({
			query: 'orchestration summary',
			limit: 5,
			search_type: 'keyword',
			domain: 'integration-session',
		});

		expect(searchResults.some((memory) => memory.id === stored.id)).toBe(true);

		const stats = await memoryProvider.stats({
			domain: 'integration-session',
			include: ['total_count', 'domain_distribution'],
		});

		expect(stats.totalCount).toBeGreaterThan(0);
		expect(stats.domainDistribution['integration-session']).toBeGreaterThan(0);
	});
});
