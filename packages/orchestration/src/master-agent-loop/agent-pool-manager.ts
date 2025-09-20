import { z } from 'zod';
import {
    type AgentConfiguration,
    AgentConfigurationSchema,
    type AgentError,
    type AgentPool,
    AgentPoolSchema,
    type AgentState,
    AgentStateSchema,
    type RecoveryAction,
    RecoveryActionSchema,
} from '../contracts/no-architecture-contracts.js';
import { withEnhancedSpan } from '../observability/otel.js';

// Enhanced types for Phase 2.1 AgentPool Management
export interface AgentLifecycleEvent {
    agentId: string;
    event: 'created' | 'started' | 'stopped' | 'failed' | 'recovered' | 'destroyed';
    timestamp: string;
    metadata: Record<string, unknown>;
}

export interface LoadBalancingStrategy {
    name: 'round-robin' | 'least-loaded' | 'performance-based' | 'resource-aware';
    parameters: Record<string, unknown>;
}

export interface PoolMetrics {
    totalAgents: number;
    activeAgents: number;
    busyAgents: number;
    errorAgents: number;
    averageLoad: number;
    resourceUtilization: {
        totalMemoryMB: number;
        usedMemoryMB: number;
        totalCpuPercent: number;
        usedCpuPercent: number;
    };
    throughput: {
        tasksPerMinute: number;
        successRate: number;
        averageTaskDuration: number;
    };
}

export interface AgentPoolConfiguration extends AgentConfiguration {
    loadBalancingStrategy: LoadBalancingStrategy;
    autoscaling: {
        enabled: boolean;
        minAgents: number;
        maxAgents: number;
        scaleUpThreshold: number;
        scaleDownThreshold: number;
        cooldownPeriod: number;
    };
    healthCheck: {
        enabled: boolean;
        interval: number;
        timeout: number;
        failureThreshold: number;
        recoveryThreshold: number;
    };
}

/**
 * Phase 2.1: Enhanced AgentPool Manager for nO Architecture
 *
 * Features:
 * - Dynamic agent lifecycle management with automated scaling
 * - Sophisticated load balancing strategies (round-robin, performance-based, resource-aware)
 * - Real-time health monitoring and recovery mechanisms
 * - Advanced resource allocation and constraint management
 * - Performance metrics tracking and optimization
 * - Event-driven coordination with observability integration
 *
 * Co-authored-by: brAInwav Development Team
 */
export class AgentPoolManager {
    private readonly agents: Map<string, AgentState> = new Map();
    private readonly configuration: AgentPoolConfiguration;
    private readonly lifecycleListeners: Array<(event: AgentLifecycleEvent) => void> = [];
    private healthCheckInterval: NodeJS.Timeout | null = null;
    private metrics: PoolMetrics;
    private lastLoadBalanceIndex = 0;

    constructor(config: AgentPoolConfiguration) {
        this.configuration = AgentConfigurationSchema.extend({
            loadBalancingStrategy: z.object({
                name: z.enum(['round-robin', 'least-loaded', 'performance-based', 'resource-aware']),
                parameters: z.record(z.unknown()).default({}),
            }),
            autoscaling: z.object({
                enabled: z.boolean().default(false),
                minAgents: z.number().int().min(1).default(1),
                maxAgents: z.number().int().max(50).default(10),
                scaleUpThreshold: z.number().min(0).max(1).default(0.8),
                scaleDownThreshold: z.number().min(0).max(1).default(0.3),
                cooldownPeriod: z.number().int().min(30000).default(300000), // 5 minutes
            }),
            healthCheck: z.object({
                enabled: z.boolean().default(true),
                interval: z.number().int().min(5000).default(30000), // 30 seconds
                timeout: z.number().int().min(1000).default(10000), // 10 seconds
                failureThreshold: z.number().int().min(1).default(3),
                recoveryThreshold: z.number().int().min(1).default(2),
            }),
        }).parse(config);

        this.metrics = this.initializeMetrics();

        if (this.configuration.healthCheck.enabled) {
            this.startHealthChecking();
        }
    }

    /**
     * Initialize agent pool with configuration
     */
    async initializePool(): Promise<AgentPool> {
        return withEnhancedSpan(
            'agentPoolManager.initializePool',
            async () => {
                // Create initial agents
                const initialAgents: AgentState[] = [];
                const minAgents =
                    this.configuration.autoscaling?.minAgents || this.configuration.agentPoolSize;

                for (let i = 0; i < minAgents; i++) {
                    const agent = await this.createAgent(`agent-${Date.now()}-${i}`, 'general');
                    initialAgents.push(agent);
                }

                this.updateMetrics();

                const pool: AgentPool = {
                    agents: initialAgents,
                    totalCapacity: this.configuration.maxConcurrentAgents,
                    availableCapacity: this.getAvailableCapacity(),
                    healthStatus: this.determinePoolHealth(),
                };

                this.emitLifecycleEvent('pool-initialized', 'system', { poolSize: initialAgents.length });

                return AgentPoolSchema.parse(pool);
            },
            {
                workflowName: 'agent-pool-management',
                stepKind: 'initialization',
                phase: 'pool-setup',
            },
        );
    }

    /**
     * Create new agent with specified specialization
     */
    async createAgent(agentId: string, specialization: string): Promise<AgentState> {
        return withEnhancedSpan(
            'agentPoolManager.createAgent',
            async () => {
                const agent: AgentState = {
                    agentId,
                    specialization,
                    status: 'idle',
                    currentTask: undefined,
                    performance: {
                        tasksCompleted: 0,
                        averageExecutionTime: 0,
                        successRate: 1.0,
                        errorCount: 0,
                    },
                    resources: {
                        memoryUsageMB: 0,
                        cpuUsagePercent: 0,
                    },
                    lastUpdate: new Date().toISOString(),
                    version: '2.0.0-nO',
                };

                const validatedAgent = AgentStateSchema.parse(agent);
                this.agents.set(agentId, validatedAgent);

                this.emitLifecycleEvent('created', agentId, { specialization });
                this.updateMetrics();

                return validatedAgent;
            },
            {
                workflowName: 'agent-pool-management',
                stepKind: 'agent-creation',
                phase: 'lifecycle-management',
            },
        );
    }

    /**
     * Remove agent from pool
     */
    async destroyAgent(agentId: string): Promise<void> {
        return withEnhancedSpan(
            'agentPoolManager.destroyAgent',
            async () => {
                const agent = this.agents.get(agentId);
                if (!agent) {
                    throw new Error(`Agent ${agentId} not found`);
                }

                // Gracefully stop agent if it's busy
                if (agent.status === 'busy' && agent.currentTask) {
                    await this.reassignTask(agent.currentTask, agentId);
                }

                this.agents.delete(agentId);
                this.emitLifecycleEvent('destroyed', agentId, { reason: 'manual_removal' });
                this.updateMetrics();
            },
            {
                workflowName: 'agent-pool-management',
                stepKind: 'agent-destruction',
                phase: 'lifecycle-management',
            },
        );
    }

    /**
     * Select optimal agent for task assignment using load balancing strategy
     */
    async selectAgent(taskRequirements: {
        specialization?: string;
        resourceRequirements?: { memoryMB: number; cpuPercent: number };
        priority: 'low' | 'normal' | 'high' | 'urgent';
    }): Promise<string | null> {
        return withEnhancedSpan(
            'agentPoolManager.selectAgent',
            async () => {
                const availableAgents = Array.from(this.agents.values()).filter(
                    (agent) =>
                        agent.status === 'idle' &&
                        (!taskRequirements.specialization ||
                            agent.specialization === taskRequirements.specialization),
                );

                if (availableAgents.length === 0) {
                    // Try autoscaling if enabled
                    if (this.configuration.autoscaling.enabled) {
                        const scaled = await this.attemptAutoscale('up', taskRequirements);
                        if (scaled) {
                            return this.selectAgent(taskRequirements);
                        }
                    }
                    return null;
                }

                let selectedAgent: AgentState;

                switch (this.configuration.loadBalancingStrategy.name) {
                    case 'round-robin':
                        selectedAgent = this.selectRoundRobin(availableAgents);
                        break;
                    case 'least-loaded':
                        selectedAgent = this.selectLeastLoaded(availableAgents);
                        break;
                    case 'performance-based':
                        selectedAgent = this.selectPerformanceBased(availableAgents);
                        break;
                    case 'resource-aware':
                        selectedAgent = this.selectResourceAware(
                            availableAgents,
                            taskRequirements.resourceRequirements,
                        );
                        break;
                    default:
                        selectedAgent = availableAgents[0];
                }

                return selectedAgent.agentId;
            },
            {
                workflowName: 'agent-pool-management',
                stepKind: 'agent-selection',
                phase: 'load-balancing',
            },
        );
    }

    /**
     * Assign task to specific agent
     */
    async assignTask(agentId: string, taskId: string): Promise<void> {
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        if (agent.status !== 'idle') {
            throw new Error(`Agent ${agentId} is not available (status: ${agent.status})`);
        }

        agent.status = 'busy';
        agent.currentTask = taskId;
        agent.lastUpdate = new Date().toISOString();

        this.agents.set(agentId, agent);
        this.updateMetrics();
    }

    /**
     * Complete task and free agent
     */
    async completeTask(
        agentId: string,
        taskId: string,
        success: boolean,
        duration: number,
    ): Promise<void> {
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        if (agent.currentTask !== taskId) {
            throw new Error(`Agent ${agentId} is not working on task ${taskId}`);
        }

        // Update performance metrics
        agent.performance.tasksCompleted++;
        agent.performance.averageExecutionTime =
            (agent.performance.averageExecutionTime * (agent.performance.tasksCompleted - 1) + duration) /
            agent.performance.tasksCompleted;

        if (!success) {
            agent.performance.errorCount++;
        }

        agent.performance.successRate =
            (agent.performance.tasksCompleted - agent.performance.errorCount) /
            agent.performance.tasksCompleted;

        agent.status = 'idle';
        agent.currentTask = undefined;
        agent.lastUpdate = new Date().toISOString();

        this.agents.set(agentId, agent);
        this.updateMetrics();

        // Check for autoscaling
        if (this.configuration.autoscaling.enabled) {
            await this.checkAutoscaling();
        }
    }

    /**
     * Handle agent failure and recovery
     */
    async handleAgentFailure(agentId: string, error: AgentError): Promise<RecoveryAction> {
        return withEnhancedSpan(
            'agentPoolManager.handleAgentFailure',
            async () => {
                const agent = this.agents.get(agentId);
                if (!agent) {
                    throw new Error(`Agent ${agentId} not found`);
                }

                // Update agent status
                agent.status = 'error';
                agent.performance.errorCount++;
                agent.lastUpdate = new Date().toISOString();
                this.agents.set(agentId, agent);

                this.emitLifecycleEvent('failed', agentId, {
                    error: error.error,
                    severity: error.severity,
                });

                // Determine recovery action based on error severity and agent history
                let recoveryAction: RecoveryAction;

                if (error.severity === 'critical' || agent.performance.errorCount > 5) {
                    // Restart agent for critical errors or repeated failures
                    recoveryAction = {
                        type: 'restart',
                        targetAgent: agentId,
                        reasoning: `Agent ${agentId} requires restart due to ${error.severity} error or repeated failures`,
                    };
                    await this.restartAgent(agentId);
                } else if (agent.currentTask) {
                    // Redistribute current task to another agent
                    const newAgentId = await this.selectAgent({
                        specialization: agent.specialization,
                        priority: 'high',
                    });

                    if (newAgentId) {
                        recoveryAction = {
                            type: 'redistribute',
                            targetAgent: agentId,
                            fallbackAgent: newAgentId,
                            newTaskDistribution: [
                                {
                                    agentId: newAgentId,
                                    tasks: [agent.currentTask],
                                },
                            ],
                            reasoning: `Redistributing task ${agent.currentTask} from failed agent ${agentId} to ${newAgentId}`,
                        };
                        await this.reassignTask(agent.currentTask, agentId, newAgentId);
                    } else {
                        recoveryAction = {
                            type: 'fallback',
                            targetAgent: agentId,
                            reasoning: `No available agents for task redistribution, entering fallback mode`,
                        };
                    }
                } else {
                    // Try to recover agent in place
                    recoveryAction = {
                        type: 'restart',
                        targetAgent: agentId,
                        reasoning: `Attempting in-place recovery for agent ${agentId}`,
                    };
                    await this.recoverAgent(agentId);
                }

                this.updateMetrics();
                return RecoveryActionSchema.parse(recoveryAction);
            },
            {
                workflowName: 'agent-pool-management',
                stepKind: 'failure-recovery',
                phase: 'error-handling',
            },
        );
    }

    /**
     * Get current pool metrics
     */
    getPoolMetrics(): PoolMetrics {
        return { ...this.metrics };
    }

    /**
     * Get current pool state
     */
    getPoolState(): AgentPool {
        return {
            agents: Array.from(this.agents.values()),
            totalCapacity: this.configuration.maxConcurrentAgents,
            availableCapacity: this.getAvailableCapacity(),
            healthStatus: this.determinePoolHealth(),
        };
    }

    /**
     * Add lifecycle event listener
     */
    onLifecycleEvent(listener: (event: AgentLifecycleEvent) => void): () => void {
        this.lifecycleListeners.push(listener);
        return () => {
            const index = this.lifecycleListeners.indexOf(listener);
            if (index > -1) {
                this.lifecycleListeners.splice(index, 1);
            }
        };
    }

    /**
     * Cleanup and shutdown pool
     */
    async shutdown(): Promise<void> {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

        // Gracefully shutdown all agents
        const agentIds = Array.from(this.agents.keys());
        const shutdownPromises = agentIds.map(async (agentId) => {
            try {
                const agent = this.agents.get(agentId);
                if (agent) {
                    // Clear any current task without reassignment during shutdown
                    agent.currentTask = undefined;
                    agent.status = 'shutdown';
                    this.agents.set(agentId, agent);
                }
                // Remove from pool
                this.agents.delete(agentId);
                this.emitLifecycleEvent('destroyed', agentId, { reason: 'shutdown' });
            } catch (error) {
                console.error(`Error shutting down agent ${agentId}:`, error);
            }
        });

        await Promise.allSettled(shutdownPromises);
        this.lifecycleListeners.length = 0;
        this.emitLifecycleEvent('pool-shutdown', 'system', {});
    }

    // Private helper methods

    private selectRoundRobin(agents: AgentState[]): AgentState {
        const agent = agents[this.lastLoadBalanceIndex % agents.length];
        this.lastLoadBalanceIndex++;
        return agent;
    }

    private selectLeastLoaded(agents: AgentState[]): AgentState {
        return agents.reduce<AgentState>((least, current) =>
            current.performance.tasksCompleted < least.performance.tasksCompleted ? current : least,
            agents[0]);
    }

    private selectPerformanceBased(agents: AgentState[]): AgentState {
        return agents.reduce<AgentState>((best, current) => {
            const currentScore =
                current.performance.successRate *
                (1 / Math.max(1, current.performance.averageExecutionTime / 1000));
            const bestScore =
                best.performance.successRate *
                (1 / Math.max(1, best.performance.averageExecutionTime / 1000));
            return currentScore > bestScore ? current : best;
        }, agents[0]);
    }

    private selectResourceAware(
        agents: AgentState[],
        requirements?: { memoryMB: number; cpuPercent: number },
    ): AgentState {
        if (!requirements) return agents[0];

        return agents.reduce<AgentState>((best, current) => {
            const currentFit = this.calculateResourceFit(current, requirements);
            const bestFit = this.calculateResourceFit(best, requirements);
            return currentFit > bestFit ? current : best;
        }, agents[0]);
    }

    private calculateResourceFit(
        agent: AgentState,
        _requirements: { memoryMB: number; cpuPercent: number },
    ): number {
        const memoryFit =
            1 - agent.resources.memoryUsageMB / this.configuration.resourceLimits.memoryMB;
        const cpuFit =
            1 - agent.resources.cpuUsagePercent / this.configuration.resourceLimits.cpuPercent;
        return (memoryFit + cpuFit) / 2;
    }

    private async restartAgent(agentId: string): Promise<void> {
        const agent = this.agents.get(agentId);
        if (!agent) return;

        const currentTask = agent.currentTask;
        const specialization = agent.specialization;

        // Remove old agent
        this.agents.delete(agentId);

        // Create new agent with same ID and specialization
        await this.createAgent(agentId, specialization);

        // Reassign task if there was one
        if (currentTask) {
            const alternateAgent = await this.selectAgent({ specialization, priority: 'high' });
            if (alternateAgent && alternateAgent !== agentId) {
                await this.reassignTask(currentTask, agentId, alternateAgent);
            }
        }

        this.emitLifecycleEvent('recovered', agentId, { method: 'restart' });
    }

    private async recoverAgent(agentId: string): Promise<void> {
        const agent = this.agents.get(agentId);
        if (!agent) return;

        // Reset agent to idle state
        agent.status = 'idle';
        agent.currentTask = undefined;
        agent.lastUpdate = new Date().toISOString();

        this.agents.set(agentId, agent);
        this.emitLifecycleEvent('recovered', agentId, { method: 'in-place' });
    }

    private async reassignTask(
        taskId: string,
        fromAgentId: string,
        toAgentId?: string,
    ): Promise<void> {
        if (!toAgentId) {
            // Find alternative agent
            const selectedAgentId = await this.selectAgent({ priority: 'high' });
            toAgentId = selectedAgentId || undefined;
        }

        if (toAgentId && toAgentId !== fromAgentId) {
            await this.assignTask(toAgentId, taskId);
        }

        // Clear task from original agent
        const fromAgent = this.agents.get(fromAgentId);
        if (fromAgent) {
            fromAgent.currentTask = undefined;
            if (fromAgent.status === 'busy') {
                fromAgent.status = 'idle';
            }
            this.agents.set(fromAgentId, fromAgent);
        }
    }

    private async attemptAutoscale(
        direction: 'up' | 'down',
        taskRequirements?: {
            specialization?: string;
            resourceRequirements?: { memoryMB: number; cpuPercent: number };
            priority?: 'low' | 'normal' | 'high' | 'urgent';
        },
    ): Promise<boolean> {
        const currentSize = this.agents.size;
        const config = this.configuration.autoscaling;

        if (direction === 'up' && currentSize < config.maxAgents) {
            const newAgentId = `agent-${Date.now()}-autoscale`;
            const specialization = taskRequirements?.specialization || 'general';
            await this.createAgent(newAgentId, specialization);
            this.emitLifecycleEvent('scaled-up', newAgentId, {
                reason: 'demand',
                currentSize: currentSize + 1,
            });
            return true;
        } else if (direction === 'down' && currentSize > config.minAgents) {
            // Find least utilized idle agent
            const idleAgents = Array.from(this.agents.values()).filter((a) => a.status === 'idle');
            if (idleAgents.length > 0) {
                const leastUtilized = idleAgents.reduce<AgentState>((least, current) =>
                    current.performance.tasksCompleted < least.performance.tasksCompleted ? current : least,
                    idleAgents[0]);
                await this.destroyAgent(leastUtilized.agentId);
                this.emitLifecycleEvent('scaled-down', leastUtilized.agentId, {
                    reason: 'low-utilization',
                    currentSize: currentSize - 1,
                });
                return true;
            }
        }

        return false;
    }

    private async checkAutoscaling(): Promise<void> {
        const metrics = this.getPoolMetrics();
        const config = this.configuration.autoscaling;

        if (metrics.averageLoad > config.scaleUpThreshold) {
            await this.attemptAutoscale('up');
        } else if (metrics.averageLoad < config.scaleDownThreshold) {
            await this.attemptAutoscale('down');
        }
    }

    private startHealthChecking(): void {
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthChecks();
        }, this.configuration.healthCheck.interval);
    }

    private async performHealthChecks(): Promise<void> {
        const healthPromises = Array.from(this.agents.entries()).map(([agentId, agent]) =>
            this.checkAgentHealth(agentId, agent),
        );

        await Promise.allSettled(healthPromises);
        this.updateMetrics();
    }

    private async checkAgentHealth(agentId: string, agent: AgentState): Promise<void> {
        try {
            // Simulate health check - in real implementation, this would ping the agent
            const isHealthy =
                agent.status !== 'error' &&
                Date.now() - new Date(agent.lastUpdate).getTime() <
                this.configuration.healthCheck.timeout * 2;

            if (!isHealthy && agent.status !== 'error') {
                const error: AgentError = {
                    agentId,
                    error: 'Health check failed - agent unresponsive',
                    severity: 'medium',
                    timestamp: new Date().toISOString(),
                    context: { lastUpdate: agent.lastUpdate },
                };
                await this.handleAgentFailure(agentId, error);
            }
        } catch (error) {
            console.error(`Health check failed for agent ${agentId}:`, error);
        }
    }

    private getAvailableCapacity(): number {
        const idleAgents = Array.from(this.agents.values()).filter(
            (agent) => agent.status === 'idle',
        ).length;
        return Math.min(idleAgents, this.configuration.maxConcurrentAgents);
    }

    private determinePoolHealth(): 'healthy' | 'degraded' | 'critical' {
        const totalAgents = this.agents.size;
        const errorAgents = Array.from(this.agents.values()).filter(
            (agent) => agent.status === 'error',
        ).length;

        const errorRatio = errorAgents / Math.max(1, totalAgents);

        if (errorRatio > 0.5) return 'critical';
        if (errorRatio > 0.2) return 'degraded';
        return 'healthy';
    }

    private updateMetrics(): void {
        const agents = Array.from(this.agents.values());
        const activeAgents = agents.filter(
            (a) => a.status !== 'error' && a.status !== 'shutdown',
        ).length;
        const busyAgents = agents.filter((a) => a.status === 'busy').length;
        const errorAgents = agents.filter((a) => a.status === 'error').length;

        const totalTasks = agents.reduce((sum, a) => sum + a.performance.tasksCompleted, 0);
        const totalDurations = agents.reduce(
            (sum, a) => sum + a.performance.averageExecutionTime * a.performance.tasksCompleted,
            0,
        );
        const totalMemory = agents.reduce((sum, a) => sum + a.resources.memoryUsageMB, 0);
        const totalCpu = agents.reduce((sum, a) => sum + a.resources.cpuUsagePercent, 0);

        this.metrics = {
            totalAgents: agents.length,
            activeAgents,
            busyAgents,
            errorAgents,
            averageLoad: busyAgents / Math.max(1, activeAgents),
            resourceUtilization: {
                totalMemoryMB: this.configuration.resourceLimits.memoryMB * agents.length,
                usedMemoryMB: totalMemory,
                totalCpuPercent: this.configuration.resourceLimits.cpuPercent * agents.length,
                usedCpuPercent: totalCpu,
            },
            throughput: {
                tasksPerMinute: totalTasks > 0 ? totalTasks / Math.max(1, totalDurations / 60000) : 0,
                successRate:
                    totalTasks > 0
                        ? agents.reduce((sum, a) => sum + a.performance.successRate, 0) / agents.length
                        : 1.0,
                averageTaskDuration: totalTasks > 0 ? totalDurations / totalTasks : 0,
            },
        };
    }

    private initializeMetrics(): PoolMetrics {
        return {
            totalAgents: 0,
            activeAgents: 0,
            busyAgents: 0,
            errorAgents: 0,
            averageLoad: 0,
            resourceUtilization: {
                totalMemoryMB: 0,
                usedMemoryMB: 0,
                totalCpuPercent: 0,
                usedCpuPercent: 0,
            },
            throughput: {
                tasksPerMinute: 0,
                successRate: 1.0,
                averageTaskDuration: 0,
            },
        };
    }

    private emitLifecycleEvent(
        event:
            | AgentLifecycleEvent['event']
            | 'pool-initialized'
            | 'pool-shutdown'
            | 'scaled-up'
            | 'scaled-down',
        agentId: string,
        metadata: Record<string, unknown>,
    ): void {
        const lifecycleEvent: AgentLifecycleEvent = {
            agentId,
            event: event as AgentLifecycleEvent['event'],
            timestamp: new Date().toISOString(),
            metadata,
        };

        this.lifecycleListeners.forEach((listener) => {
            try {
                listener(lifecycleEvent);
            } catch (error) {
                console.error('Error in lifecycle event listener:', error);
            }
        });
    }
}

export default AgentPoolManager;
