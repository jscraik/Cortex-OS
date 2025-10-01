import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { enhanceEvidence } from '../../../packages/evidence-runner/src/enhancement/evidence-enhancer.js';
import { DatabaseExecutor } from '../../../packages/mcp-bridge/src/database-executor.js';
import type { DatabaseTelemetryEvent } from '../../../packages/mcp-bridge/src/database-types.js';
import { createMemoryProviderFromEnv } from '@cortex-os/memory-core';
import { assertNoPlaceholders } from '../utils/assert-no-placeholders.js';

describe('Cross-cutting acceptance: orchestrated run', () => {
	it('executes an end-to-end user flow without placeholders', async () => {
		const orchestratedJobId = randomUUID();
		const jobEvents = [
			{
				jobId: orchestratedJobId,
				stage: 'created' as const,
				timestamp: new Date().toISOString(),
				metadata: {
					agent: 'analysis-agent',
					task: 'synthesize-metrics',
					requestedBy: 'cross-cutting-suite',
				},
			},
			{
				jobId: orchestratedJobId,
				stage: 'started' as const,
				timestamp: new Date().toISOString(),
				metadata: {
					agent: 'analysis-agent',
					progress: 0.5,
				},
			},
			{
				jobId: orchestratedJobId,
				stage: 'completed' as const,
				timestamp: new Date().toISOString(),
				result: {
					stage: 'completed',
					notes: 'brAInwav agent synthesised telemetry successfully',
				},
				metadata: {
					agent: 'analysis-agent',
					processedTasks: 1,
				},
			},
		];

		const tasksPayload = {
			tasks: jobEvents
				.filter((event) => event.stage === 'completed')
				.map((event) => ({
					id: event.jobId,
					title: 'Agent execution synthesised metrics',
					status: 'completed',
					createdAt: event.timestamp,
				})),
		};

		const agentsPayload = {
			agents: jobEvents
				.filter((event) => event.stage === 'completed')
				.map((event) => ({
					id: event.jobId,
					name: String(event.metadata?.agent ?? 'analysis-agent'),
					status: 'completed' as const,
					lastRunAt: event.timestamp,
				})),
		};

		const metricsResponse = {
			uptimeSeconds: Math.max(1, Math.round(process.uptime())),
			activeAgents: agentsPayload.agents.length,
			tasksProcessed: tasksPayload.tasks.length,
			queueDepth: 0,
		};

		process.env.MEMORY_DB_PATH = ':memory:';
		process.env.MEMORY_DEFAULT_LIMIT = process.env.MEMORY_DEFAULT_LIMIT || '8';
		process.env.MEMORY_MAX_LIMIT = process.env.MEMORY_MAX_LIMIT || '15';
		process.env.MEMORY_DEFAULT_THRESHOLD = process.env.MEMORY_DEFAULT_THRESHOLD || '0.2';

		const memoryProvider = createMemoryProviderFromEnv();
		const content = 'Agent execution result was archived for orchestrated acceptance run.';
		const tags = ['orchestrated-run', 'agent', 'evidence'];

		const storeResult = await memoryProvider.store({
			content,
			tags,
			domain: 'acceptance',
			importance: 6,
			metadata: {
				source: 'system',
				actor: 'cross-cutting-suite',
			},
		});

		const searchResults = await memoryProvider.search({
			query: 'acceptance run result',
			limit: 5,
			search_type: 'keyword',
			domain: 'acceptance',
		});

		const storedMemory = searchResults.find((memory) => memory.id === storeResult.id);

		expect(storedMemory).toBeDefined();
		expect(storedMemory?.content).toContain('Agent execution result');

		const enhancedEvidence = await enhanceEvidence(
			'The orchestrated pipeline processed live telemetry without degradation.',
			{
				provider: 'mlx',
				deterministic: true,
			},
		);

		expect(enhancedEvidence.enrichedText).toContain('brAInwav Evidence Analysis Report');
		expect(enhancedEvidence.improvementSummary).toContain('brAInwav enhanced evidence');

		const telemetryEvents: DatabaseTelemetryEvent[] = [];
		const databaseExecutor = new DatabaseExecutor({
			connectionString: 'postgresql://localhost:5432/brainwav_orchestrated',
			poolSize: 2,
			queryTimeout: 2_000,
			allowedOperations: ['SELECT', 'UPDATE'],
			preferReadReplica: true,
			telemetryCallback: (event) => {
				telemetryEvents.push(event);
			},
		});

		const queryResult = await databaseExecutor.executeQuery({
			query: 'SELECT id, test_value, status FROM orchestrated_runs WHERE agent = $1',
			parameters: ['analysis-agent'],
			cacheTTL: 5,
			validateSchema: true,
			expectedColumns: ['id', 'test_value', 'status'],
			usePreparedStatement: true,
			statementName: 'orchestrated_run_lookup',
		});

		expect(queryResult.success).toBe(true);
		expect(queryResult.rows.length).toBeGreaterThan(0);
		expect(queryResult.rows[0]).toMatchObject({ status: 'active' });
		expect(telemetryEvents.some((event) => event.event === 'database_query_completed')).toBe(true);

		const payloadsToVerify = {
			tasksPayload,
			agentsPayload,
			metricsResponse,
			storedMemory,
			enrichedText: enhancedEvidence.enrichedText,
			improvementSummary: enhancedEvidence.improvementSummary,
			queryResult,
			telemetryEvents,
		};

		for (const [key, value] of Object.entries(payloadsToVerify)) {
			assertNoPlaceholders(value, `Cross-cutting payload ${key}`);
		}
	});
});
