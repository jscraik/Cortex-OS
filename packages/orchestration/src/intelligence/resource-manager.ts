import { z } from 'zod';
import type { ExecutionPlan } from '../contracts/no-architecture-contracts.js';

export const ResourceManagerConfigSchema = z.object({
	maxConcurrentAgents: z.number().int().positive().max(1000).default(5),
	maxMemoryMB: z.number().int().positive().default(4096),
	maxCpuPercent: z.number().int().positive().max(100).default(80),
	agentHourlyCost: z.number().positive().default(10),
	memoryGBHourlyCost: z.number().positive().default(5),
	cpuHourlyCost: z.number().positive().default(3),
});
export type ResourceManagerConfig = z.infer<typeof ResourceManagerConfigSchema>;

// Enhanced types for nO architecture
export interface ResourceAllocation {
	agents: string[];
	totalMemoryMB: number;
	totalCpuPercent: number;
	estimatedCost: number;
	details: {
		agentAssignments: Array<{
			agentId: string;
			specialization: string;
			assignedSteps: string[];
			memoryMB: number;
			cpuPercent: number;
		}>;
	};
}

export interface ScalingDecision {
	recommendedAgents: number;
	reasoning: string;
	cpuThrottling: boolean;
	memoryLimits: {
		maxMemoryMB: number;
		perAgentMemoryMB: number;
	};
}

export interface AgentPool {
	agents: Array<{
		id: string;
		specialization: string;
		status: 'available' | 'busy' | 'failed';
		capabilities: string[];
		resourceUsage: {
			memoryMB: number;
			cpuPercent: number;
		};
	}>;
	totalCapacity: {
		memoryMB: number;
		cpuPercent: number;
	};
}

export interface AgentFailureHandling {
	newAgent: {
		id: string;
		specialization: string;
		status: 'available';
		capabilities: string[];
		resourceUsage: {
			memoryMB: number;
			cpuPercent: number;
		};
	};
	updatedPool: AgentPool;
	failureLog: {
		failedAgentId: string;
		reason: string;
		timestamp: string;
		replacementId: string;
	};
}

export interface ConstraintEnforcement {
	feasible: boolean;
	adjustedPlan: ExecutionPlan;
	optimizationSuggestions: string[];
}

export interface CostOptimization {
	estimatedCost: number;
	optimizedAllocation: ResourceAllocation;
	costSavings: number;
	tradeoffs: string[];
}

export interface ResourceMonitoring {
	currentUsage: {
		memoryMB: number;
		cpuPercent: number;
		networkLatency: number;
	};
	projectedUsage: {
		memoryMB: number;
		cpuPercent: number;
		estimatedCompletion: string;
	};
	alerts: Array<{
		type: 'warning' | 'critical';
		message: string;
		metric: string;
		threshold: number;
		currentValue: number;
	}>;
}

export interface ResourceAnalytics {
	averageUtilization: {
		memory: number;
		cpu: number;
	};
	recommendations: string[];
	trends: {
		memoryUsageTrend: 'increasing' | 'decreasing' | 'stable';
		cpuUsageTrend: 'increasing' | 'decreasing' | 'stable';
		efficiencyTrend: 'improving' | 'declining' | 'stable';
	};
}

export interface PreemptionEvaluation {
	canPreempt: boolean;
	preemptionPlan: {
		preemptedExecutions: string[];
		recoveryActions: string[];
		estimatedDelay: number;
	};
	affectedExecutions: Array<{
		planId: string;
		impact: 'paused' | 'cancelled' | 'delayed';
		estimatedDelay: number;
	}>;
}

export interface QuotaCheck {
	withinLimits: boolean;
	violations: Array<{
		type: 'memory' | 'cpu' | 'agents';
		limit: number;
		requested: number;
		excess: number;
	}>;
	adjustedPlan: ExecutionPlan;
}

/**
 * Enhanced ResourceManager for Phase 1.3 nO Architecture
 */
export class ResourceManager {
	private readonly cfg: ResourceManagerConfig;
	private agentCounter = 0;

	constructor(config?: Partial<ResourceManagerConfig>) {
		this.cfg = ResourceManagerConfigSchema.parse({
			maxConcurrentAgents: 5,
			...(config || {}),
		});
	}

	/**
	 * Enhanced resource allocation for execution plans
	 */
	async allocateResources(plan: ExecutionPlan): Promise<ResourceAllocation> {
		const agentAssignments: ResourceAllocation['details']['agentAssignments'] = [];
		const agentIds: string[] = [];
		let totalMemoryMB = 0;
		let totalCpuPercent = 0;

		// Allocate agents based on strategy and steps
		const requiredAgents = this.calculateRequiredAgents(plan);
		const actualAgentCount = Math.min(requiredAgents, this.cfg.maxConcurrentAgents);

		for (let i = 0; i < actualAgentCount; i++) {
			const agentId = `agent-${++this.agentCounter}`;
			const specialization = this.determineSpecialization(plan.steps, i);
			const assignedSteps = this.assignStepsToAgent(plan.steps, i, actualAgentCount);

			// Calculate resource allocation per agent
			const memoryMB = Math.ceil(plan.resourceAllocation.memoryMB / actualAgentCount);
			const cpuPercent = Math.ceil(plan.resourceAllocation.cpuPercent / actualAgentCount);

			agentIds.push(agentId);
			agentAssignments.push({
				agentId,
				specialization,
				assignedSteps,
				memoryMB,
				cpuPercent,
			});

			totalMemoryMB += memoryMB;
			totalCpuPercent += cpuPercent;
		}

		// Calculate estimated cost
		const durationHours = plan.estimatedDuration / (1000 * 60 * 60);
		const estimatedCost = this.calculateCost(
			totalMemoryMB,
			totalCpuPercent,
			durationHours,
			actualAgentCount,
		);

		return {
			agents: agentIds,
			totalMemoryMB,
			totalCpuPercent,
			estimatedCost,
			details: {
				agentAssignments,
			},
		};
	}

	/**
	 * Scale resources based on current system load
	 */
	async scaleResources(systemLoad: {
		currentCpuUsage: number;
		currentMemoryUsage: number;
		availableAgents: number;
		networkLatency: number;
	}): Promise<ScalingDecision> {
		let recommendedAgents = this.cfg.maxConcurrentAgents;
		let reasoning = 'Normal resource allocation';
		let cpuThrottling = false;
		let maxMemoryMB = this.cfg.maxMemoryMB;

		// Adjust based on CPU usage
		if (systemLoad.currentCpuUsage > 0.8) {
			recommendedAgents = Math.ceil(recommendedAgents * 0.7);
			cpuThrottling = true;
			reasoning = 'Reduced agents due to high CPU usage';
		}

		// Adjust based on memory usage
		if (systemLoad.currentMemoryUsage > 0.8) {
			maxMemoryMB = Math.ceil(maxMemoryMB * 0.6);
			reasoning += '; limited memory allocation';
		}

		// Constraint by available agents
		if (systemLoad.availableAgents < recommendedAgents) {
			recommendedAgents = systemLoad.availableAgents;
			reasoning += '; constrained by available agents';
		}

		// Handle very constrained resources
		if (systemLoad.currentCpuUsage > 0.9 || systemLoad.currentMemoryUsage > 0.9) {
			recommendedAgents = Math.min(1, systemLoad.availableAgents);
			cpuThrottling = true;
			maxMemoryMB = Math.ceil(maxMemoryMB * 0.3); // More aggressive reduction for constrained resources
			reasoning = 'Severely constrained resources - minimal allocation';
		}

		return {
			recommendedAgents,
			reasoning,
			cpuThrottling,
			memoryLimits: {
				maxMemoryMB,
				perAgentMemoryMB: Math.ceil(maxMemoryMB / Math.max(1, recommendedAgents)),
			},
		};
	}

	/**
	 * Create and manage agent pools with specializations
	 */
	async createAgentPool(
		requirements: Array<{
			specialization: string;
			count: number;
		}>,
	): Promise<AgentPool> {
		const agents: AgentPool['agents'] = [];
		let totalMemoryMB = 0;
		let totalCpuPercent = 0;

		requirements.forEach((req) => {
			for (let i = 0; i < req.count; i++) {
				const agentId = `${req.specialization}-agent-${++this.agentCounter}`;
				const capabilities = this.getCapabilitiesForSpecialization(req.specialization);
				const resourceUsage = this.getResourceUsageForSpecialization(req.specialization);

				agents.push({
					id: agentId,
					specialization: req.specialization,
					status: 'available',
					capabilities,
					resourceUsage,
				});

				totalMemoryMB += resourceUsage.memoryMB;
				totalCpuPercent += resourceUsage.cpuPercent;
			}
		});

		return {
			agents,
			totalCapacity: {
				memoryMB: totalMemoryMB,
				cpuPercent: totalCpuPercent,
			},
		};
	}

	/**
	 * Handle agent failures and provide replacements
	 */
	async handleAgentFailure(
		pool: AgentPool,
		failedAgentId: string,
		failureReason: string,
	): Promise<AgentFailureHandling> {
		// Find the failed agent
		const failedAgent = pool.agents.find((a) => a.id === failedAgentId);
		if (!failedAgent) {
			throw new Error(`Agent ${failedAgentId} not found in pool`);
		}

		// Create replacement agent with same specialization
		const replacementId = `${failedAgent.specialization}-agent-${++this.agentCounter}-replacement`;
		const newAgent = {
			id: replacementId,
			specialization: failedAgent.specialization,
			status: 'available' as const,
			capabilities: [...failedAgent.capabilities],
			resourceUsage: { ...failedAgent.resourceUsage },
		};

		// Update pool - replace failed agent
		const updatedPool: AgentPool = {
			...pool,
			agents: pool.agents.map((agent) => (agent.id === failedAgentId ? newAgent : agent)),
		};

		return {
			newAgent,
			updatedPool,
			failureLog: {
				failedAgentId,
				reason: failureReason,
				timestamp: new Date().toISOString(),
				replacementId,
			},
		};
	}

	/**
	 * Enforce resource constraints and suggest optimizations
	 */
	async enforceConstraints(
		plan: ExecutionPlan,
		constraints: {
			maxMemoryMB: number;
			maxCpuPercent: number;
			maxConcurrentAgents: number;
		},
	): Promise<ConstraintEnforcement> {
		const violations: string[] = [];
		const adjustedPlan = { ...plan };
		let feasible = true;

		// Check memory constraint
		if (plan.resourceAllocation.memoryMB > constraints.maxMemoryMB) {
			violations.push(
				`Memory usage ${plan.resourceAllocation.memoryMB}MB exceeds limit ${constraints.maxMemoryMB}MB`,
			);
			adjustedPlan.resourceAllocation.memoryMB = constraints.maxMemoryMB;
			feasible = false;
		}

		// Check CPU constraint
		if (plan.resourceAllocation.cpuPercent > constraints.maxCpuPercent) {
			violations.push(
				`CPU usage ${plan.resourceAllocation.cpuPercent}% exceeds limit ${constraints.maxCpuPercent}%`,
			);
			adjustedPlan.resourceAllocation.cpuPercent = constraints.maxCpuPercent;
			feasible = false;
		}

		// Check agent constraint
		const requiredAgents = this.calculateRequiredAgents(plan);
		if (requiredAgents > constraints.maxConcurrentAgents) {
			violations.push(
				`Required agents ${requiredAgents} exceeds limit ${constraints.maxConcurrentAgents}`,
			);
			// Adjust strategy to be more sequential
			if (adjustedPlan.strategy === 'parallel') {
				adjustedPlan.strategy = 'hierarchical';
			} else if (adjustedPlan.strategy === 'hierarchical') {
				adjustedPlan.strategy = 'sequential';
			}
			feasible = false;
		}

		const optimizationSuggestions = [
			...violations,
			...(feasible
				? []
				: [
						'Consider breaking down the task into smaller subtasks',
						'Use more efficient algorithms to reduce resource requirements',
						'Schedule execution during off-peak hours',
					]),
		];

		return {
			feasible,
			adjustedPlan,
			optimizationSuggestions,
		};
	}

	/**
	 * Optimize resource allocation for cost efficiency
	 */
	async optimizeForCost(
		plan: ExecutionPlan,
		costParams: {
			agentHourlyCost: number;
			memoryGBHourlyCost: number;
			cpuHourlyCost: number;
			prioritizeSpeed: boolean;
		},
	): Promise<CostOptimization> {
		const originalAllocation = await this.allocateResources(plan);
		const originalCost = originalAllocation.estimatedCost;

		// Optimize by potentially using fewer agents for longer duration
		const optimizedPlan = { ...plan };
		const tradeoffs: string[] = [];

		if (!costParams.prioritizeSpeed) {
			// Reduce parallelism to save on agent costs
			if (plan.strategy === 'parallel') {
				optimizedPlan.strategy = 'sequential';
				optimizedPlan.estimatedDuration = plan.estimatedDuration * 1.5;
				tradeoffs.push('Increased duration for cost savings');
			}

			// Reduce memory allocation if possible
			optimizedPlan.resourceAllocation.memoryMB = Math.ceil(plan.resourceAllocation.memoryMB * 0.8);
			optimizedPlan.resourceAllocation.cpuPercent = Math.ceil(
				plan.resourceAllocation.cpuPercent * 0.9,
			);
			tradeoffs.push('Reduced resource allocation');
		}

		const optimizedAllocation = await this.allocateResources(optimizedPlan);
		const costSavings = originalCost - optimizedAllocation.estimatedCost;

		return {
			estimatedCost: optimizedAllocation.estimatedCost,
			optimizedAllocation,
			costSavings: Math.max(0, costSavings),
			tradeoffs,
		};
	}

	/**
	 * Monitor resource usage during execution
	 */
	async monitorResourceUsage(execution: {
		planId: string;
		agentIds: string[];
		startTime: string;
		currentStep: string;
	}): Promise<ResourceMonitoring> {
		// Simulate current resource usage
		const currentUsage = {
			memoryMB: execution.agentIds.length * 256, // Base memory per agent
			cpuPercent: execution.agentIds.length * 25, // Base CPU per agent
			networkLatency: 50 + Math.random() * 100, // Simulated latency
		};

		// Project future usage
		const projectedUsage = {
			memoryMB: currentUsage.memoryMB * 1.2, // Expect some growth
			cpuPercent: Math.min(100, currentUsage.cpuPercent * 1.1),
			estimatedCompletion: new Date(Date.now() + 5000).toISOString(),
		};

		// Generate alerts based on usage
		const alerts: ResourceMonitoring['alerts'] = [];
		if (currentUsage.memoryMB > 1024) {
			alerts.push({
				type: 'warning',
				message: 'High memory usage detected',
				metric: 'memory',
				threshold: 1024,
				currentValue: currentUsage.memoryMB,
			});
		}

		if (currentUsage.cpuPercent > 80) {
			alerts.push({
				type: 'critical',
				message: 'Critical CPU usage detected',
				metric: 'cpu',
				threshold: 80,
				currentValue: currentUsage.cpuPercent,
			});
		}

		return {
			currentUsage,
			projectedUsage,
			alerts,
		};
	}

	/**
	 * Analyze resource efficiency and provide recommendations
	 */
	async analyzeResourceEfficiency(
		historicalData: Array<{
			planId: string;
			strategy: string;
			allocatedMemoryMB: number;
			usedMemoryMB: number;
			allocatedCpuPercent: number;
			usedCpuPercent: number;
			duration: number;
			agentCount: number;
		}>,
	): Promise<ResourceAnalytics> {
		if (historicalData.length === 0) {
			return {
				averageUtilization: { memory: 0, cpu: 0 },
				recommendations: ['No historical data available'],
				trends: {
					memoryUsageTrend: 'stable',
					cpuUsageTrend: 'stable',
					efficiencyTrend: 'stable',
				},
			};
		}

		// Calculate average utilization
		const avgMemoryUtilization =
			historicalData.reduce((sum, data) => sum + data.usedMemoryMB / data.allocatedMemoryMB, 0) /
			historicalData.length;

		const avgCpuUtilization =
			historicalData.reduce(
				(sum, data) => sum + data.usedCpuPercent / data.allocatedCpuPercent,
				0,
			) / historicalData.length;

		// Generate recommendations
		const recommendations: string[] = [];
		if (avgMemoryUtilization < 0.6) {
			recommendations.push('Consider reducing memory allocations - current utilization is low');
		}
		if (avgCpuUtilization < 0.7) {
			recommendations.push('Consider reducing CPU allocations - current utilization is low');
		}
		if (avgMemoryUtilization > 0.9) {
			recommendations.push('Consider increasing memory allocations - usage is near capacity');
		}
		if (avgCpuUtilization > 0.9) {
			recommendations.push('Consider increasing CPU allocations - usage is near capacity');
		}

		return {
			averageUtilization: {
				memory: avgMemoryUtilization,
				cpu: avgCpuUtilization,
			},
			recommendations,
			trends: {
				memoryUsageTrend: 'stable', // Simplified for now
				cpuUsageTrend: 'stable',
				efficiencyTrend:
					avgMemoryUtilization > 0.7 && avgCpuUtilization > 0.7 ? 'improving' : 'stable',
			},
		};
	}

	/**
	 * Evaluate resource preemption for high-priority tasks
	 */
	async evaluatePreemption(
		highPriorityPlan: ExecutionPlan,
		currentExecutions: Array<{
			planId: string;
			priority: string;
			allocatedAgents: string[];
			estimatedCompletion: string;
		}>,
	): Promise<PreemptionEvaluation> {
		const requiredAgents = this.calculateRequiredAgents(highPriorityPlan);
		const lowPriorityExecutions = currentExecutions.filter((exec) => exec.priority === 'low');

		const canPreempt =
			lowPriorityExecutions.length > 0 &&
			lowPriorityExecutions.reduce((sum, exec) => sum + exec.allocatedAgents.length, 0) >=
				requiredAgents;

		const affectedExecutions = lowPriorityExecutions
			.slice(0, Math.ceil(requiredAgents / 2))
			.map((exec) => ({
				planId: exec.planId,
				impact: 'paused' as const,
				estimatedDelay: 5000, // 5 second delay
			}));

		return {
			canPreempt,
			preemptionPlan: {
				preemptedExecutions: affectedExecutions.map((ae) => ae.planId),
				recoveryActions: ['pause_execution', 'reschedule_after_completion'],
				estimatedDelay: 5000,
			},
			affectedExecutions,
		};
	}

	/**
	 * Check resource quotas and limits
	 */
	async checkQuotas(
		plan: ExecutionPlan,
		userQuotas: {
			userId: string;
			dailyMemoryLimitMB: number;
			dailyCpuLimitPercent: number;
			maxConcurrentAgents: number;
			currentUsage: {
				memoryMB: number;
				cpuPercent: number;
				activeAgents: number;
			};
		},
	): Promise<QuotaCheck> {
		const violations: QuotaCheck['violations'] = [];
		let withinLimits = true;
		const adjustedPlan = { ...plan };

		// Check memory quota
		const totalMemoryRequired = userQuotas.currentUsage.memoryMB + plan.resourceAllocation.memoryMB;
		if (totalMemoryRequired > userQuotas.dailyMemoryLimitMB) {
			const excess = totalMemoryRequired - userQuotas.dailyMemoryLimitMB;
			violations.push({
				type: 'memory',
				limit: userQuotas.dailyMemoryLimitMB,
				requested: totalMemoryRequired,
				excess,
			});
			adjustedPlan.resourceAllocation.memoryMB = Math.max(
				64,
				userQuotas.dailyMemoryLimitMB - userQuotas.currentUsage.memoryMB,
			);
			withinLimits = false;
		}

		// Check CPU quota (considering duration)
		const durationHours = plan.estimatedDuration / (1000 * 60 * 60);
		const cpuHours = plan.resourceAllocation.cpuPercent * durationHours;
		const totalCpuRequired = userQuotas.currentUsage.cpuPercent + cpuHours;
		if (totalCpuRequired > userQuotas.dailyCpuLimitPercent) {
			const excess = totalCpuRequired - userQuotas.dailyCpuLimitPercent;
			violations.push({
				type: 'cpu',
				limit: userQuotas.dailyCpuLimitPercent,
				requested: totalCpuRequired,
				excess,
			});
			adjustedPlan.resourceAllocation.cpuPercent = Math.max(
				10,
				(userQuotas.dailyCpuLimitPercent - userQuotas.currentUsage.cpuPercent) / durationHours,
			);
			withinLimits = false;
		}

		// Check agent quota
		const requiredAgents = this.calculateRequiredAgents(plan);
		const totalAgentsRequired = userQuotas.currentUsage.activeAgents + requiredAgents;
		if (totalAgentsRequired > userQuotas.maxConcurrentAgents) {
			const excess = totalAgentsRequired - userQuotas.maxConcurrentAgents;
			violations.push({
				type: 'agents',
				limit: userQuotas.maxConcurrentAgents,
				requested: totalAgentsRequired,
				excess,
			});
			// Adjust strategy to use fewer agents
			if (adjustedPlan.strategy === 'parallel') {
				adjustedPlan.strategy = 'sequential';
			}
			withinLimits = false;
		}

		return {
			withinLimits,
			violations,
			adjustedPlan,
		};
	}

	// Private helper methods
	private calculateRequiredAgents(plan: ExecutionPlan): number {
		switch (plan.strategy) {
			case 'parallel':
				return Math.min(plan.steps.length, this.cfg.maxConcurrentAgents);
			case 'hierarchical':
				return Math.min(Math.ceil(plan.steps.length / 2), this.cfg.maxConcurrentAgents);
			default:
				return 1;
		}
	}

	private determineSpecialization(steps: ExecutionPlan['steps'], agentIndex: number): string {
		if (steps.length === 0) return 'general';
		const step = steps[agentIndex % steps.length];
		return step.agentRequirements[0] || 'general';
	}

	private assignStepsToAgent(
		steps: ExecutionPlan['steps'],
		agentIndex: number,
		totalAgents: number,
	): string[] {
		if (totalAgents === 1) {
			return steps.map((s) => s.id);
		}

		const stepsPerAgent = Math.ceil(steps.length / totalAgents);
		const startIndex = agentIndex * stepsPerAgent;
		const endIndex = Math.min(startIndex + stepsPerAgent, steps.length);

		return steps.slice(startIndex, endIndex).map((s) => s.id);
	}

	private calculateCost(
		memoryMB: number,
		cpuPercent: number,
		durationHours: number,
		agentCount: number,
	): number {
		const memoryCost = (memoryMB / 1024) * this.cfg.memoryGBHourlyCost * durationHours;
		const cpuCost = (cpuPercent / 100) * this.cfg.cpuHourlyCost * durationHours;
		const agentCost = agentCount * this.cfg.agentHourlyCost * durationHours;

		return Number((memoryCost + cpuCost + agentCost).toFixed(2));
	}

	private getCapabilitiesForSpecialization(specialization: string): string[] {
		const capabilityMap: Record<string, string[]> = {
			analyst: ['data_analysis', 'pattern_recognition', 'reporting'],
			executor: ['task_execution', 'processing', 'computation'],
			coordinator: ['workflow_management', 'resource_coordination', 'synchronization'],
			general: ['basic_tasks', 'flexible_processing'],
		};

		return capabilityMap[specialization] || capabilityMap.general;
	}

	private getResourceUsageForSpecialization(specialization: string): {
		memoryMB: number;
		cpuPercent: number;
	} {
		const resourceMap: Record<string, { memoryMB: number; cpuPercent: number }> = {
			analyst: { memoryMB: 512, cpuPercent: 30 },
			executor: { memoryMB: 256, cpuPercent: 50 },
			coordinator: { memoryMB: 128, cpuPercent: 20 },
			general: { memoryMB: 256, cpuPercent: 25 },
		};

		return resourceMap[specialization] || resourceMap.general;
	}
}
