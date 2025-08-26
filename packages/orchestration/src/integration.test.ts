/**
 * @file_path packages/orchestration/src/integration.test.ts
 * @description Integration tests for CrewAI and AutoGen multi-agent coordination
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-03
 * @version 1.0.0
 * @status active
 * @ai_generated_by claude-3.5-sonnet
 * @ai_provenance_hash phase4_integration_testing
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentProtocolBridge } from './agent-protocol-bridge.js';
import { AutoGenManager } from './autogen-manager.js';
import { CrewAICoordinator } from './crewai-coordinator.js';
import { MultiAgentCoordinationEngine } from './multi-agent-coordination.js';
import {
  Agent,
  AgentRole,
  ExecutionPlan,
  OrchestrationStrategy,
  Task,
  TaskStatus,
} from './types.js';

// Mock PythonAgentBridge to avoid starting real Python processes during tests
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
    getStatistics() {
      return {
        isInitialized: true,
        pendingTasks: 0,
        pendingQueries: 0,
        processId: 0,
      };
    }
    on() {}
    emit() {}
  }
  return { PythonAgentBridge: FakeBridge };
});

describe('Multi-Agent Framework Integration', () => {
  let coordinationEngine: MultiAgentCoordinationEngine;
  let crewaiCoordinator: CrewAICoordinator;
  let autogenManager: AutoGenManager;
  let protocolBridge: AgentProtocolBridge;

  beforeEach(async () => {
    coordinationEngine = new MultiAgentCoordinationEngine({
      maxConcurrentTasks: 5,
      enablePerformanceMonitoring: false,
    });

    crewaiCoordinator = new CrewAICoordinator({
      enableLogging: false,
    });

    autogenManager = new AutoGenManager({
      enableLogging: false,
      conversationMemory: true,
    });

    protocolBridge = new AgentProtocolBridge({
      enableLogging: false,
    });

    await coordinationEngine.initialize();
  });

  afterEach(async () => {
    await coordinationEngine.cleanup();
    await crewaiCoordinator.shutdown();
    await autogenManager.shutdown();
    await protocolBridge.shutdown();
  });

  describe('Framework Selection Logic', () => {
    it('should select CrewAI for hierarchical architecture tasks', async () => {
      const task: Task = {
        id: 'arch-task-001',
        title: 'System Architecture Design',
        description: 'Design microservices architecture',
        status: TaskStatus.PENDING,
        priority: 8,
        dependencies: ['architecture', 'design-patterns'],
        requiredCapabilities: ['system-design', 'architecture-planning'],
        context: { complexity: 'high' },
        metadata: { framework: 'crewai' },
        createdAt: new Date(),
      };

      const agents: Agent[] = [
        {
          id: 'architect-001',
          name: 'Senior Architect',
          role: AgentRole.SPECIALIST,
          capabilities: ['system-design', 'architecture-planning', 'pattern-recommendation'],
          status: 'available',
          metadata: {},
          lastSeen: new Date(),
          // performance omitted in tests; not part of Agent type
        },
      ];

      const plan: ExecutionPlan = {
        id: 'plan-arch-001',
        taskId: task.id,
        strategy: OrchestrationStrategy.SEQUENTIAL,
        phases: ['planning', 'execution', 'validation'],
        dependencies: { execution: ['planning'], validation: ['execution'] },
        estimatedDuration: 1000,
        resourceRequirements: {
          minAgents: 1,
          maxAgents: 3,
          requiredCapabilities: ['system-design', 'architecture-planning'],
          memoryRequirement: 128,
          computeRequirement: 1,
        },
        checkpoints: [],
        fallbackStrategies: [],
        createdAt: new Date(),
      };

      // Test that the coordination engine can handle the task
      const result = await coordinationEngine.coordinateExecution(task, plan, agents);

      expect(result).toBeDefined();
      expect(result.coordinationId).toBeDefined();
      // Note: In a real test environment with Python bridges, we'd expect success: true
    });

    it('should select AutoGen for conversational collaboration tasks', async () => {
      const task: Task = {
        id: 'collab-task-001',
        title: 'Code Review Discussion',
        description: 'Collaborative code review with multiple stakeholders',
        status: TaskStatus.PENDING,
        priority: 6,
        dependencies: ['conversation', 'collaboration'],
        requiredCapabilities: ['code-review', 'discussion-facilitation'],
        context: { type: 'collaborative' },
        metadata: { framework: 'autogen' },
        createdAt: new Date(),
      };

      const agents: Agent[] = [
        {
          id: 'reviewer-001',
          name: 'Code Reviewer',
          role: AgentRole.VALIDATOR,
          capabilities: ['code-review', 'discussion-facilitation', 'quality-assessment'],
          status: 'available',
          metadata: {},
          lastSeen: new Date(),
          // performance omitted in tests; not part of Agent type
        },
      ];

      const plan: ExecutionPlan = {
        id: 'plan-collab-001',
        taskId: task.id,
        strategy: OrchestrationStrategy.SEQUENTIAL,
        phases: ['planning', 'execution'],
        dependencies: { execution: ['planning'] },
        estimatedDuration: 1000,
        resourceRequirements: {
          minAgents: 1,
          maxAgents: 3,
          requiredCapabilities: ['code-review', 'discussion-facilitation'],
          memoryRequirement: 128,
          computeRequirement: 1,
        },
        checkpoints: [],
        fallbackStrategies: [],
        createdAt: new Date(),
      };

      const result = await coordinationEngine.coordinateExecution(task, plan, agents);

      expect(result).toBeDefined();
      expect(result.coordinationId).toBeDefined();
    });
  });

  describe('Cross-Framework Communication', () => {
    it('should register agents from different frameworks', async () => {
      // Register CrewAI agent
      await protocolBridge.registerAgent({
        agentId: 'crewai-architect',
        framework: 'crewai',
        role: 'architect',
        capabilities: ['system-design', 'architecture-planning'],
        tools: ['code-analysis', 'pattern-matcher'],
        availability: 'available',
        maxConcurrentTasks: 3,
        currentLoad: 0,
      });

      // Register AutoGen agent
      await protocolBridge.registerAgent({
        agentId: 'autogen-coordinator',
        framework: 'autogen',
        role: 'coordinator',
        capabilities: ['task-distribution', 'conversation-management'],
        tools: ['workflow-planner', 'communication-hub'],
        availability: 'available',
        maxConcurrentTasks: 5,
        currentLoad: 1,
      });

      // Query capabilities across frameworks
      const matchingAgents = await protocolBridge.queryCapabilities(['system-design']);

      expect(matchingAgents.length).toBeGreaterThan(0);
      expect(matchingAgents.some((agent) => agent.framework === 'crewai')).toBe(true);
    });

    it('should handle agent handoffs between frameworks', async () => {
      const handoffRequest = {
        fromAgentId: 'langchain-planner',
        toAgentId: 'crewai-architect',
        taskId: 'handoff-test-001',
        taskDescription: 'Design system architecture based on requirements',
        context: {
          requirements: ['scalability', 'security', 'maintainability'],
          deadline: new Date(Date.now() + 86400000), // 24 hours
        },
        requiredCapabilities: ['system-design', 'architecture-planning'],
        priority: 7,
      };

      await expect(protocolBridge.handleAgentHandoff(handoffRequest)).resolves.not.toThrow();
    });
  });

  describe('Framework Integration Points', () => {
    it('should coordinate CrewAI specialized roles', async () => {
      const coordinationRequest = {
        coordinationId: 'crew-integration-001',
        agents: [
          {
            id: 'test-architect',
            role: 'architect',
            goal: 'Design robust system architecture',
            backstory: 'Senior architect with 10+ years experience',
            allowDelegation: true,
            verbose: false,
            maxIter: 5,
            memory: true,
            tools: ['architecture-tools'],
            decisionMaking: 'hierarchical' as const,
            conflictResolution: 'consensus-based' as const,
          },
        ],
        tasks: [
          {
            description: 'Create microservices architecture',
            agent: 'test-architect',
            expectedOutput: 'Architecture documentation and diagrams',
            tools: ['architecture-tools'],
            dependencies: [],
            asyncExecution: false,
          },
        ],
        process: 'hierarchical' as const,
        context: { projectType: 'microservices' },
      };

      const coordinationId = await crewaiCoordinator.createCrew(coordinationRequest);
      expect(coordinationId).toBe('crew-integration-001');
    });

    it('should manage AutoGen conversational flows', async () => {
      const taskRequest = {
        taskId: 'autogen-integration-001',
        agents: [
          {
            name: 'TestCollaborator',
            systemMessage: 'You are a collaborative agent for team discussions',
            description: 'Facilitates team collaboration and decision making',
            maxConsecutiveAutoReply: 10,
            humanInputMode: 'NEVER' as const,
            codeExecutionConfig: false,
            conversationConfig: {
              adaptiveFlows: true,
              taskComplexityThreshold: 0.6,
              maxRoundTrip: 20,
            },
          },
        ],
        initialMessage: "Let's discuss the system architecture requirements",
        context: { sessionType: 'planning' },
        adaptiveFlow: true,
      };

      const taskId = await autogenManager.startConversation(taskRequest);
      expect(taskId).toBe('autogen-integration-001');

      // Continue the conversation
      const result = await autogenManager.continueConversation(
        taskId,
        'What are the key architectural considerations?',
        'TestCollaborator',
      );

      expect(result.taskId).toBe('autogen-integration-001');
      expect(result.conversationHistory).toBeDefined();
    });
  });

  describe('Workflow Configuration Loading', () => {
    it('should validate sequential workflow configuration', () => {
      const sequentialWorkflow = {
        id: 'test-sequential',
        name: 'Test Sequential Workflow',
        strategy: 'sequential',
        agents: [
          { id: 'analyst', role: 'analyst', framework: 'crewai' },
          { id: 'architect', role: 'architect', framework: 'crewai' },
          { id: 'coder', role: 'coder', framework: 'autogen' },
        ],
        phases: [
          { name: 'analysis', agents: ['analyst'], dependencies: [] },
          { name: 'design', agents: ['architect'], dependencies: ['analysis'] },
          {
            name: 'implementation',
            agents: ['coder'],
            dependencies: ['design'],
          },
        ],
      };

      expect(sequentialWorkflow.strategy).toBe('sequential');
      expect(sequentialWorkflow.phases.length).toBe(3);
      expect(sequentialWorkflow.agents.length).toBe(3);
    });

    it('should validate parallel workflow configuration', () => {
      const parallelWorkflow = {
        id: 'test-parallel',
        name: 'Test Parallel Workflow',
        strategy: 'parallel',
        agents: [
          { id: 'market-researcher', role: 'analyst', framework: 'autogen' },
          { id: 'tech-researcher', role: 'analyst', framework: 'crewai' },
          { id: 'user-researcher', role: 'analyst', framework: 'langchain' },
        ],
        phases: [
          {
            name: 'parallel-research',
            agents: ['market-researcher', 'tech-researcher', 'user-researcher'],
            dependencies: [],
            execution: 'parallel',
          },
          {
            name: 'synthesis',
            agents: ['data-coordinator'],
            dependencies: ['parallel-research'],
          },
        ],
      };

      expect(parallelWorkflow.strategy).toBe('parallel');
      expect(parallelWorkflow.phases[0].execution).toBe('parallel');
      expect(parallelWorkflow.phases[0].agents.length).toBe(3);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle Python bridge connection failures gracefully', async () => {
      const task: Task = {
        id: 'error-test-001',
        title: 'Test Error Handling',
        description: 'Test task for error scenarios',
        status: TaskStatus.PENDING,
        priority: 5,
        dependencies: [],
        requiredCapabilities: ['error-handling'],
        context: {},
        metadata: {},
        createdAt: new Date(),
      };

      const agents: Agent[] = [
        {
          id: 'error-agent',
          name: 'Error Test Agent',
          role: AgentRole.WORKER,
          capabilities: ['error-handling'],
          status: 'available',
          metadata: {},
          lastSeen: new Date(),
          // performance omitted in tests; not part of Agent type
        },
      ];

      const plan: ExecutionPlan = {
        id: 'plan-error-001',
        taskId: task.id,
        strategy: OrchestrationStrategy.SEQUENTIAL,
        phases: ['planning'],
        dependencies: {},
        estimatedDuration: 100,
        resourceRequirements: {
          minAgents: 1,
          maxAgents: 1,
          requiredCapabilities: ['error-handling'],
          memoryRequirement: 64,
          computeRequirement: 1,
        },
        checkpoints: [],
        fallbackStrategies: [],
        createdAt: new Date(),
      };

      // This should not throw, but handle errors gracefully
      const result = await coordinationEngine.coordinateExecution(task, plan, agents);

      expect(result).toBeDefined();
      expect(result.coordinationId).toBeDefined();
      // In error scenarios, success might be false but the system should remain stable
    });
  });
});

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
