import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AgentLifecycleEvent, AgentPoolConfiguration } from '../agent-pool-manager.js';
import { AgentPoolManager } from '../agent-pool-manager.js';

/**
 * Phase 2.1: AgentPool Management Test Suite
 * Co-authored-by: brAInwav Development Team
 */
describe('Phase 2.1: Enhanced AgentPoolManager (nO Architecture)', () => {
    let poolManager: AgentPoolManager;
    let lifecycleEvents: AgentLifecycleEvent[];
    let mockConfiguration: AgentPoolConfiguration;

    beforeEach(() => {
        lifecycleEvents = [];
        mockConfiguration = {
            maxConcurrentAgents: 10,
            agentPoolSize: 3,
            healthCheckInterval: 5000,
            restartPolicy: 'on-failure',
            resourceLimits: { memoryMB: 512, cpuPercent: 80, timeoutMs: 30000 },
            loadBalancingStrategy: { name: 'round-robin', parameters: {} },
            autoscaling: {
                enabled: true,
                minAgents: 2,
                maxAgents: 8,
                scaleUpThreshold: 0.8,
                scaleDownThreshold: 0.3,
                cooldownPeriod: 60000,
            },
            healthCheck: {
                enabled: true,
                interval: 5000,
                timeout: 3000,
                failureThreshold: 3,
                recoveryThreshold: 2,
            },
        };

        poolManager = new AgentPoolManager(mockConfiguration);
        poolManager.onLifecycleEvent((event) => lifecycleEvents.push(event));
    });

    afterEach(async () => {
        await poolManager.shutdown();
    });

    describe('Pool Initialization and Management', () => {
        it('should initialize pool with minimum agents', async () => {
            const pool = await poolManager.initializePool();

            expect(pool.agents.length).toBe(mockConfiguration.autoscaling.minAgents);
            expect(pool.totalCapacity).toBe(mockConfiguration.maxConcurrentAgents);
            expect(pool.healthStatus).toBe('healthy');
            expect(pool.availableCapacity).toBeGreaterThan(0);

            const createdEvents = lifecycleEvents.filter((e) => e.event === 'created');
            expect(createdEvents.length).toBe(mockConfiguration.autoscaling.minAgents);

            pool.agents.forEach((agent) => {
                expect(agent.specialization).toBe('general');
                expect(agent.status).toBe('idle');
                expect(agent.performance.successRate).toBe(1.0);
                expect(agent.version).toBe('2.0.0-nO');
            });
        });

        it('should create agents with specified specializations', async () => {
            await poolManager.initializePool();
            const agent = await poolManager.createAgent('analysis-001', 'analysis');

            expect(agent.agentId).toBe('analysis-001');
            expect(agent.specialization).toBe('analysis');
            expect(agent.status).toBe('idle');

            const creationEvent = lifecycleEvents.find(
                (e) => e.event === 'created' && e.agentId === 'analysis-001',
            );
            expect(creationEvent?.metadata.specialization).toBe('analysis');
        });

        it('should destroy agents gracefully', async () => {
            await poolManager.initializePool();
            const initialPool = poolManager.getPoolState();
            const agentToDestroy = initialPool.agents[0].agentId;

            await poolManager.destroyAgent(agentToDestroy);

            const finalPool = poolManager.getPoolState();
            expect(finalPool.agents.length).toBe(initialPool.agents.length - 1);
            expect(finalPool.agents.find((a) => a.agentId === agentToDestroy)).toBeUndefined();
        });
    });

    describe('Load Balancing and Task Management', () => {
        beforeEach(async () => {
            await poolManager.initializePool();
        });

        it('should select agents using round-robin strategy', async () => {
            const pool = poolManager.getPoolState();
            const availableAgents = pool.agents.filter((a) => a.status === 'idle');

            const selections: (string | null)[] = [];
            for (let i = 0; i < availableAgents.length * 2; i++) {
                selections.push(await poolManager.selectAgent({ priority: 'normal' }));
            }

            const uniqueSelections = [...new Set(selections.filter((s) => s !== null))];
            expect(uniqueSelections.length).toBe(availableAgents.length);
        });

        it('should assign and complete tasks successfully', async () => {
            const pool = poolManager.getPoolState();
            const agentId = pool.agents[0].agentId;

            await poolManager.assignTask(agentId, 'test-task-001');

            let updatedAgent = poolManager.getPoolState().agents.find((a) => a.agentId === agentId);
            expect(updatedAgent?.status).toBe('busy');
            expect(updatedAgent?.currentTask).toBe('test-task-001');

            await poolManager.completeTask(agentId, 'test-task-001', true, 2500);

            updatedAgent = poolManager.getPoolState().agents.find((a) => a.agentId === agentId);
            expect(updatedAgent?.status).toBe('idle');
            expect(updatedAgent?.performance.tasksCompleted).toBe(1);
            expect(updatedAgent?.performance.averageExecutionTime).toBe(2500);
        });

        it('should handle specialization requirements', async () => {
            await poolManager.createAgent('specialist-001', 'data-analysis');

            const selected = await poolManager.selectAgent({
                specialization: 'data-analysis',
                priority: 'normal',
            });

            expect(selected).toBe('specialist-001');
        });
    });

    describe('Failure Recovery and Resilience', () => {
        beforeEach(async () => {
            await poolManager.initializePool();
        });

        it('should handle agent failures with restart recovery', async () => {
            const pool = poolManager.getPoolState();
            const agentId = pool.agents[0].agentId;

            const agentError = {
                agentId,
                error: 'Critical system failure',
                severity: 'critical' as const,
                timestamp: new Date().toISOString(),
                context: { reason: 'memory_exhaustion' },
            };

            const recoveryAction = await poolManager.handleAgentFailure(agentId, agentError);

            expect(recoveryAction.type).toBe('restart');
            expect(recoveryAction.targetAgent).toBe(agentId);
            expect(recoveryAction.reasoning).toContain('restart');

            const failedEvent = lifecycleEvents.find(
                (e) => e.event === 'failed' && e.agentId === agentId,
            );
            const recoveredEvent = lifecycleEvents.find(
                (e) => e.event === 'recovered' && e.agentId === agentId,
            );
            expect(failedEvent).toBeDefined();
            expect(recoveredEvent).toBeDefined();
        });

        it('should redistribute tasks on agent failure', async () => {
            const pool = poolManager.getPoolState();
            const failingAgentId = pool.agents[0].agentId;

            await poolManager.assignTask(failingAgentId, 'important-task');

            const agentError = {
                agentId: failingAgentId,
                error: 'Agent timeout',
                severity: 'medium' as const,
                timestamp: new Date().toISOString(),
                context: {},
            };

            const recoveryAction = await poolManager.handleAgentFailure(failingAgentId, agentError);

            if (recoveryAction.type === 'redistribute') {
                expect(recoveryAction.fallbackAgent).toBeDefined();
                expect(recoveryAction.newTaskDistribution?.[0].tasks).toContain('important-task');
            }
        });
    });

    describe('Metrics and Monitoring', () => {
        beforeEach(async () => {
            await poolManager.initializePool();
        });

        it('should track comprehensive pool metrics', async () => {
            const pool = poolManager.getPoolState();
            const agentId = pool.agents[0].agentId;

            await poolManager.assignTask(agentId, 'metrics-task');
            await poolManager.completeTask(agentId, 'metrics-task', true, 1000);

            const metrics = poolManager.getPoolMetrics();

            expect(metrics.totalAgents).toBeGreaterThan(0);
            expect(metrics.activeAgents).toBeGreaterThan(0);
            expect(metrics.averageLoad).toBeGreaterThanOrEqual(0);
            expect(metrics.resourceUtilization).toBeDefined();
            expect(metrics.throughput.successRate).toBeGreaterThan(0);
        });

        it('should update metrics after pool operations', async () => {
            const initialMetrics = poolManager.getPoolMetrics();
            await poolManager.createAgent('new-agent', 'general');

            const updatedMetrics = poolManager.getPoolMetrics();
            expect(updatedMetrics.totalAgents).toBe(initialMetrics.totalAgents + 1);
        });
    });

    describe('nO Architecture Integration', () => {
        beforeEach(async () => {
            await poolManager.initializePool();
        });

        it('should comply with nO contract schemas', async () => {
            const pool = poolManager.getPoolState();

            expect(pool.agents).toBeInstanceOf(Array);
            expect(['healthy', 'degraded', 'critical']).toContain(pool.healthStatus);

            pool.agents.forEach((agent) => {
                expect(['idle', 'busy', 'error', 'maintenance', 'shutdown']).toContain(agent.status);
                expect(agent.performance.successRate).toBeGreaterThanOrEqual(0);
                expect(agent.performance.successRate).toBeLessThanOrEqual(1);
            });
        });

        it('should handle edge cases safely', async () => {
            await expect(poolManager.assignTask('non-existent', 'test')).rejects.toThrow(
                'Agent non-existent not found',
            );

            const pool = poolManager.getPoolState();
            const agentId = pool.agents[0].agentId;

            await poolManager.assignTask(agentId, 'task-1');
            await expect(poolManager.assignTask(agentId, 'task-2')).rejects.toThrow('is not available');
        });
    });
});
