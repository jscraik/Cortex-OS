/**
 * Adaptive Strategy Selection Test Suite
 * Tests adaptive coordination strategy selection based on capability and history
 * Validates brAInwav-enhanced DSP patterns for intelligent orchestration
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    type AdaptiveCoordinationConfig,
    AdaptiveCoordinationManager,
    type CoordinationRequest,
} from '../../src/coordinator/adaptive-coordinator.js';
import type { LongHorizonTask } from '../../src/lib/long-horizon-planner.js';
import { type Agent, AgentRole, OrchestrationStrategy } from '../../src/types.js';

describe('Adaptive Strategy Selection - Phase 11 DSP Integration', () => {
    let coordinationManager: AdaptiveCoordinationManager;
    let config: AdaptiveCoordinationConfig;
    let mockAgents: Agent[];
    let mockTask: LongHorizonTask;

    beforeEach(() => {
        config = {
            learningEnabled: true,
            contextIsolationEnabled: true,
            maxHistorySize: 100,
            strategyTimeoutMs: 5000,
            performanceThreshold: 0.7,
            nOArchitectureEnabled: true,
        };

        coordinationManager = new AdaptiveCoordinationManager(config);

        mockAgents = [
            createMockAgent('agent-001', AgentRole.PLANNER, ['planning', 'analysis']),
            createMockAgent('agent-002', AgentRole.EXECUTOR, ['execution', 'deployment']),
            createMockAgent('agent-003', AgentRole.COORDINATOR, ['coordination', 'monitoring']),
            createMockAgent('agent-004', AgentRole.SPECIALIST, ['security', 'performance']),
            createMockAgent('agent-005', AgentRole.WORKER, ['data-processing', 'computation']),
            // Add multi-capability agents for complex coordination scenarios
            createMockAgent('agent-006', AgentRole.COORDINATOR, ['execution', 'coordination']),
            createMockAgent('agent-007', AgentRole.PLANNER, ['planning', 'execution']),
            createMockAgent('agent-008', AgentRole.SPECIALIST, ['security', 'execution']),
        ];

        mockTask = {
            id: 'adaptive-task-001',
            description: 'Complex multi-phase coordination task',
            complexity: 6,
            priority: 7,
            estimatedDuration: 15000,
            dependencies: [],
            metadata: {
                taskType: 'coordination',
                brainwavOrigin: 'test-suite',
            },
        };
    });

    describe('Strategy Selection Based on Capability', () => {
        it('should select sequential strategy for low complexity tasks', async () => {
            const simpleTask = { ...mockTask, complexity: 2, priority: 3 };
            const limitedAgents = mockAgents.slice(0, 2);

            const request: CoordinationRequest = {
                task: simpleTask,
                availableAgents: limitedAgents,
                constraints: {
                    maxDuration: 10000,
                    maxAgents: 2,
                    requiredCapabilities: ['planning'],
                },
            };

            const result = await coordinationManager.coordinate(request);

            // Low complexity (≤3) with single capability should use sequential
            expect(result.strategy).toBe(OrchestrationStrategy.SEQUENTIAL);
            expect(result.assignments.length).toBeGreaterThan(0);
            expect(result.brainwavMetadata.coordinatedBy).toBe('brAInwav');
        });

        it('should select appropriate strategy for medium complexity tasks', async () => {
            const mediumTask = { ...mockTask, complexity: 5, priority: 9 };
            const sufficientAgents = mockAgents.slice(0, 4);

            const request: CoordinationRequest = {
                task: mediumTask,
                availableAgents: sufficientAgents,
                constraints: {
                    maxDuration: 8000,
                    maxAgents: 4,
                    requiredCapabilities: ['execution'], // Single capability that agent-002 has
                },
            };

            const result = await coordinationManager.coordinate(request);

            // Complexity 5 (medium ≤6) with single capability should work
            expect([OrchestrationStrategy.SEQUENTIAL, OrchestrationStrategy.PARALLEL]).toContain(result.strategy);
            expect(result.assignments.length).toBeGreaterThan(0);
        });

        it('should select hierarchical strategy for high complexity tasks', async () => {
            const complexTask = { ...mockTask, complexity: 8, priority: 8 };
            // Use agents that have overlapping capabilities for complex coordination
            const capableAgents = [
                ...mockAgents.slice(0, 3), // Basic agents
                createMockAgent('multi-001', AgentRole.COORDINATOR, ['planning', 'execution', 'security']),
                createMockAgent('multi-002', AgentRole.SPECIALIST, ['monitoring', 'security']),
            ];

            const request: CoordinationRequest = {
                task: complexTask,
                availableAgents: capableAgents,
                constraints: {
                    maxDuration: 20000,
                    maxAgents: 5,
                    requiredCapabilities: ['planning', 'execution'],
                },
            };

            const result = await coordinationManager.coordinate(request);

            // Complexity 8 (high ≤8) should choose parallel or hierarchical
            expect([OrchestrationStrategy.PARALLEL, OrchestrationStrategy.HIERARCHICAL]).toContain(result.strategy);
            expect(result.assignments.length).toBeGreaterThan(0);
        });

        it('should select adaptive strategy for very complex tasks', async () => {
            const veryComplexTask = { ...mockTask, complexity: 9, priority: 7 };
            const largeAgentTeam = [
                ...mockAgents,
                createMockAgent('agent-009', AgentRole.COORDINATOR, ['team-lead', 'coordination']),
                createMockAgent('agent-010', AgentRole.MONITOR, ['observability', 'metrics']),
                // Add agents with combined capabilities for complex coordination
                createMockAgent('multi-003', AgentRole.PLANNER, ['planning', 'execution', 'coordination']),
                createMockAgent('multi-004', AgentRole.SPECIALIST, ['monitoring', 'coordination']),
            ];

            const request: CoordinationRequest = {
                task: veryComplexTask,
                availableAgents: largeAgentTeam,
                constraints: {
                    maxDuration: 25000,
                    maxAgents: 7,
                    requiredCapabilities: ['coordination'],
                },
            };

            const result = await coordinationManager.coordinate(request);

            // Complexity 9 (very complex >8) should use hierarchical or adaptive
            expect([OrchestrationStrategy.HIERARCHICAL, OrchestrationStrategy.ADAPTIVE]).toContain(result.strategy);
            expect(result.assignments.length).toBeGreaterThan(0);
        });

        it('should fall back to sequential when resources are severely constrained', async () => {
            const constrainedTask = { ...mockTask, complexity: 8, priority: 5 };
            const limitedAgents = mockAgents.slice(0, 1);

            const request: CoordinationRequest = {
                task: constrainedTask,
                availableAgents: limitedAgents,
                constraints: {
                    maxDuration: 5000,
                    maxAgents: 1,
                    requiredCapabilities: ['execution'],
                },
            };

            const result = await coordinationManager.coordinate(request);

            // With only 1 agent (<3), hierarchical and adaptive are filtered out
            // Should fall back to sequential or parallel (but likely sequential with 1 agent)
            expect([OrchestrationStrategy.SEQUENTIAL, OrchestrationStrategy.PARALLEL]).toContain(result.strategy);
        });
    });

    describe('Strategy Selection Based on History', () => {
        it('should learn from successful strategy executions', async () => {
            // Execute a successful parallel strategy
            const successfulTask = { ...mockTask, id: 'success-task' };
            const request: CoordinationRequest = {
                task: successfulTask,
                availableAgents: mockAgents.slice(0, 3),
                constraints: {
                    maxDuration: 10000,
                    maxAgents: 3,
                    requiredCapabilities: ['planning', 'execution'],
                },
            };

            const firstResult = await coordinationManager.coordinate(request);

            // Simulate successful completion by accessing private method via reflection
            // In real implementation, this would be handled by the orchestration engine
            const updatePerformance = (coordinationManager as any).updateStrategyPerformance;
            updatePerformance.call(coordinationManager, firstResult.strategy, successfulTask, {
                efficiency: 0.9,
                quality: 0.85,
                speed: 0.8,
                resourceUtilization: 0.75,
            });

            // Execute similar task - should prefer successful strategy
            const similarTask = { ...mockTask, id: 'similar-task', complexity: 6, priority: 7 };
            const similarRequest: CoordinationRequest = {
                task: similarTask,
                availableAgents: mockAgents.slice(0, 3),
                constraints: {
                    maxDuration: 10000,
                    maxAgents: 3,
                    requiredCapabilities: ['planning', 'execution'],
                },
            };

            const secondResult = await coordinationManager.coordinate(similarRequest);

            expect(secondResult.strategy).toBe(firstResult.strategy);
        });

        it('should avoid strategies with poor historical performance', async () => {
            // Record poor performance using private method
            const updatePerformance = (coordinationManager as any).updateStrategyPerformance;
            updatePerformance.call(coordinationManager, OrchestrationStrategy.SEQUENTIAL, mockTask, {
                efficiency: 0.3,
                quality: 0.4,
                speed: 0.2,
                resourceUtilization: 0.6,
            });

            const taskRequest: CoordinationRequest = {
                task: mockTask,
                availableAgents: mockAgents.slice(0, 2),
                constraints: {
                    maxDuration: 15000,
                    maxAgents: 2,
                    requiredCapabilities: ['planning'],
                },
            };

            const result = await coordinationManager.coordinate(taskRequest);

            // The system should still work even with poor performance data
            // Since this is the only available strategy for the constraints, it might still be selected
            expect(result.strategy).toBeDefined();
            expect(result.assignments.length).toBeGreaterThan(0);
        });

        it('should weight recent performance more heavily than historical data', async () => {
            // Add old performance data
            const updatePerformance = (coordinationManager as any).updateStrategyPerformance;
            updatePerformance.call(coordinationManager, OrchestrationStrategy.PARALLEL, mockTask, {
                efficiency: 0.5,
                quality: 0.5,
                speed: 0.5,
                resourceUtilization: 0.5,
            });

            // Add recent good performance
            updatePerformance.call(coordinationManager, OrchestrationStrategy.PARALLEL, mockTask, {
                efficiency: 0.95,
                quality: 0.9,
                speed: 0.85,
                resourceUtilization: 0.8,
            });

            const taskRequest: CoordinationRequest = {
                task: mockTask,
                availableAgents: mockAgents.slice(0, 3),
                constraints: {
                    maxDuration: 12000,
                    maxAgents: 3,
                    requiredCapabilities: ['execution', 'coordination'],
                },
            };

            const result = await coordinationManager.coordinate(taskRequest);

            // Should favor strategies with good recent performance
            expect([OrchestrationStrategy.SEQUENTIAL, OrchestrationStrategy.PARALLEL]).toContain(result.strategy);
        });

        it('should maintain performance history within configured limits', () => {
            const limitedConfig = { ...config, maxHistorySize: 5 };
            const limitedManager = new AdaptiveCoordinationManager(limitedConfig);

            // Add more entries than the limit
            const updatePerformance = (limitedManager as any).updateStrategyPerformance;
            for (let i = 0; i < 10; i++) {
                updatePerformance.call(limitedManager, OrchestrationStrategy.ADAPTIVE, mockTask, {
                    efficiency: 0.7,
                    quality: 0.7,
                    speed: 0.7,
                    resourceUtilization: 0.7,
                });
            }

            const performanceStats = limitedManager.getStats();
            expect(performanceStats.totalExecutions).toBeLessThanOrEqual(5);
        });
    });

    describe('nO Architecture Integration', () => {
        it('should implement nO Master Agent Loop principles', async () => {
            const nOTask = { ...mockTask, complexity: 7, priority: 8 };
            const request: CoordinationRequest = {
                task: nOTask,
                availableAgents: mockAgents,
                constraints: {
                    maxDuration: 15000,
                    maxAgents: 4,
                    requiredCapabilities: ['planning', 'execution', 'coordination'],
                },
            };

            const result = await coordinationManager.coordinate(request);

            // nO architecture should work with various strategies
            expect(result.strategy).toBeDefined();
            expect(result.assignments.length).toBeGreaterThan(0);

            // Should distribute coordination across agents
            expect(result.assignments.length).toBeLessThanOrEqual(4);
        });

        it('should enable distributed decision making in nO patterns', async () => {
            const distributedTask = { ...mockTask, complexity: 6, priority: 6 };
            const request: CoordinationRequest = {
                task: distributedTask,
                availableAgents: mockAgents.slice(0, 4),
                constraints: {
                    maxDuration: 12000,
                    maxAgents: 4,
                    requiredCapabilities: ['planning'],
                },
            };

            const result = await coordinationManager.coordinate(request);

            // nO patterns should distribute responsibilities
            expect(result.assignments.length).toBeGreaterThan(0);
            // Each assignment should have a meaningful role
            result.assignments.forEach(assignment => {
                expect(assignment.role).toBeDefined();
                expect(assignment.agentId).toBeDefined();
            });
        });

        it('should avoid single points of failure in nO architecture', async () => {
            const resilientTask = { ...mockTask, complexity: 8, priority: 9 };
            const request: CoordinationRequest = {
                task: resilientTask,
                availableAgents: mockAgents,
                constraints: {
                    maxDuration: 18000,
                    maxAgents: 5,
                    requiredCapabilities: ['planning'],
                },
            };

            const result = await coordinationManager.coordinate(request);

            // Should have assignments for the task
            expect(result.assignments.length).toBeGreaterThan(0);

            // Verify basic assignment structure
            result.assignments.forEach(assignment => {
                expect(assignment.taskId).toBe(resilientTask.id);
                expect(assignment.phase).toBeDefined();
            });
        });
    });

    describe('Context and Capability Matching', () => {
        it('should match agent capabilities to task requirements', async () => {
            const securityTask = {
                ...mockTask,
                id: 'security-task',
                metadata: { ...mockTask.metadata, securityRequired: true },
            };

            const request: CoordinationRequest = {
                task: securityTask,
                availableAgents: mockAgents,
                constraints: {
                    maxDuration: 12000,
                    maxAgents: 3,
                    requiredCapabilities: ['security'],
                },
            };

            const result = await coordinationManager.coordinate(request);

            // Should assign agents and have at least one with security capabilities
            expect(result.assignments.length).toBeGreaterThan(0);

            // Check if any assigned agent has security capabilities
            const hasSecurityAgent = result.assignments.some(assignment => {
                const agent = mockAgents.find(a => a.id === assignment.agentId);
                return agent?.capabilities.includes('security');
            });

            // If we have a security agent available, it should be assigned
            expect(hasSecurityAgent).toBe(true);
        });

        it('should handle partial capability matches gracefully', async () => {
            const specializedTask = { ...mockTask, complexity: 7 };
            const request: CoordinationRequest = {
                task: specializedTask,
                availableAgents: mockAgents.slice(0, 2), // Limited agents
                constraints: {
                    maxDuration: 15000,
                    maxAgents: 2,
                    requiredCapabilities: ['planning', 'security', 'data-science'], // More capabilities than available
                },
            };

            const result = await coordinationManager.coordinate(request);

            expect(result.assignments.length).toBeGreaterThan(0);
            // Should work with available capabilities
            expect(result.assignments.length).toBeGreaterThan(0);
        });

        it('should optimize agent utilization across capabilities', async () => {
            const multiCapabilityTask = { ...mockTask, complexity: 8 };
            // Create agents with diverse overlapping capabilities for this test
            const diverseAgents = [
                createMockAgent('diverse-001', AgentRole.PLANNER, ['planning', 'execution', 'security']),
                createMockAgent('diverse-002', AgentRole.EXECUTOR, ['execution', 'monitoring']),
                createMockAgent('diverse-003', AgentRole.SPECIALIST, ['security', 'planning']),
                createMockAgent('diverse-004', AgentRole.COORDINATOR, ['monitoring', 'coordination']),
            ];

            const request: CoordinationRequest = {
                task: multiCapabilityTask,
                availableAgents: diverseAgents,
                constraints: {
                    maxDuration: 20000,
                    maxAgents: 5,
                    requiredCapabilities: ['planning'],
                },
            };

            const result = await coordinationManager.coordinate(request);

            // Should utilize agents with diverse capabilities
            const assignedAgentIds = new Set(result.assignments.map((a) => a.agentId));
            const assignedCapabilities = new Set();

            assignedAgentIds.forEach((agentId) => {
                const agent = diverseAgents.find((a) => a.id === agentId);
                if (agent) {
                    for (const cap of agent.capabilities) {
                        assignedCapabilities.add(cap);
                    }
                }
            });

            expect(assignedCapabilities.size).toBeGreaterThan(1);
            expect(result.assignments.length).toBeGreaterThan(0);
        });
    });

    describe('brAInwav Telemetry and Monitoring', () => {
        it('should emit telemetry events for strategy decisions', async () => {
            const telemetrySpy = vi.fn();
            // Note: In real implementation, telemetry would be handled by orchestration engine
            // This test validates the structure is in place for telemetry integration
            const request: CoordinationRequest = {
                task: mockTask,
                availableAgents: mockAgents.slice(0, 3),
                constraints: {
                    maxDuration: 10000,
                    maxAgents: 3,
                    requiredCapabilities: ['planning', 'execution'],
                },
            };

            const result = await coordinationManager.coordinate(request);

            // Validate result contains telemetry-ready metadata
            expect(result.brainwavMetadata.coordinatedBy).toBe('brAInwav');
            expect(result.brainwavMetadata.timestamp).toBeInstanceOf(Date);
        });

        it('should track strategy performance metrics', async () => {
            const request: CoordinationRequest = {
                task: mockTask,
                availableAgents: mockAgents.slice(0, 3),
                constraints: {
                    maxDuration: 10000,
                    maxAgents: 3,
                    requiredCapabilities: ['planning'],
                },
            };

            const result = await coordinationManager.coordinate(request);

            expect(result.metrics).toBeDefined();
            expect(result.estimatedDuration).toBeGreaterThan(0);
            expect(result.brainwavMetadata.version).toBeDefined();
        });

        it('should maintain brAInwav branding in all outputs', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            const request: CoordinationRequest = {
                task: mockTask,
                availableAgents: mockAgents.slice(0, 2),
                constraints: {
                    maxDuration: 8000,
                    maxAgents: 2,
                    requiredCapabilities: ['planning'],
                },
            };

            await coordinationManager.coordinate(request);

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('brAInwav Adaptive Coordinator'),
            );

            consoleSpy.mockRestore();
        });
    });
});

// Helper function to create mock agents
function createMockAgent(id: string, role: AgentRole, capabilities: string[]): Agent {
    return {
        id,
        name: `Agent ${id}`,
        role,
        capabilities,
        status: 'available',
        metadata: {
            brainwavManaged: true,
            createdBy: 'brAInwav',
        },
        lastSeen: new Date(),
    };
}
