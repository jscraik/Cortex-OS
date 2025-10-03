import { z } from 'zod';
export declare const OrchestrationEventTypes: {
	readonly TaskCreated: 'orchestration.task.created';
	readonly TaskStarted: 'orchestration.task.started';
	readonly TaskCompleted: 'orchestration.task.completed';
	readonly TaskFailed: 'orchestration.task.failed';
	readonly AgentAssigned: 'orchestration.agent.assigned';
	readonly AgentFreed: 'orchestration.agent.freed';
	readonly PlanCreated: 'orchestration.plan.created';
	readonly PlanUpdated: 'orchestration.plan.updated';
	readonly CoordinationStarted: 'orchestration.coordination.started';
	readonly DecisionMade: 'orchestration.decision.made';
	readonly ResourceAllocated: 'orchestration.resource.allocated';
	readonly AgentCoordinationStarted: 'agent_coordination_started';
	readonly ScheduleAdjusted: 'schedule_adjusted';
	readonly ToolLayerInvoked: 'tool_layer_invoked';
};
export type OrchestrationEventType =
	(typeof OrchestrationEventTypes)[keyof typeof OrchestrationEventTypes];
export declare const taskCreatedEventSchema: z.ZodObject<
	{
		taskId: z.ZodString;
		input: z.ZodUnknown;
		metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
	},
	'strip',
	z.ZodTypeAny,
	{
		taskId: string;
		input?: unknown;
		metadata?: Record<string, unknown> | undefined;
	},
	{
		taskId: string;
		input?: unknown;
		metadata?: Record<string, unknown> | undefined;
	}
>;
export declare const taskStartedEventSchema: z.ZodObject<
	{
		taskId: z.ZodString;
		agentId: z.ZodOptional<z.ZodString>;
		attempt: z.ZodOptional<z.ZodNumber>;
		metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
	},
	'strip',
	z.ZodTypeAny,
	{
		taskId: string;
		metadata?: Record<string, unknown> | undefined;
		agentId?: string | undefined;
		attempt?: number | undefined;
	},
	{
		taskId: string;
		metadata?: Record<string, unknown> | undefined;
		agentId?: string | undefined;
		attempt?: number | undefined;
	}
>;
export declare const taskCompletedEventSchema: z.ZodObject<
	{
		taskId: z.ZodString;
		result: z.ZodUnknown;
		durationMs: z.ZodOptional<z.ZodNumber>;
		metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
	},
	'strip',
	z.ZodTypeAny,
	{
		taskId: string;
		metadata?: Record<string, unknown> | undefined;
		result?: unknown;
		durationMs?: number | undefined;
	},
	{
		taskId: string;
		metadata?: Record<string, unknown> | undefined;
		result?: unknown;
		durationMs?: number | undefined;
	}
>;
export declare const taskFailedEventSchema: z.ZodObject<
	{
		taskId: z.ZodString;
		error: z.ZodString;
		retryable: z.ZodOptional<z.ZodBoolean>;
		metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
	},
	'strip',
	z.ZodTypeAny,
	{
		error: string;
		taskId: string;
		metadata?: Record<string, unknown> | undefined;
		retryable?: boolean | undefined;
	},
	{
		error: string;
		taskId: string;
		metadata?: Record<string, unknown> | undefined;
		retryable?: boolean | undefined;
	}
>;
export declare const agentAssignedEventSchema: z.ZodObject<
	{
		agentId: z.ZodString;
		taskId: z.ZodString;
		capabilities: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
	},
	'strip',
	z.ZodTypeAny,
	{
		agentId: string;
		taskId: string;
		capabilities?: string[] | undefined;
	},
	{
		agentId: string;
		taskId: string;
		capabilities?: string[] | undefined;
	}
>;
export declare const agentFreedEventSchema: z.ZodObject<
	{
		agentId: z.ZodString;
		taskId: z.ZodOptional<z.ZodString>;
		reason: z.ZodOptional<z.ZodString>;
	},
	'strip',
	z.ZodTypeAny,
	{
		agentId: string;
		reason?: string | undefined;
		taskId?: string | undefined;
	},
	{
		agentId: string;
		reason?: string | undefined;
		taskId?: string | undefined;
	}
>;
export declare const planCreatedEventSchema: z.ZodObject<
	{
		planId: z.ZodString;
		summary: z.ZodOptional<z.ZodString>;
		steps: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
	},
	'strip',
	z.ZodTypeAny,
	{
		planId: string;
		summary?: string | undefined;
		steps?: string[] | undefined;
	},
	{
		planId: string;
		summary?: string | undefined;
		steps?: string[] | undefined;
	}
>;
export declare const planUpdatedEventSchema: z.ZodObject<
	{
		planId: z.ZodString;
		changes: z.ZodArray<z.ZodString, 'many'>;
	},
	'strip',
	z.ZodTypeAny,
	{
		planId: string;
		changes: string[];
	},
	{
		planId: string;
		changes: string[];
	}
>;
export declare const coordinationStartedEventSchema: z.ZodObject<
	{
		strategy: z.ZodString;
		runId: z.ZodString;
		participants: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
	},
	'strip',
	z.ZodTypeAny,
	{
		runId: string;
		strategy: string;
		participants?: string[] | undefined;
	},
	{
		runId: string;
		strategy: string;
		participants?: string[] | undefined;
	}
>;
export declare const decisionMadeEventSchema: z.ZodObject<
	{
		decisionId: z.ZodString;
		outcome: z.ZodString;
		confidence: z.ZodOptional<z.ZodNumber>;
		metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
	},
	'strip',
	z.ZodTypeAny,
	{
		outcome: string;
		decisionId: string;
		metadata?: Record<string, unknown> | undefined;
		confidence?: number | undefined;
	},
	{
		outcome: string;
		decisionId: string;
		metadata?: Record<string, unknown> | undefined;
		confidence?: number | undefined;
	}
>;
export declare const resourceAllocatedEventSchema: z.ZodObject<
	{
		resourceId: z.ZodString;
		taskId: z.ZodString;
		amount: z.ZodOptional<z.ZodNumber>;
		unit: z.ZodOptional<z.ZodString>;
	},
	'strip',
	z.ZodTypeAny,
	{
		taskId: string;
		resourceId: string;
		unit?: string | undefined;
		amount?: number | undefined;
	},
	{
		taskId: string;
		resourceId: string;
		unit?: string | undefined;
		amount?: number | undefined;
	}
>;
export declare const agentCoordinationStartedEventSchema: z.ZodObject<
	{
		type: z.ZodLiteral<'agent_coordination_started'>;
		timestamp: z.ZodString;
		planId: z.ZodString;
		masterAgentId: z.ZodString;
		coordinatedAgents: z.ZodArray<
			z.ZodObject<
				{
					agentId: z.ZodString;
					specialization: z.ZodString;
					assignedTasks: z.ZodArray<z.ZodString, 'many'>;
					priority: z.ZodNumber;
				},
				'strip',
				z.ZodTypeAny,
				{
					priority: number;
					agentId: string;
					specialization: string;
					assignedTasks: string[];
				},
				{
					priority: number;
					agentId: string;
					specialization: string;
					assignedTasks: string[];
				}
			>,
			'many'
		>;
		coordinationStrategy: z.ZodEnum<['parallel', 'sequential', 'hierarchical']>;
		estimatedDuration: z.ZodNumber;
		metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
	},
	'strip',
	z.ZodTypeAny,
	{
		type: 'agent_coordination_started';
		planId: string;
		estimatedDuration: number;
		timestamp: string;
		masterAgentId: string;
		coordinatedAgents: {
			priority: number;
			agentId: string;
			specialization: string;
			assignedTasks: string[];
		}[];
		coordinationStrategy: 'parallel' | 'sequential' | 'hierarchical';
		metadata?: Record<string, unknown> | undefined;
	},
	{
		type: 'agent_coordination_started';
		planId: string;
		estimatedDuration: number;
		timestamp: string;
		masterAgentId: string;
		coordinatedAgents: {
			priority: number;
			agentId: string;
			specialization: string;
			assignedTasks: string[];
		}[];
		coordinationStrategy: 'parallel' | 'sequential' | 'hierarchical';
		metadata?: Record<string, unknown> | undefined;
	}
>;
export declare const scheduleAdjustedEventSchema: z.ZodObject<
	{
		type: z.ZodLiteral<'schedule_adjusted'>;
		timestamp: z.ZodString;
		scheduleId: z.ZodString;
		planId: z.ZodString;
		adjustmentType: z.ZodEnum<
			[
				'resource_reallocation',
				'agent_reallocation',
				'priority_adjustment',
				'adaptive_optimization',
			]
		>;
		previousSchedule: z.ZodObject<
			{
				totalAgents: z.ZodNumber;
				estimatedCompletion: z.ZodString;
				resourceAllocation: z.ZodObject<
					{
						memoryMB: z.ZodNumber;
						cpuPercent: z.ZodNumber;
					},
					'strip',
					z.ZodTypeAny,
					{
						memoryMB: number;
						cpuPercent: number;
					},
					{
						memoryMB: number;
						cpuPercent: number;
					}
				>;
			},
			'strip',
			z.ZodTypeAny,
			{
				totalAgents: number;
				estimatedCompletion: string;
				resourceAllocation: {
					memoryMB: number;
					cpuPercent: number;
				};
			},
			{
				totalAgents: number;
				estimatedCompletion: string;
				resourceAllocation: {
					memoryMB: number;
					cpuPercent: number;
				};
			}
		>;
		newSchedule: z.ZodObject<
			{
				totalAgents: z.ZodNumber;
				estimatedCompletion: z.ZodString;
				resourceAllocation: z.ZodObject<
					{
						memoryMB: z.ZodNumber;
						cpuPercent: z.ZodNumber;
					},
					'strip',
					z.ZodTypeAny,
					{
						memoryMB: number;
						cpuPercent: number;
					},
					{
						memoryMB: number;
						cpuPercent: number;
					}
				>;
			},
			'strip',
			z.ZodTypeAny,
			{
				totalAgents: number;
				estimatedCompletion: string;
				resourceAllocation: {
					memoryMB: number;
					cpuPercent: number;
				};
			},
			{
				totalAgents: number;
				estimatedCompletion: string;
				resourceAllocation: {
					memoryMB: number;
					cpuPercent: number;
				};
			}
		>;
		adjustmentReason: z.ZodString;
		triggeringMetrics: z.ZodObject<
			{
				currentLoad: z.ZodNumber;
				averageResponseTime: z.ZodNumber;
				errorRate: z.ZodNumber;
			},
			'strip',
			z.ZodTypeAny,
			{
				currentLoad: number;
				averageResponseTime: number;
				errorRate: number;
			},
			{
				currentLoad: number;
				averageResponseTime: number;
				errorRate: number;
			}
		>;
		expectedImprovement: z.ZodObject<
			{
				loadReduction: z.ZodNumber;
				responseTimeImprovement: z.ZodNumber;
				errorRateReduction: z.ZodNumber;
			},
			'strip',
			z.ZodTypeAny,
			{
				loadReduction: number;
				responseTimeImprovement: number;
				errorRateReduction: number;
			},
			{
				loadReduction: number;
				responseTimeImprovement: number;
				errorRateReduction: number;
			}
		>;
	},
	'strip',
	z.ZodTypeAny,
	{
		type: 'schedule_adjusted';
		planId: string;
		timestamp: string;
		scheduleId: string;
		adjustmentType:
			| 'resource_reallocation'
			| 'agent_reallocation'
			| 'priority_adjustment'
			| 'adaptive_optimization';
		previousSchedule: {
			totalAgents: number;
			estimatedCompletion: string;
			resourceAllocation: {
				memoryMB: number;
				cpuPercent: number;
			};
		};
		newSchedule: {
			totalAgents: number;
			estimatedCompletion: string;
			resourceAllocation: {
				memoryMB: number;
				cpuPercent: number;
			};
		};
		adjustmentReason: string;
		triggeringMetrics: {
			currentLoad: number;
			averageResponseTime: number;
			errorRate: number;
		};
		expectedImprovement: {
			loadReduction: number;
			responseTimeImprovement: number;
			errorRateReduction: number;
		};
	},
	{
		type: 'schedule_adjusted';
		planId: string;
		timestamp: string;
		scheduleId: string;
		adjustmentType:
			| 'resource_reallocation'
			| 'agent_reallocation'
			| 'priority_adjustment'
			| 'adaptive_optimization';
		previousSchedule: {
			totalAgents: number;
			estimatedCompletion: string;
			resourceAllocation: {
				memoryMB: number;
				cpuPercent: number;
			};
		};
		newSchedule: {
			totalAgents: number;
			estimatedCompletion: string;
			resourceAllocation: {
				memoryMB: number;
				cpuPercent: number;
			};
		};
		adjustmentReason: string;
		triggeringMetrics: {
			currentLoad: number;
			averageResponseTime: number;
			errorRate: number;
		};
		expectedImprovement: {
			loadReduction: number;
			responseTimeImprovement: number;
			errorRateReduction: number;
		};
	}
>;
export declare const toolLayerInvokedEventSchema: z.ZodObject<
	{
		type: z.ZodLiteral<'tool_layer_invoked'>;
		timestamp: z.ZodString;
		invocationId: z.ZodString;
		agentId: z.ZodString;
		toolLayer: z.ZodEnum<['intelligence', 'execution', 'coordination', 'observation']>;
		toolsInvoked: z.ZodArray<
			z.ZodObject<
				{
					toolName: z.ZodString;
					parameters: z.ZodRecord<z.ZodString, z.ZodUnknown>;
					estimatedDuration: z.ZodNumber;
				},
				'strip',
				z.ZodTypeAny,
				{
					estimatedDuration: number;
					toolName: string;
					parameters: Record<string, unknown>;
				},
				{
					estimatedDuration: number;
					toolName: string;
					parameters: Record<string, unknown>;
				}
			>,
			'many'
		>;
		invocationContext: z.ZodObject<
			{
				taskId: z.ZodString;
				stepId: z.ZodOptional<z.ZodString>;
				priority: z.ZodEnum<['low', 'medium', 'high', 'critical']>;
			},
			'strip',
			z.ZodTypeAny,
			{
				priority: 'critical' | 'low' | 'medium' | 'high';
				taskId: string;
				stepId?: string | undefined;
			},
			{
				priority: 'critical' | 'low' | 'medium' | 'high';
				taskId: string;
				stepId?: string | undefined;
			}
		>;
		parallelExecution: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
		timeoutMs: z.ZodOptional<z.ZodNumber>;
		securityContext: z.ZodOptional<
			z.ZodObject<
				{
					permissionLevel: z.ZodEnum<['low', 'medium', 'high']>;
					allowedDomains: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
					restrictedOperations: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
				},
				'strip',
				z.ZodTypeAny,
				{
					permissionLevel: 'low' | 'medium' | 'high';
					allowedDomains?: string[] | undefined;
					restrictedOperations?: string[] | undefined;
				},
				{
					permissionLevel: 'low' | 'medium' | 'high';
					allowedDomains?: string[] | undefined;
					restrictedOperations?: string[] | undefined;
				}
			>
		>;
	},
	'strip',
	z.ZodTypeAny,
	{
		type: 'tool_layer_invoked';
		agentId: string;
		timestamp: string;
		invocationId: string;
		toolLayer: 'intelligence' | 'execution' | 'coordination' | 'observation';
		toolsInvoked: {
			estimatedDuration: number;
			toolName: string;
			parameters: Record<string, unknown>;
		}[];
		invocationContext: {
			priority: 'critical' | 'low' | 'medium' | 'high';
			taskId: string;
			stepId?: string | undefined;
		};
		parallelExecution: boolean;
		timeoutMs?: number | undefined;
		securityContext?:
			| {
					permissionLevel: 'low' | 'medium' | 'high';
					allowedDomains?: string[] | undefined;
					restrictedOperations?: string[] | undefined;
			  }
			| undefined;
	},
	{
		type: 'tool_layer_invoked';
		agentId: string;
		timestamp: string;
		invocationId: string;
		toolLayer: 'intelligence' | 'execution' | 'coordination' | 'observation';
		toolsInvoked: {
			estimatedDuration: number;
			toolName: string;
			parameters: Record<string, unknown>;
		}[];
		invocationContext: {
			priority: 'critical' | 'low' | 'medium' | 'high';
			taskId: string;
			stepId?: string | undefined;
		};
		timeoutMs?: number | undefined;
		parallelExecution?: boolean | undefined;
		securityContext?:
			| {
					permissionLevel: 'low' | 'medium' | 'high';
					allowedDomains?: string[] | undefined;
					restrictedOperations?: string[] | undefined;
			  }
			| undefined;
	}
>;
export type TaskCreatedEvent = z.infer<typeof taskCreatedEventSchema>;
export type TaskStartedEvent = z.infer<typeof taskStartedEventSchema>;
export type TaskCompletedEvent = z.infer<typeof taskCompletedEventSchema>;
export type TaskFailedEvent = z.infer<typeof taskFailedEventSchema>;
export type AgentAssignedEvent = z.infer<typeof agentAssignedEventSchema>;
export type AgentFreedEvent = z.infer<typeof agentFreedEventSchema>;
export type PlanCreatedEvent = z.infer<typeof planCreatedEventSchema>;
export type PlanUpdatedEvent = z.infer<typeof planUpdatedEventSchema>;
export type CoordinationStartedEvent = z.infer<typeof coordinationStartedEventSchema>;
export type DecisionMadeEvent = z.infer<typeof decisionMadeEventSchema>;
export type ResourceAllocatedEvent = z.infer<typeof resourceAllocatedEventSchema>;
export type AgentCoordinationStartedEvent = z.infer<typeof agentCoordinationStartedEventSchema>;
export type ScheduleAdjustedEvent = z.infer<typeof scheduleAdjustedEventSchema>;
export type ToolLayerInvokedEvent = z.infer<typeof toolLayerInvokedEventSchema>;
export declare const ORCHESTRATION_EVENT_SCHEMAS: {
	readonly 'orchestration.task.created': z.ZodObject<
		{
			taskId: z.ZodString;
			input: z.ZodUnknown;
			metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
		},
		'strip',
		z.ZodTypeAny,
		{
			taskId: string;
			input?: unknown;
			metadata?: Record<string, unknown> | undefined;
		},
		{
			taskId: string;
			input?: unknown;
			metadata?: Record<string, unknown> | undefined;
		}
	>;
	readonly 'orchestration.task.started': z.ZodObject<
		{
			taskId: z.ZodString;
			agentId: z.ZodOptional<z.ZodString>;
			attempt: z.ZodOptional<z.ZodNumber>;
			metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
		},
		'strip',
		z.ZodTypeAny,
		{
			taskId: string;
			metadata?: Record<string, unknown> | undefined;
			agentId?: string | undefined;
			attempt?: number | undefined;
		},
		{
			taskId: string;
			metadata?: Record<string, unknown> | undefined;
			agentId?: string | undefined;
			attempt?: number | undefined;
		}
	>;
	readonly 'orchestration.task.completed': z.ZodObject<
		{
			taskId: z.ZodString;
			result: z.ZodUnknown;
			durationMs: z.ZodOptional<z.ZodNumber>;
			metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
		},
		'strip',
		z.ZodTypeAny,
		{
			taskId: string;
			metadata?: Record<string, unknown> | undefined;
			result?: unknown;
			durationMs?: number | undefined;
		},
		{
			taskId: string;
			metadata?: Record<string, unknown> | undefined;
			result?: unknown;
			durationMs?: number | undefined;
		}
	>;
	readonly 'orchestration.task.failed': z.ZodObject<
		{
			taskId: z.ZodString;
			error: z.ZodString;
			retryable: z.ZodOptional<z.ZodBoolean>;
			metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
		},
		'strip',
		z.ZodTypeAny,
		{
			error: string;
			taskId: string;
			metadata?: Record<string, unknown> | undefined;
			retryable?: boolean | undefined;
		},
		{
			error: string;
			taskId: string;
			metadata?: Record<string, unknown> | undefined;
			retryable?: boolean | undefined;
		}
	>;
	readonly 'orchestration.agent.assigned': z.ZodObject<
		{
			agentId: z.ZodString;
			taskId: z.ZodString;
			capabilities: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
		},
		'strip',
		z.ZodTypeAny,
		{
			agentId: string;
			taskId: string;
			capabilities?: string[] | undefined;
		},
		{
			agentId: string;
			taskId: string;
			capabilities?: string[] | undefined;
		}
	>;
	readonly 'orchestration.agent.freed': z.ZodObject<
		{
			agentId: z.ZodString;
			taskId: z.ZodOptional<z.ZodString>;
			reason: z.ZodOptional<z.ZodString>;
		},
		'strip',
		z.ZodTypeAny,
		{
			agentId: string;
			reason?: string | undefined;
			taskId?: string | undefined;
		},
		{
			agentId: string;
			reason?: string | undefined;
			taskId?: string | undefined;
		}
	>;
	readonly 'orchestration.plan.created': z.ZodObject<
		{
			planId: z.ZodString;
			summary: z.ZodOptional<z.ZodString>;
			steps: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
		},
		'strip',
		z.ZodTypeAny,
		{
			planId: string;
			summary?: string | undefined;
			steps?: string[] | undefined;
		},
		{
			planId: string;
			summary?: string | undefined;
			steps?: string[] | undefined;
		}
	>;
	readonly 'orchestration.plan.updated': z.ZodObject<
		{
			planId: z.ZodString;
			changes: z.ZodArray<z.ZodString, 'many'>;
		},
		'strip',
		z.ZodTypeAny,
		{
			planId: string;
			changes: string[];
		},
		{
			planId: string;
			changes: string[];
		}
	>;
	readonly 'orchestration.coordination.started': z.ZodObject<
		{
			strategy: z.ZodString;
			runId: z.ZodString;
			participants: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
		},
		'strip',
		z.ZodTypeAny,
		{
			runId: string;
			strategy: string;
			participants?: string[] | undefined;
		},
		{
			runId: string;
			strategy: string;
			participants?: string[] | undefined;
		}
	>;
	readonly 'orchestration.decision.made': z.ZodObject<
		{
			decisionId: z.ZodString;
			outcome: z.ZodString;
			confidence: z.ZodOptional<z.ZodNumber>;
			metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
		},
		'strip',
		z.ZodTypeAny,
		{
			outcome: string;
			decisionId: string;
			metadata?: Record<string, unknown> | undefined;
			confidence?: number | undefined;
		},
		{
			outcome: string;
			decisionId: string;
			metadata?: Record<string, unknown> | undefined;
			confidence?: number | undefined;
		}
	>;
	readonly 'orchestration.resource.allocated': z.ZodObject<
		{
			resourceId: z.ZodString;
			taskId: z.ZodString;
			amount: z.ZodOptional<z.ZodNumber>;
			unit: z.ZodOptional<z.ZodString>;
		},
		'strip',
		z.ZodTypeAny,
		{
			taskId: string;
			resourceId: string;
			unit?: string | undefined;
			amount?: number | undefined;
		},
		{
			taskId: string;
			resourceId: string;
			unit?: string | undefined;
			amount?: number | undefined;
		}
	>;
	readonly agent_coordination_started: z.ZodObject<
		{
			type: z.ZodLiteral<'agent_coordination_started'>;
			timestamp: z.ZodString;
			planId: z.ZodString;
			masterAgentId: z.ZodString;
			coordinatedAgents: z.ZodArray<
				z.ZodObject<
					{
						agentId: z.ZodString;
						specialization: z.ZodString;
						assignedTasks: z.ZodArray<z.ZodString, 'many'>;
						priority: z.ZodNumber;
					},
					'strip',
					z.ZodTypeAny,
					{
						priority: number;
						agentId: string;
						specialization: string;
						assignedTasks: string[];
					},
					{
						priority: number;
						agentId: string;
						specialization: string;
						assignedTasks: string[];
					}
				>,
				'many'
			>;
			coordinationStrategy: z.ZodEnum<['parallel', 'sequential', 'hierarchical']>;
			estimatedDuration: z.ZodNumber;
			metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
		},
		'strip',
		z.ZodTypeAny,
		{
			type: 'agent_coordination_started';
			planId: string;
			estimatedDuration: number;
			timestamp: string;
			masterAgentId: string;
			coordinatedAgents: {
				priority: number;
				agentId: string;
				specialization: string;
				assignedTasks: string[];
			}[];
			coordinationStrategy: 'parallel' | 'sequential' | 'hierarchical';
			metadata?: Record<string, unknown> | undefined;
		},
		{
			type: 'agent_coordination_started';
			planId: string;
			estimatedDuration: number;
			timestamp: string;
			masterAgentId: string;
			coordinatedAgents: {
				priority: number;
				agentId: string;
				specialization: string;
				assignedTasks: string[];
			}[];
			coordinationStrategy: 'parallel' | 'sequential' | 'hierarchical';
			metadata?: Record<string, unknown> | undefined;
		}
	>;
	readonly schedule_adjusted: z.ZodObject<
		{
			type: z.ZodLiteral<'schedule_adjusted'>;
			timestamp: z.ZodString;
			scheduleId: z.ZodString;
			planId: z.ZodString;
			adjustmentType: z.ZodEnum<
				[
					'resource_reallocation',
					'agent_reallocation',
					'priority_adjustment',
					'adaptive_optimization',
				]
			>;
			previousSchedule: z.ZodObject<
				{
					totalAgents: z.ZodNumber;
					estimatedCompletion: z.ZodString;
					resourceAllocation: z.ZodObject<
						{
							memoryMB: z.ZodNumber;
							cpuPercent: z.ZodNumber;
						},
						'strip',
						z.ZodTypeAny,
						{
							memoryMB: number;
							cpuPercent: number;
						},
						{
							memoryMB: number;
							cpuPercent: number;
						}
					>;
				},
				'strip',
				z.ZodTypeAny,
				{
					totalAgents: number;
					estimatedCompletion: string;
					resourceAllocation: {
						memoryMB: number;
						cpuPercent: number;
					};
				},
				{
					totalAgents: number;
					estimatedCompletion: string;
					resourceAllocation: {
						memoryMB: number;
						cpuPercent: number;
					};
				}
			>;
			newSchedule: z.ZodObject<
				{
					totalAgents: z.ZodNumber;
					estimatedCompletion: z.ZodString;
					resourceAllocation: z.ZodObject<
						{
							memoryMB: z.ZodNumber;
							cpuPercent: z.ZodNumber;
						},
						'strip',
						z.ZodTypeAny,
						{
							memoryMB: number;
							cpuPercent: number;
						},
						{
							memoryMB: number;
							cpuPercent: number;
						}
					>;
				},
				'strip',
				z.ZodTypeAny,
				{
					totalAgents: number;
					estimatedCompletion: string;
					resourceAllocation: {
						memoryMB: number;
						cpuPercent: number;
					};
				},
				{
					totalAgents: number;
					estimatedCompletion: string;
					resourceAllocation: {
						memoryMB: number;
						cpuPercent: number;
					};
				}
			>;
			adjustmentReason: z.ZodString;
			triggeringMetrics: z.ZodObject<
				{
					currentLoad: z.ZodNumber;
					averageResponseTime: z.ZodNumber;
					errorRate: z.ZodNumber;
				},
				'strip',
				z.ZodTypeAny,
				{
					currentLoad: number;
					averageResponseTime: number;
					errorRate: number;
				},
				{
					currentLoad: number;
					averageResponseTime: number;
					errorRate: number;
				}
			>;
			expectedImprovement: z.ZodObject<
				{
					loadReduction: z.ZodNumber;
					responseTimeImprovement: z.ZodNumber;
					errorRateReduction: z.ZodNumber;
				},
				'strip',
				z.ZodTypeAny,
				{
					loadReduction: number;
					responseTimeImprovement: number;
					errorRateReduction: number;
				},
				{
					loadReduction: number;
					responseTimeImprovement: number;
					errorRateReduction: number;
				}
			>;
		},
		'strip',
		z.ZodTypeAny,
		{
			type: 'schedule_adjusted';
			planId: string;
			timestamp: string;
			scheduleId: string;
			adjustmentType:
				| 'resource_reallocation'
				| 'agent_reallocation'
				| 'priority_adjustment'
				| 'adaptive_optimization';
			previousSchedule: {
				totalAgents: number;
				estimatedCompletion: string;
				resourceAllocation: {
					memoryMB: number;
					cpuPercent: number;
				};
			};
			newSchedule: {
				totalAgents: number;
				estimatedCompletion: string;
				resourceAllocation: {
					memoryMB: number;
					cpuPercent: number;
				};
			};
			adjustmentReason: string;
			triggeringMetrics: {
				currentLoad: number;
				averageResponseTime: number;
				errorRate: number;
			};
			expectedImprovement: {
				loadReduction: number;
				responseTimeImprovement: number;
				errorRateReduction: number;
			};
		},
		{
			type: 'schedule_adjusted';
			planId: string;
			timestamp: string;
			scheduleId: string;
			adjustmentType:
				| 'resource_reallocation'
				| 'agent_reallocation'
				| 'priority_adjustment'
				| 'adaptive_optimization';
			previousSchedule: {
				totalAgents: number;
				estimatedCompletion: string;
				resourceAllocation: {
					memoryMB: number;
					cpuPercent: number;
				};
			};
			newSchedule: {
				totalAgents: number;
				estimatedCompletion: string;
				resourceAllocation: {
					memoryMB: number;
					cpuPercent: number;
				};
			};
			adjustmentReason: string;
			triggeringMetrics: {
				currentLoad: number;
				averageResponseTime: number;
				errorRate: number;
			};
			expectedImprovement: {
				loadReduction: number;
				responseTimeImprovement: number;
				errorRateReduction: number;
			};
		}
	>;
	readonly tool_layer_invoked: z.ZodObject<
		{
			type: z.ZodLiteral<'tool_layer_invoked'>;
			timestamp: z.ZodString;
			invocationId: z.ZodString;
			agentId: z.ZodString;
			toolLayer: z.ZodEnum<['intelligence', 'execution', 'coordination', 'observation']>;
			toolsInvoked: z.ZodArray<
				z.ZodObject<
					{
						toolName: z.ZodString;
						parameters: z.ZodRecord<z.ZodString, z.ZodUnknown>;
						estimatedDuration: z.ZodNumber;
					},
					'strip',
					z.ZodTypeAny,
					{
						estimatedDuration: number;
						toolName: string;
						parameters: Record<string, unknown>;
					},
					{
						estimatedDuration: number;
						toolName: string;
						parameters: Record<string, unknown>;
					}
				>,
				'many'
			>;
			invocationContext: z.ZodObject<
				{
					taskId: z.ZodString;
					stepId: z.ZodOptional<z.ZodString>;
					priority: z.ZodEnum<['low', 'medium', 'high', 'critical']>;
				},
				'strip',
				z.ZodTypeAny,
				{
					priority: 'critical' | 'low' | 'medium' | 'high';
					taskId: string;
					stepId?: string | undefined;
				},
				{
					priority: 'critical' | 'low' | 'medium' | 'high';
					taskId: string;
					stepId?: string | undefined;
				}
			>;
			parallelExecution: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
			timeoutMs: z.ZodOptional<z.ZodNumber>;
			securityContext: z.ZodOptional<
				z.ZodObject<
					{
						permissionLevel: z.ZodEnum<['low', 'medium', 'high']>;
						allowedDomains: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
						restrictedOperations: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
					},
					'strip',
					z.ZodTypeAny,
					{
						permissionLevel: 'low' | 'medium' | 'high';
						allowedDomains?: string[] | undefined;
						restrictedOperations?: string[] | undefined;
					},
					{
						permissionLevel: 'low' | 'medium' | 'high';
						allowedDomains?: string[] | undefined;
						restrictedOperations?: string[] | undefined;
					}
				>
			>;
		},
		'strip',
		z.ZodTypeAny,
		{
			type: 'tool_layer_invoked';
			agentId: string;
			timestamp: string;
			invocationId: string;
			toolLayer: 'intelligence' | 'execution' | 'coordination' | 'observation';
			toolsInvoked: {
				estimatedDuration: number;
				toolName: string;
				parameters: Record<string, unknown>;
			}[];
			invocationContext: {
				priority: 'critical' | 'low' | 'medium' | 'high';
				taskId: string;
				stepId?: string | undefined;
			};
			parallelExecution: boolean;
			timeoutMs?: number | undefined;
			securityContext?:
				| {
						permissionLevel: 'low' | 'medium' | 'high';
						allowedDomains?: string[] | undefined;
						restrictedOperations?: string[] | undefined;
				  }
				| undefined;
		},
		{
			type: 'tool_layer_invoked';
			agentId: string;
			timestamp: string;
			invocationId: string;
			toolLayer: 'intelligence' | 'execution' | 'coordination' | 'observation';
			toolsInvoked: {
				estimatedDuration: number;
				toolName: string;
				parameters: Record<string, unknown>;
			}[];
			invocationContext: {
				priority: 'critical' | 'low' | 'medium' | 'high';
				taskId: string;
				stepId?: string | undefined;
			};
			timeoutMs?: number | undefined;
			parallelExecution?: boolean | undefined;
			securityContext?:
				| {
						permissionLevel: 'low' | 'medium' | 'high';
						allowedDomains?: string[] | undefined;
						restrictedOperations?: string[] | undefined;
				  }
				| undefined;
		}
	>;
};
//# sourceMappingURL=orchestration-events.d.ts.map
