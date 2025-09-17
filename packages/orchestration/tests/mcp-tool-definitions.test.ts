import { describe, expect, it } from 'vitest';
import {
	createToolErrorResponse,
	processMonitoringTools,
	ToolErrorCode,
	ToolValidationError,
	taskManagementTools,
	toolErrorResponseSchema,
	workflowOrchestrationTools,
} from '../src/mcp/tools.js';
import { AgentRole, OrchestrationStrategy, TaskStatus } from '../src/types.js';

describe('orchestration MCP tool contracts', () => {
	const planTool = workflowOrchestrationTools.find(
		(tool) => tool.name === 'workflow.plan',
	);
	const updateTaskStatusTool = taskManagementTools.find(
		(tool) => tool.name === 'task.update_status',
	);
	const getProcessStatusTool = processMonitoringTools.find(
		(tool) => tool.name === 'process.get_status',
	);

	it('exposes plan workflow tool with validation', () => {
		expect(planTool).toBeDefined();
		const validInput = planTool?.validateInput({
			workflowName: 'Atlas rollout',
			goal: 'Coordinate cross-team release workstreams',
			preferredStrategy: OrchestrationStrategy.ADAPTIVE,
			context: {
				domain: 'release-engineering',
				constraints: ['freeze-window'],
				metadata: { releaseTrain: 'atlas-q1' },
			},
			tasks: [
				{
					title: 'Prepare change log',
					summary: 'Compile notable changes for the release notes',
					requiredCapabilities: ['technical-writing'],
					dependencies: [],
					estimatedDurationMinutes: 45,
				},
			],
		});

		expect(validInput.tasks[0].estimatedDurationMinutes).toBe(45);

		expect(() =>
			planTool?.validateInput({
				workflowName: '',
				goal: '',
				tasks: [],
			}),
		).toThrow(ToolValidationError);
	});

	it('documents plan workflow result schema', () => {
		const sample = {
			planId: 'b1f0c006-2ee9-4f27-8e0f-7033b7b1541d',
			workflowName: 'Atlas rollout',
			recommendedStrategy: OrchestrationStrategy.ADAPTIVE,
			phases: [
				{
					id: 'phase-1',
					name: 'Planning',
					objective: 'Define the release tasks',
					dependencies: [],
					tasks: [
						{
							id: 'task-1',
							title: 'Prepare change log',
							status: TaskStatus.PENDING,
							requiredCapabilities: ['technical-writing'],
							estimatedDurationMinutes: 45,
						},
					],
				},
			],
			estimatedDurationMinutes: 240,
			confidence: 0.82,
			createdAt: new Date().toISOString(),
		};

		expect(() => planTool?.resultSchema.parse(sample)).not.toThrow();
	});

	it('validates task status updates with enums', () => {
		expect(updateTaskStatusTool).toBeDefined();
		const valid = updateTaskStatusTool?.validateInput({
			taskId: 'task-123',
			status: TaskStatus.EXECUTING,
			progress: { percentage: 20, message: 'Queued job start' },
			audit: {
				actor: 'agent-42',
				reason: 'triggered by deploy workflow',
			},
		});

		expect(valid.progress?.percentage).toBe(20);

		expect(() =>
			updateTaskStatusTool?.validateInput({
				taskId: 'task-123',
				status: 'done',
			}),
		).toThrow(ToolValidationError);

		expect(Object.keys(updateTaskStatusTool?.errors)).toContain(
			ToolErrorCode.TASK_NOT_FOUND,
		);
	});

	it('provides process monitoring validation and error codes', () => {
		expect(getProcessStatusTool).toBeDefined();
		const input = getProcessStatusTool?.validateInput({
			workflowId: '1c8ffd6f-ff7b-4e9f-9c56-792124e94191',
			includeTimeline: true,
			includeMetrics: true,
		});

		expect(input.includeTimeline).toBe(true);

		expect(() =>
			getProcessStatusTool?.validateInput({
				workflowId: 'not-a-uuid',
			}),
		).toThrow(ToolValidationError);

		expect(Object.keys(getProcessStatusTool?.errors)).toContain(
			ToolErrorCode.WORKFLOW_NOT_FOUND,
		);
	});

	it('exports documented process result schema', () => {
		const sample = {
			workflowId: '1c8ffd6f-ff7b-4e9f-9c56-792124e94191',
			status: TaskStatus.EXECUTING,
			lastUpdated: new Date().toISOString(),
			metrics: {
				progress: 0.25,
				riskLevel: 'medium',
				estimatedMinutesRemaining: 180,
			},
			activeTasks: [
				{
					id: 'task-123',
					title: 'Deploy service',
					status: TaskStatus.EXECUTING,
					assigned: {
						agentId: 'agent-7',
						role: AgentRole.EXECUTOR,
					},
					startedAt: new Date().toISOString(),
				},
			],
			timeline: [
				{
					timestamp: new Date().toISOString(),
					event: 'workflow.started',
					detail: 'Workflow run started',
				},
			],
		};

		expect(() =>
			getProcessStatusTool?.resultSchema.parse(sample),
		).not.toThrow();
	});

	it('formats tool error responses consistently', () => {
		const response = createToolErrorResponse(
			ToolErrorCode.TASK_NOT_FOUND,
			'Task missing',
			{
				details: ['taskId=task-404'],
				retryable: false,
			},
		);

		const parsed = toolErrorResponseSchema.safeParse(response);
		expect(parsed.success).toBe(true);
		expect(response.code).toBe(ToolErrorCode.TASK_NOT_FOUND);
		expect(response.details).toContain('taskId=task-404');
	});
});
