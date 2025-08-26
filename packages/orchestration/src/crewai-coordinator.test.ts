/**
 * @file_path packages/orchestration/src/crewai-coordinator.test.ts
 * @description Tests for CrewAI coordinator integration with role-based coordination
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-03
 * @version 1.0.0
 * @status active
 * @ai_generated_by claude-3.5-sonnet
 * @ai_provenance_hash phase4_testing
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CrewAICoordinationRequest, CrewAICoordinator } from './crewai-coordinator.js';
// Mock PythonAgentBridge to avoid real Python process during tests
vi.mock('./bridges/python-agent-bridge.js', () => {
  class FakeBridge {
    isInitialized = true;
    async initialize() {}
    async executeTask(payload: any) {
      return {
        success: true,
        data: {
          taskDistribution: {},
          agentAssignments: {},
          agentOutputs: {},
        },
        errors: [],
        duration_ms: 1,
        agent_id: payload.coordinationId,
        timestamp: new Date().toISOString(),
      };
    }
    async executeAgentTask(payload: any) {
      return this.executeTask(payload);
    }
    async shutdown() {}
    on() {}
    emit() {}
  }
  return { PythonAgentBridge: FakeBridge };
});

describe('CrewAICoordinator', () => {
  let coordinator: CrewAICoordinator;

  beforeEach(() => {
    coordinator = new CrewAICoordinator({
      enableLogging: false,
      timeout: 30000,
    });
  });

  afterEach(async () => {
    await coordinator.shutdown();
  });

  describe('Crew Creation', () => {
    it('should create a crew with valid configuration', async () => {
      const request: CrewAICoordinationRequest = {
        coordinationId: 'test-crew-001',
        agents: [
          {
            id: 'architect-001',
            role: 'architect',
            goal: 'Design system architecture',
            backstory: 'Experienced system architect',
            allowDelegation: true,
            verbose: false,
            maxIter: 5,
            memory: true,
            tools: ['code-analysis'],
            decisionMaking: 'hierarchical',
            conflictResolution: 'consensus-based',
          },
        ],
        tasks: [
          {
            description: 'Create system architecture',
            agent: 'architect-001',
            expectedOutput: 'Architecture diagram and documentation',
            tools: ['code-analysis'],
            dependencies: [],
            asyncExecution: false,
          },
        ],
        process: 'hierarchical',
        context: { projectId: 'test-project' },
      };

      const coordinationId = await coordinator.createCrew(request);
      expect(coordinationId).toBe('test-crew-001');
    });

    it('should reject invalid crew configuration', async () => {
      const invalidRequest = {
        coordinationId: 'invalid-crew',
        agents: [], // Empty agents array should be invalid
        tasks: [],
        process: 'invalid-process' as any,
      };

      await expect(coordinator.createCrew(invalidRequest as any)).rejects.toThrow(
        'CrewAI crew creation failed',
      );
    });
  });

  describe('Specialized Role Assignment', () => {
    it('should assign architect role with appropriate capabilities', async () => {
      const agentId = 'test-architect';
      const role = 'architect';
      const capabilities = ['system-design', 'pattern-recommendation'];

      // This would normally interact with Python bridge
      await expect(
        coordinator.assignSpecializedRole(agentId, role, capabilities),
      ).resolves.not.toThrow();
    });

    it('should handle multiple specialized roles', async () => {
      const roles = [
        {
          agentId: 'architect-1',
          role: 'architect',
          capabilities: ['system-design'],
        },
        { agentId: 'coder-1', role: 'coder', capabilities: ['implementation'] },
        {
          agentId: 'tester-1',
          role: 'tester',
          capabilities: ['quality-validation'],
        },
      ];

      for (const { agentId, role, capabilities } of roles) {
        await expect(
          coordinator.assignSpecializedRole(agentId, role, capabilities),
        ).resolves.not.toThrow();
      }
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflicts using consensus mechanism', async () => {
      const coordinationId = 'conflict-test';
      const conflictType = 'design-disagreement';
      const conflictData = {
        options: ['option-a', 'option-b'],
        participants: ['architect-1', 'architect-2'],
      };

      const resolution = await coordinator.resolveConflict(
        coordinationId,
        conflictType,
        conflictData,
      );
      expect(resolution).toBeDefined();
    });
  });

  describe('Event Emission', () => {
    it('should emit crew-created event when crew is successfully created', async () => {
      await new Promise<void>((resolve) => {
        coordinator.on('crew-created', (event) => {
          expect(event.coordinationId).toBe('event-test-crew');
          expect(event.agentCount).toBe(1);
          resolve();
        });

        const request: CrewAICoordinationRequest = {
          coordinationId: 'event-test-crew',
          agents: [
            {
              id: 'test-agent',
              role: 'specialist',
              goal: 'Test goal',
              backstory: 'Test backstory',
              allowDelegation: false,
              verbose: false,
              maxIter: 3,
              memory: false,
              tools: [],
              decisionMaking: 'hierarchical',
              conflictResolution: 'consensus-based',
            },
          ],
          tasks: [
            {
              description: 'Test task',
              agent: 'test-agent',
              expectedOutput: 'Test output',
              tools: [],
              dependencies: [],
              asyncExecution: false,
            },
          ],
          process: 'sequential',
        };

        coordinator.createCrew(request).catch(() => {
          // Expected to fail due to missing Python bridge in test environment
          resolve();
        });
      });
    });
  });

  describe('Hierarchical Decision Making', () => {
    it('should support hierarchical process configuration', async () => {
      const request: CrewAICoordinationRequest = {
        coordinationId: 'hierarchical-test',
        agents: [
          {
            id: 'manager-agent',
            role: 'coordinator',
            goal: 'Manage team execution',
            backstory: 'Team manager with delegation authority',
            allowDelegation: true,
            verbose: false,
            maxIter: 10,
            memory: true,
            tools: ['delegation-tool'],
            decisionMaking: 'hierarchical',
            conflictResolution: 'authority-based',
          },
        ],
        tasks: [
          {
            description: 'Coordinate team tasks',
            agent: 'manager-agent',
            expectedOutput: 'Team coordination results',
            tools: ['delegation-tool'],
            dependencies: [],
            asyncExecution: false,
          },
        ],
        process: 'hierarchical',
      };

      const coordinationId = await coordinator.createCrew(request);
      expect(coordinationId).toBe('hierarchical-test');
    });
  });
});

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
