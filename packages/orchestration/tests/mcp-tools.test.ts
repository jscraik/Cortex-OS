import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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

const executeWorkflowThroughCoreMock = vi.fn(async () => ({
	result: { orchestrationId: 'test-orchestration', success: true },
	fromCache: false,
}));

vi.mock('../src/mcp/core-adapter.js', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../src/mcp/core-adapter.js')>();
	return {
		...actual,
		executeWorkflowThroughCore: executeWorkflowThroughCoreMock,
	};
});

let workflowTool: any;
let taskTool: any;
let processTool: any;
let otel: typeof import('../src/observability/otel.js');

beforeAll(async () => {
	otel = await import('../src/observability/otel.js');
	const module = await import('../src/mcp/tools.js');
	workflowTool = module.workflowOrchestrationTool;
	taskTool = module.taskManagementTool;
	processTool = module.processMonitoringTool;
});

beforeEach(() => {
	vi.clearAllMocks();
	executeWorkflowThroughCoreMock.mockResolvedValue({
		result: { orchestrationId: 'test-orchestration', success: true },
		fromCache: false,
	});
});

describe('workflow orchestration handler', () => {
	it('sanitizes input and formats orchestration summary', async () => {
		const response = await workflowTool.handler({
			workflowName: '  Demo Flow  ',
			goal: '  Align agents to build docs  ',
			steps: [
				{
					id: ' step-1 ',
					name: '  Draft plan  ',
					description: ' Create initial plan ',
					agent: 'planner-agent',
				},
				{
					id: 'step-2',
					name: 'Review plan',
					description: 'Check quality',
					agent: 'validator-agent',
					status: 'completed',
				},
			],
			context: { priority: 'high' },
			agents: [
				{
					id: ' agent-one ',
					name: ' Planner ',
					role: 'executor',
					status: 'available',
					capabilities: [' planning '],
				},
			],
		});

		expect(response.metadata.tool).toBe('orchestration.workflow.execute');
		expect(response.isError).toBeUndefined();

		const payload = JSON.parse(response.content[0].text);
		expect(payload.success).toBe(true);
		expect(payload.data.workflowName).toBe('Demo Flow');
		expect(payload.data.summary.totalSteps).toBe(2);
		expect(payload.data.summary.pendingSteps).toBe(1);
		expect(payload.data.steps[0].id).toBe('step-1');
		expect(payload.data.steps[0].status).toBe('pending');
		expect(payload.data.steps[1].status).toBe('completed');
		expect(payload.data.summary.assignedAgents).toEqual([
			'planner-agent',
			'validator-agent',
		]);
		expect(payload.data.context).toEqual({ priority: 'high' });
		expect(payload.data.agents[0]).toEqual(
			expect.objectContaining({
				id: 'agent-one',
				role: 'executor',
				status: 'available',
			}),
		);
		expect(payload.data.result).toEqual({
			orchestrationId: 'test-orchestration',
			success: true,
		});

		expect(otel.recordWorkflowStart).toHaveBeenCalledWith(
			expect.any(String),
			'Demo Flow',
		);
		expect(otel.recordWorkflowEnd).toHaveBeenCalledWith(
			expect.any(String),
			'Demo Flow',
			true,
		);
	});

	it('returns structured validation errors', async () => {
		const response = await workflowTool.handler({
			workflowName: '',
			goal: 'Goal',
			steps: [],
		});

		expect(response.isError).toBe(true);
		const payload = JSON.parse(response.content[0].text);
		expect(payload.success).toBe(false);
		expect(payload.error.code).toBe('validation_error');
	});
});

describe('task management handler', () => {
	it('computes progress percentages and normalizes fields', async () => {
		const response = await taskTool.handler({
			action: 'progress',
			task: {
				id: 'task-123',
				title: '  Build docs  ',
				progress: { current: 5, total: 10, message: '  halfway  ' },
				assignee: '  agent-9  ',
			},
			audit: { actor: ' supervisor ' },
		});

		expect(response.metadata.tool).toBe('orchestration.task.manage');
		const payload = JSON.parse(response.content[0].text);
		expect(payload.success).toBe(true);
		expect(payload.data.taskId).toBe('task-123');
		expect(payload.data.status).toBe('in_progress');
		expect(payload.data.progress.percentage).toBe(50);
		expect(payload.data.assignee).toBe('agent-9');
		expect(payload.data.audit.actor).toBe('supervisor');
	});
});

describe('process monitoring handler', () => {
	it('flags processes that exceed thresholds and records utilization metrics', async () => {
		const response = await processTool.handler({
			workflowId: '11111111-1111-1111-1111-111111111111',
			workflowName: 'Ops pipeline',
			processes: [
				{ pid: 123, name: ' main ', cpu: 92.5, memoryMb: 2048 },
				{
					pid: 456,
					name: 'worker',
					cpu: 30.25,
					memoryMb: 512,
					status: 'sleeping',
				},
			],
			thresholds: { cpu: 80, memoryMb: 1024 },
		});

		const payload = JSON.parse(response.content[0].text);
		expect(payload.success).toBe(true);
		expect(payload.data.alerts).toHaveLength(2);
		expect(payload.data.summary.nonRunningProcesses).toBe(1);
		expect(otel.updateResourceUtilization).toHaveBeenCalledWith(
			'cpu',
			expect.closeTo(0.925, 5),
			'main',
		);
		expect(otel.updateResourceUtilization).toHaveBeenCalledWith(
			'memory',
			expect.closeTo(2, 5),
			'main',
		);
	});

	it('surfaces validation errors for invalid process payloads', async () => {
		const response = await processTool.handler({
			workflowName: 'Bad payload',
			processes: [{ pid: -2, name: '', cpu: 150, memoryMb: -1 }],
		});

		expect(response.isError).toBe(true);
		const payload = JSON.parse(response.content[0].text);
		expect(payload.error.code).toBe('validation_error');
		expect(payload.success).toBe(false);
	});
});
