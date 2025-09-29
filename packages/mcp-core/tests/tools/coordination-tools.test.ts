/**
 * Coordination Tools Test Suite
 * Tests multi-agent coordination with security controls and isolation
 * Validates coordination tools respect security boundaries and brAInwav architecture
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
        type AssignTaskInput,
        assignTaskTool,
        CoordinationRole,
        CoordinationStrategy,
        type CreateCoordinationSessionInput,
        createCoordinationSessionTool,
        coordinationSessionManager,
        type RegisterAgentInput,
        registerAgentTool,
} from '../../src/tools/coordination-tools.js';

describe('Coordination Tools - Phase 12 Security & Isolation', () => {
        let testCoordinationId: string;

        beforeEach(() => {
                coordinationSessionManager.reset();
                vi.clearAllMocks();
        });

        describe('coordination-create-session tool', () => {
                it('creates coordination session with security controls and brAInwav branding', async () => {
                        const input: CreateCoordinationSessionInput = {
                                name: 'brAInwav nO Coordination Session',
                                description: 'Multi-agent coordination with strict security controls',
                                strategy: CoordinationStrategy.ADAPTIVE,
                                workspaceId: 'secure-workspace-001',
                                sessionId: 'secure-session-001',
                                securityContext: {
                                        isolationLevel: 'strict',
                                        permissions: {
                                                canCreateAgents: false,
                                                canManageWorkspace: true,
                                                canAccessHistory: true,
                                                canEmitEvents: true,
                                        },
                                        accessControls: {
                                                allowedAgentIds: ['agent-001', 'agent-002'],
                                                restrictedResources: ['sensitive-data', 'admin-functions'],
                                                maxConcurrentOperations: 3,
                                        },
                                },
                                maxAgents: 5,
                                timeoutMs: 180000,
                        };

                        const result = await createCoordinationSessionTool.execute(input);

                        expect(result.session).toBeDefined();
                        expect(result.session.name).toBe('brAInwav nO Coordination Session');
                        expect(result.session.strategy).toBe(CoordinationStrategy.ADAPTIVE);
                        expect(result.session.status).toBe('active');
                        expect(result.session.agents).toHaveLength(0);
                        expect(result.session.tasks).toHaveLength(0);

                        expect(result.session.securityContext.isolationLevel).toBe('strict');
                        expect(result.session.securityContext.permissions.canCreateAgents).toBe(false);
                        expect(result.session.securityContext.permissions.canManageWorkspace).toBe(true);
                        expect(result.session.securityContext.accessControls.allowedAgentIds).toEqual([
                                'agent-001',
                                'agent-002',
                        ]);
                        expect(result.session.securityContext.accessControls.maxConcurrentOperations).toBe(3);

                        expect(result.session.metadata.createdBy).toBe('brAInwav');
                        expect(result.session.metadata.nOArchitecture).toBe(true);
                        expect(result.brainwavMetadata.createdBy).toBe('brAInwav');
                        expect(result.brainwavMetadata.securityEnabled).toBe(true);
                        expect(result.brainwavMetadata.isolationActive).toBe(true);

                        expect(result.coordinationId).toMatch(/^coord-\d+-[a-z0-9]+$/);

                        testCoordinationId = result.coordinationId;
                });

                it('creates session with default security settings', async () => {
                        const input: CreateCoordinationSessionInput = {
                                name: 'Default Security Session',
                                strategy: CoordinationStrategy.SEQUENTIAL,
                                maxAgents: 10,
                                timeoutMs: 300000,
                        };

                        const result = await createCoordinationSessionTool.execute(input);

                        expect(result.session.securityContext.isolationLevel).toBe('moderate');
                        expect(result.session.securityContext.permissions.canCreateAgents).toBe(false);
                        expect(result.session.securityContext.permissions.canAccessHistory).toBe(true);
                        expect(result.session.securityContext.accessControls.maxConcurrentOperations).toBe(5);

                        expect(result.brainwavMetadata.isolationActive).toBe(false);
                });

                it('validates required input fields', async () => {
                        const input = {
                                name: '',
                        } as CreateCoordinationSessionInput;

                        await expect(createCoordinationSessionTool.execute(input)).rejects.toThrow();
                });

                it('emits A2A events for session creation with security metadata', async () => {
                        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

                        const input: CreateCoordinationSessionInput = {
                                name: 'A2A Security Test Session',
                                strategy: CoordinationStrategy.HIERARCHICAL,
                                securityContext: {
                                        isolationLevel: 'strict',
                                        permissions: {
                                                canCreateAgents: false,
                                                canManageWorkspace: false,
                                                canAccessHistory: true,
                                                canEmitEvents: true,
                                        },
                                        accessControls: {
                                                allowedAgentIds: [],
                                                restrictedResources: [],
                                                maxConcurrentOperations: 5,
                                        },
                                },
                                maxAgents: 10,
                                timeoutMs: 300000,
                        };

                        await createCoordinationSessionTool.execute(input);

                        expect(consoleSpy).toHaveBeenCalledWith(
                                expect.stringContaining('brAInwav A2A: Emitting event coordination.session.created'),
                                expect.objectContaining({
                                        strategy: CoordinationStrategy.HIERARCHICAL,
                                        securityLevel: 'strict',
                                        brainwavOrigin: true,
                                }),
                        );

                        consoleSpy.mockRestore();
                });
        });

        describe('coordination-register-agent tool', () => {
                beforeEach(async () => {
                        const session = await createCoordinationSessionTool.execute({
                                name: 'Agent Registration Test Session',
                                strategy: CoordinationStrategy.ADAPTIVE,
                                securityContext: {
                                        isolationLevel: 'strict',
                                        permissions: {
                                                canCreateAgents: true,
                                                canManageWorkspace: true,
                                                canAccessHistory: true,
                                                canEmitEvents: true,
                                        },
                                        accessControls: {
                                                allowedAgentIds: ['trusted-agent-001'],
                                                restrictedResources: [],
                                                maxConcurrentOperations: 2,
                                        },
                                },
                                maxAgents: 5,
                                timeoutMs: 120000,
                        });
                        testCoordinationId = session.coordinationId;
                });

                it('registers agent with security validation', async () => {
                        const input: RegisterAgentInput = {
                                coordinationId: testCoordinationId,
                                agent: {
                                        id: 'trusted-agent-001',
                                        name: 'Trusted Agent',
                                        role: CoordinationRole.COORDINATOR,
                                        status: 'available',
                                        capabilities: ['planning', 'coordination'],
                                        trustLevel: 9,
                                },
                                validatePermissions: true,
                        };

                        const result = await registerAgentTool.execute(input);

                        expect(result.agent).toBeDefined();
                        expect(result.agent.id).toBe('trusted-agent-001');
                        expect(result.agent.metadata.trustLevel).toBe(9);
                        expect(result.securityValidated).toBe(true);
                        expect(result.brainwavMetadata.securityChecked).toBe(true);
                });

                it('rejects agent failing security validation', async () => {
                        const input: RegisterAgentInput = {
                                coordinationId: testCoordinationId,
                                agent: {
                                        id: 'untrusted-agent-002',
                                        name: 'Untrusted Agent',
                                        role: CoordinationRole.EXECUTOR,
                                        status: 'available',
                                        capabilities: ['execution'],
                                        trustLevel: 4,
                                },
                                validatePermissions: true,
                        };

                        await expect(registerAgentTool.execute(input)).rejects.toThrow(/security validation/);
                });
        });

        describe('coordination-assign-task tool', () => {
                beforeEach(async () => {
                        const session = await createCoordinationSessionTool.execute({
                                name: 'Task Assignment Test Session',
                                strategy: CoordinationStrategy.ADAPTIVE,
                                maxAgents: 10,
                                timeoutMs: 240000,
                        });
                        testCoordinationId = session.coordinationId;

                        await registerAgentTool.execute({
                                coordinationId: testCoordinationId,
                                agent: {
                                        id: 'agent-task-001',
                                        name: 'Task Agent',
                                        role: CoordinationRole.EXECUTOR,
                                        status: 'available',
                                        capabilities: ['execution', 'analysis'],
                                        trustLevel: 9,
                                },
                                validatePermissions: true,
                        });
                });

                it('assigns task with capability-based strategy', async () => {
                        const input: AssignTaskInput = {
                                coordinationId: testCoordinationId,
                                task: {
                                        name: 'Execute Complex Task',
                                        description: 'Complex task requiring execution and analysis',
                                        dependencies: [],
                                        priority: 8,
                                        estimatedDuration: 600000,
                                        metadata: {
                                                requiredCapabilities: ['execution', 'analysis'],
                                        },
                                },
                                strategy: 'capability_based',
                                validateSecurity: true,
                        };

                        const result = await assignTaskTool.execute(input);

                        expect(result.task).toBeDefined();
                        expect(result.task.assignedAgent).toBe('agent-task-001');
                        expect(result.assignedAgent?.metadata.trustLevel).toBeGreaterThanOrEqual(8);
                        expect(result.securityValidated).toBe(true);
                        expect(result.brainwavMetadata.assignedBy).toBe('brAInwav');
                });

                it('allows unassigned tasks when no agent matches', async () => {
                        const input: AssignTaskInput = {
                                coordinationId: testCoordinationId,
                                task: {
                                        name: 'Specialized Task',
                                        description: 'Task requiring unavailable capability',
                                        dependencies: [],
                                        priority: 5,
                                        estimatedDuration: 120000,
                                        metadata: {
                                                requiredCapabilities: ['quantum-tunneling'],
                                        },
                                },
                                strategy: 'capability_based',
                                validateSecurity: true,
                        };

                        const result = await assignTaskTool.execute(input);

                        expect(result.task.assignedAgent).toBeUndefined();
                        expect(result.assignedAgent).toBeUndefined();
                        expect(result.securityValidated).toBe(true);
                });
        });
});
