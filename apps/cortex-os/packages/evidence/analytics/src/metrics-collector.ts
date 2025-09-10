/**
 * @file_path packages/orchestration-analytics/src/metrics-collector.ts
 * @description Advanced metrics collection for multi-agent orchestration analytics
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-04
 * @version 1.0.0
 * @status active
 * @ai_generated_by human
 * @ai_provenance_hash N/A
 */

import { EventEmitter } from 'node:events';
import pino from 'pino';

// Minimal tracer types to avoid hard dependency on @opentelemetry/api
type MinimalSpan = {
	setStatus: (status: { code: 'OK' | 'ERROR'; message?: string }) => void;
	end: () => void;
};

type MinimalTracer = {
	startSpan: (name: string, _options?: { kind?: string }) => MinimalSpan;
};

function getMinimalTracer(): MinimalTracer {
	return {
		startSpan: (_name: string) => {
			return {
				setStatus: () => { },
				end: () => { },
			};
		},
	};
}

import type {
	AgentMetrics,
	AgentTrace,
	AnalyticsConfig,
	OrchestrationMetrics,
	PerformanceMetrics,
	ResourceUtilization,
	TimeSeriesData,
} from './types.js';

// Security: Allowlisted domains for telemetry endpoints
const ALLOWED_TELEMETRY_DOMAINS = [
	'localhost',
	'127.0.0.1',
	'::1',
	// Add your trusted telemetry domains here
];

/**
 * Security: Validate telemetry endpoint URL to prevent SSRF attacks
 */
function validateTelemetryEndpoint(url: string): boolean {
	try {
		const parsedUrl = new URL(url);

		// Only allow HTTP/HTTPS protocols
		if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
			return false;
		}

		// Check against allowlist
		const hostname = parsedUrl.hostname.toLowerCase();
		return ALLOWED_TELEMETRY_DOMAINS.includes(hostname);
	} catch {
		return false;
	}
}

/**
 * Advanced metrics collector for orchestration analytics
 * Collects performance data across LangGraph, CrewAI, and AutoGen frameworks
 */
export class MetricsCollector extends EventEmitter {
	private readonly logger = pino({
		name: 'orchestration-analytics-collector',
		level: 'info',
	});
	private readonly config: AnalyticsConfig;
	private readonly tracer: MinimalTracer = getMinimalTracer();
	private isCollecting = false;
	private collectionInterval?: NodeJS.Timeout;

	// Storage for collected metrics
	private readonly agentMetricsBuffer: Map<string, AgentMetrics[]> = new Map();
	private readonly orchestrationMetricsBuffer: OrchestrationMetrics[] = [];
	private readonly performanceHistory: Map<string, TimeSeriesData[]> =
		new Map();
	private readonly resourceUtilizationHistory: ResourceUtilization[] = [];

	// Collection statistics
	private metricsCollected = 0;
	private lastCollectionTime?: Date;
	private collectionErrors = 0;

	constructor(config: AnalyticsConfig) {
		super();
		this.config = config;

		this.initializeCollection();
	}

	/**
	 * Initialize the metrics collection system
	 */
	private initializeCollection(): void {
		this.logger.info('Initializing orchestration metrics collection', {
			enabled: this.config.collection.enabled,
			interval: this.config.collection.interval,
			batchSize: this.config.collection.batchSize,
		});

		if (this.config.collection.enabled) {
			this.startCollection();
		}
	}

	/**
	 * Start automated metrics collection
	 */
	startCollection(): void {
		if (this.isCollecting) {
			this.logger.warn('Metrics collection already running');
			return;
		}

		this.isCollecting = true;

		// Start periodic collection
		this.collectionInterval = setInterval(() => {
			this.collectMetrics().catch((error) => {
				this.logger.error('Error during metrics collection', {
					error: error.message,
				});
				this.collectionErrors++;
			});
		}, this.config.collection.interval);

		this.logger.info('Metrics collection started');
		this.emit('collectionStarted');
	}

	/**
	 * Stop metrics collection
	 */
	stopCollection(): void {
		if (!this.isCollecting) {
			this.logger.warn('Metrics collection not running');
			return;
		}

		this.isCollecting = false;

		if (this.collectionInterval) {
			clearInterval(this.collectionInterval);
			this.collectionInterval = undefined;
		}

		this.logger.info('Metrics collection stopped');
		this.emit('collectionStopped');
	}

	/**
	 * Collect metrics from all active orchestration frameworks
	 */
	async collectMetrics(): Promise<void> {
		const span = this.tracer.startSpan('collect_orchestration_metrics', {
			kind: 'INTERNAL',
		});

		try {
			const startTime = Date.now();

			// Collect agent-level metrics
			const agentMetrics = await this.collectAgentMetrics();

			// Collect orchestration-level metrics
			const orchestrationMetrics = await this.collectOrchestrationMetrics();

			// Collect resource utilization
			const resourceMetrics = await this.collectResourceUtilization();

			// Store collected metrics
			this.storeCollectedMetrics(
				agentMetrics,
				orchestrationMetrics,
				resourceMetrics,
			);

			// Update collection statistics
			this.metricsCollected +=
				agentMetrics.length + orchestrationMetrics.length;
			this.lastCollectionTime = new Date();

			const collectionTime = Date.now() - startTime;

			this.logger.debug('Metrics collection completed', {
				agentMetrics: agentMetrics.length,
				orchestrationMetrics: orchestrationMetrics.length,
				collectionTime,
				totalCollected: this.metricsCollected,
			});

			// Emit collection event for real-time processing
			this.emit('metricsCollected', {
				agentMetrics,
				orchestrationMetrics,
				resourceMetrics,
				timestamp: new Date(),
				collectionTime,
			});

			span.setStatus({ code: 'OK' });
		} catch (error) {
			this.logger.error('Failed to collect metrics', { error: error.message });
			span.setStatus({ code: 'ERROR', message: error.message });
			this.collectionErrors++;
			throw error;
		} finally {
			span.end();
		}
	}

	/**
	 * Collect metrics from individual agents across frameworks
	 */
	private async collectAgentMetrics(): Promise<AgentMetrics[]> {
		const metrics: AgentMetrics[] = [];
		const timestamp = new Date();

		try {
			// Collect LangGraph agent metrics
			const langGraphMetrics = await this.collectLangGraphMetrics(timestamp);
			metrics.push(...langGraphMetrics);

			// Collect CrewAI agent metrics
			const crewAIMetrics = await this.collectCrewAIMetrics(timestamp);
			metrics.push(...crewAIMetrics);

			// Collect AutoGen agent metrics
			const autoGenMetrics = await this.collectAutoGenMetrics(timestamp);
			metrics.push(...autoGenMetrics);

			// Collect custom agent metrics
			const customMetrics = await this.collectCustomAgentMetrics(timestamp);
			metrics.push(...customMetrics);
		} catch (error) {
			this.logger.error('Error collecting agent metrics', {
				error: error.message,
			});
		}

		return metrics;
	}

	/**
	 * Collect LangGraph-specific agent metrics
	 */
	private async collectLangGraphMetrics(
		timestamp: Date,
	): Promise<AgentMetrics[]> {
		const metrics: AgentMetrics[] = [];

		try {
			// Integration with LangGraph StateGraph monitoring
			// In production, this would connect to actual LangGraph instances via:
			// 1. LangGraph's built-in telemetry hooks
			// 2. OpenTelemetry traces from StateGraph execution
			// 3. Direct integration with LangGraph Runtime API

			const langGraphAgents = await this.discoverLangGraphAgents();

			for (const agentInfo of langGraphAgents) {
				try {
					const agentMetrics = await this.collectLangGraphAgentMetrics(
						agentInfo,
						timestamp,
					);
					if (agentMetrics) {
						metrics.push(agentMetrics);
					}
				} catch (error) {
					this.logger.warn('Failed to collect metrics for LangGraph agent', {
						agentId: agentInfo.id,
						error: error.message,
					});
				}
			}
		} catch (error) {
			this.logger.error('Error discovering LangGraph agents', {
				error: error.message,
			});
		}
		return metrics;
	}

	/**
	 * Discover active LangGraph agents in the system
	 */
	private async discoverLangGraphAgents(): Promise<
		Array<{
			id: string;
			name: string;
			stateGraphInstance?: StateGraphLike;
			telemetryEndpoint?: string;
		}>
	> {
		// Production implementation would:
		// 1. Query LangGraph runtime registry
		// 2. Scan OpenTelemetry traces for LangGraph spans
		// 3. Connect to LangGraph monitoring endpoints
		// 4. Use service discovery to find active agents

		const agents: Array<{
			id: string;
			name: string;
			stateGraphInstance?: StateGraphLike;
			telemetryEndpoint?: string;
		}> = [];

		// Check if LangGraph runtime is available
		try {
			// In production: const { StateGraph } = require('@langchain/langgraph');
			// For now, we simulate discovery
			const potentialAgents = await this.scanForLangGraphProcesses();
			agents.push(...potentialAgents);
		} catch (error) {
			this.logger.debug(
				'LangGraph runtime not available for direct integration',
				{
					error: error.message,
				},
			);
		}

		return agents;
	}

	/**
	 * Scan for running LangGraph processes
	 */
	private async scanForLangGraphProcesses(): Promise<
		Array<{
			id: string;
			name: string;
			stateGraphInstance?: StateGraphLike;
			telemetryEndpoint?: string;
		}>
	> {
		// Production implementation would scan:
		// 1. Process list for LangGraph instances
		// 2. Docker containers with LangGraph labels
		// 3. Kubernetes pods with LangGraph annotations
		// 4. Service mesh discovery endpoints
		return [];
	}

	/**
	 * Collect metrics from a specific LangGraph agent
	 */
	private async collectLangGraphAgentMetrics(
		agentInfo: {
			id: string;
			name: string;
			stateGraphInstance?: StateGraphLike;
			telemetryEndpoint?: string;
		},
		timestamp: Date,
	): Promise<AgentMetrics | null> {
		try {
			// Production implementation would:
			// 1. Query StateGraph.get_state() for current execution state
			// 2. Access LangGraph's built-in metrics via StateGraph.get_graph().nodes
			// 3. Pull OpenTelemetry spans for execution timing
			// 4. Query agent-specific telemetry endpoints

			let executionTime = 0;
			let taskCount = 0;
			let errorCount = 0;
			let successRate = 1.0;

			if (agentInfo.stateGraphInstance) {
				// Direct StateGraph integration
				const state = agentInfo.stateGraphInstance.get_state?.();

				// Extract metrics from StateGraph state
				executionTime = state?.execution_time || 0;
				taskCount = state?.task_count || 0;
				errorCount = state?.error_count || 0;
				successRate =
					taskCount > 0 ? (taskCount - errorCount) / taskCount : 1.0;
			} else if (agentInfo.telemetryEndpoint) {
				// Security: Validate telemetry endpoint to prevent SSRF
				if (!validateTelemetryEndpoint(agentInfo.telemetryEndpoint)) {
					this.logger.warn('Invalid telemetry endpoint rejected', {
						endpoint: agentInfo.telemetryEndpoint,
						agentId: agentInfo.id,
					});
					return null;
				}

				// HTTP endpoint integration - secure fetch with validation
				// Validate agent endpoint URL to prevent SSRF
				if (!agentInfo.telemetryEndpoint?.startsWith('https://')) {
					throw new Error('Invalid telemetry endpoint: must use HTTPS');
				}
				const response = await fetch(`${agentInfo.telemetryEndpoint}/metrics`, {
					redirect: 'manual',
					referrerPolicy: 'no-referrer',
					signal: AbortSignal.timeout(15000),
				});
				const telemetryData = (await response.json()) as TelemetryData;

				executionTime = telemetryData.execution_time || 0;
				taskCount = telemetryData.task_count || 0;
				errorCount = telemetryData.error_count || 0;
				successRate = telemetryData.success_rate || 1.0;
			}

			return {
				agentId: agentInfo.id,
				agentType: 'langgraph',
				framework: 'LangGraph',
				timestamp,
				executionTime,
				successRate,
				resourceUsage: await this.getAgentResourceUsage(agentInfo.id),
				taskCount,
				errorCount,
				responseTime: taskCount > 0 ? executionTime / taskCount : 0,
				throughput: executionTime > 0 ? taskCount / (executionTime / 1000) : 0,
				availability: errorCount === 0 ? 1.0 : Math.max(0.5, successRate),
			};
		} catch (error) {
			this.logger.error('Error collecting LangGraph agent metrics', {
				agentId: agentInfo.id,
				error: error.message,
			});
			return null;
		}
	}

	/**
	 * Collect CrewAI-specific agent metrics
	 */
	private async collectCrewAIMetrics(timestamp: Date): Promise<AgentMetrics[]> {
		const metrics: AgentMetrics[] = [];

		try {
			// Integration with CrewAI crew monitoring
			// In production, this would connect to actual CrewAI instances via:
			// 1. CrewAI's agent telemetry API
			// 2. Integration with CrewAI Agent.get_metrics()
			// 3. CrewAI Crew monitoring dashboard API
			// 4. OpenTelemetry traces from CrewAI tasks

			const crewAIAgents = await this.discoverCrewAIAgents();

			for (const agentInfo of crewAIAgents) {
				try {
					const agentMetrics = await this.collectCrewAIAgentMetrics(
						agentInfo,
						timestamp,
					);
					if (agentMetrics) {
						metrics.push(agentMetrics);
					}
				} catch (error) {
					this.logger.warn('Failed to collect metrics for CrewAI agent', {
						agentId: agentInfo.id,
						error: error.message,
					});
				}
			}
		} catch (error) {
			this.logger.error('Error discovering CrewAI agents', {
				error: error.message,
			});
		}

		return metrics;
	}

	/**
	 * Discover active CrewAI agents in the system
	 */
	private async discoverCrewAIAgents(): Promise<
		Array<{
			id: string;
			name: string;
			role?: string;
			crewInstance?: CrewInstanceLike;
			monitoringEndpoint?: string;
		}>
	> {
		// Production implementation would:
		// 1. Query CrewAI agent registry
		// 2. Connect to CrewAI monitoring endpoints
		// 3. Scan for active CrewAI processes
		// 4. Use CrewAI's built-in discovery mechanisms

		try {
			// In production: const crew = require('crewai');
			// Check for active CrewAI crews and agents
			const potentialAgents = await this.scanForCrewAIProcesses();
			return potentialAgents;
		} catch (error) {
			this.logger.debug('CrewAI runtime not available for direct integration', {
				error: error.message,
			});
			return [];
		}
	}

	/**
	 * Scan for running CrewAI processes
	 */
	private async scanForCrewAIProcesses(): Promise<
		Array<{
			id: string;
			name: string;
			role?: string;
			crewInstance?: CrewInstanceLike;
			monitoringEndpoint?: string;
		}>
	> {
		// Production implementation would:
		// 1. Use CrewAI.get_active_crews()
		// 2. Scan process list for CrewAI instances
		// 3. Query CrewAI monitoring dashboard
		// 4. Check environment variables for CrewAI configuration
		return [];
	}

	/**
	 * Collect metrics from a specific CrewAI agent
	 */
	private async collectCrewAIAgentMetrics(
		agentInfo: {
			id: string;
			name: string;
			role?: string;
			crewInstance?: CrewInstanceLike;
			monitoringEndpoint?: string;
		},
		timestamp: Date,
	): Promise<AgentMetrics | null> {
		try {
			// Production implementation would:
			// 1. Use agent.get_execution_metrics()
			// 2. Query crew.get_agent_performance(agent_id)
			// 3. Access CrewAI's built-in telemetry
			// 4. Pull from CrewAI monitoring API

			let executionTime = 0;
			let taskCount = 0;
			let errorCount = 0;
			let successRate = 1.0;

			if (agentInfo.crewInstance) {
				// Direct CrewAI integration
				const agentData = agentInfo.crewInstance.get_agent_data?.(agentInfo.id);

				executionTime = agentData?.execution_time || 0;
				taskCount = agentData?.completed_tasks || 0;
				errorCount = agentData?.failed_tasks || 0;
				successRate =
					taskCount > 0 ? (taskCount - errorCount) / taskCount : 1.0;
			} else if (agentInfo.monitoringEndpoint) {
				// Security: Validate monitoring endpoint to prevent SSRF
				if (!validateTelemetryEndpoint(agentInfo.monitoringEndpoint)) {
					this.logger.warn('Invalid monitoring endpoint rejected', {
						endpoint: agentInfo.monitoringEndpoint,
						agentId: agentInfo.id,
					});
					return null;
				}

				// HTTP endpoint integration - secure fetch with validation
				// Validate agent endpoint URL to prevent SSRF
				if (!agentInfo.monitoringEndpoint?.startsWith('https://')) {
					throw new Error('Invalid monitoring endpoint: must use HTTPS');
				}
				const response = await fetch(
					`${agentInfo.monitoringEndpoint}/agent/${agentInfo.id}/metrics`,
					{
						redirect: 'manual',
						referrerPolicy: 'no-referrer',
						signal: AbortSignal.timeout(15000),
					},
				);
				const telemetryData = (await response.json()) as TelemetryData;

				executionTime = telemetryData.execution_time || 0;
				taskCount = telemetryData.completed_tasks || 0;
				errorCount = telemetryData.failed_tasks || 0;
				successRate = telemetryData.success_rate || 1.0;
			}

			return {
				agentId: agentInfo.id,
				agentType: 'crewai',
				framework: 'CrewAI',
				timestamp,
				executionTime,
				successRate,
				resourceUsage: await this.getAgentResourceUsage(agentInfo.id),
				taskCount,
				errorCount,
				responseTime: taskCount > 0 ? executionTime / taskCount : 0,
				throughput: executionTime > 0 ? taskCount / (executionTime / 1000) : 0,
				availability: errorCount === 0 ? 1.0 : Math.max(0.7, successRate),
			};
		} catch (error) {
			this.logger.error('Error collecting CrewAI agent metrics', {
				agentId: agentInfo.id,
				error: error.message,
			});
			return null;
		}
	}

	/**
	 * Collect AutoGen-specific agent metrics
	 */
	private async collectAutoGenMetrics(
		timestamp: Date,
	): Promise<AgentMetrics[]> {
		const metrics: AgentMetrics[] = [];

		try {
			// Integration with AutoGen conversation monitoring
			// In production, this would connect to actual AutoGen instances via:
			// 1. AutoGen's conversation history API
			// 2. Integration with AutoGen GroupChat monitoring
			// 3. AutoGen agent performance metrics
			// 4. OpenTelemetry traces from AutoGen conversations

			const autoGenAgents = await this.discoverAutoGenAgents();

			for (const agentInfo of autoGenAgents) {
				try {
					const agentMetrics = await this.collectAutoGenAgentMetrics(
						agentInfo,
						timestamp,
					);
					if (agentMetrics) {
						metrics.push(agentMetrics);
					}
				} catch (error) {
					this.logger.warn('Failed to collect metrics for AutoGen agent', {
						agentId: agentInfo.id,
						error: error.message,
					});
				}
			}
		} catch (error) {
			this.logger.error('Error discovering AutoGen agents', {
				error: error.message,
			});
		}
		return metrics;
	}

	/**
	 * Discover active AutoGen agents in the system
	 */
	private async discoverAutoGenAgents(): Promise<
		Array<{
			id: string;
			name: string;
			role?: string;
			groupChatInstance?: GroupChatLike;
			conversationEndpoint?: string;
		}>
	> {
		// Production implementation would:
		// 1. Query AutoGen agent registry
		// 2. Scan active GroupChat instances
		// 3. Connect to AutoGen monitoring endpoints
		// 4. Use AutoGen's agent discovery API

		try {
			// In production: const autogen = require('autogen');
			// Check for active AutoGen agents and group chats
			const potentialAgents = await this.scanForAutoGenProcesses();
			return potentialAgents;
		} catch (error) {
			this.logger.debug(
				'AutoGen runtime not available for direct integration',
				{
					error: error.message,
				},
			);
			return [];
		}
	}

	/**
	 * Scan for running AutoGen processes
	 */
	private async scanForAutoGenProcesses(): Promise<
		Array<{
			id: string;
			name: string;
			role?: string;
			groupChatInstance?: GroupChatLike;
			conversationEndpoint?: string;
		}>
	> {
		// Production implementation would:
		// 1. Use AutoGen.get_active_agents()
		// 2. Query GroupChat.get_participants()
		// 3. Scan for AutoGen process signatures
		// 4. Check conversation state endpoints
		return [];
	}

	/**
	 * Collect metrics from a specific AutoGen agent
	 */
	private async collectAutoGenAgentMetrics(
		agentInfo: {
			id: string;
			name: string;
			role?: string;
			groupChatInstance?: GroupChatLike;
			conversationEndpoint?: string;
		},
		timestamp: Date,
	): Promise<AgentMetrics | null> {
		try {
			// Production implementation would:
			// 1. Use agent.get_conversation_metrics()
			// 2. Query GroupChat.get_agent_stats(agent_id)
			// 3. Access AutoGen's conversation history
			// 4. Pull from AutoGen monitoring endpoints

			let executionTime = 0;
			let taskCount = 0;
			let errorCount = 0;
			let successRate = 1.0;

			if (agentInfo.groupChatInstance) {
				// Direct AutoGen integration
				const agentStats = agentInfo.groupChatInstance.get_agent_stats?.(
					agentInfo.id,
				);

				executionTime = agentStats?.total_conversation_time || 0;
				taskCount = agentStats?.messages_sent || 0;
				errorCount = agentStats?.failed_responses || 0;
				successRate =
					taskCount > 0 ? (taskCount - errorCount) / taskCount : 1.0;
			} else if (agentInfo.conversationEndpoint) {
				// Security: Validate conversation endpoint to prevent SSRF
				if (!validateTelemetryEndpoint(agentInfo.conversationEndpoint)) {
					this.logger.warn('Invalid conversation endpoint rejected', {
						endpoint: agentInfo.conversationEndpoint,
						agentId: agentInfo.id,
					});
					return null;
				}

				// HTTP endpoint integration - secure fetch with validation
				// Validate agent endpoint URL to prevent SSRF
				if (!agentInfo.conversationEndpoint?.startsWith('https://')) {
					throw new Error('Invalid conversation endpoint: must use HTTPS');
				}
				const response = await fetch(
					`${agentInfo.conversationEndpoint}/agent/${agentInfo.id}/stats`,
					{
						redirect: 'manual',
						referrerPolicy: 'no-referrer',
						signal: AbortSignal.timeout(15000),
					},
				);
				const telemetryData = (await response.json()) as TelemetryData;

				executionTime = telemetryData.conversation_time || 0;
				taskCount = telemetryData.messages_sent || 0;
				errorCount = telemetryData.failed_responses || 0;
				successRate = telemetryData.success_rate || 1.0;
			}

			return {
				agentId: agentInfo.id,
				agentType: 'autogen',
				framework: 'AutoGen',
				timestamp,
				executionTime,
				successRate,
				resourceUsage: await this.getAgentResourceUsage(agentInfo.id),
				taskCount,
				errorCount,
				responseTime: taskCount > 0 ? executionTime / taskCount : 0,
				throughput: executionTime > 0 ? taskCount / (executionTime / 1000) : 0,
				availability: errorCount === 0 ? 1.0 : Math.max(0.8, successRate),
			};
		} catch (error) {
			this.logger.error('Error collecting AutoGen agent metrics', {
				agentId: agentInfo.id,
				error: error.message,
			});
			return null;
		}
	}

	/**
	 * Collect metrics from custom agents
	 */
	private async collectCustomAgentMetrics(
		_timestamp: Date,
	): Promise<AgentMetrics[]> {
		// Handle custom agent implementations
		return [];
	}

	/**
	 * Collect orchestration-level metrics
	 */
	private async collectOrchestrationMetrics(): Promise<OrchestrationMetrics[]> {
		const metrics: OrchestrationMetrics[] = [];
		const timestamp = new Date();

		try {
			// Mock orchestration data - replace with actual orchestration engine queries
			const orchestrations = [
				{
					id: 'orchestration-1',
					framework: 'Multi-Framework',
					activeAgents: 5,
					totalAgents: 7,
					completedTasks: 45,
					failedTasks: 3,
					avgExecutionTime: 650,
				},
			];

			for (const orch of orchestrations) {
				metrics.push({
					orchestrationId: orch.id,
					framework: orch.framework,
					timestamp,
					totalAgents: orch.totalAgents,
					activeAgents: orch.activeAgents,
					completedTasks: orch.completedTasks,
					failedTasks: orch.failedTasks,
					averageExecutionTime: orch.avgExecutionTime,
					totalResourceUtilization: await this.getSystemResourceUtilization(),
					workflowEfficiency:
						orch.completedTasks / (orch.completedTasks + orch.failedTasks),
					coordinationOverhead: 0.15, // 15% overhead for coordination
				});
			}
		} catch (error) {
			this.logger.error('Error collecting orchestration metrics', {
				error: error.message,
			});
		}

		return metrics;
	}

	/**
	 * Collect system resource utilization
	 */
	private async collectResourceUtilization(): Promise<ResourceUtilization> {
		try {
			// Get system resource metrics
			// In a real implementation, this would interface with system monitoring tools
			return {
				cpu: {
					current: Math.random() * 100,
					average: 45 + Math.random() * 20,
					peak: 80 + Math.random() * 20,
				},
				memory: {
					current: Math.random() * 100,
					average: 60 + Math.random() * 15,
					peak: 85 + Math.random() * 15,
				},
				gpu: {
					current: Math.random() * 100,
					average: 30 + Math.random() * 25,
					peak: 70 + Math.random() * 30,
				},
				network: {
					inbound: Math.random() * 1000,
					outbound: Math.random() * 800,
				},
				storage: {
					reads: Math.random() * 500,
					writes: Math.random() * 300,
				},
			};
		} catch (error) {
			this.logger.error('Error collecting resource utilization', {
				error: error.message,
			});
			throw error;
		}
	}

	/**
	 * Get resource usage for a specific agent
	 */
	private async getAgentResourceUsage(
		_agentId: string,
	): Promise<AgentMetrics['resourceUsage']> {
		// Mock implementation - replace with actual agent resource monitoring
		return {
			memory: Math.random() * 512, // MB
			cpu: Math.random() * 100, // percentage
			gpu: Math.random() * 100, // percentage (if available)
		};
	}

	/**
	 * Get system-wide resource utilization
	 */
	private async getSystemResourceUtilization(): Promise<ResourceUtilization> {
		return this.collectResourceUtilization();
	}

	/**
	 * Store collected metrics in appropriate buffers
	 */
	private storeCollectedMetrics(
		agentMetrics: AgentMetrics[],
		orchestrationMetrics: OrchestrationMetrics[],
		resourceMetrics: ResourceUtilization,
	): void {
		// Store agent metrics
		for (const metric of agentMetrics) {
			const existing = this.agentMetricsBuffer.get(metric.agentId);
			if (!existing) {
				const arr: AgentMetrics[] = [metric];
				this.agentMetricsBuffer.set(metric.agentId, arr);
			} else {
				existing.push(metric);
				// Maintain buffer size
				if (existing.length > this.config.collection.batchSize * 2) {
					existing.shift();
				}
			}
		}

		// Store orchestration metrics
		this.orchestrationMetricsBuffer.push(...orchestrationMetrics);
		if (
			this.orchestrationMetricsBuffer.length >
			this.config.collection.batchSize * 2
		) {
			this.orchestrationMetricsBuffer.shift();
		}

		// Store resource utilization
		this.resourceUtilizationHistory.push(resourceMetrics);
		if (
			this.resourceUtilizationHistory.length >
			this.config.collection.batchSize * 2
		) {
			this.resourceUtilizationHistory.shift();
		}

		// Update performance history for visualization
		this.updatePerformanceHistory(agentMetrics, orchestrationMetrics);
	}

	/**
	 * Update performance history for trend analysis
	 */
	private updatePerformanceHistory(
		agentMetrics: AgentMetrics[],
		orchestrationMetrics: OrchestrationMetrics[],
	): void {
		const timestamp = new Date();

		// Calculate aggregate performance metrics
		const avgExecutionTime =
			agentMetrics.reduce((sum, m) => sum + m.executionTime, 0) /
			agentMetrics.length;
		const avgThroughput =
			agentMetrics.reduce((sum, m) => sum + m.throughput, 0) /
			agentMetrics.length;
		const avgSuccessRate =
			agentMetrics.reduce((sum, m) => sum + m.successRate, 0) /
			agentMetrics.length;

		// Store time series data
		this.addToTimeSeries('executionTime', timestamp, avgExecutionTime);
		this.addToTimeSeries('throughput', timestamp, avgThroughput);
		this.addToTimeSeries('successRate', timestamp, avgSuccessRate);
		this.addToTimeSeries(
			'activeAgents',
			timestamp,
			orchestrationMetrics.reduce((sum, m) => sum + m.activeAgents, 0),
		);
	}

	/**
	 * Add data point to time series
	 */
	private addToTimeSeries(
		series: string,
		timestamp: Date,
		value: number,
	): void {
		const seriesData = this.performanceHistory.get(series);
		if (!seriesData) {
			const arr: TimeSeriesData[] = [{ timestamp, value }];
			this.performanceHistory.set(series, arr);
		} else {
			seriesData.push({ timestamp, value });
			// Maintain series length
			const maxDataPoints = this.config.visualization.maxDataPoints;
			if (seriesData.length > maxDataPoints) {
				seriesData.shift();
			}
		}
	}

	/**
	 * Collect OpenTelemetry traces for agent activities
	 */
	async collectAgentTraces(_agentId?: string): Promise<AgentTrace[]> {
		// This would integrate with OpenTelemetry trace collection
		// Mock implementation for now
		return [];
	}

	/**
	 * Get current performance metrics for dashboard
	 */
	getCurrentPerformanceMetrics(): PerformanceMetrics {
		return {
			executionTimes: this.performanceHistory.get('executionTime') || [],
			throughput: this.performanceHistory.get('throughput') || [],
			errorRates: this.performanceHistory.get('errorRate') || [],
			resourceUtilization:
				this.performanceHistory.get('resourceUtilization') || [],
			agentDistribution: this.calculateAgentDistribution(),
		};
	}

	/**
	 * Calculate agent distribution by framework
	 */
	private calculateAgentDistribution(): Array<{
		framework: string;
		count: number;
		percentage: number;
	}> {
		const frameworkCounts = new Map<string, number>();
		let totalAgents = 0;

		for (const agentMetrics of this.agentMetricsBuffer.values()) {
			if (agentMetrics.length > 0) {
				const latestMetric = agentMetrics[agentMetrics.length - 1];
				frameworkCounts.set(
					latestMetric.framework,
					(frameworkCounts.get(latestMetric.framework) || 0) + 1,
				);
				totalAgents++;
			}
		}

		return Array.from(frameworkCounts.entries()).map(([framework, count]) => ({
			framework,
			count,
			percentage: totalAgents > 0 ? (count / totalAgents) * 100 : 0,
		}));
	}

	/**
	 * Get collection statistics
	 */
	getCollectionStatistics(): {
		isCollecting: boolean;
		metricsCollected: number;
		lastCollectionTime?: Date;
		collectionErrors: number;
		bufferedMetrics: number;
	} {
		let bufferedMetrics = this.orchestrationMetricsBuffer.length;
		for (const agentBuffer of this.agentMetricsBuffer.values()) {
			bufferedMetrics += agentBuffer.length;
		}

		return {
			isCollecting: this.isCollecting,
			metricsCollected: this.metricsCollected,
			lastCollectionTime: this.lastCollectionTime,
			collectionErrors: this.collectionErrors,
			bufferedMetrics,
		};
	}

	/**
	 * Clear collected metrics
	 */
	clearMetrics(): void {
		this.agentMetricsBuffer.clear();
		this.orchestrationMetricsBuffer.length = 0;
		this.performanceHistory.clear();
		this.resourceUtilizationHistory.length = 0;
		this.metricsCollected = 0;
		this.collectionErrors = 0;

		this.logger.info('Metrics cleared');
		this.emit('metricsCleared');
	}

	/**
	 * Cleanup resources
	 */
	async cleanup(): Promise<void> {
		this.stopCollection();
		this.clearMetrics();
		this.removeAllListeners();

		this.logger.info('Metrics collector cleanup completed');
	}
}

// Minimal telemetry shape for external endpoints
type TelemetryData = {
	execution_time?: number;
	task_count?: number;
	error_count?: number;
	success_rate?: number;
	completed_tasks?: number;
	failed_tasks?: number;
	conversation_time?: number;
	messages_sent?: number;
	failed_responses?: number;
};

// Minimal runtime integration interfaces to avoid any
type StateGraphLike = {
	get_state?: () => {
		execution_time?: number;
		task_count?: number;
		error_count?: number;
	};
};

type CrewInstanceLike = {
	get_agent_data?: (id: string) => {
		execution_time?: number;
		completed_tasks?: number;
		failed_tasks?: number;
	};
};

type GroupChatLike = {
	get_agent_stats?: (id: string) => {
		total_conversation_time?: number;
		messages_sent?: number;
		failed_responses?: number;
	};
};

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
