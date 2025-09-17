import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentRole, TaskStatus } from '../src/types.js';

const runMock = vi.fn();
const shutdownMock = vi.fn(async () => {});
const provideOrchestrationMock = vi.fn(() => ({
	engine: {
		config: { maxConcurrentOrchestrations: 5 },
		logger: {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		},
	},
	run: runMock,
	shutdown: shutdownMock,
}));

vi.mock('../src/service.js', () => ({
	provideOrchestration: provideOrchestrationMock,
}));

vi.mock('../src/observability/otel.js', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../src/observability/otel.js')>();
	return {
		...actual,
		withEnhancedSpan: vi.fn(async (_name: string, fn: () => Promise<unknown>) =>
			fn(),
		),
		recordWorkflowStart: vi.fn(),
		recordWorkflowEnd: vi.fn(),
		recordAgentActivation: vi.fn(),
		recordAgentDeactivation: vi.fn(),
		updateResourceUtilization: vi.fn(),
	};
});

describe('orchestration MCP tools integration with core service', () => {
	let workflowTool: any;
	let configureTools: (config: any) => void;
	let resetTools: () => void;
	let auditModule: any;
	let recordSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(async () => {
		vi.clearAllMocks();
		runMock.mockReset();
		shutdownMock.mockReset();
		provideOrchestrationMock.mockClear();
		runMock.mockResolvedValue({
			orchestrationId: 'orch-123',
			success: true,
			executionResults: { summary: 'ok' },
		});

		auditModule = await import('../src/lib/audit.js');
		if (auditModule.enableMemoryAuditBuffer) {
			auditModule.enableMemoryAuditBuffer();
		}
		recordSpy = vi.spyOn(auditModule, 'record').mockResolvedValue();

		const toolsModule: any = await import('../src/mcp/tools.js');
		workflowTool = toolsModule.workflowOrchestrationTool;
		configureTools = toolsModule.configureOrchestrationMcp ?? (() => {});
		resetTools = toolsModule.__resetOrchestrationMcpState ?? (() => {});

		resetTools();
		configureTools({
			cacheTtlMs: 0,
			rateLimit: { maxConcurrent: 5, windowMs: 100 },
		});
	});

	it('passes sanitized workflow requests to orchestration service and records audit logs', async () => {
		const input = buildWorkflowInput({ workflowId: 'wf-service' });

		const response = await workflowTool.handler(input);

		expect(runMock).toHaveBeenCalledTimes(1);
		const [taskArg, agentsArg, contextArg] = runMock.mock.calls[0];
		expect(taskArg.title).toBe('Alpha Release Plan');
		expect(taskArg.status).toBe(TaskStatus.PLANNING);
		expect(agentsArg[0].role).toBe(AgentRole.EXECUTOR);
		expect(contextArg.preferences?.strategy).toBeDefined();
		expect(recordSpy).toHaveBeenCalled();

		const payload = JSON.parse(response.content[0].text);
		expect(payload.success).toBe(true);
		expect(payload.data.result).toEqual(
			expect.objectContaining({ orchestrationId: 'orch-123' }),
		);
	});

	it('reuses cached orchestration result for identical sanitized requests', async () => {
		configureTools({
			cacheTtlMs: 1_000,
			cacheSize: 5,
			rateLimit: { maxConcurrent: 5, windowMs: 100 },
		});
		const input = buildWorkflowInput({ workflowId: 'wf-cache' });

		await workflowTool.handler(input);
		await workflowTool.handler({ ...input });

		expect(runMock).toHaveBeenCalledTimes(1);
	});

	it('returns rate limited error when concurrent executions exceed threshold', async () => {
		configureTools({
			cacheTtlMs: 0,
			rateLimit: { maxConcurrent: 1, windowMs: 10_000 },
		});

		let resolveFirst: (() => void) | undefined;
		runMock.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					resolveFirst = () =>
						resolve({
							orchestrationId: 'orch-first',
							success: true,
							executionResults: {},
						});
				}),
		);

		const first = workflowTool.handler(
			buildWorkflowInput({ workflowId: 'wf-a' }),
		);
		const second = await workflowTool.handler(
			buildWorkflowInput({ workflowId: 'wf-b' }),
		);

		expect(second.isError).toBe(true);
		const payload = JSON.parse(second.content[0].text);
		expect(payload.error.code).toBe('rate_limited');

		resolveFirst?.();
		await first;
	});
});

function buildWorkflowInput(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		workflowId: 'wf-1234',
		workflowName: ' Alpha Release Plan ',
		goal: ' Coordinate cross-team release preparation ',
		steps: [
			{
				id: 'step-1',
				name: ' Draft release tasks ',
				description: ' Identify gating work ',
				agent: 'agent-primary',
				status: 'pending',
				estimatedDurationMs: 3_600_000,
			},
		],
		context: {
			priority: 'high',
			metadata: { releaseTrain: 'atlas-q1' },
		},
		agents: [
			{
				id: 'agent-primary',
				name: ' Primary Coordinator ',
				role: 'executor',
				status: 'available',
				capabilities: ['coordination', 'release-management'],
				metadata: { region: 'us-east-1' },
			},
		],
		strategy: 'adaptive',
		priority: 7,
		...overrides,
	};
}
