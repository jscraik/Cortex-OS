import { randomUUID } from 'node:crypto';
import { CORTEX_SEC_TOOL_ALLOWLIST, cortexSecMcpTools } from '@cortex-os/cortex-sec';
import { ZodError, z } from 'zod';
import {
	recordAgentActivation,
	recordAgentDeactivation,
	recordWorkflowEnd,
	recordWorkflowStart,
	updateResourceUtilization,
	withEnhancedSpan,
} from '../observability/otel.js';
import { AgentRole, OrchestrationStrategy, TaskStatus } from '../types.js';
import {
	executeWorkflowThroughCore,
	getDefaultOrchestrationPlanningContext,
	RateLimitError,
} from './core-adapter.js';

function adaptSecurityTool(tool) {
	return {
		name: `cortex_sec.${tool.name}`,
		description: `${tool.description} (brAInwav security allow-list enforced).`,
		inputSchema: tool.inputSchema,
		handler: async (params) => {
			const result = await tool.handler(params);
			return {
				content: [
					...result.content,
					{
						type: 'text',
						text: JSON.stringify({
							brand: result.metadata.brand,
							allowList: tool.allowList,
						}),
					},
				],
				metadata: {
					correlationId: result.metadata.correlationId,
					timestamp: result.metadata.timestamp,
					tool: `cortex_sec.${tool.name}`,
				},
			};
		},
	};
}
class OrchestrationToolError extends Error {
	code;
	details;
	constructor(code, message, details = []) {
		super(message);
		this.code = code;
		this.details = details;
		this.name = 'OrchestrationToolError';
	}
}
// Helper to remove ASCII control characters (NUL..US and DEL) without using a control-regex
function removeControlChars(input) {
	let out = '';
	for (const ch of input) {
		const cp = ch.codePointAt(0);
		if ((cp >= 0x00 && cp <= 0x1f) || cp === 0x7f) continue;
		out += ch;
	}
	return out;
}
const MAX_METADATA_DEPTH = 4;
const MAX_METADATA_ENTRIES = 64;
const MAX_ARRAY_LENGTH = 64;
const MAX_STRING_LENGTH = 4096;
function mapZodIssues(issues) {
	return issues.map((issue) => `${issue.path.join('.') || issue.code}: ${issue.message}`);
}
function createCorrelationId() {
	return randomUUID();
}
function sanitizeString(value, field, { min, max }) {
	// Remove control characters first, then normalize whitespace
	const withoutControl = removeControlChars(value);
	const normalized = withoutControl.replace(/\s+/g, ' ').trim();
	if (!normalized || normalized.length < min) {
		throw new OrchestrationToolError('validation_error', `${field} cannot be empty`, [
			`${field} must contain at least ${min} characters`,
		]);
	}
	if (normalized.length > max) {
		throw new OrchestrationToolError('validation_error', `${field} exceeds maximum length`, [
			`${field} must not exceed ${max} characters`,
		]);
	}
	return normalized;
}
function ensurePlainObject(value, context) {
	if (typeof value !== 'object' || value === null) {
		throw new OrchestrationToolError('validation_error', `${context} must be an object`, [
			`${context} must be an object`,
		]);
	}
	const proto = Reflect.getPrototypeOf(value);
	if (proto !== Object.prototype && proto !== null) {
		throw new OrchestrationToolError('security_error', `${context} has an unsafe prototype`, [
			`${context} must not override Object prototype`,
		]);
	}
}
function sanitizeMetadataValue(value, context, depth) {
	if (depth > MAX_METADATA_DEPTH) {
		throw new OrchestrationToolError('validation_error', `${context} exceeds maximum depth`, [
			`${context} exceeds maximum metadata depth of ${MAX_METADATA_DEPTH}`,
		]);
	}
	if (value === null || value === undefined) return value;
	if (typeof value === 'string') {
		const sanitized = value.replace(/\s+/g, ' ').trim();
		if (sanitized.length > MAX_STRING_LENGTH) {
			throw new OrchestrationToolError('validation_error', `${context} exceeds allowed length`, [
				`${context} exceeds maximum metadata length of ${MAX_STRING_LENGTH}`,
			]);
		}
		return sanitized;
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		if (typeof value === 'number' && !Number.isFinite(value)) {
			throw new OrchestrationToolError('validation_error', `${context} must be a finite number`, [
				`${context} must be finite`,
			]);
		}
		return value;
	}
	if (Array.isArray(value)) {
		if (value.length > MAX_ARRAY_LENGTH) {
			throw new OrchestrationToolError('validation_error', `${context} array too large`, [
				`${context} arrays cannot exceed ${MAX_ARRAY_LENGTH} items`,
			]);
		}
		return value.map((entry, index) =>
			sanitizeMetadataValue(entry, `${context}[${index}]`, depth + 1),
		);
	}
	ensurePlainObject(value, context);
	const entries = Object.entries(value);
	if (entries.length > MAX_METADATA_ENTRIES) {
		throw new OrchestrationToolError('validation_error', `${context} has too many entries`, [
			`${context} cannot exceed ${MAX_METADATA_ENTRIES} entries`,
		]);
	}
	const sanitized = {};
	for (const [key, entry] of entries) {
		sanitized[sanitizeString(key, `${context} key`, { min: 1, max: 120 })] = sanitizeMetadataValue(
			entry,
			`${context}.${key}`,
			depth + 1,
		);
	}
	return sanitized;
}
function sanitizeOptionalRecord(value, context) {
	if (value === undefined) return undefined;
	ensurePlainObject(value, context);
	return sanitizeMetadataValue(value, context, 1);
}
function stableStringify(value) {
	if (value === null || value === undefined) {
		return String(value);
	}
	if (Array.isArray(value)) {
		return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
	}
	if (typeof value === 'object') {
		const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
		return `{${entries
			.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
			.join(',')}}`;
	}
	return JSON.stringify(value);
}
function createSuccessResponse(tool, data, correlationId, timestamp) {
	return {
		content: [
			{
				type: 'text',
				text: JSON.stringify({ success: true, data, correlationId, timestamp }),
			},
		],
		metadata: { correlationId, timestamp, tool },
	};
}
function createErrorResponse(tool, error, correlationId, timestamp) {
	console.error(`[orchestration:mcp:${tool}] ${error.code}: ${error.message}`, {
		correlationId,
		details: error.details ?? [],
	});
	return {
		content: [
			{
				type: 'text',
				text: JSON.stringify({
					success: false,
					error,
					correlationId,
					timestamp,
				}),
			},
		],
		metadata: { correlationId, timestamp, tool },
		isError: true,
	};
}
async function executeTool(options) {
	const { tool, schema, params, logic } = options;
	const correlationId = createCorrelationId();
	const timestamp = new Date().toISOString();
	try {
		const parsed = schema.parse(params);
		const result = await logic(parsed);
		console.info(`[orchestration:mcp:${tool}] completed`, {
			correlationId,
			timestamp,
		});
		return createSuccessResponse(tool, result, correlationId, timestamp);
	} catch (error) {
		if (error instanceof OrchestrationToolError) {
			return createErrorResponse(
				tool,
				{
					code: error.code,
					message: error.message,
					details: error.details,
				},
				correlationId,
				timestamp,
			);
		}
		if (error instanceof RateLimitError) {
			return createErrorResponse(
				tool,
				{
					code: 'rate_limited',
					message: 'Orchestration service is busy',
					details: [`retry_in_ms=${error.retryInMs}`],
				},
				correlationId,
				timestamp,
			);
		}
		if (error instanceof ZodError) {
			return createErrorResponse(
				tool,
				{
					code: 'validation_error',
					message: 'Invalid input provided',
					details: mapZodIssues(error.issues),
				},
				correlationId,
				timestamp,
			);
		}
		const message = error instanceof Error ? error.message : 'Unknown error';
		return createErrorResponse(tool, { code: 'internal_error', message }, correlationId, timestamp);
	}
}
const STEP_STATUSES = new Set(['pending', 'running', 'completed', 'failed']);
const workflowStepSchema = z.object({
	id: z.string().min(1).max(64),
	name: z.string().min(1).max(160),
	description: z.string().min(1).max(1024),
	agent: z.string().min(1).max(160),
	status: z.string().optional(),
	estimatedDurationMs: z.number().int().positive().max(86_400_000).optional(),
});
const agentInputSchema = z.object({
	id: z.string().min(1).max(128),
	name: z.string().min(1).max(160),
	role: z.nativeEnum(AgentRole).optional(),
	status: z.enum(['available', 'busy', 'offline']).optional(),
	capabilities: z.array(z.string().min(1).max(120)).max(64).optional(),
	metadata: z.record(z.unknown()).optional(),
});
const workflowInputSchema = z.object({
	workflowId: z.string().min(3).max(128).optional(),
	workflowName: z.string().min(1).max(180),
	goal: z.string().min(1).max(4096),
	steps: z.array(workflowStepSchema).min(1).max(50),
	context: z.record(z.unknown()).optional(),
	agents: z.array(agentInputSchema).min(1).max(32),
	strategy: z.nativeEnum(OrchestrationStrategy).optional(),
	priority: z.number().int().min(1).max(10).optional(),
	metadata: z.record(z.unknown()).optional(),
});
function sanitizeWorkflowStep(step, index) {
	const id = sanitizeString(step.id, `steps[${index}].id`, { min: 1, max: 64 });
	const name = sanitizeString(step.name, `steps[${index}].name`, {
		min: 1,
		max: 160,
	});
	const description = sanitizeString(step.description, `steps[${index}].description`, {
		min: 1,
		max: 1024,
	});
	const agent = sanitizeString(step.agent, `steps[${index}].agent`, {
		min: 1,
		max: 160,
	});
	const normalizedStatus = step.status ? step.status.toLowerCase() : 'pending';
	if (!STEP_STATUSES.has(normalizedStatus)) {
		throw new OrchestrationToolError('validation_error', `Invalid status for step ${id}`, [
			`steps[${index}].status must be one of ${Array.from(STEP_STATUSES).join(', ')}`,
		]);
	}
	const estimatedDurationMs = step.estimatedDurationMs;
	return {
		id,
		name,
		description,
		agent,
		status: normalizedStatus,
		estimatedDurationMs,
	};
}
function sanitizeAgent(agent, index) {
	const id = sanitizeString(agent.id, `agents[${index}].id`, {
		min: 1,
		max: 128,
	});
	const name = sanitizeString(agent.name, `agents[${index}].name`, {
		min: 1,
		max: 160,
	});
	const normalizedStatus = (agent.status ?? 'available').toLowerCase();
	if (!['available', 'busy', 'offline'].includes(normalizedStatus)) {
		throw new OrchestrationToolError('validation_error', `Invalid status for agent ${id}`, [
			`agents[${index}].status must be available, busy, or offline`,
		]);
	}
	const capabilities = agent.capabilities
		? agent.capabilities.map((capability, capIndex) =>
				sanitizeString(capability, `agents[${index}].capabilities[${capIndex}]`, {
					min: 1,
					max: 120,
				}),
			)
		: [];
	const metadata = sanitizeOptionalRecord(agent.metadata, `agents[${index}].metadata`) ?? {};
	return {
		id,
		name,
		role: agent.role ?? AgentRole.EXECUTOR,
		capabilities,
		status: normalizedStatus,
		metadata,
		lastSeen: new Date(),
	};
}
export const workflowOrchestrationTool = {
	name: 'orchestration.workflow.execute',
	description: 'Validate and summarize a multi-agent workflow orchestration request.',
	inputSchema: workflowInputSchema,
	handler: async (params) =>
		executeTool({
			tool: 'orchestration.workflow.execute',
			schema: workflowInputSchema,
			params,
			logic: async (input) => {
				const workflowName = sanitizeString(input.workflowName, 'workflowName', {
					min: 1,
					max: 180,
				});
				const goal = sanitizeString(input.goal, 'goal', { min: 1, max: 4096 });
				const workflowId = input.workflowId
					? sanitizeString(input.workflowId, 'workflowId', { min: 3, max: 128 })
					: `workflow-${randomUUID()}`;
				const context = sanitizeOptionalRecord(input.context, 'context') ?? {};
				const metadata = sanitizeOptionalRecord(input.metadata, 'metadata') ?? {};
				const sanitizedSteps = input.steps.map((step, index) => sanitizeWorkflowStep(step, index));
				const agents = input.agents.map((agent, index) => sanitizeAgent(agent, index));
				const strategy = input.strategy ?? OrchestrationStrategy.ADAPTIVE;
				const priority = input.priority ?? 5;
				const startedAtIso = new Date().toISOString();
				recordWorkflowStart(workflowId, workflowName);
				for (const agent of agents) {
					recordAgentActivation(agent.id, []);
				}
				let success = false;
				try {
					const pendingSteps = sanitizedSteps.filter((step) => step.status === 'pending').length;
					const completedSteps = sanitizedSteps.filter(
						(step) => step.status === 'completed',
					).length;
					const totalDurationMs = sanitizedSteps.reduce(
						(acc, step) => acc + (step.estimatedDurationMs ?? 0),
						0,
					);
					const task = {
						id: workflowId,
						title: workflowName,
						description: goal,
						status: TaskStatus.PLANNING,
						priority,
						dependencies: [],
						requiredCapabilities: Array.from(
							new Set(agents.flatMap((agent) => agent.capabilities)),
						),
						context,
						metadata: { ...metadata, goal, steps: sanitizedSteps },
						createdAt: new Date(startedAtIso),
						updatedAt: new Date(startedAtIso),
						completedAt: undefined,
						estimatedDuration: totalDurationMs || undefined,
						actualDuration: undefined,
					};
					const planningContext = {
						...getDefaultOrchestrationPlanningContext(strategy, totalDurationMs, agents),
						task,
					};
					const cacheKey = stableStringify({
						workflowId,
						workflowName,
						goal,
						strategy,
						priority,
						context,
						metadata,
						steps: sanitizedSteps,
						agents: agents.map((agent) => ({
							id: agent.id,
							role: agent.role,
							status: agent.status,
							capabilities: agent.capabilities,
						})),
					});
					const spanContext = {
						workflowId,
						workflowName,
						stepKind: 'workflow',
						phase: 'coordination',
					};
					const payload = await withEnhancedSpan(
						'mcp.tool.orchestration.workflow.execute',
						async () => {
							const execution = await executeWorkflowThroughCore({
								cacheKey,
								workflowId,
								task,
								agents,
								planningContext,
								metadata: { goal, workflowName },
							});
							return {
								workflowId,
								workflowName,
								goal,
								strategy,
								priority,
								summary: {
									totalSteps: sanitizedSteps.length,
									pendingSteps,
									completedSteps,
									assignedAgents: Array.from(new Set(sanitizedSteps.map((step) => step.agent))),
									estimatedDurationMs: totalDurationMs || null,
								},
								steps: sanitizedSteps,
								agents: agents.map((agent) => ({
									id: agent.id,
									name: agent.name,
									role: agent.role,
									status: agent.status,
								})),
								context,
								metadata,
								startedAt: startedAtIso,
								completedAt: new Date().toISOString(),
								result: execution.result,
								cacheHit: execution.fromCache,
							};
						},
						spanContext,
					);
					success = true;
					return payload;
				} finally {
					for (const agent of agents) {
						recordAgentDeactivation(agent.id);
					}
					recordWorkflowEnd(workflowId, workflowName, success);
				}
			},
		}),
};
const progressSchema = z.object({
	current: z.number().int().min(0),
	total: z.number().int().positive(),
	message: z.string().max(512).optional(),
});
const taskSchema = z.object({
	id: z.string().min(1).max(128).optional(),
	title: z.string().min(1).max(160),
	description: z.string().max(2048).optional(),
	priority: z.enum(['low', 'medium', 'high']).default('medium'),
	status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']).optional(),
	assignee: z.string().min(1).max(160).optional(),
	tags: z.array(z.string()).max(32).optional(),
	metadata: z.record(z.unknown()).optional(),
	progress: progressSchema.optional(),
});
const taskManagementInputSchema = z.object({
	action: z.enum(['create', 'update', 'progress', 'complete', 'fail', 'cancel']).default('create'),
	task: taskSchema,
	audit: z
		.object({
			actor: z.string().min(1).max(160),
			reason: z.string().max(512).optional(),
		})
		.optional(),
});
const STATUS_BY_ACTION = {
	create: 'pending',
	update: 'in_progress',
	progress: 'in_progress',
	complete: 'completed',
	fail: 'failed',
	cancel: 'cancelled',
};
export const taskManagementTool = {
	name: 'orchestration.task.manage',
	description: 'Manage orchestration task lifecycle with structured updates.',
	inputSchema: taskManagementInputSchema,
	handler: async (params) =>
		executeTool({
			tool: 'orchestration.task.manage',
			schema: taskManagementInputSchema,
			params,
			logic: async (input) => {
				const title = sanitizeString(input.task.title, 'task.title', {
					min: 1,
					max: 160,
				});
				const taskId = input.task.id
					? sanitizeString(input.task.id, 'task.id', { min: 1, max: 128 })
					: `task-${randomUUID()}`;
				const assignee = input.task.assignee
					? sanitizeString(input.task.assignee, 'task.assignee', {
							min: 1,
							max: 160,
						})
					: undefined;
				const metadata = sanitizeOptionalRecord(input.task.metadata, 'task.metadata');
				const tags = input.task.tags?.map((tag, index) =>
					sanitizeString(tag, `task.tags[${index}]`, { min: 1, max: 64 }),
				);
				const audit = input.audit
					? {
							actor: sanitizeString(input.audit.actor, 'audit.actor', {
								min: 1,
								max: 160,
							}),
							reason: input.audit.reason
								? sanitizeString(input.audit.reason, 'audit.reason', {
										min: 1,
										max: 512,
									})
								: undefined,
						}
					: undefined;
				const baseStatus = STATUS_BY_ACTION[input.action];
				const status = input.action === 'update' ? (input.task.status ?? baseStatus) : baseStatus;
				const spanContext = {
					workflowName: title,
					stepKind: 'task-management',
					agentId: assignee,
				};
				const progress = input.task.progress
					? (() => {
							const current = input.task.progress?.current;
							const total = input.task.progress?.total;
							if (current > total) {
								throw new OrchestrationToolError(
									'validation_error',
									'Progress current cannot exceed total',
									['task.progress.current cannot exceed task.progress.total'],
								);
							}
							const percentage = Math.round((current / total) * 100);
							const message = input.task.progress?.message
								? sanitizeString(input.task.progress?.message, 'task.progress.message', {
										min: 1,
										max: 512,
									})
								: undefined;
							return { current, total, percentage, message };
						})()
					: undefined;
				return withEnhancedSpan(
					'mcp.tool.orchestration.task.manage',
					async () => ({
						taskId,
						action: input.action,
						status,
						title,
						assignee,
						priority: input.task.priority,
						progress,
						metadata,
						tags,
						audit,
						updatedAt: new Date().toISOString(),
					}),
					spanContext,
				);
			},
		}),
};
const processSchema = z.object({
	pid: z.number().int().positive(),
	name: z.string().min(1).max(160),
	status: z.enum(['running', 'sleeping', 'stopped', 'zombie', 'waiting']).optional(),
	cpu: z.number().min(0).max(100),
	memoryMb: z.number().min(0),
	startedAt: z.string().datetime().optional(),
	metadata: z.record(z.unknown()).optional(),
});
const processMonitoringInputSchema = z.object({
	workflowId: z.string().min(3).max(128).optional(),
	workflowName: z.string().min(1).max(180).optional(),
	processes: z.array(processSchema).min(1).max(100),
	thresholds: z
		.object({
			cpu: z.number().min(1).max(100).default(85),
			memoryMb: z.number().min(1).default(1024),
		})
		.default({ cpu: 85, memoryMb: 1024 }),
});
const RUNNING_STATUS = 'running';
export const processMonitoringTool = {
	name: 'orchestration.process.monitor',
	description: 'Assess running orchestration processes and flag anomalies.',
	inputSchema: processMonitoringInputSchema,
	handler: async (params) =>
		executeTool({
			tool: 'orchestration.process.monitor',
			schema: processMonitoringInputSchema,
			params,
			logic: async (input) => {
				const workflowName = input.workflowName
					? sanitizeString(input.workflowName, 'workflowName', {
							min: 1,
							max: 180,
						})
					: undefined;
				const workflowId = input.workflowId
					? sanitizeString(input.workflowId, 'workflowId', { min: 3, max: 128 })
					: undefined;
				const thresholds = input.thresholds ?? { cpu: 85, memoryMb: 1024 };
				const processes = input.processes.map((proc, index) => {
					const name = sanitizeString(proc.name, `processes[${index}].name`, {
						min: 1,
						max: 160,
					});
					const status = (proc.status ?? RUNNING_STATUS).toLowerCase();
					if (!['running', 'sleeping', 'stopped', 'zombie', 'waiting'].includes(status)) {
						throw new OrchestrationToolError(
							'validation_error',
							`Invalid status for process ${name}`,
							[`processes[${index}].status must be running, sleeping, stopped, waiting, or zombie`],
						);
					}
					const startedAt = proc.startedAt ? new Date(proc.startedAt).toISOString() : undefined;
					const metadata = sanitizeOptionalRecord(proc.metadata, `processes[${index}].metadata`);
					return {
						pid: proc.pid,
						name,
						status,
						cpu: Number(proc.cpu.toFixed(2)),
						memoryMb: Number(proc.memoryMb.toFixed(2)),
						startedAt,
						metadata,
					};
				});
				const spanContext = {
					workflowId,
					workflowName,
					stepKind: 'process-monitoring',
					phase: 'monitoring',
				};
				return withEnhancedSpan(
					'mcp.tool.orchestration.process.monitor',
					async () => {
						const alerts = [];
						let cpuSum = 0;
						let memorySum = 0;
						let highCpu = 0;
						let highMemory = 0;
						let nonRunning = 0;
						for (const proc of processes) {
							cpuSum += proc.cpu;
							memorySum += proc.memoryMb;
							const cpuRatio = proc.cpu / 100;
							const memoryRatio = proc.memoryMb / thresholds.memoryMb;
							updateResourceUtilization('cpu', Number(cpuRatio.toFixed(4)), proc.name);
							updateResourceUtilization('memory', Number(memoryRatio.toFixed(4)), proc.name);
							if (proc.cpu > thresholds.cpu) {
								highCpu += 1;
								alerts.push(
									`Process ${proc.name} (pid ${proc.pid}) exceeded CPU threshold ${thresholds.cpu}% with ${proc.cpu}%`,
								);
							}
							if (proc.memoryMb > thresholds.memoryMb) {
								highMemory += 1;
								alerts.push(
									`Process ${proc.name} (pid ${proc.pid}) exceeded memory threshold ${thresholds.memoryMb}MB with ${proc.memoryMb}MB`,
								);
							}
							if (proc.status !== RUNNING_STATUS) {
								nonRunning += 1;
							}
						}
						const count = processes.length;
						const summary = {
							totalProcesses: count,
							highCpuProcesses: highCpu,
							highMemoryProcesses: highMemory,
							nonRunningProcesses: nonRunning,
							averageCpu: Number((cpuSum / count).toFixed(2)),
							averageMemoryMb: Number((memorySum / count).toFixed(2)),
						};
						return {
							workflowId,
							workflowName,
							thresholds,
							summary,
							alerts,
							processes: processes.map((proc) => ({
								pid: proc.pid,
								name: proc.name,
								status: proc.status,
								cpu: proc.cpu,
								memoryMb: proc.memoryMb,
							})),
							timestamp: new Date().toISOString(),
						};
					},
					spanContext,
				);
			},
		}),
};
const securityMcpTools = cortexSecMcpTools.map(adaptSecurityTool);
export const orchestrationMcpTools = [
	workflowOrchestrationTool,
	taskManagementTool,
	processMonitoringTool,
	...securityMcpTools,
];
export const orchestrationSecurityToolAllowList = CORTEX_SEC_TOOL_ALLOWLIST;
export { __resetOrchestrationMcpState, configureOrchestrationMcp } from './core-adapter.js';

// MCP Tool Contract Definitions for Orchestration Package
// Import contract schemas and arrays from separated module
// Import tool contract schemas for use in local contract definitions
import {
	GetProcessStatusInputSchema,
	GetProcessStatusResultSchema,
	PlanWorkflowInputSchema,
	PlanWorkflowResultSchema,
	UpdateTaskStatusInputSchema,
	UpdateTaskStatusResultSchema,
} from './tool-contracts.js';
// Error handling
import { ToolErrorCode, ToolValidationError } from './tool-errors.js';

// Re-export error symbols so package surface can export from this module
export { ToolErrorCode, ToolValidationError } from './tool-errors.js';

// Create tool contract helper
function createToolContract(name, description, inputSchema, resultSchema) {
	return {
		name,
		description,
		inputSchema,
		resultSchema,
		validateInput: (input) => {
			try {
				return inputSchema.parse(input);
			} catch (error) {
				if (error instanceof z.ZodError) {
					throw new ToolValidationError(
						`Invalid input: ${error.errors.map((e) => e.message).join(', ')}`,
					);
				}
				throw error;
			}
		},
		errors: {
			[ToolErrorCode.TASK_NOT_FOUND]: 'The specified task was not found',
			[ToolErrorCode.WORKFLOW_NOT_FOUND]: 'The specified workflow was not found',
			[ToolErrorCode.INVALID_INPUT]: 'The input provided is invalid',
			[ToolErrorCode.PERMISSION_DENIED]: 'Permission denied to perform this operation',
			[ToolErrorCode.RATE_LIMITED]: 'Rate limit exceeded, please try again later',
			[ToolErrorCode.INTERNAL_ERROR]: 'An internal error occurred while processing the request',
		},
	};
}
// Tool contracts
export const workflowOrchestrationTools = [
	createToolContract(
		'workflow.plan',
		'Create a workflow plan for multi-agent orchestration',
		PlanWorkflowInputSchema,
		PlanWorkflowResultSchema,
	),
];
export const taskManagementTools = [
	createToolContract(
		'task.update_status',
		'Update the status of a task in the orchestration system',
		UpdateTaskStatusInputSchema,
		UpdateTaskStatusResultSchema,
	),
];
export const processMonitoringTools = [
	createToolContract(
		'process.get_status',
		'Get the current status of a workflow process',
		GetProcessStatusInputSchema,
		GetProcessStatusResultSchema,
	),
];
// Error response schema and helper
export const toolErrorResponseSchema = z.object({
	code: z.nativeEnum(ToolErrorCode),
	message: z.string(),
	details: z.array(z.string()).optional(),
	retryable: z.boolean().optional(),
	timestamp: z.string().datetime(),
});
export function createToolErrorResponse(code, message, options) {
	return {
		code,
		message,
		details: options?.details ?? [],
		retryable: options?.retryable ?? false,
		timestamp: new Date().toISOString(),
	};
}
// All orchestration tool contracts
export const orchestrationToolContracts = [
	...workflowOrchestrationTools,
	...taskManagementTools,
	...processMonitoringTools,
];
//# sourceMappingURL=tools.js.map
