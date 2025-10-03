/**
 * nO (Master Agent Loop) Telemetry & Observability Contracts
 *
 * Defines structured logging schemas, OpenTelemetry span definitions,
 * performance metric contracts, and audit trail specifications for nO operations.
 *
 * Co-authored-by: brAInwav Development Team
 */
import { z } from 'zod';
export declare const NoTelemetryContextSchema: z.ZodObject<
	{
		planId: z.ZodString;
		agentId: z.ZodString;
		correlationId: z.ZodString;
		traceId: z.ZodString;
		spanId: z.ZodString;
		parentSpanId: z.ZodOptional<z.ZodString>;
	},
	'strip',
	z.ZodTypeAny,
	{
		traceId: string;
		planId: string;
		agentId: string;
		correlationId: string;
		spanId: string;
		parentSpanId?: string | undefined;
	},
	{
		traceId: string;
		planId: string;
		agentId: string;
		correlationId: string;
		spanId: string;
		parentSpanId?: string | undefined;
	}
>;
export declare const NoTelemetryPayloadSchema: z.ZodObject<
	{
		decision: z.ZodOptional<
			z.ZodObject<
				{
					selectedStrategy: z.ZodString;
					confidence: z.ZodNumber;
					alternatives: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
					reasoning: z.ZodString;
				},
				'strip',
				z.ZodTypeAny,
				{
					reasoning: string;
					selectedStrategy: string;
					confidence: number;
					alternatives: string[];
				},
				{
					reasoning: string;
					selectedStrategy: string;
					confidence: number;
					alternatives?: string[] | undefined;
				}
			>
		>;
		coordination: z.ZodOptional<
			z.ZodObject<
				{
					strategy: z.ZodEnum<['parallel', 'sequential', 'hierarchical', 'adaptive']>;
					totalAgents: z.ZodNumber;
					layers: z.ZodArray<
						z.ZodEnum<['intelligence', 'execution', 'coordination', 'observation']>,
						'many'
					>;
					estimatedDuration: z.ZodNumber;
				},
				'strip',
				z.ZodTypeAny,
				{
					strategy: 'parallel' | 'sequential' | 'hierarchical' | 'adaptive';
					totalAgents: number;
					layers: ('intelligence' | 'execution' | 'coordination' | 'observation')[];
					estimatedDuration: number;
				},
				{
					strategy: 'parallel' | 'sequential' | 'hierarchical' | 'adaptive';
					totalAgents: number;
					layers: ('intelligence' | 'execution' | 'coordination' | 'observation')[];
					estimatedDuration: number;
				}
			>
		>;
		agents: z.ZodOptional<
			z.ZodArray<
				z.ZodObject<
					{
						agentId: z.ZodString;
						specialization: z.ZodString;
						assignedTasks: z.ZodArray<z.ZodString, 'many'>;
						estimatedLoad: z.ZodNumber;
					},
					'strip',
					z.ZodTypeAny,
					{
						agentId: string;
						specialization: string;
						assignedTasks: string[];
						estimatedLoad: number;
					},
					{
						agentId: string;
						specialization: string;
						assignedTasks: string[];
						estimatedLoad: number;
					}
				>,
				'many'
			>
		>;
		metrics: z.ZodDefault<
			z.ZodObject<
				{
					executionTimeMs: z.ZodOptional<z.ZodNumber>;
					memoryUsageMB: z.ZodOptional<z.ZodNumber>;
					cpuUtilizationPercent: z.ZodOptional<z.ZodNumber>;
					coordinationSetupTimeMs: z.ZodOptional<z.ZodNumber>;
					agentAllocationTimeMs: z.ZodOptional<z.ZodNumber>;
					totalMemoryAllocationMB: z.ZodOptional<z.ZodNumber>;
				},
				'strip',
				z.ZodTypeAny,
				{
					executionTimeMs?: number | undefined;
					memoryUsageMB?: number | undefined;
					cpuUtilizationPercent?: number | undefined;
					coordinationSetupTimeMs?: number | undefined;
					agentAllocationTimeMs?: number | undefined;
					totalMemoryAllocationMB?: number | undefined;
				},
				{
					executionTimeMs?: number | undefined;
					memoryUsageMB?: number | undefined;
					cpuUtilizationPercent?: number | undefined;
					coordinationSetupTimeMs?: number | undefined;
					agentAllocationTimeMs?: number | undefined;
					totalMemoryAllocationMB?: number | undefined;
				}
			>
		>;
		tags: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
		thermal: z.ZodOptional<
			z.ZodObject<
				{
					event: z.ZodObject<
						{
							level: z.ZodEnum<['nominal', 'warning', 'critical']>;
							deviceId: z.ZodString;
							temperature: z.ZodNumber;
							throttleHint: z.ZodOptional<z.ZodString>;
							source: z.ZodString;
						},
						'strip',
						z.ZodTypeAny,
						{
							source: string;
							temperature: number;
							level: 'warning' | 'nominal' | 'critical';
							deviceId: string;
							throttleHint?: string | undefined;
						},
						{
							source: string;
							temperature: number;
							level: 'warning' | 'nominal' | 'critical';
							deviceId: string;
							throttleHint?: string | undefined;
						}
					>;
					response: z.ZodObject<
						{
							action: z.ZodEnum<['pause', 'resume', 'cooldown']>;
							paused: z.ZodBoolean;
							fallbackProvider: z.ZodOptional<z.ZodString>;
							cooldownUntil: z.ZodOptional<z.ZodString>;
						},
						'strip',
						z.ZodTypeAny,
						{
							action: 'pause' | 'resume' | 'cooldown';
							paused: boolean;
							fallbackProvider?: string | undefined;
							cooldownUntil?: string | undefined;
						},
						{
							action: 'pause' | 'resume' | 'cooldown';
							paused: boolean;
							fallbackProvider?: string | undefined;
							cooldownUntil?: string | undefined;
						}
					>;
				},
				'strip',
				z.ZodTypeAny,
				{
					response: {
						action: 'pause' | 'resume' | 'cooldown';
						paused: boolean;
						fallbackProvider?: string | undefined;
						cooldownUntil?: string | undefined;
					};
					event: {
						source: string;
						temperature: number;
						level: 'warning' | 'nominal' | 'critical';
						deviceId: string;
						throttleHint?: string | undefined;
					};
				},
				{
					response: {
						action: 'pause' | 'resume' | 'cooldown';
						paused: boolean;
						fallbackProvider?: string | undefined;
						cooldownUntil?: string | undefined;
					};
					event: {
						source: string;
						temperature: number;
						level: 'warning' | 'nominal' | 'critical';
						deviceId: string;
						throttleHint?: string | undefined;
					};
				}
			>
		>;
	},
	'strip',
	z.ZodTypeAny,
	{
		tags: Record<string, string>;
		metrics: {
			executionTimeMs?: number | undefined;
			memoryUsageMB?: number | undefined;
			cpuUtilizationPercent?: number | undefined;
			coordinationSetupTimeMs?: number | undefined;
			agentAllocationTimeMs?: number | undefined;
			totalMemoryAllocationMB?: number | undefined;
		};
		decision?:
			| {
					reasoning: string;
					selectedStrategy: string;
					confidence: number;
					alternatives: string[];
			  }
			| undefined;
		coordination?:
			| {
					strategy: 'parallel' | 'sequential' | 'hierarchical' | 'adaptive';
					totalAgents: number;
					layers: ('intelligence' | 'execution' | 'coordination' | 'observation')[];
					estimatedDuration: number;
			  }
			| undefined;
		agents?:
			| {
					agentId: string;
					specialization: string;
					assignedTasks: string[];
					estimatedLoad: number;
			  }[]
			| undefined;
		thermal?:
			| {
					response: {
						action: 'pause' | 'resume' | 'cooldown';
						paused: boolean;
						fallbackProvider?: string | undefined;
						cooldownUntil?: string | undefined;
					};
					event: {
						source: string;
						temperature: number;
						level: 'warning' | 'nominal' | 'critical';
						deviceId: string;
						throttleHint?: string | undefined;
					};
			  }
			| undefined;
	},
	{
		tags?: Record<string, string> | undefined;
		decision?:
			| {
					reasoning: string;
					selectedStrategy: string;
					confidence: number;
					alternatives?: string[] | undefined;
			  }
			| undefined;
		coordination?:
			| {
					strategy: 'parallel' | 'sequential' | 'hierarchical' | 'adaptive';
					totalAgents: number;
					layers: ('intelligence' | 'execution' | 'coordination' | 'observation')[];
					estimatedDuration: number;
			  }
			| undefined;
		agents?:
			| {
					agentId: string;
					specialization: string;
					assignedTasks: string[];
					estimatedLoad: number;
			  }[]
			| undefined;
		metrics?:
			| {
					executionTimeMs?: number | undefined;
					memoryUsageMB?: number | undefined;
					cpuUtilizationPercent?: number | undefined;
					coordinationSetupTimeMs?: number | undefined;
					agentAllocationTimeMs?: number | undefined;
					totalMemoryAllocationMB?: number | undefined;
			  }
			| undefined;
		thermal?:
			| {
					response: {
						action: 'pause' | 'resume' | 'cooldown';
						paused: boolean;
						fallbackProvider?: string | undefined;
						cooldownUntil?: string | undefined;
					};
					event: {
						source: string;
						temperature: number;
						level: 'warning' | 'nominal' | 'critical';
						deviceId: string;
						throttleHint?: string | undefined;
					};
			  }
			| undefined;
	}
>;
export declare const NoTelemetrySchema: z.ZodObject<
	{
		eventId: z.ZodString;
		timestamp: z.ZodString;
		source: z.ZodEnum<
			[
				'intelligence-scheduler',
				'master-agent-loop',
				'tool-layer',
				'agent-network',
				'adaptive-decision-engine',
				'resource-manager',
				'execution-planner',
			]
		>;
		eventType: z.ZodEnum<
			[
				'decision_made',
				'agent_coordination_started',
				'schedule_adjusted',
				'tool_layer_invoked',
				'performance_metric_recorded',
				'resource_allocated',
				'strategy_adapted',
				'execution_completed',
			]
		>;
		operation: z.ZodString;
		context: z.ZodObject<
			{
				planId: z.ZodString;
				agentId: z.ZodString;
				correlationId: z.ZodString;
				traceId: z.ZodString;
				spanId: z.ZodString;
				parentSpanId: z.ZodOptional<z.ZodString>;
			},
			'strip',
			z.ZodTypeAny,
			{
				traceId: string;
				planId: string;
				agentId: string;
				correlationId: string;
				spanId: string;
				parentSpanId?: string | undefined;
			},
			{
				traceId: string;
				planId: string;
				agentId: string;
				correlationId: string;
				spanId: string;
				parentSpanId?: string | undefined;
			}
		>;
		payload: z.ZodObject<
			{
				decision: z.ZodOptional<
					z.ZodObject<
						{
							selectedStrategy: z.ZodString;
							confidence: z.ZodNumber;
							alternatives: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
							reasoning: z.ZodString;
						},
						'strip',
						z.ZodTypeAny,
						{
							reasoning: string;
							selectedStrategy: string;
							confidence: number;
							alternatives: string[];
						},
						{
							reasoning: string;
							selectedStrategy: string;
							confidence: number;
							alternatives?: string[] | undefined;
						}
					>
				>;
				coordination: z.ZodOptional<
					z.ZodObject<
						{
							strategy: z.ZodEnum<['parallel', 'sequential', 'hierarchical', 'adaptive']>;
							totalAgents: z.ZodNumber;
							layers: z.ZodArray<
								z.ZodEnum<['intelligence', 'execution', 'coordination', 'observation']>,
								'many'
							>;
							estimatedDuration: z.ZodNumber;
						},
						'strip',
						z.ZodTypeAny,
						{
							strategy: 'parallel' | 'sequential' | 'hierarchical' | 'adaptive';
							totalAgents: number;
							layers: ('intelligence' | 'execution' | 'coordination' | 'observation')[];
							estimatedDuration: number;
						},
						{
							strategy: 'parallel' | 'sequential' | 'hierarchical' | 'adaptive';
							totalAgents: number;
							layers: ('intelligence' | 'execution' | 'coordination' | 'observation')[];
							estimatedDuration: number;
						}
					>
				>;
				agents: z.ZodOptional<
					z.ZodArray<
						z.ZodObject<
							{
								agentId: z.ZodString;
								specialization: z.ZodString;
								assignedTasks: z.ZodArray<z.ZodString, 'many'>;
								estimatedLoad: z.ZodNumber;
							},
							'strip',
							z.ZodTypeAny,
							{
								agentId: string;
								specialization: string;
								assignedTasks: string[];
								estimatedLoad: number;
							},
							{
								agentId: string;
								specialization: string;
								assignedTasks: string[];
								estimatedLoad: number;
							}
						>,
						'many'
					>
				>;
				metrics: z.ZodDefault<
					z.ZodObject<
						{
							executionTimeMs: z.ZodOptional<z.ZodNumber>;
							memoryUsageMB: z.ZodOptional<z.ZodNumber>;
							cpuUtilizationPercent: z.ZodOptional<z.ZodNumber>;
							coordinationSetupTimeMs: z.ZodOptional<z.ZodNumber>;
							agentAllocationTimeMs: z.ZodOptional<z.ZodNumber>;
							totalMemoryAllocationMB: z.ZodOptional<z.ZodNumber>;
						},
						'strip',
						z.ZodTypeAny,
						{
							executionTimeMs?: number | undefined;
							memoryUsageMB?: number | undefined;
							cpuUtilizationPercent?: number | undefined;
							coordinationSetupTimeMs?: number | undefined;
							agentAllocationTimeMs?: number | undefined;
							totalMemoryAllocationMB?: number | undefined;
						},
						{
							executionTimeMs?: number | undefined;
							memoryUsageMB?: number | undefined;
							cpuUtilizationPercent?: number | undefined;
							coordinationSetupTimeMs?: number | undefined;
							agentAllocationTimeMs?: number | undefined;
							totalMemoryAllocationMB?: number | undefined;
						}
					>
				>;
				tags: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
				thermal: z.ZodOptional<
					z.ZodObject<
						{
							event: z.ZodObject<
								{
									level: z.ZodEnum<['nominal', 'warning', 'critical']>;
									deviceId: z.ZodString;
									temperature: z.ZodNumber;
									throttleHint: z.ZodOptional<z.ZodString>;
									source: z.ZodString;
								},
								'strip',
								z.ZodTypeAny,
								{
									source: string;
									temperature: number;
									level: 'warning' | 'nominal' | 'critical';
									deviceId: string;
									throttleHint?: string | undefined;
								},
								{
									source: string;
									temperature: number;
									level: 'warning' | 'nominal' | 'critical';
									deviceId: string;
									throttleHint?: string | undefined;
								}
							>;
							response: z.ZodObject<
								{
									action: z.ZodEnum<['pause', 'resume', 'cooldown']>;
									paused: z.ZodBoolean;
									fallbackProvider: z.ZodOptional<z.ZodString>;
									cooldownUntil: z.ZodOptional<z.ZodString>;
								},
								'strip',
								z.ZodTypeAny,
								{
									action: 'pause' | 'resume' | 'cooldown';
									paused: boolean;
									fallbackProvider?: string | undefined;
									cooldownUntil?: string | undefined;
								},
								{
									action: 'pause' | 'resume' | 'cooldown';
									paused: boolean;
									fallbackProvider?: string | undefined;
									cooldownUntil?: string | undefined;
								}
							>;
						},
						'strip',
						z.ZodTypeAny,
						{
							response: {
								action: 'pause' | 'resume' | 'cooldown';
								paused: boolean;
								fallbackProvider?: string | undefined;
								cooldownUntil?: string | undefined;
							};
							event: {
								source: string;
								temperature: number;
								level: 'warning' | 'nominal' | 'critical';
								deviceId: string;
								throttleHint?: string | undefined;
							};
						},
						{
							response: {
								action: 'pause' | 'resume' | 'cooldown';
								paused: boolean;
								fallbackProvider?: string | undefined;
								cooldownUntil?: string | undefined;
							};
							event: {
								source: string;
								temperature: number;
								level: 'warning' | 'nominal' | 'critical';
								deviceId: string;
								throttleHint?: string | undefined;
							};
						}
					>
				>;
			},
			'strip',
			z.ZodTypeAny,
			{
				tags: Record<string, string>;
				metrics: {
					executionTimeMs?: number | undefined;
					memoryUsageMB?: number | undefined;
					cpuUtilizationPercent?: number | undefined;
					coordinationSetupTimeMs?: number | undefined;
					agentAllocationTimeMs?: number | undefined;
					totalMemoryAllocationMB?: number | undefined;
				};
				decision?:
					| {
							reasoning: string;
							selectedStrategy: string;
							confidence: number;
							alternatives: string[];
					  }
					| undefined;
				coordination?:
					| {
							strategy: 'parallel' | 'sequential' | 'hierarchical' | 'adaptive';
							totalAgents: number;
							layers: ('intelligence' | 'execution' | 'coordination' | 'observation')[];
							estimatedDuration: number;
					  }
					| undefined;
				agents?:
					| {
							agentId: string;
							specialization: string;
							assignedTasks: string[];
							estimatedLoad: number;
					  }[]
					| undefined;
				thermal?:
					| {
							response: {
								action: 'pause' | 'resume' | 'cooldown';
								paused: boolean;
								fallbackProvider?: string | undefined;
								cooldownUntil?: string | undefined;
							};
							event: {
								source: string;
								temperature: number;
								level: 'warning' | 'nominal' | 'critical';
								deviceId: string;
								throttleHint?: string | undefined;
							};
					  }
					| undefined;
			},
			{
				tags?: Record<string, string> | undefined;
				decision?:
					| {
							reasoning: string;
							selectedStrategy: string;
							confidence: number;
							alternatives?: string[] | undefined;
					  }
					| undefined;
				coordination?:
					| {
							strategy: 'parallel' | 'sequential' | 'hierarchical' | 'adaptive';
							totalAgents: number;
							layers: ('intelligence' | 'execution' | 'coordination' | 'observation')[];
							estimatedDuration: number;
					  }
					| undefined;
				agents?:
					| {
							agentId: string;
							specialization: string;
							assignedTasks: string[];
							estimatedLoad: number;
					  }[]
					| undefined;
				metrics?:
					| {
							executionTimeMs?: number | undefined;
							memoryUsageMB?: number | undefined;
							cpuUtilizationPercent?: number | undefined;
							coordinationSetupTimeMs?: number | undefined;
							agentAllocationTimeMs?: number | undefined;
							totalMemoryAllocationMB?: number | undefined;
					  }
					| undefined;
				thermal?:
					| {
							response: {
								action: 'pause' | 'resume' | 'cooldown';
								paused: boolean;
								fallbackProvider?: string | undefined;
								cooldownUntil?: string | undefined;
							};
							event: {
								source: string;
								temperature: number;
								level: 'warning' | 'nominal' | 'critical';
								deviceId: string;
								throttleHint?: string | undefined;
							};
					  }
					| undefined;
			}
		>;
		metadata: z.ZodObject<
			{
				version: z.ZodString;
				component: z.ZodString;
				createdBy: z.ZodString;
				brainwav_component: z.ZodString;
				severity: z.ZodDefault<
					z.ZodOptional<z.ZodEnum<['trace', 'debug', 'info', 'warn', 'error', 'fatal']>>
				>;
				environment: z.ZodOptional<z.ZodEnum<['development', 'staging', 'production']>>;
			},
			'strip',
			z.ZodTypeAny,
			{
				version: string;
				component: string;
				createdBy: string;
				brainwav_component: string;
				severity: 'error' | 'fatal' | 'warn' | 'info' | 'debug' | 'trace';
				environment?: 'development' | 'staging' | 'production' | undefined;
			},
			{
				version: string;
				component: string;
				createdBy: string;
				brainwav_component: string;
				severity?: 'error' | 'fatal' | 'warn' | 'info' | 'debug' | 'trace' | undefined;
				environment?: 'development' | 'staging' | 'production' | undefined;
			}
		>;
	},
	'strip',
	z.ZodTypeAny,
	{
		eventType:
			| 'decision_made'
			| 'agent_coordination_started'
			| 'schedule_adjusted'
			| 'tool_layer_invoked'
			| 'performance_metric_recorded'
			| 'resource_allocated'
			| 'strategy_adapted'
			| 'execution_completed';
		metadata: {
			version: string;
			component: string;
			createdBy: string;
			brainwav_component: string;
			severity: 'error' | 'fatal' | 'warn' | 'info' | 'debug' | 'trace';
			environment?: 'development' | 'staging' | 'production' | undefined;
		};
		source:
			| 'intelligence-scheduler'
			| 'master-agent-loop'
			| 'tool-layer'
			| 'agent-network'
			| 'adaptive-decision-engine'
			| 'resource-manager'
			| 'execution-planner';
		eventId: string;
		timestamp: string;
		operation: string;
		context: {
			traceId: string;
			planId: string;
			agentId: string;
			correlationId: string;
			spanId: string;
			parentSpanId?: string | undefined;
		};
		payload: {
			tags: Record<string, string>;
			metrics: {
				executionTimeMs?: number | undefined;
				memoryUsageMB?: number | undefined;
				cpuUtilizationPercent?: number | undefined;
				coordinationSetupTimeMs?: number | undefined;
				agentAllocationTimeMs?: number | undefined;
				totalMemoryAllocationMB?: number | undefined;
			};
			decision?:
				| {
						reasoning: string;
						selectedStrategy: string;
						confidence: number;
						alternatives: string[];
				  }
				| undefined;
			coordination?:
				| {
						strategy: 'parallel' | 'sequential' | 'hierarchical' | 'adaptive';
						totalAgents: number;
						layers: ('intelligence' | 'execution' | 'coordination' | 'observation')[];
						estimatedDuration: number;
				  }
				| undefined;
			agents?:
				| {
						agentId: string;
						specialization: string;
						assignedTasks: string[];
						estimatedLoad: number;
				  }[]
				| undefined;
			thermal?:
				| {
						response: {
							action: 'pause' | 'resume' | 'cooldown';
							paused: boolean;
							fallbackProvider?: string | undefined;
							cooldownUntil?: string | undefined;
						};
						event: {
							source: string;
							temperature: number;
							level: 'warning' | 'nominal' | 'critical';
							deviceId: string;
							throttleHint?: string | undefined;
						};
				  }
				| undefined;
		};
	},
	{
		eventType:
			| 'decision_made'
			| 'agent_coordination_started'
			| 'schedule_adjusted'
			| 'tool_layer_invoked'
			| 'performance_metric_recorded'
			| 'resource_allocated'
			| 'strategy_adapted'
			| 'execution_completed';
		metadata: {
			version: string;
			component: string;
			createdBy: string;
			brainwav_component: string;
			severity?: 'error' | 'fatal' | 'warn' | 'info' | 'debug' | 'trace' | undefined;
			environment?: 'development' | 'staging' | 'production' | undefined;
		};
		source:
			| 'intelligence-scheduler'
			| 'master-agent-loop'
			| 'tool-layer'
			| 'agent-network'
			| 'adaptive-decision-engine'
			| 'resource-manager'
			| 'execution-planner';
		eventId: string;
		timestamp: string;
		operation: string;
		context: {
			traceId: string;
			planId: string;
			agentId: string;
			correlationId: string;
			spanId: string;
			parentSpanId?: string | undefined;
		};
		payload: {
			tags?: Record<string, string> | undefined;
			decision?:
				| {
						reasoning: string;
						selectedStrategy: string;
						confidence: number;
						alternatives?: string[] | undefined;
				  }
				| undefined;
			coordination?:
				| {
						strategy: 'parallel' | 'sequential' | 'hierarchical' | 'adaptive';
						totalAgents: number;
						layers: ('intelligence' | 'execution' | 'coordination' | 'observation')[];
						estimatedDuration: number;
				  }
				| undefined;
			agents?:
				| {
						agentId: string;
						specialization: string;
						assignedTasks: string[];
						estimatedLoad: number;
				  }[]
				| undefined;
			metrics?:
				| {
						executionTimeMs?: number | undefined;
						memoryUsageMB?: number | undefined;
						cpuUtilizationPercent?: number | undefined;
						coordinationSetupTimeMs?: number | undefined;
						agentAllocationTimeMs?: number | undefined;
						totalMemoryAllocationMB?: number | undefined;
				  }
				| undefined;
			thermal?:
				| {
						response: {
							action: 'pause' | 'resume' | 'cooldown';
							paused: boolean;
							fallbackProvider?: string | undefined;
							cooldownUntil?: string | undefined;
						};
						event: {
							source: string;
							temperature: number;
							level: 'warning' | 'nominal' | 'critical';
							deviceId: string;
							throttleHint?: string | undefined;
						};
				  }
				| undefined;
		};
	}
>;
export declare const NoSpanEventSchema: z.ZodObject<
	{
		name: z.ZodString;
		attributes: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
	},
	'strip',
	z.ZodTypeAny,
	{
		name: string;
		attributes: string[];
	},
	{
		name: string;
		attributes?: string[] | undefined;
	}
>;
export declare const NoSpanAttributesSchema: z.ZodObject<
	{
		required: z.ZodArray<z.ZodString, 'many'>;
		optional: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
	},
	'strip',
	z.ZodTypeAny,
	{
		required: string[];
		optional: string[];
	},
	{
		required: string[];
		optional?: string[] | undefined;
	}
>;
export declare const NoSpanDefinitionsSchema: z.ZodObject<
	{
		operationName: z.ZodString;
		spanKind: z.ZodEnum<['internal', 'server', 'client', 'producer', 'consumer']>;
		component: z.ZodString;
		layer: z.ZodEnum<['intelligence', 'execution', 'coordination', 'observation']>;
		attributes: z.ZodObject<
			{
				required: z.ZodArray<z.ZodString, 'many'>;
				optional: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
			},
			'strip',
			z.ZodTypeAny,
			{
				required: string[];
				optional: string[];
			},
			{
				required: string[];
				optional?: string[] | undefined;
			}
		>;
		events: z.ZodDefault<
			z.ZodArray<
				z.ZodObject<
					{
						name: z.ZodString;
						attributes: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
					},
					'strip',
					z.ZodTypeAny,
					{
						name: string;
						attributes: string[];
					},
					{
						name: string;
						attributes?: string[] | undefined;
					}
				>,
				'many'
			>
		>;
		sampleRate: z.ZodDefault<z.ZodNumber>;
		criticality: z.ZodDefault<z.ZodEnum<['low', 'medium', 'high', 'critical']>>;
		documentation: z.ZodOptional<
			z.ZodObject<
				{
					description: z.ZodString;
					examples: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
					troubleshooting: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
				},
				'strip',
				z.ZodTypeAny,
				{
					examples: string[];
					description: string;
					troubleshooting: string[];
				},
				{
					description: string;
					examples?: string[] | undefined;
					troubleshooting?: string[] | undefined;
				}
			>
		>;
	},
	'strip',
	z.ZodTypeAny,
	{
		component: string;
		attributes: {
			required: string[];
			optional: string[];
		};
		operationName: string;
		spanKind: 'server' | 'internal' | 'client' | 'producer' | 'consumer';
		layer: 'intelligence' | 'execution' | 'coordination' | 'observation';
		events: {
			name: string;
			attributes: string[];
		}[];
		sampleRate: number;
		criticality: 'critical' | 'low' | 'medium' | 'high';
		documentation?:
			| {
					examples: string[];
					description: string;
					troubleshooting: string[];
			  }
			| undefined;
	},
	{
		component: string;
		attributes: {
			required: string[];
			optional?: string[] | undefined;
		};
		operationName: string;
		spanKind: 'server' | 'internal' | 'client' | 'producer' | 'consumer';
		layer: 'intelligence' | 'execution' | 'coordination' | 'observation';
		events?:
			| {
					name: string;
					attributes?: string[] | undefined;
			  }[]
			| undefined;
		sampleRate?: number | undefined;
		criticality?: 'critical' | 'low' | 'medium' | 'high' | undefined;
		documentation?:
			| {
					description: string;
					examples?: string[] | undefined;
					troubleshooting?: string[] | undefined;
			  }
			| undefined;
	}
>;
export declare const NoMetricLabelsSchema: z.ZodObject<
	{
		required: z.ZodArray<z.ZodString, 'many'>;
		optional: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
	},
	'strip',
	z.ZodTypeAny,
	{
		required: string[];
		optional: string[];
	},
	{
		required: string[];
		optional?: string[] | undefined;
	}
>;
export declare const NoMetricAlertSchema: z.ZodObject<
	{
		condition: z.ZodString;
		severity: z.ZodEnum<['info', 'warning', 'critical']>;
		description: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		description: string;
		condition: string;
		severity: 'info' | 'warning' | 'critical';
	},
	{
		description: string;
		condition: string;
		severity: 'info' | 'warning' | 'critical';
	}
>;
export declare const NoMetricAggregationSchema: z.ZodObject<
	{
		method: z.ZodEnum<['histogram', 'counter', 'gauge', 'summary']>;
		windowMs: z.ZodNumber;
		retention: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		method: 'histogram' | 'counter' | 'gauge' | 'summary';
		windowMs: number;
		retention: string;
	},
	{
		method: 'histogram' | 'counter' | 'gauge' | 'summary';
		windowMs: number;
		retention: string;
	}
>;
export declare const NoMetricDashboardSchema: z.ZodObject<
	{
		panels: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
		queries: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
	},
	'strip',
	z.ZodTypeAny,
	{
		panels: string[];
		queries: string[];
	},
	{
		panels?: string[] | undefined;
		queries?: string[] | undefined;
	}
>;
export declare const NoMetricContractsSchema: z.ZodObject<
	{
		metricName: z.ZodString;
		metricType: z.ZodEnum<['counter', 'gauge', 'histogram', 'summary']>;
		description: z.ZodString;
		unit: z.ZodString;
		labels: z.ZodObject<
			{
				required: z.ZodArray<z.ZodString, 'many'>;
				optional: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
			},
			'strip',
			z.ZodTypeAny,
			{
				required: string[];
				optional: string[];
			},
			{
				required: string[];
				optional?: string[] | undefined;
			}
		>;
		buckets: z.ZodOptional<z.ZodArray<z.ZodNumber, 'many'>>;
		quantiles: z.ZodOptional<z.ZodArray<z.ZodNumber, 'many'>>;
		sampleRate: z.ZodDefault<z.ZodNumber>;
		aggregation: z.ZodObject<
			{
				method: z.ZodEnum<['histogram', 'counter', 'gauge', 'summary']>;
				windowMs: z.ZodNumber;
				retention: z.ZodString;
			},
			'strip',
			z.ZodTypeAny,
			{
				method: 'histogram' | 'counter' | 'gauge' | 'summary';
				windowMs: number;
				retention: string;
			},
			{
				method: 'histogram' | 'counter' | 'gauge' | 'summary';
				windowMs: number;
				retention: string;
			}
		>;
		alerts: z.ZodDefault<
			z.ZodArray<
				z.ZodObject<
					{
						condition: z.ZodString;
						severity: z.ZodEnum<['info', 'warning', 'critical']>;
						description: z.ZodString;
					},
					'strip',
					z.ZodTypeAny,
					{
						description: string;
						condition: string;
						severity: 'info' | 'warning' | 'critical';
					},
					{
						description: string;
						condition: string;
						severity: 'info' | 'warning' | 'critical';
					}
				>,
				'many'
			>
		>;
		dashboard: z.ZodOptional<
			z.ZodObject<
				{
					panels: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
					queries: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
				},
				'strip',
				z.ZodTypeAny,
				{
					panels: string[];
					queries: string[];
				},
				{
					panels?: string[] | undefined;
					queries?: string[] | undefined;
				}
			>
		>;
	},
	'strip',
	z.ZodTypeAny,
	{
		description: string;
		sampleRate: number;
		metricName: string;
		metricType: 'histogram' | 'counter' | 'gauge' | 'summary';
		unit: string;
		labels: {
			required: string[];
			optional: string[];
		};
		aggregation: {
			method: 'histogram' | 'counter' | 'gauge' | 'summary';
			windowMs: number;
			retention: string;
		};
		alerts: {
			description: string;
			condition: string;
			severity: 'info' | 'warning' | 'critical';
		}[];
		buckets?: number[] | undefined;
		quantiles?: number[] | undefined;
		dashboard?:
			| {
					panels: string[];
					queries: string[];
			  }
			| undefined;
	},
	{
		description: string;
		metricName: string;
		metricType: 'histogram' | 'counter' | 'gauge' | 'summary';
		unit: string;
		labels: {
			required: string[];
			optional?: string[] | undefined;
		};
		aggregation: {
			method: 'histogram' | 'counter' | 'gauge' | 'summary';
			windowMs: number;
			retention: string;
		};
		sampleRate?: number | undefined;
		buckets?: number[] | undefined;
		quantiles?: number[] | undefined;
		alerts?:
			| {
					description: string;
					condition: string;
					severity: 'info' | 'warning' | 'critical';
			  }[]
			| undefined;
		dashboard?:
			| {
					panels?: string[] | undefined;
					queries?: string[] | undefined;
			  }
			| undefined;
	}
>;
export declare const NoAuditActorSchema: z.ZodObject<
	{
		type: z.ZodEnum<['user', 'system', 'agent', 'service']>;
		identifier: z.ZodString;
		context: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
	},
	'strip',
	z.ZodTypeAny,
	{
		type: 'system' | 'user' | 'agent' | 'service';
		context: Record<string, unknown>;
		identifier: string;
	},
	{
		type: 'system' | 'user' | 'agent' | 'service';
		identifier: string;
		context?: Record<string, unknown> | undefined;
	}
>;
export declare const NoAuditResourceSchema: z.ZodObject<
	{
		type: z.ZodString;
		identifier: z.ZodString;
		namespace: z.ZodOptional<z.ZodString>;
	},
	'strip',
	z.ZodTypeAny,
	{
		type: string;
		identifier: string;
		namespace?: string | undefined;
	},
	{
		type: string;
		identifier: string;
		namespace?: string | undefined;
	}
>;
export declare const NoAuditActionSchema: z.ZodObject<
	{
		type: z.ZodEnum<['create', 'read', 'update', 'delete', 'execute', 'optimize', 'coordinate']>;
		description: z.ZodString;
		previousState: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
		newState: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
		reason: z.ZodOptional<z.ZodString>;
	},
	'strip',
	z.ZodTypeAny,
	{
		type: 'delete' | 'create' | 'read' | 'update' | 'execute' | 'optimize' | 'coordinate';
		description: string;
		previousState?: Record<string, unknown> | undefined;
		newState?: Record<string, unknown> | undefined;
		reason?: string | undefined;
	},
	{
		type: 'delete' | 'create' | 'read' | 'update' | 'execute' | 'optimize' | 'coordinate';
		description: string;
		previousState?: Record<string, unknown> | undefined;
		newState?: Record<string, unknown> | undefined;
		reason?: string | undefined;
	}
>;
export declare const NoAuditComplianceSchema: z.ZodObject<
	{
		level: z.ZodEnum<['low', 'medium', 'high', 'critical']>;
		requirements: z.ZodArray<z.ZodString, 'many'>;
		retentionPeriod: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		level: 'critical' | 'low' | 'medium' | 'high';
		requirements: string[];
		retentionPeriod: string;
	},
	{
		level: 'critical' | 'low' | 'medium' | 'high';
		requirements: string[];
		retentionPeriod: string;
	}
>;
export declare const NoAuditTrailSchema: z.ZodObject<
	{
		auditId: z.ZodString;
		timestamp: z.ZodString;
		operation: z.ZodString;
		actor: z.ZodObject<
			{
				type: z.ZodEnum<['user', 'system', 'agent', 'service']>;
				identifier: z.ZodString;
				context: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
			},
			'strip',
			z.ZodTypeAny,
			{
				type: 'system' | 'user' | 'agent' | 'service';
				context: Record<string, unknown>;
				identifier: string;
			},
			{
				type: 'system' | 'user' | 'agent' | 'service';
				identifier: string;
				context?: Record<string, unknown> | undefined;
			}
		>;
		resource: z.ZodObject<
			{
				type: z.ZodString;
				identifier: z.ZodString;
				namespace: z.ZodOptional<z.ZodString>;
			},
			'strip',
			z.ZodTypeAny,
			{
				type: string;
				identifier: string;
				namespace?: string | undefined;
			},
			{
				type: string;
				identifier: string;
				namespace?: string | undefined;
			}
		>;
		action: z.ZodObject<
			{
				type: z.ZodEnum<
					['create', 'read', 'update', 'delete', 'execute', 'optimize', 'coordinate']
				>;
				description: z.ZodString;
				previousState: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
				newState: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
				reason: z.ZodOptional<z.ZodString>;
			},
			'strip',
			z.ZodTypeAny,
			{
				type: 'delete' | 'create' | 'read' | 'update' | 'execute' | 'optimize' | 'coordinate';
				description: string;
				previousState?: Record<string, unknown> | undefined;
				newState?: Record<string, unknown> | undefined;
				reason?: string | undefined;
			},
			{
				type: 'delete' | 'create' | 'read' | 'update' | 'execute' | 'optimize' | 'coordinate';
				description: string;
				previousState?: Record<string, unknown> | undefined;
				newState?: Record<string, unknown> | undefined;
				reason?: string | undefined;
			}
		>;
		compliance: z.ZodObject<
			{
				level: z.ZodEnum<['low', 'medium', 'high', 'critical']>;
				requirements: z.ZodArray<z.ZodString, 'many'>;
				retentionPeriod: z.ZodString;
			},
			'strip',
			z.ZodTypeAny,
			{
				level: 'critical' | 'low' | 'medium' | 'high';
				requirements: string[];
				retentionPeriod: string;
			},
			{
				level: 'critical' | 'low' | 'medium' | 'high';
				requirements: string[];
				retentionPeriod: string;
			}
		>;
		metadata: z.ZodObject<
			{
				correlationId: z.ZodString;
				traceId: z.ZodString;
				severity: z.ZodDefault<z.ZodEnum<['trace', 'debug', 'info', 'warn', 'error', 'fatal']>>;
				tags: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
			},
			'strip',
			z.ZodTypeAny,
			{
				tags: Record<string, string>;
				traceId: string;
				correlationId: string;
				severity: 'error' | 'fatal' | 'warn' | 'info' | 'debug' | 'trace';
			},
			{
				traceId: string;
				correlationId: string;
				tags?: Record<string, string> | undefined;
				severity?: 'error' | 'fatal' | 'warn' | 'info' | 'debug' | 'trace' | undefined;
			}
		>;
	},
	'strip',
	z.ZodTypeAny,
	{
		metadata: {
			tags: Record<string, string>;
			traceId: string;
			correlationId: string;
			severity: 'error' | 'fatal' | 'warn' | 'info' | 'debug' | 'trace';
		};
		action: {
			type: 'delete' | 'create' | 'read' | 'update' | 'execute' | 'optimize' | 'coordinate';
			description: string;
			previousState?: Record<string, unknown> | undefined;
			newState?: Record<string, unknown> | undefined;
			reason?: string | undefined;
		};
		timestamp: string;
		operation: string;
		auditId: string;
		actor: {
			type: 'system' | 'user' | 'agent' | 'service';
			context: Record<string, unknown>;
			identifier: string;
		};
		resource: {
			type: string;
			identifier: string;
			namespace?: string | undefined;
		};
		compliance: {
			level: 'critical' | 'low' | 'medium' | 'high';
			requirements: string[];
			retentionPeriod: string;
		};
	},
	{
		metadata: {
			traceId: string;
			correlationId: string;
			tags?: Record<string, string> | undefined;
			severity?: 'error' | 'fatal' | 'warn' | 'info' | 'debug' | 'trace' | undefined;
		};
		action: {
			type: 'delete' | 'create' | 'read' | 'update' | 'execute' | 'optimize' | 'coordinate';
			description: string;
			previousState?: Record<string, unknown> | undefined;
			newState?: Record<string, unknown> | undefined;
			reason?: string | undefined;
		};
		timestamp: string;
		operation: string;
		auditId: string;
		actor: {
			type: 'system' | 'user' | 'agent' | 'service';
			identifier: string;
			context?: Record<string, unknown> | undefined;
		};
		resource: {
			type: string;
			identifier: string;
			namespace?: string | undefined;
		};
		compliance: {
			level: 'critical' | 'low' | 'medium' | 'high';
			requirements: string[];
			retentionPeriod: string;
		};
	}
>;
export type NoTelemetryEvent = z.infer<typeof NoTelemetrySchema>;
export type NoTelemetryContext = z.infer<typeof NoTelemetryContextSchema>;
export type NoTelemetryPayload = z.infer<typeof NoTelemetryPayloadSchema>;
export type NoSpanDefinition = z.infer<typeof NoSpanDefinitionsSchema>;
export type NoSpanEvent = z.infer<typeof NoSpanEventSchema>;
export type NoSpanAttributes = z.infer<typeof NoSpanAttributesSchema>;
export type NoMetricContract = z.infer<typeof NoMetricContractsSchema>;
export type NoMetricLabels = z.infer<typeof NoMetricLabelsSchema>;
export type NoMetricAlert = z.infer<typeof NoMetricAlertSchema>;
export type NoMetricAggregation = z.infer<typeof NoMetricAggregationSchema>;
export type NoMetricDashboard = z.infer<typeof NoMetricDashboardSchema>;
export type NoAuditEntry = z.infer<typeof NoAuditTrailSchema>;
export type NoAuditActor = z.infer<typeof NoAuditActorSchema>;
export type NoAuditResource = z.infer<typeof NoAuditResourceSchema>;
export type NoAuditAction = z.infer<typeof NoAuditActionSchema>;
export type NoAuditCompliance = z.infer<typeof NoAuditComplianceSchema>;
export declare const NO_TELEMETRY_EVENT_TYPES: {
	readonly DECISION_MADE: 'decision_made';
	readonly AGENT_COORDINATION_STARTED: 'agent_coordination_started';
	readonly SCHEDULE_ADJUSTED: 'schedule_adjusted';
	readonly TOOL_LAYER_INVOKED: 'tool_layer_invoked';
	readonly PERFORMANCE_METRIC_RECORDED: 'performance_metric_recorded';
	readonly RESOURCE_ALLOCATED: 'resource_allocated';
	readonly STRATEGY_ADAPTED: 'strategy_adapted';
	readonly EXECUTION_COMPLETED: 'execution_completed';
};
export declare const NO_SPAN_OPERATIONS: {
	readonly PLAN_EXECUTION: 'nO.intelligence_scheduler.plan_execution';
	readonly AGENT_COORDINATION: 'nO.master_agent_loop.agent_coordination';
	readonly STRATEGY_SELECTION: 'nO.intelligence_scheduler.strategy_selection';
	readonly TOOL_LAYER_INVOCATION: 'nO.tool_layer.invocation';
	readonly RESOURCE_ALLOCATION: 'nO.resource_manager.allocation';
	readonly ADAPTIVE_DECISION: 'nO.adaptive_decision_engine.decision';
	readonly AGENT_POOL_MANAGEMENT: 'nO.master_agent_loop.pool_management';
	readonly EXECUTION_PLANNING: 'nO.execution_planner.planning';
};
export declare const NO_METRIC_NAMES: {
	readonly COORDINATION_DURATION: 'no_agent_coordination_duration_ms';
	readonly PLAN_EXECUTION_TIME: 'no_plan_execution_time_ms';
	readonly AGENT_UTILIZATION: 'no_agent_utilization_ratio';
	readonly STRATEGY_SELECTION_CONFIDENCE: 'no_strategy_selection_confidence';
	readonly RESOURCE_ALLOCATION_TIME: 'no_resource_allocation_time_ms';
	readonly DECISION_ADAPTATION_COUNT: 'no_decision_adaptation_total';
	readonly TOOL_LAYER_INVOCATION_COUNT: 'no_tool_layer_invocation_total';
	readonly EXECUTION_SUCCESS_RATE: 'no_execution_success_rate';
};
/**
 * Create a structured telemetry event for nO operations
 */
export declare function createNoTelemetryEvent(
	source: NoTelemetryEvent['source'],
	eventType: NoTelemetryEvent['eventType'],
	operation: string,
	context: NoTelemetryContext,
	payload: NoTelemetryPayload,
	metadata?: Partial<NoTelemetryEvent['metadata']>,
): NoTelemetryEvent;
/**
 * Create an audit trail entry for nO operations
 */
export declare function createNoAuditEntry(
	operation: string,
	actor: NoAuditActor,
	resource: NoAuditResource,
	action: NoAuditAction,
	compliance: NoAuditCompliance,
	metadata?: Partial<NoAuditEntry['metadata']>,
): NoAuditEntry;
/**
 * Validate telemetry event against schema
 */
export declare function validateNoTelemetryEvent(event: unknown): NoTelemetryEvent;
/**
 * Validate span definition against schema
 */
export declare function validateNoSpanDefinition(spanDef: unknown): NoSpanDefinition;
/**
 * Validate metric contract against schema
 */
export declare function validateNoMetricContract(metric: unknown): NoMetricContract;
/**
 * Validate audit entry against schema
 */
export declare function validateNoAuditEntry(audit: unknown): NoAuditEntry;
//# sourceMappingURL=no-telemetry-contracts.d.ts.map
