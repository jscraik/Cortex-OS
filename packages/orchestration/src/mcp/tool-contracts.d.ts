import { z } from 'zod';
import { AgentRole, OrchestrationStrategy, TaskStatus } from '../types.js';
import { ToolErrorCode } from './tool-errors.js';
export declare const PlanWorkflowInputSchema: z.ZodObject<
	{
		workflowName: z.ZodString;
		goal: z.ZodString;
		preferredStrategy: z.ZodOptional<z.ZodNativeEnum<typeof OrchestrationStrategy>>;
		context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
		tasks: z.ZodArray<
			z.ZodObject<
				{
					title: z.ZodString;
					summary: z.ZodString;
					requiredCapabilities: z.ZodArray<z.ZodString, 'many'>;
					dependencies: z.ZodArray<z.ZodString, 'many'>;
					estimatedDurationMinutes: z.ZodOptional<z.ZodNumber>;
				},
				'strip',
				z.ZodTypeAny,
				{
					summary: string;
					title: string;
					dependencies: string[];
					requiredCapabilities: string[];
					estimatedDurationMinutes?: number | undefined;
				},
				{
					summary: string;
					title: string;
					dependencies: string[];
					requiredCapabilities: string[];
					estimatedDurationMinutes?: number | undefined;
				}
			>,
			'many'
		>;
	},
	'strip',
	z.ZodTypeAny,
	{
		tasks: {
			summary: string;
			title: string;
			dependencies: string[];
			requiredCapabilities: string[];
			estimatedDurationMinutes?: number | undefined;
		}[];
		workflowName: string;
		goal: string;
		context?: Record<string, unknown> | undefined;
		preferredStrategy?: OrchestrationStrategy | undefined;
	},
	{
		tasks: {
			summary: string;
			title: string;
			dependencies: string[];
			requiredCapabilities: string[];
			estimatedDurationMinutes?: number | undefined;
		}[];
		workflowName: string;
		goal: string;
		context?: Record<string, unknown> | undefined;
		preferredStrategy?: OrchestrationStrategy | undefined;
	}
>;
export declare const PlanWorkflowResultSchema: z.ZodObject<
	{
		planId: z.ZodString;
		workflowName: z.ZodString;
		recommendedStrategy: z.ZodNativeEnum<typeof OrchestrationStrategy>;
		phases: z.ZodArray<
			z.ZodObject<
				{
					id: z.ZodString;
					name: z.ZodString;
					objective: z.ZodString;
					dependencies: z.ZodArray<z.ZodString, 'many'>;
					tasks: z.ZodArray<
						z.ZodObject<
							{
								id: z.ZodString;
								title: z.ZodString;
								status: z.ZodNativeEnum<typeof TaskStatus>;
								requiredCapabilities: z.ZodArray<z.ZodString, 'many'>;
								estimatedDurationMinutes: z.ZodOptional<z.ZodNumber>;
							},
							'strip',
							z.ZodTypeAny,
							{
								status: TaskStatus;
								id: string;
								title: string;
								requiredCapabilities: string[];
								estimatedDurationMinutes?: number | undefined;
							},
							{
								status: TaskStatus;
								id: string;
								title: string;
								requiredCapabilities: string[];
								estimatedDurationMinutes?: number | undefined;
							}
						>,
						'many'
					>;
				},
				'strip',
				z.ZodTypeAny,
				{
					id: string;
					name: string;
					dependencies: string[];
					tasks: {
						status: TaskStatus;
						id: string;
						title: string;
						requiredCapabilities: string[];
						estimatedDurationMinutes?: number | undefined;
					}[];
					objective: string;
				},
				{
					id: string;
					name: string;
					dependencies: string[];
					tasks: {
						status: TaskStatus;
						id: string;
						title: string;
						requiredCapabilities: string[];
						estimatedDurationMinutes?: number | undefined;
					}[];
					objective: string;
				}
			>,
			'many'
		>;
		estimatedDurationMinutes: z.ZodNumber;
		confidence: z.ZodNumber;
		createdAt: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		createdAt: string;
		planId: string;
		confidence: number;
		recommendedStrategy: OrchestrationStrategy;
		phases: {
			id: string;
			name: string;
			dependencies: string[];
			tasks: {
				status: TaskStatus;
				id: string;
				title: string;
				requiredCapabilities: string[];
				estimatedDurationMinutes?: number | undefined;
			}[];
			objective: string;
		}[];
		workflowName: string;
		estimatedDurationMinutes: number;
	},
	{
		createdAt: string;
		planId: string;
		confidence: number;
		recommendedStrategy: OrchestrationStrategy;
		phases: {
			id: string;
			name: string;
			dependencies: string[];
			tasks: {
				status: TaskStatus;
				id: string;
				title: string;
				requiredCapabilities: string[];
				estimatedDurationMinutes?: number | undefined;
			}[];
			objective: string;
		}[];
		workflowName: string;
		estimatedDurationMinutes: number;
	}
>;
export declare const UpdateTaskStatusInputSchema: z.ZodObject<
	{
		taskId: z.ZodString;
		status: z.ZodNativeEnum<typeof TaskStatus>;
		progress: z.ZodOptional<
			z.ZodObject<
				{
					percentage: z.ZodNumber;
					message: z.ZodOptional<z.ZodString>;
				},
				'strip',
				z.ZodTypeAny,
				{
					percentage: number;
					message?: string | undefined;
				},
				{
					percentage: number;
					message?: string | undefined;
				}
			>
		>;
		audit: z.ZodOptional<
			z.ZodObject<
				{
					actor: z.ZodString;
					reason: z.ZodOptional<z.ZodString>;
				},
				'strip',
				z.ZodTypeAny,
				{
					actor: string;
					reason?: string | undefined;
				},
				{
					actor: string;
					reason?: string | undefined;
				}
			>
		>;
	},
	'strip',
	z.ZodTypeAny,
	{
		status: TaskStatus;
		taskId: string;
		audit?:
			| {
					actor: string;
					reason?: string | undefined;
			  }
			| undefined;
		progress?:
			| {
					percentage: number;
					message?: string | undefined;
			  }
			| undefined;
	},
	{
		status: TaskStatus;
		taskId: string;
		audit?:
			| {
					actor: string;
					reason?: string | undefined;
			  }
			| undefined;
		progress?:
			| {
					percentage: number;
					message?: string | undefined;
			  }
			| undefined;
	}
>;
export declare const UpdateTaskStatusResultSchema: z.ZodObject<
	{
		taskId: z.ZodString;
		status: z.ZodNativeEnum<typeof TaskStatus>;
		updatedAt: z.ZodString;
		progress: z.ZodOptional<
			z.ZodObject<
				{
					percentage: z.ZodNumber;
					message: z.ZodOptional<z.ZodString>;
				},
				'strip',
				z.ZodTypeAny,
				{
					percentage: number;
					message?: string | undefined;
				},
				{
					percentage: number;
					message?: string | undefined;
				}
			>
		>;
	},
	'strip',
	z.ZodTypeAny,
	{
		status: TaskStatus;
		updatedAt: string;
		taskId: string;
		progress?:
			| {
					percentage: number;
					message?: string | undefined;
			  }
			| undefined;
	},
	{
		status: TaskStatus;
		updatedAt: string;
		taskId: string;
		progress?:
			| {
					percentage: number;
					message?: string | undefined;
			  }
			| undefined;
	}
>;
export declare const GetProcessStatusInputSchema: z.ZodObject<
	{
		workflowId: z.ZodString;
		includeTimeline: z.ZodOptional<z.ZodBoolean>;
		includeMetrics: z.ZodOptional<z.ZodBoolean>;
	},
	'strip',
	z.ZodTypeAny,
	{
		workflowId: string;
		includeTimeline?: boolean | undefined;
		includeMetrics?: boolean | undefined;
	},
	{
		workflowId: string;
		includeTimeline?: boolean | undefined;
		includeMetrics?: boolean | undefined;
	}
>;
export declare const GetProcessStatusResultSchema: z.ZodObject<
	{
		workflowId: z.ZodString;
		status: z.ZodNativeEnum<typeof TaskStatus>;
		lastUpdated: z.ZodString;
		metrics: z.ZodOptional<
			z.ZodObject<
				{
					progress: z.ZodNumber;
					riskLevel: z.ZodEnum<['low', 'medium', 'high']>;
					estimatedMinutesRemaining: z.ZodNumber;
				},
				'strip',
				z.ZodTypeAny,
				{
					progress: number;
					riskLevel: 'low' | 'medium' | 'high';
					estimatedMinutesRemaining: number;
				},
				{
					progress: number;
					riskLevel: 'low' | 'medium' | 'high';
					estimatedMinutesRemaining: number;
				}
			>
		>;
		activeTasks: z.ZodArray<
			z.ZodObject<
				{
					id: z.ZodString;
					title: z.ZodString;
					status: z.ZodNativeEnum<typeof TaskStatus>;
					assigned: z.ZodObject<
						{
							agentId: z.ZodString;
							role: z.ZodNativeEnum<typeof AgentRole>;
						},
						'strip',
						z.ZodTypeAny,
						{
							role: AgentRole;
							agentId: string;
						},
						{
							role: AgentRole;
							agentId: string;
						}
					>;
					startedAt: z.ZodString;
				},
				'strip',
				z.ZodTypeAny,
				{
					status: TaskStatus;
					id: string;
					title: string;
					assigned: {
						role: AgentRole;
						agentId: string;
					};
					startedAt: string;
				},
				{
					status: TaskStatus;
					id: string;
					title: string;
					assigned: {
						role: AgentRole;
						agentId: string;
					};
					startedAt: string;
				}
			>,
			'many'
		>;
		timeline: z.ZodOptional<
			z.ZodArray<
				z.ZodObject<
					{
						timestamp: z.ZodString;
						event: z.ZodString;
						detail: z.ZodString;
					},
					'strip',
					z.ZodTypeAny,
					{
						event: string;
						timestamp: string;
						detail: string;
					},
					{
						event: string;
						timestamp: string;
						detail: string;
					}
				>,
				'many'
			>
		>;
	},
	'strip',
	z.ZodTypeAny,
	{
		status: TaskStatus;
		workflowId: string;
		lastUpdated: string;
		activeTasks: {
			status: TaskStatus;
			id: string;
			title: string;
			assigned: {
				role: AgentRole;
				agentId: string;
			};
			startedAt: string;
		}[];
		metrics?:
			| {
					progress: number;
					riskLevel: 'low' | 'medium' | 'high';
					estimatedMinutesRemaining: number;
			  }
			| undefined;
		timeline?:
			| {
					event: string;
					timestamp: string;
					detail: string;
			  }[]
			| undefined;
	},
	{
		status: TaskStatus;
		workflowId: string;
		lastUpdated: string;
		activeTasks: {
			status: TaskStatus;
			id: string;
			title: string;
			assigned: {
				role: AgentRole;
				agentId: string;
			};
			startedAt: string;
		}[];
		metrics?:
			| {
					progress: number;
					riskLevel: 'low' | 'medium' | 'high';
					estimatedMinutesRemaining: number;
			  }
			| undefined;
		timeline?:
			| {
					event: string;
					timestamp: string;
					detail: string;
			  }[]
			| undefined;
	}
>;
export interface ToolContract {
	name: string;
	description: string;
	inputSchema: z.ZodTypeAny;
	resultSchema: z.ZodTypeAny;
	validateInput: (input: unknown) => unknown;
	errors: Record<ToolErrorCode, string>;
}
export declare const workflowOrchestrationTools: ToolContract[];
export declare const taskManagementTools: ToolContract[];
export declare const processMonitoringTools: ToolContract[];
export declare const orchestrationToolContracts: ToolContract[];
//# sourceMappingURL=tool-contracts.d.ts.map
