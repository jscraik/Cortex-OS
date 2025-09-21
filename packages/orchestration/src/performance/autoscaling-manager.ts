/**
 * nO Master Agent Loop - Autoscaling Manager
 *
 * Provides dynamic scaling capabilities for the nO system based on
 * resource utilization, queue depth, and performance metrics.
 *
 * Co-authored-by: brAInwav Development Team
 */

import { agentMetrics } from '../monitoring/prometheus-metrics.js';

export interface AutoscalingConfig {
	enabled: boolean;
	minAgents: number;
	maxAgents: number;
	targetCpuUtilization: number;
	targetMemoryUtilization: number;
	targetQueueDepth: number;
	scaleUpThreshold: number;
	scaleDownThreshold: number;
	scaleUpCooldown: number; // ms
	scaleDownCooldown: number; // ms
	stepSize: number;
	metrics: {
		evaluationInterval: number; // ms
		historicalWindow: number; // ms
		metricsAggregation: 'average' | 'max' | 'p95';
	};
}

export interface ScalingDecision {
	action: 'scale_up' | 'scale_down' | 'maintain';
	currentAgents: number;
	targetAgents: number;
	reason: string;
	metrics: {
		cpuUtilization: number;
		memoryUtilization: number;
		queueDepth: number;
		throughput: number;
		responseTime: number;
	};
	timestamp: number;
}

export interface AgentInstance {
	id: string;
	status: 'starting' | 'running' | 'stopping' | 'stopped';
	startTime: number;
	lastHeartbeat: number;
	utilization: {
		cpu: number;
		memory: number;
	};
	assignedTasks: number;
	maxTasks: number;
}

/**
 * Autoscaling Manager for nO Agent Pool
 */
export class AutoscalingManager {
	private config: AutoscalingConfig;
	private agents: Map<string, AgentInstance> = new Map();
	private lastScaleAction: number = 0;
	private metricsHistory: Array<{
		timestamp: number;
		cpuUtilization: number;
		memoryUtilization: number;
		queueDepth: number;
		activeAgents: number;
		throughput: number;
		responseTime: number;
	}> = [];

	constructor(config: AutoscalingConfig) {
		this.config = config;
		this.startMetricsCollection();
	}

	/**
	 * Evaluate scaling decision based on current metrics
	 */
	async evaluateScaling(): Promise<ScalingDecision> {
		const currentMetrics = await this.getCurrentMetrics();
		const currentAgents = this.getActiveAgentCount();

		// Store metrics for historical analysis
		this.metricsHistory.push({
			timestamp: Date.now(),
			...currentMetrics,
			activeAgents: currentAgents,
		});

		// Keep only recent history
		const cutoff = Date.now() - this.config.metrics.historicalWindow;
		this.metricsHistory = this.metricsHistory.filter((m) => m.timestamp > cutoff);

		// Calculate aggregated metrics
		const aggregatedMetrics = this.aggregateMetrics();

		// Determine scaling decision
		const decision = this.makeScalingDecision(currentAgents, aggregatedMetrics);

		// Log scaling decision
		console.log('Autoscaling decision:', {
			action: decision.action,
			current: decision.currentAgents,
			target: decision.targetAgents,
			reason: decision.reason,
			metrics: decision.metrics,
		});

		return decision;
	}

	/**
	 * Execute scaling action
	 */
	async executeScaling(decision: ScalingDecision): Promise<boolean> {
		if (decision.action === 'maintain') {
			return true;
		}

		// Check cooldown period
		const now = Date.now();
		const cooldownPeriod =
			decision.action === 'scale_up' ? this.config.scaleUpCooldown : this.config.scaleDownCooldown;

		if (now - this.lastScaleAction < cooldownPeriod) {
			console.log(`Scaling action skipped due to cooldown (${cooldownPeriod}ms remaining)`);
			return false;
		}

		try {
			if (decision.action === 'scale_up') {
				await this.scaleUp(decision.targetAgents - decision.currentAgents);
			} else {
				await this.scaleDown(decision.currentAgents - decision.targetAgents);
			}

			this.lastScaleAction = now;

			// Update metrics
			agentMetrics.availableAgents.set(decision.targetAgents);

			return true;
		} catch (error) {
			console.error('Failed to execute scaling action:', error);
			return false;
		}
	}

	/**
	 * Add agent instances to the pool
	 */
	private async scaleUp(count: number): Promise<void> {
		console.log(`Scaling up by ${count} agents`);

		for (let i = 0; i < count; i++) {
			const agentId = this.generateAgentId();
			const agent: AgentInstance = {
				id: agentId,
				status: 'starting',
				startTime: Date.now(),
				lastHeartbeat: Date.now(),
				utilization: { cpu: 0, memory: 0 },
				assignedTasks: 0,
				maxTasks: 10, // Default task capacity
			};

			this.agents.set(agentId, agent);

			// Simulate agent startup (in production, this would start actual agent)
			setTimeout(() => {
				const existingAgent = this.agents.get(agentId);
				if (existingAgent) {
					existingAgent.status = 'running';
					this.agents.set(agentId, existingAgent);
				}
			}, 2000);
		}
	}

	/**
	 * Remove agent instances from the pool
	 */
	private async scaleDown(count: number): Promise<void> {
		console.log(`Scaling down by ${count} agents`);

		// Get least utilized agents for removal
		const candidates = Array.from(this.agents.values())
			.filter((agent) => agent.status === 'running' && agent.assignedTasks === 0)
			.sort((a, b) => a.utilization.cpu - b.utilization.cpu)
			.slice(0, count);

		for (const agent of candidates) {
			agent.status = 'stopping';
			this.agents.set(agent.id, agent);

			// Simulate graceful shutdown
			setTimeout(() => {
				this.agents.delete(agent.id);
			}, 5000);
		}
	}

	/**
	 * Make scaling decision based on metrics
	 */
	private makeScalingDecision(
		currentAgents: number,
		metrics: ScalingDecision['metrics'],
	): ScalingDecision {
		const { cpuUtilization, memoryUtilization, queueDepth, responseTime } = metrics;

		// Calculate scaling signals
		const cpuSignal = cpuUtilization > this.config.targetCpuUtilization;
		const memorySignal = memoryUtilization > this.config.targetMemoryUtilization;
		const queueSignal = queueDepth > this.config.targetQueueDepth;
		const responseTimeSignal = responseTime > 1000; // 1 second threshold

		// Scale up conditions
		const shouldScaleUp =
			(cpuSignal || memorySignal || queueSignal || responseTimeSignal) &&
			currentAgents < this.config.maxAgents;

		// Scale down conditions
		const shouldScaleDown =
			cpuUtilization < this.config.scaleDownThreshold &&
			memoryUtilization < this.config.scaleDownThreshold &&
			queueDepth === 0 &&
			responseTime < 500 &&
			currentAgents > this.config.minAgents;

		let action: ScalingDecision['action'] = 'maintain';
		let targetAgents = currentAgents;
		let reason = 'Metrics within target range';

		if (shouldScaleUp) {
			action = 'scale_up';
			targetAgents = Math.min(currentAgents + this.config.stepSize, this.config.maxAgents);

			const reasons = [];
			if (cpuSignal) reasons.push(`CPU: ${cpuUtilization.toFixed(1)}%`);
			if (memorySignal) reasons.push(`Memory: ${memoryUtilization.toFixed(1)}%`);
			if (queueSignal) reasons.push(`Queue: ${queueDepth}`);
			if (responseTimeSignal) reasons.push(`Response time: ${responseTime.toFixed(0)}ms`);

			reason = `Scale up needed - ${reasons.join(', ')}`;
		} else if (shouldScaleDown) {
			action = 'scale_down';
			targetAgents = Math.max(currentAgents - this.config.stepSize, this.config.minAgents);
			reason = `Scale down opportunity - low utilization (CPU: ${cpuUtilization.toFixed(1)}%, Memory: ${memoryUtilization.toFixed(1)}%)`;
		}

		return {
			action,
			currentAgents,
			targetAgents,
			reason,
			metrics,
			timestamp: Date.now(),
		};
	}

	/**
	 * Get current system metrics
	 */
	private async getCurrentMetrics(): Promise<ScalingDecision['metrics']> {
		// In production, these would come from actual monitoring systems
		// For now, simulate realistic metrics with some variability

		const baseLoad =
			this.getActiveAgentCount() > 0 ? Math.min(80, 30 + this.getQueueDepth() * 10) : 20;

		return {
			cpuUtilization: baseLoad + (Math.random() * 20 - 10),
			memoryUtilization: baseLoad * 0.8 + (Math.random() * 15 - 7.5),
			queueDepth: this.getQueueDepth(),
			throughput: Math.max(0, 10 + (Math.random() * 5 - 2.5)),
			responseTime: 200 + baseLoad * 5 + (Math.random() * 100 - 50),
		};
	}

	/**
	 * Aggregate historical metrics
	 */
	private aggregateMetrics(): ScalingDecision['metrics'] {
		if (this.metricsHistory.length === 0) {
			return {
				cpuUtilization: 0,
				memoryUtilization: 0,
				queueDepth: 0,
				throughput: 0,
				responseTime: 0,
			};
		}

		const aggregation = this.config.metrics.metricsAggregation;

		const aggregate = (values: number[]) => {
			if (values.length === 0) return 0;

			switch (aggregation) {
				case 'average':
					return values.reduce((sum, val) => sum + val, 0) / values.length;
				case 'max':
					return Math.max(...values);
				case 'p95': {
					const sorted = values.sort((a, b) => a - b);
					const index = Math.floor(sorted.length * 0.95);
					return sorted[index] || 0;
				}
				default:
					return values[values.length - 1] || 0;
			}
		};

		return {
			cpuUtilization: aggregate(this.metricsHistory.map((m) => m.cpuUtilization)),
			memoryUtilization: aggregate(this.metricsHistory.map((m) => m.memoryUtilization)),
			queueDepth: aggregate(this.metricsHistory.map((m) => m.queueDepth)),
			throughput: aggregate(this.metricsHistory.map((m) => m.throughput)),
			responseTime: aggregate(this.metricsHistory.map((m) => m.responseTime)),
		};
	}

	/**
	 * Get active agent count
	 */
	private getActiveAgentCount(): number {
		return Array.from(this.agents.values()).filter((agent) => agent.status === 'running').length;
	}

	/**
	 * Get current queue depth (mock implementation)
	 */
	private getQueueDepth(): number {
		// In production, this would come from actual queue metrics
		return Math.floor(Math.random() * 5); // 0-4 items in queue
	}

	/**
	 * Generate unique agent ID
	 */
	private generateAgentId(): string {
		return `agent-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
	}

	/**
	 * Start metrics collection interval
	 */
	private startMetricsCollection(): void {
		if (!this.config.enabled) {
			return;
		}

		setInterval(async () => {
			try {
				const decision = await this.evaluateScaling();
				await this.executeScaling(decision);
			} catch (error) {
				console.error('Autoscaling evaluation error:', error);
			}
		}, this.config.metrics.evaluationInterval);
	}

	/**
	 * Get agent status information
	 */
	getAgentStatus(): AgentInstance[] {
		return Array.from(this.agents.values());
	}

	/**
	 * Get scaling configuration
	 */
	getConfig(): AutoscalingConfig {
		return { ...this.config };
	}

	/**
	 * Update scaling configuration
	 */
	updateConfig(updates: Partial<AutoscalingConfig>): void {
		this.config = { ...this.config, ...updates };
	}

	/**
	 * Get metrics history for analysis
	 */
	getMetricsHistory(): typeof this.metricsHistory {
		return [...this.metricsHistory];
	}
}

/**
 * Default autoscaling configuration
 */
export const defaultAutoscalingConfig: AutoscalingConfig = {
	enabled: true,
	minAgents: 2,
	maxAgents: 20,
	targetCpuUtilization: 70,
	targetMemoryUtilization: 80,
	targetQueueDepth: 5,
	scaleUpThreshold: 75,
	scaleDownThreshold: 30,
	scaleUpCooldown: 300000, // 5 minutes
	scaleDownCooldown: 600000, // 10 minutes
	stepSize: 2,
	metrics: {
		evaluationInterval: 30000, // 30 seconds
		historicalWindow: 600000, // 10 minutes
		metricsAggregation: 'average',
	},
};
