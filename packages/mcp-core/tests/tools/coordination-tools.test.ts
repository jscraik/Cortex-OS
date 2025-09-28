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
	type RegisterAgentInput,
	registerAgentTool,
} from '../../src/tools/coordination-tools.js';

describe('Coordination Tools - Phase 12 Security & Isolation', () => {
	let testCoordinationId: string;

	beforeEach(() => {
		// Clear any existing coordination sessions
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

			// Verify session creation
			expect(result.session).toBeDefined();
			expect(result.session.name).toBe('brAInwav nO Coordination Session');
			expect(result.session.strategy).toBe(CoordinationStrategy.ADAPTIVE);
			expect(result.session.status).toBe('active');
			expect(result.session.agents).toHaveLength(0);
			expect(result.session.tasks).toHaveLength(0);

			// Verify security context
			expect(result.session.securityContext.isolationLevel).toBe('strict');
			expect(result.session.securityContext.permissions.canCreateAgents).toBe(false);
			expect(result.session.securityContext.permissions.canManageWorkspace).toBe(true);
			expect(result.session.securityContext.accessControls.allowedAgentIds).toEqual([
				'agent-001',
				'agent-002',
			]);
			expect(result.session.securityContext.accessControls.maxConcurrentOperations).toBe(3);

			// Verify brAInwav metadata
			expect(result.session.metadata.createdBy).toBe('brAInwav');
			expect(result.session.metadata.nOArchitecture).toBe(true);
			expect(result.brainwavMetadata.createdBy).toBe('brAInwav');
			expect(result.brainwavMetadata.securityEnabled).toBe(true);
			expect(result.brainwavMetadata.isolationActive).toBe(true);

			// Verify coordination ID format
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

			// Verify default security context
			expect(result.session.securityContext.isolationLevel).toBe('moderate');
			expect(result.session.securityContext.permissions.canCreateAgents).toBe(false);
			expect(result.session.securityContext.permissions.canAccessHistory).toBe(true);
			expect(result.session.securityContext.accessControls.maxConcurrentOperations).toBe(5);

			expect(result.brainwavMetadata.isolationActive).toBe(false); // Not strict isolation
		});

		it('validates required input fields', async () => {
			const input = {
				name: '', // Empty name should fail
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

			// Verify A2A event emission with security context
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
			// Create a coordination session with security controls
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
						allowedAgentIds: ['trusted-agent-001', 'trusted-agent-002'],
						restrictedResources: ['admin-panel'],
						maxConcurrentOperations: 3,
					},
				},
				maxAgents: 10,
				timeoutMs: 300000,
			});
			testCoordinationId = session.coordinationId;
		});

		it('registers agent with security validation and brAInwav metadata', async () => {
			const input: RegisterAgentInput = {
				coordinationId: testCoordinationId,
				agent: {
					id: 'trusted-agent-001',
					name: 'brAInwav Trusted Agent',
					role: CoordinationRole.EXECUTOR,
					status: 'available',
					capabilities: ['task-execution', 'data-processing', 'validation'],
					workspaceId: 'secure-workspace-001',
					sessionId: 'secure-session-001',
					trustLevel: 8,
				},
				validatePermissions: true,
			};

			const result = await registerAgentTool.execute(input);

			// Verify agent registration
			expect(result.coordinationId).toBe(testCoordinationId);
			expect(result.agent.id).toBe('trusted-agent-001');
			expect(result.agent.name).toBe('brAInwav Trusted Agent');
			expect(result.agent.role).toBe(CoordinationRole.EXECUTOR);
			expect(result.agent.capabilities).toEqual([
				'task-execution',
				'data-processing',
				'validation',
			]);
			expect(result.registered).toBe(true);
			expect(result.securityValidated).toBe(true);

			// Verify brAInwav metadata
			expect(result.agent.metadata.createdBy).toBe('brAInwav');
			expect(result.agent.metadata.trustLevel).toBe(8);
			expect(result.brainwavMetadata.registeredBy).toBe('brAInwav');
			expect(result.brainwavMetadata.securityChecked).toBe(true);
		});

		it('enforces strict security validation for trusted agents', async () => {
			const input: RegisterAgentInput = {
				coordinationId: testCoordinationId,
				agent: {
					id: 'untrusted-agent-999',
					name: 'Untrusted Agent',
					role: CoordinationRole.OBSERVER,
					status: 'available',
					capabilities: ['monitoring'],
					trustLevel: 3, // Low trust level
				},
				validatePermissions: true,
			};

			// Should fail security validation due to low trust level and not being in allowed list
			await expect(registerAgentTool.execute(input)).rejects.toThrow(
				/Agent failed security validation/,
			);
		});

		it('allows registration when agent is in allowed list', async () => {
			const input: RegisterAgentInput = {
				coordinationId: testCoordinationId,
				agent: {
					id: 'trusted-agent-002',
					name: 'Another Trusted Agent',
					role: CoordinationRole.VALIDATOR,
					status: 'available',
					capabilities: ['validation', 'quality-assurance'],
					trustLevel: 9,
				},
				validatePermissions: true,
			};

			const result = await registerAgentTool.execute(input);

			expect(result.registered).toBe(true);
			expect(result.securityValidated).toBe(true);
			expect(result.agent.id).toBe('trusted-agent-002');
		});

		it('skips security validation when requested', async () => {
			const input: RegisterAgentInput = {
				coordinationId: testCoordinationId,
				agent: {
					id: 'bypass-security-agent',
					name: 'Security Bypass Agent',
					role: CoordinationRole.COORDINATOR,
					status: 'available',
					capabilities: ['coordination'],
					trustLevel: 1, // Very low trust level
				},
				validatePermissions: false,
			};

			const result = await registerAgentTool.execute(input);

			expect(result.registered).toBe(true);
			expect(result.securityValidated).toBe(false);
		});

		it('prevents duplicate agent registration', async () => {
			const agent = {
				id: 'trusted-agent-001',
				name: 'Duplicate Agent Test',
				role: CoordinationRole.EXECUTOR,
				status: 'available' as const,
				capabilities: ['testing'],
				trustLevel: 8,
			};

			// Register first time
			await registerAgentTool.execute({
				coordinationId: testCoordinationId,
				agent,
				validatePermissions: true,
			});

			// Try to register again
			await expect(
				registerAgentTool.execute({
					coordinationId: testCoordinationId,
					agent,
					validatePermissions: true,
				}),
			).rejects.toThrow(/Agent trusted-agent-001 already registered/);
		});

		it('fails when coordination session does not exist', async () => {
			const input: RegisterAgentInput = {
				coordinationId: 'non-existent-session',
				agent: {
					id: 'test-agent',
					name: 'Test Agent',
					role: CoordinationRole.EXECUTOR,
					status: 'available',
					capabilities: ['testing'],
					trustLevel: 5,
				},
				validatePermissions: true,
			};

			await expect(registerAgentTool.execute(input)).rejects.toThrow(
				/Session non-existent-session not found/,
			);
		});

		it('emits A2A events for agent registration with security metadata', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const input: RegisterAgentInput = {
				coordinationId: testCoordinationId,
				agent: {
					id: 'trusted-agent-002',
					name: 'A2A Event Test Agent',
					role: CoordinationRole.VALIDATOR,
					status: 'available',
					capabilities: ['validation', 'a2a-events'],
					trustLevel: 9,
				},
				validatePermissions: true,
			};

			await registerAgentTool.execute(input);

			// Verify A2A event emission
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav A2A: Emitting event coordination.agent.registered'),
				expect.objectContaining({
					coordinationId: testCoordinationId,
					agentId: 'trusted-agent-002',
					role: CoordinationRole.VALIDATOR,
					capabilities: ['validation', 'a2a-events'],
					securityValidated: true,
					brainwavOrigin: true,
				}),
			);

			consoleSpy.mockRestore();
		});
	});

	describe('coordination-assign-task tool', () => {
		beforeEach(async () => {
			// Create coordination session and register agents
			const session = await createCoordinationSessionTool.execute({
				name: 'Task Assignment Test Session',
				strategy: CoordinationStrategy.ADAPTIVE,
				securityContext: {
					isolationLevel: 'moderate',
					permissions: {
						canCreateAgents: true,
						canManageWorkspace: true,
						canAccessHistory: true,
						canEmitEvents: true,
					},
					accessControls: {
						allowedAgentIds: ['executor-agent-001', 'validator-agent-001'],
						restrictedResources: [],
						maxConcurrentOperations: 5,
					},
				},
				maxAgents: 10,
				timeoutMs: 300000,
			});
			testCoordinationId = session.coordinationId;

			// Register test agents
			await registerAgentTool.execute({
				coordinationId: testCoordinationId,
				agent: {
					id: 'executor-agent-001',
					name: 'Task Executor Agent',
					role: CoordinationRole.EXECUTOR,
					status: 'available',
					capabilities: ['task-execution', 'data-processing'],
					trustLevel: 8,
				},
				validatePermissions: true,
			});

			await registerAgentTool.execute({
				coordinationId: testCoordinationId,
				agent: {
					id: 'validator-agent-001',
					name: 'Task Validator Agent',
					role: CoordinationRole.VALIDATOR,
					status: 'available',
					capabilities: ['validation', 'quality-control'],
					trustLevel: 9,
				},
				validatePermissions: true,
			});
		});

		it('assigns task with security validation and brAInwav metadata', async () => {
			const input: AssignTaskInput = {
				coordinationId: testCoordinationId,
				task: {
					name: 'brAInwav Secure Task',
					description: 'High-priority task requiring security validation',
					dependencies: [],
					priority: 8,
					estimatedDuration: 30000,
					metadata: {
						requiredCapabilities: ['task-execution'],
						securityLevel: 'high',
						brainwavTask: true,
					},
				},
				agentId: 'executor-agent-001',
				strategy: 'manual',
				validateSecurity: true,
			};

			const result = await assignTaskTool.execute(input);

			// Verify task assignment
			expect(result.coordinationId).toBe(testCoordinationId);
			expect(result.task.name).toBe('brAInwav Secure Task');
			expect(result.task.assignedAgent).toBe('executor-agent-001');
			expect(result.task.status).toBe('pending');
			expect(result.task.priority).toBe(8);
			expect(result.assignedAgent?.id).toBe('executor-agent-001');
			expect(result.assignedAgent?.status).toBe('busy');
			expect(result.securityValidated).toBe(true);

			// Verify brAInwav metadata
			expect(result.brainwavMetadata.assignedBy).toBe('brAInwav');
			expect(result.brainwavMetadata.strategyUsed).toBe('manual');
		});

		it('assigns task using capability-based strategy', async () => {
			const input: AssignTaskInput = {
				coordinationId: testCoordinationId,
				task: {
					name: 'Validation Task',
					description: 'Task requiring validation capabilities',
					dependencies: [],
					priority: 6,
					estimatedDuration: 15000,
					metadata: {
						requiredCapabilities: ['validation', 'quality-control'],
					},
				},
				strategy: 'capability_based',
				validateSecurity: true,
			};

			const result = await assignTaskTool.execute(input);

			// Should assign to validator agent based on capabilities
			expect(result.assignedAgent?.id).toBe('validator-agent-001');
			expect(result.assignedAgent?.capabilities).toContain('validation');
			expect(result.assignedAgent?.capabilities).toContain('quality-control');
			expect(result.strategy).toBe('capability_based');
		});

		it('assigns task using auto strategy (first available)', async () => {
			const input: AssignTaskInput = {
				coordinationId: testCoordinationId,
				task: {
					name: 'Auto Assignment Task',
					description: 'Task for auto assignment testing',
					dependencies: [],
					priority: 5,
					estimatedDuration: 20000,
					metadata: {},
				},
				strategy: 'auto',
				validateSecurity: true,
			};

			const result = await assignTaskTool.execute(input);

			// Should assign to first available agent
			expect(result.assignedAgent).toBeDefined();
			expect(['executor-agent-001', 'validator-agent-001']).toContain(result.assignedAgent?.id);
			expect(result.strategy).toBe('auto');
		});

		it('enforces security validation for task assignment', async () => {
			// Create session with strict security
			const strictSession = await createCoordinationSessionTool.execute({
				name: 'Strict Security Session',
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
						allowedAgentIds: ['trusted-agent-only'],
						restrictedResources: [],
						maxConcurrentOperations: 5,
					},
				},
				maxAgents: 10,
				timeoutMs: 300000,
			});

			// Register agent with low trust level
			await registerAgentTool.execute({
				coordinationId: strictSession.coordinationId,
				agent: {
					id: 'low-trust-agent',
					name: 'Low Trust Agent',
					role: CoordinationRole.EXECUTOR,
					status: 'available',
					capabilities: ['basic-tasks'],
					trustLevel: 3, // Below strict threshold
				},
				validatePermissions: false, // Skip validation during registration
			});

			const input: AssignTaskInput = {
				coordinationId: strictSession.coordinationId,
				task: {
					name: 'Secure Task',
					description: 'Task requiring high security',
					dependencies: [],
					priority: 9,
					estimatedDuration: 25000,
					metadata: {},
				},
				agentId: 'low-trust-agent',
				strategy: 'manual',
				validateSecurity: true,
			};

			// Should fail security validation
			await expect(assignTaskTool.execute(input)).rejects.toThrow(
				/Task assignment failed security validation/,
			);
		});

		it('generates task ID when not provided', async () => {
			const input: AssignTaskInput = {
				coordinationId: testCoordinationId,
				task: {
					// No ID provided
					name: 'Auto ID Task',
					description: 'Task to test auto ID generation',
					dependencies: [],
					priority: 4,
					estimatedDuration: 10000,
					metadata: {},
				},
				strategy: 'auto',
				validateSecurity: true,
			};

			const result = await assignTaskTool.execute(input);

			expect(result.task.id).toBeDefined();
			expect(result.task.id).toMatch(/^task-\d+-[a-z0-9]+$/);
		});

		it('fails when coordination session does not exist', async () => {
			const input: AssignTaskInput = {
				coordinationId: 'non-existent-session',
				task: {
					name: 'Fail Task',
					description: 'Should fail',
					dependencies: [],
					priority: 1,
					estimatedDuration: 5000,
					metadata: {},
				},
				strategy: 'auto',
				validateSecurity: true,
			};

			await expect(assignTaskTool.execute(input)).rejects.toThrow(
				/Session non-existent-session not found/,
			);
		});

		it('fails when specified agent does not exist', async () => {
			const input: AssignTaskInput = {
				coordinationId: testCoordinationId,
				task: {
					name: 'No Agent Task',
					description: 'Task for non-existent agent',
					dependencies: [],
					priority: 3,
					estimatedDuration: 8000,
					metadata: {},
				},
				agentId: 'non-existent-agent',
				strategy: 'manual',
				validateSecurity: true,
			};

			await expect(assignTaskTool.execute(input)).rejects.toThrow(
				/Agent non-existent-agent not found in session/,
			);
		});

		it('emits A2A events for task assignment with security metadata', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const input: AssignTaskInput = {
				coordinationId: testCoordinationId,
				task: {
					name: 'A2A Event Task',
					description: 'Task for A2A event testing',
					dependencies: [],
					priority: 7,
					estimatedDuration: 12000,
					metadata: { a2aTest: true },
				},
				agentId: 'executor-agent-001',
				strategy: 'manual',
				validateSecurity: true,
			};

			const result = await assignTaskTool.execute(input);

			// Verify A2A event emission
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav A2A: Emitting event coordination.task.assigned'),
				expect.objectContaining({
					coordinationId: testCoordinationId,
					taskId: result.task.id,
					agentId: 'executor-agent-001',
					strategy: 'manual',
					priority: 7,
					securityValidated: true,
					brainwavOrigin: true,
				}),
			);

			consoleSpy.mockRestore();
		});
	});

	describe('security and isolation integration', () => {
		it('maintains isolation across different security levels', async () => {
			const sessions = await Promise.all([
				createCoordinationSessionTool.execute({
					name: 'Strict Security Session',
					strategy: CoordinationStrategy.ADAPTIVE,
					securityContext: {
						isolationLevel: 'strict',
						permissions: {
							canCreateAgents: false,
							canManageWorkspace: false,
							canAccessHistory: true,
							canEmitEvents: true,
						},
						accessControls: {
							allowedAgentIds: ['strict-agent'],
							restrictedResources: ['admin'],
							maxConcurrentOperations: 1,
						},
					},
					maxAgents: 10,
					timeoutMs: 300000,
				}),
				createCoordinationSessionTool.execute({
					name: 'Relaxed Security Session',
					strategy: CoordinationStrategy.PARALLEL,
					securityContext: {
						isolationLevel: 'relaxed',
						permissions: {
							canCreateAgents: true,
							canManageWorkspace: true,
							canAccessHistory: true,
							canEmitEvents: true,
						},
						accessControls: {
							allowedAgentIds: [],
							restrictedResources: [],
							maxConcurrentOperations: 10,
						},
					},
					maxAgents: 10,
					timeoutMs: 300000,
				}),
			]);

			const strictSession = sessions[0]!;
			const relaxedSession = sessions[1]!;

			expect(strictSession.session.securityContext.isolationLevel).toBe('strict');
			expect(relaxedSession.session.securityContext.isolationLevel).toBe('relaxed');

			expect(strictSession.brainwavMetadata.isolationActive).toBe(true);
			expect(relaxedSession.brainwavMetadata.isolationActive).toBe(false);
		});

		it('ensures brAInwav branding consistency across all coordination operations', async () => {
			const session = await createCoordinationSessionTool.execute({
				name: 'Branding Consistency Test',
				strategy: CoordinationStrategy.HIERARCHICAL,
				maxAgents: 10,
				timeoutMs: 300000,
			});

			const agent = await registerAgentTool.execute({
				coordinationId: session.coordinationId,
				agent: {
					id: 'branding-test-agent',
					name: 'Branding Test Agent',
					role: CoordinationRole.COORDINATOR,
					status: 'available',
					capabilities: ['coordination', 'branding'],
					trustLevel: 7,
				},
				validatePermissions: true,
			});

			const task = await assignTaskTool.execute({
				coordinationId: session.coordinationId,
				task: {
					name: 'Branding Test Task',
					description: 'Task for branding consistency',
					dependencies: [],
					priority: 5,
					estimatedDuration: 15000,
					metadata: { brandingTest: true },
				},
				agentId: 'branding-test-agent',
				strategy: 'manual',
				validateSecurity: true,
			});

			// Verify brAInwav branding across all operations
			expect(session.session.metadata.createdBy).toBe('brAInwav');
			expect(session.brainwavMetadata.createdBy).toBe('brAInwav');

			expect(agent.agent.metadata.createdBy).toBe('brAInwav');
			expect(agent.brainwavMetadata.registeredBy).toBe('brAInwav');

			expect(task.brainwavMetadata.assignedBy).toBe('brAInwav');
		});

		it('logs security operations for observability', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const session = await createCoordinationSessionTool.execute({
				name: 'Security Observability Test',
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
						allowedAgentIds: ['secure-agent'],
						restrictedResources: [],
						maxConcurrentOperations: 5,
					},
				},
				maxAgents: 10,
				timeoutMs: 300000,
			});

			await registerAgentTool.execute({
				coordinationId: session.coordinationId,
				agent: {
					id: 'secure-agent',
					name: 'Secure Agent',
					role: CoordinationRole.EXECUTOR,
					status: 'available',
					capabilities: ['secure-operations'],
					trustLevel: 9,
				},
				validatePermissions: true,
			});

			// Verify security-related logging
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav Coordination: Created secure coordination session'),
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav Coordination: Registered agent secure-agent'),
			);

			consoleSpy.mockRestore();
		});
	});
});
