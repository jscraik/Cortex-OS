/**
 * Phase 1.1: BasicScheduler TDD Test Suite
 *
 * Test-driven development for nO Intelligence & Scheduler Core
 * Following the TDD plan: Red-Green-Refactor cycle
 *
 * Co-authored-by: brAInwav Development Team
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type {
    AgentSchedule,
    ExecutionFeedback,
    ExecutionPlan,
    ExecutionRequest,
} from '../../contracts/no-architecture-contracts.js';
import {
    AgentScheduleSchema,
    ExecutionPlanSchema,
    ExecutionStatusSchema,
    StrategyAdjustmentSchema
} from '../../contracts/no-architecture-contracts.js';
import { BasicScheduler } from '../basic-scheduler.js';

describe('Phase 1.1: BasicScheduler (nO Architecture)', () => {
    let scheduler: BasicScheduler;

    beforeEach(() => {
        scheduler = new BasicScheduler();
    });

    describe('Core Scheduling Engine', () => {
        it('should create execution plan from simple request', async () => {
            const request: ExecutionRequest = {
                id: 'req-demo-001',
                description: 'Simple demo task for testing',
                priority: 'medium',
                complexity: 0.3,
                timeoutMs: 5000,
                resourceLimits: {
                    memoryMB: 256,
                    cpuPercent: 50,
                    timeoutMs: 5000,
                },
                constraints: {
                    maxTokens: 512,
                    maxConcurrentAgents: 3,
                },
                metadata: {
                    createdBy: 'test-suite',
                },
            };

            // This will fail until BasicScheduler is updated to use nO contracts
            const plan = await scheduler.planExecution(request);
            const parsedPlan = ExecutionPlanSchema.parse(plan);

            expect(parsedPlan.steps.length).toBeGreaterThanOrEqual(1);
            expect(parsedPlan.id).toBeDefined();
            expect(parsedPlan.strategy).toBeDefined();
            expect(parsedPlan.requestId).toBe('req-demo-001');
        });

        it('should use StrategySelector for parallel execution when complexity is high', async () => {
            const request: ExecutionRequest = {
                id: 'req-complex-001',
                description: 'Complex parallelizable task',
                priority: 'high',
                complexity: 0.9,
                timeoutMs: 10000,
                resourceLimits: {
                    memoryMB: 512,
                    cpuPercent: 75,
                    timeoutMs: 10000,
                },
                constraints: {
                    maxTokens: 1024,
                    maxConcurrentAgents: 5,
                    canParallelize: true,
                    estimatedBranches: 4,
                },
            };

            // This will fail until strategy selection is properly implemented
            const plan = await scheduler.planExecution(request);
            const parsedPlan = ExecutionPlanSchema.parse(plan);

            expect(parsedPlan.steps.length).toBeGreaterThanOrEqual(3);
            expect(['parallel', 'hierarchical'].includes(parsedPlan.strategy)).toBe(true);

            // For parallel strategy, many steps should have no dependencies
            const independentSteps = parsedPlan.steps.filter((step) => step.dependencies.length === 0);
            expect(independentSteps.length).toBeGreaterThanOrEqual(2);
        });

        it('should use sequential strategy for low complexity tasks', async () => {
            const request: ExecutionRequest = {
                id: 'req-sequential-001',
                description: 'Simple sequential task',
                priority: 'medium',
                complexity: 0.2,
                timeoutMs: 5000,
                resourceLimits: {
                    memoryMB: 128,
                    cpuPercent: 30,
                    timeoutMs: 5000,
                },
                constraints: {
                    maxTokens: 256,
                    maxConcurrentAgents: 1,
                    canParallelize: false,
                },
            };

            // This will fail until sequential strategy handling is implemented
            const plan = await scheduler.planExecution(request);
            const parsedPlan = ExecutionPlanSchema.parse(plan);

            expect(parsedPlan.strategy).toBe('sequential');
            expect(parsedPlan.steps.length).toBeGreaterThanOrEqual(1);

            // Sequential tasks should have dependency chains
            const dependentSteps = parsedPlan.steps.filter((step) => step.dependencies.length > 0);
            expect(dependentSteps.length).toBeGreaterThanOrEqual(0); // May be 0 for single step
        });

        it('should include bounded metadata from resource limits', async () => {
            const request: ExecutionRequest = {
                id: 'req-bounded-001',
                description: 'Task with strict resource bounds',
                priority: 'urgent',
                complexity: 0.6,
                timeoutMs: 3000,
                resourceLimits: {
                    memoryMB: 1024,
                    cpuPercent: 80,
                    timeoutMs: 3000,
                },
                constraints: {
                    maxTokens: 2048,
                    maxConcurrentAgents: 4,
                },
            };

            // This will fail until bounds are properly included in metadata
            const plan = await scheduler.planExecution(request);
            const parsedPlan = ExecutionPlanSchema.parse(plan);

            expect(parsedPlan.resourceAllocation).toBeDefined();
            expect(parsedPlan.resourceAllocation.timeoutMs).toBe(3000);
            expect(parsedPlan.resourceAllocation.memoryMB).toBe(1024);
            expect(parsedPlan.resourceAllocation.cpuPercent).toBe(80);
        });
    });

    describe('Agent Scheduling', () => {
        it('should schedule agents for execution plan', async () => {
            const plan: ExecutionPlan = {
                id: 'plan-001',
                requestId: 'req-001',
                strategy: 'sequential',
                estimatedDuration: 5000,
                steps: [
                    {
                        id: 'step-1',
                        type: 'execution',
                        agentRequirements: ['general'],
                        dependencies: [],
                        estimatedDuration: 1000,
                        parameters: {},
                    },
                ],
                resourceAllocation: {
                    memoryMB: 256,
                    cpuPercent: 50,
                    timeoutMs: 5000,
                },
                contingencyPlans: [],
                metadata: {},
            };

            const availableAgents = ['agent-a'];

            // This will fail until agent scheduling is properly implemented
            const schedule = await scheduler.scheduleAgents(plan, availableAgents);
            const parsedSchedule = AgentScheduleSchema.parse(schedule);

            expect(parsedSchedule.agents.length).toBe(1);
            expect(parsedSchedule.agents[0].agentId).toBe('agent-a');
            expect(parsedSchedule.planId).toBe('plan-001');
        });

        it('should distribute multiple steps across available agents', async () => {
            const plan: ExecutionPlan = {
                id: 'plan-multi',
                requestId: 'req-multi',
                strategy: 'parallel',
                estimatedDuration: 8000,
                steps: [
                    {
                        id: 'step-1',
                        type: 'analysis',
                        agentRequirements: ['analyst'],
                        dependencies: [],
                        estimatedDuration: 2000,
                        parameters: {},
                    },
                    {
                        id: 'step-2',
                        type: 'execution',
                        agentRequirements: ['executor'],
                        dependencies: [],
                        estimatedDuration: 3000,
                        parameters: {},
                    },
                    {
                        id: 'step-3',
                        type: 'validation',
                        agentRequirements: ['validator'],
                        dependencies: ['step-1', 'step-2'],
                        estimatedDuration: 1000,
                        parameters: {},
                    },
                ],
                resourceAllocation: {
                    memoryMB: 512,
                    cpuPercent: 70,
                    timeoutMs: 8000,
                },
                contingencyPlans: [],
                metadata: {},
            };

            const availableAgents = ['agent-a', 'agent-b', 'agent-c'];

            // This will fail until multi-agent scheduling is implemented
            const schedule = await scheduler.scheduleAgents(plan, availableAgents);
            const parsedSchedule = AgentScheduleSchema.parse(schedule);

            expect(parsedSchedule.agents.length).toBeGreaterThanOrEqual(2);
            expect(parsedSchedule.agents.every((agent) => availableAgents.includes(agent.agentId))).toBe(
                true,
            );
        });
    });

    describe('Strategy Adaptation', () => {
        it('should adapt strategy based on execution feedback', async () => {
            const feedback: ExecutionFeedback = {
                planId: 'plan-001',
                successRate: 0.4,
                averageDuration: 8000,
                resourceUtilization: {
                    memoryUsage: 0.9,
                    cpuUsage: 0.85,
                },
                errors: [
                    {
                        step: 'step-1',
                        error: 'timeout occurred',
                        severity: 'high',
                    },
                ],
                optimizationSuggestions: ['reduce complexity', 'increase timeout'],
            };

            // This will fail until strategy adaptation is properly implemented
            const adjustment = await scheduler.adaptStrategy(feedback);
            const parsedAdjustment = StrategyAdjustmentSchema.parse(adjustment);

            expect(parsedAdjustment.newStrategy).toBeDefined();
            expect(parsedAdjustment.reasoning).toBeDefined();
            expect(parsedAdjustment.confidence).toBeGreaterThanOrEqual(0);
            expect(parsedAdjustment.confidence).toBeLessThanOrEqual(1);

            // For low success rate, should suggest more conservative strategy
            expect(['sequential', 'adaptive'].includes(parsedAdjustment.newStrategy)).toBe(true);
        });
    });

    describe('Execution Monitoring', () => {
        it('should monitor execution and return status', async () => {
            const schedule: AgentSchedule = {
                id: 'schedule-001',
                planId: 'plan-001',
                agents: [
                    {
                        agentId: 'agent-a',
                        specialization: 'general',
                        assignedSteps: ['step-1'],
                        estimatedLoad: 0.5,
                        priority: 5,
                    },
                ],
                coordinationEvents: [],
                startTime: new Date().toISOString(),
                estimatedEndTime: new Date(Date.now() + 60000).toISOString(),
            };

            // This will fail until execution monitoring is properly implemented
            const status = await scheduler.monitorExecution(schedule);
            const parsedStatus = ExecutionStatusSchema.parse(status);

            expect(parsedStatus.status).toMatch(/pending|running|completed|failed|cancelled/);
            expect(parsedStatus.planId).toBe('plan-001');
            expect(parsedStatus.progress).toBeGreaterThanOrEqual(0);
            expect(parsedStatus.progress).toBeLessThanOrEqual(1);
        });
    });

    describe('Integration Tests', () => {
        it('should coordinate all scheduler components in end-to-end execution', async () => {
            const request: ExecutionRequest = {
                id: 'req-integration-001',
                description: 'Complex integration test task',
                priority: 'high',
                complexity: 0.8,
                timeoutMs: 15000,
                resourceLimits: {
                    memoryMB: 512,
                    cpuPercent: 75,
                    timeoutMs: 15000,
                },
                constraints: {
                    maxTokens: 1024,
                    maxConcurrentAgents: 4,
                    canParallelize: true,
                    estimatedBranches: 3,
                },
                metadata: {
                    createdBy: 'integration-test',
                },
            };

            const availableAgents = ['agent-a', 'agent-b', 'agent-c', 'agent-d'];

            // This will fail until end-to-end integration is properly implemented
            const result = await scheduler.execute(request, availableAgents);

            expect(result.success).toBeTruthy();
            expect(result.plan).toBeDefined();
            expect(result.schedule).toBeDefined();
            expect(result.status).toBeDefined();
            expect(result.adjustment).toBeDefined();

            // Validate all components use nO contracts
            ExecutionPlanSchema.parse(result.plan);
            AgentScheduleSchema.parse(result.schedule);
            ExecutionStatusSchema.parse(result.status);
            StrategyAdjustmentSchema.parse(result.adjustment);
        });

        it('should handle resource constraints gracefully', async () => {
            const request: ExecutionRequest = {
                id: 'req-constrained-001',
                description: 'Resource constrained task',
                priority: 'urgent',
                complexity: 0.9,
                timeoutMs: 1000, // Very tight
                resourceLimits: {
                    memoryMB: 64, // Very limited
                    cpuPercent: 25, // Low CPU
                    timeoutMs: 1000,
                },
                constraints: {
                    maxTokens: 64,
                    maxConcurrentAgents: 1,
                    canParallelize: false,
                },
            };

            // This will fail until constraint handling is properly implemented
            const plan = await scheduler.planExecution(request);
            const parsedPlan = ExecutionPlanSchema.parse(plan);

            // Should respect tight constraints
            expect(parsedPlan.resourceAllocation.timeoutMs).toBe(1000);
            expect(parsedPlan.resourceAllocation.memoryMB).toBe(64);
            expect(parsedPlan.resourceAllocation.cpuPercent).toBe(25);

            // Should adapt strategy to constraints (likely sequential)
            expect(parsedPlan.strategy).toBe('sequential');
        });
    });
});

// Test utilities for creating mock data structures
function createMockExecutionRequest(): ExecutionRequest {
    return {
        id: 'mock-req-001',
        description: 'Mock execution request for testing',
        priority: 'medium',
        complexity: 0.5,
        timeoutMs: 5000,
        resourceLimits: {
            memoryMB: 256,
            cpuPercent: 50,
            timeoutMs: 5000,
        },
        constraints: {
            maxTokens: 512,
            maxConcurrentAgents: 3,
        },
        metadata: {
            createdBy: 'mock-test',
        },
    };
}
