/**
 * Comprehensive Agent Coordination Tests
 * Tests multi-agent orchestration, communication, and workflow management
 * 
 * Context: Backend
 * Framework: Vitest
 * Specification: Agent coordination protocols, IPC bridges, performance SLAs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import type {
  Agent,
  AgentCapability,
  CoordinationResult,
  MultiAgentState,
  OrchestrationConfig,
  OrchestrationResult,
  Task
} from '../src/types.js'

// Import orchestration components under test
import { OrchestrationEngine } from '../src/orchestration-engine.js'
import { MultiAgentCoordinationEngine } from '../src/multi-agent-coordination.js'
import { PRPOrchestrationEngine } from '../src/prp-integration.js'
import { createOrchestrationEngine, createPRPOrchestrationEngine } from '../src/index.js'

/**
 * Test Plan JSON with PRP Traceability
 */
const TEST_PLAN = {
  "multi_agent_coordination": {
    "prd_id": "ORCH-COORD-001",
    "requirements": ["Agent discovery", "Task delegation", "Result aggregation"],
    "coverage": "unit,integration,performance"
  },
  "bridge_communication": {
    "prd_id": "ORCH-BRIDGE-002", 
    "requirements": ["TypeScript-Python IPC", "Error propagation", "Timeout handling"],
    "coverage": "integration,error_handling"
  },
  "orchestration_workflows": {
    "prd_id": "ORCH-FLOW-003",
    "requirements": ["Sequential execution", "Parallel coordination", "Failure recovery"],
    "coverage": "workflow,reliability"
  },
  "performance_sla": {
    "prd_id": "ORCH-PERF-004",
    "requirements": ["<5s orchestration", "10 concurrent agents", "Memory bounds"],
    "coverage": "performance,scalability"
  }
}

describe('Multi-Agent Orchestration System', () => {
  let orchestrationEngine: OrchestrationEngine
  let multiAgentEngine: MultiAgentCoordinationEngine
  let prpEngine: PRPOrchestrationEngine

  beforeEach(async () => {
    // Initialize orchestration components with test configuration
    const testConfig: Partial<OrchestrationConfig> = {
      maxConcurrentOrchestrations: 5,
      planningTimeout: 10000, // 10s for tests
      executionTimeout: 30000, // 30s for tests
      qualityThreshold: 0.7,
      confidenceThreshold: 0.6,
      database: {
        type: 'memory', // Use in-memory for tests
        connectionString: 'memory://test'
      }
    }

    orchestrationEngine = createOrchestrationEngine(testConfig)
    multiAgentEngine = new MultiAgentCoordinationEngine(testConfig)
    prpEngine = createPRPOrchestrationEngine(testConfig)

    await orchestrationEngine.initialize()
    await multiAgentEngine.initialize()
    await prpEngine.initialize()
  })

  afterEach(async () => {
    await orchestrationEngine.shutdown()
    await multiAgentEngine.shutdown()
    await prpEngine.shutdown()
  })

  describe('Agent Registration and Discovery', () => {
    it('should register agents with capabilities', async () => {
      const testAgent: Agent = {
        id: 'test-agent-001',
        name: 'Test Agent',
        type: 'task-executor',
        capabilities: [
          AgentCapability.TEXT_GENERATION,
          AgentCapability.CODE_ANALYSIS,
          AgentCapability.FILE_OPERATIONS
        ],
        metadata: {
          version: '1.0.0',
          description: 'Test agent for coordination testing',
          maxConcurrentTasks: 3
        },
        isOnline: true
      }

      const registrationResult = await multiAgentEngine.registerAgent(testAgent)
      
      expect(registrationResult.success).toBe(true)
      expect(registrationResult.agentId).toBe('test-agent-001')
      
      // Verify agent is discoverable
      const discoveredAgents = await multiAgentEngine.discoverAgents({
        capabilities: [AgentCapability.TEXT_GENERATION]
      })
      
      expect(discoveredAgents).toHaveLength(1)
      expect(discoveredAgents[0].id).toBe('test-agent-001')
      expect(discoveredAgents[0].capabilities).toContain(AgentCapability.TEXT_GENERATION)
    })

    it('should handle agent capability conflicts', async () => {
      const agentA: Agent = {
        id: 'agent-a',
        name: 'Agent A',
        type: 'specialist',
        capabilities: [AgentCapability.TEXT_GENERATION],
        metadata: { priority: 'high' },
        isOnline: true
      }

      const agentB: Agent = {
        id: 'agent-b', 
        name: 'Agent B',
        type: 'specialist',
        capabilities: [AgentCapability.TEXT_GENERATION],
        metadata: { priority: 'low' },
        isOnline: true
      }

      await multiAgentEngine.registerAgent(agentA)
      await multiAgentEngine.registerAgent(agentB)

      // Request agent with TEXT_GENERATION capability
      const selectedAgents = await multiAgentEngine.selectAgentsForTask({
        id: 'test-task',
        type: 'text-generation',
        requiredCapabilities: [AgentCapability.TEXT_GENERATION],
        priority: 'normal',
        maxAgents: 1
      })

      expect(selectedAgents).toHaveLength(1)
      // Should select agent with higher priority
      expect(selectedAgents[0].id).toBe('agent-a')
    })

    it('should handle agent offline/online state changes', async () => {
      const agent: Agent = {
        id: 'state-test-agent',
        name: 'State Test Agent',
        type: 'worker',
        capabilities: [AgentCapability.DATA_PROCESSING],
        metadata: {},
        isOnline: true
      }

      await multiAgentEngine.registerAgent(agent)

      // Agent goes offline
      await multiAgentEngine.updateAgentStatus('state-test-agent', { isOnline: false })
      
      let discoveredAgents = await multiAgentEngine.discoverAgents({
        onlineOnly: true
      })
      expect(discoveredAgents).toHaveLength(0)

      // Agent comes back online
      await multiAgentEngine.updateAgentStatus('state-test-agent', { isOnline: true })
      
      discoveredAgents = await multiAgentEngine.discoverAgents({
        onlineOnly: true
      })
      expect(discoveredAgents).toHaveLength(1)
      expect(discoveredAgents[0].id).toBe('state-test-agent')
    })
  })

  describe('Task Coordination and Delegation', () => {
    beforeEach(async () => {
      // Register test agents for coordination tests
      const agents: Agent[] = [
        {
          id: 'coordinator-agent',
          name: 'Coordinator',
          type: 'coordinator',
          capabilities: [AgentCapability.TASK_COORDINATION, AgentCapability.PLANNING],
          metadata: { role: 'coordinator' },
          isOnline: true
        },
        {
          id: 'text-agent',
          name: 'Text Processor',
          type: 'processor',
          capabilities: [AgentCapability.TEXT_GENERATION, AgentCapability.TEXT_ANALYSIS],
          metadata: { role: 'processor' },
          isOnline: true
        },
        {
          id: 'code-agent',
          name: 'Code Specialist',
          type: 'specialist',
          capabilities: [AgentCapability.CODE_ANALYSIS, AgentCapability.CODE_GENERATION],
          metadata: { role: 'specialist' },
          isOnline: true
        }
      ]

      for (const agent of agents) {
        await multiAgentEngine.registerAgent(agent)
      }
    })

    it('should orchestrate sequential task execution', async () => {
      const sequentialTasks: Task[] = [
        {
          id: 'task-1',
          type: 'text-analysis',
          description: 'Analyze input text',
          requiredCapabilities: [AgentCapability.TEXT_ANALYSIS],
          input: { text: 'Sample text for analysis' },
          dependencies: [],
          priority: 'high'
        },
        {
          id: 'task-2',
          type: 'code-generation',
          description: 'Generate code based on analysis',
          requiredCapabilities: [AgentCapability.CODE_GENERATION],
          input: { requirements: 'Based on task-1 results' },
          dependencies: ['task-1'],
          priority: 'high'
        }
      ]

      const orchestrationResult = await orchestrationEngine.orchestrate({
        tasks: sequentialTasks,
        strategy: 'sequential',
        timeout: 30000
      })

      expect(orchestrationResult.success).toBe(true)
      expect(orchestrationResult.results).toHaveLength(2)
      expect(orchestrationResult.executionOrder).toEqual(['task-1', 'task-2'])
      
      // Verify task dependencies were respected
      const task1Result = orchestrationResult.results.find(r => r.taskId === 'task-1')
      const task2Result = orchestrationResult.results.find(r => r.taskId === 'task-2')
      
      expect(task1Result!.completedAt).toBeLessThan(task2Result!.startedAt)
    })

    it('should orchestrate parallel task execution', async () => {
      const parallelTasks: Task[] = [
        {
          id: 'parallel-1',
          type: 'text-generation',
          description: 'Generate documentation',
          requiredCapabilities: [AgentCapability.TEXT_GENERATION],
          input: { topic: 'API documentation' },
          dependencies: [],
          priority: 'normal'
        },
        {
          id: 'parallel-2',
          type: 'code-analysis',
          description: 'Analyze existing code',
          requiredCapabilities: [AgentCapability.CODE_ANALYSIS],
          input: { codebase: 'src/' },
          dependencies: [],
          priority: 'normal'
        }
      ]

      const startTime = Date.now()
      const orchestrationResult = await orchestrationEngine.orchestrate({
        tasks: parallelTasks,
        strategy: 'parallel',
        timeout: 30000
      })
      const endTime = Date.now()

      expect(orchestrationResult.success).toBe(true)
      expect(orchestrationResult.results).toHaveLength(2)
      
      // Parallel execution should be faster than sequential
      expect(endTime - startTime).toBeLessThan(20000) // Should complete in <20s
      
      // Tasks should have overlapping execution times
      const results = orchestrationResult.results
      const task1 = results[0]
      const task2 = results[1]
      
      const overlap = Math.min(task1.completedAt, task2.completedAt) > Math.max(task1.startedAt, task2.startedAt)
      expect(overlap).toBe(true)
    })

    it('should handle task delegation with proper agent selection', async () => {
      const complexTask: Task = {
        id: 'complex-task',
        type: 'multi-capability',
        description: 'Task requiring multiple capabilities',
        requiredCapabilities: [
          AgentCapability.TEXT_ANALYSIS,
          AgentCapability.CODE_GENERATION,
          AgentCapability.TASK_COORDINATION
        ],
        input: { 
          text: 'Complex input requiring multiple agents',
          requirements: 'Generate code and coordinate execution'
        },
        dependencies: [],
        priority: 'high',
        maxAgents: 3
      }

      const coordinationResult = await multiAgentEngine.coordinateTask(complexTask)

      expect(coordinationResult.success).toBe(true)
      expect(coordinationResult.assignedAgents).toHaveLength(3)
      
      // Verify correct agents were selected
      const assignedAgentIds = coordinationResult.assignedAgents.map(a => a.id)
      expect(assignedAgentIds).toContain('coordinator-agent')
      expect(assignedAgentIds).toContain('text-agent')
      expect(assignedAgentIds).toContain('code-agent')
      
      expect(coordinationResult.executionPlan).toBeDefined()
      expect(coordinationResult.estimatedDuration).toBeGreaterThan(0)
    })

    it('should handle task failures with proper error propagation', async () => {
      // Mock an agent to fail
      const failingAgent: Agent = {
        id: 'failing-agent',
        name: 'Failing Agent',
        type: 'unreliable',
        capabilities: [AgentCapability.DATA_PROCESSING],
        metadata: { simulateFailure: true },
        isOnline: true
      }

      await multiAgentEngine.registerAgent(failingAgent)

      const failingTask: Task = {
        id: 'failing-task',
        type: 'data-processing',
        description: 'Task that will fail',
        requiredCapabilities: [AgentCapability.DATA_PROCESSING],
        input: { data: 'test-data' },
        dependencies: [],
        priority: 'normal'
      }

      const orchestrationResult = await orchestrationEngine.orchestrate({
        tasks: [failingTask],
        strategy: 'resilient',
        retryPolicy: {
          maxRetries: 2,
          backoffMs: 1000
        },
        timeout: 15000
      })

      expect(orchestrationResult.success).toBe(false)
      expect(orchestrationResult.errors).toHaveLength(1)
      expect(orchestrationResult.errors[0].taskId).toBe('failing-task')
      expect(orchestrationResult.retryCount).toBe(2) // Should have retried
    })
  })

  describe('PRP Neural Orchestration', () => {
    it('should leverage PRP framework for intelligent orchestration', async () => {
      const prpTask = {
        goal: "Create a comprehensive API documentation",
        context: {
          codebase: "TypeScript REST API",
          audience: "developers",
          format: "markdown"
        },
        requirements: [
          "Analyze existing code structure",
          "Generate endpoint documentation", 
          "Create usage examples",
          "Validate documentation completeness"
        ]
      }

      const prpResult = await prpEngine.orchestratePRP(prpTask)

      expect(prpResult.success).toBe(true)
      expect(prpResult.executionPlan).toBeDefined()
      expect(prpResult.executionPlan.phases).toHaveLength(4) // Should break down requirements
      
      // PRP should optimize agent selection
      expect(prpResult.selectedAgents.length).toBeGreaterThan(0)
      expect(prpResult.optimizationScore).toBeGreaterThan(0.7) // Should achieve good optimization
      
      // Should complete within reasonable time
      expect(prpResult.actualDuration).toBeLessThan(prpResult.estimatedDuration * 1.5)
    })

    it('should adapt orchestration strategy based on context', async () => {
      const contexts = [
        {
          type: 'time-critical',
          constraints: { maxDuration: 5000 },
          expectedStrategy: 'aggressive-parallel'
        },
        {
          type: 'quality-focused', 
          constraints: { qualityThreshold: 0.95 },
          expectedStrategy: 'quality-first'
        },
        {
          type: 'resource-constrained',
          constraints: { maxAgents: 2 },
          expectedStrategy: 'resource-optimal'
        }
      ]

      for (const context of contexts) {
        const adaptiveTask = {
          goal: "Process data with adaptive strategy",
          context: context,
          requirements: ["Analyze input", "Transform data", "Generate output"]
        }

        const result = await prpEngine.orchestratePRP(adaptiveTask)
        
        expect(result.success).toBe(true)
        expect(result.selectedStrategy).toBe(context.expectedStrategy)
        
        // Verify constraints were respected
        if (context.constraints.maxDuration) {
          expect(result.actualDuration).toBeLessThan(context.constraints.maxDuration)
        }
        if (context.constraints.maxAgents) {
          expect(result.selectedAgents.length).toBeLessThanOrEqual(context.constraints.maxAgents)
        }
        if (context.constraints.qualityThreshold) {
          expect(result.qualityScore).toBeGreaterThanOrEqual(context.constraints.qualityThreshold)
        }
      }
    })
  })

  describe('Communication and State Management', () => {
    it('should maintain consistent state across agents', async () => {
      const sharedState: MultiAgentState = {
        sessionId: 'test-session',
        currentPhase: 'initialization',
        sharedData: {
          projectContext: 'Test project',
          progress: 0
        },
        agentStates: new Map(),
        synchronizationPoints: [
          {
            id: 'sync-1',
            requiredAgents: ['coordinator-agent', 'text-agent'],
            condition: 'phase-complete',
            timeout: 30000
          }
        ]
      }

      await multiAgentEngine.initializeSharedState(sharedState)

      // Update state from different agents
      await multiAgentEngine.updateSharedState('coordinator-agent', {
        currentPhase: 'planning',
        sharedData: { ...sharedState.sharedData, progress: 25 }
      })

      await multiAgentEngine.updateSharedState('text-agent', {
        sharedData: { ...sharedState.sharedData, progress: 50 }
      })

      const currentState = await multiAgentEngine.getSharedState('test-session')
      
      expect(currentState.currentPhase).toBe('planning')
      expect(currentState.sharedData.progress).toBe(50) // Last update should win
      expect(currentState.agentStates.size).toBe(2)
    })

    it('should handle synchronization points correctly', async () => {
      const syncPoint = {
        id: 'test-sync',
        requiredAgents: ['agent-1', 'agent-2', 'agent-3'],
        condition: 'all-ready',
        timeout: 10000
      }

      const syncPromise = multiAgentEngine.waitForSynchronization(syncPoint)

      // Simulate agents reaching sync point
      await multiAgentEngine.reportSynchronizationReady('agent-1', 'test-sync')
      await multiAgentEngine.reportSynchronizationReady('agent-2', 'test-sync')
      // Don't signal agent-3 yet

      // Should still be waiting
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000))
      const result = await Promise.race([syncPromise, timeoutPromise])
      
      expect(result).toBeUndefined() // Should timeout, not resolve

      // Now agent-3 reports ready
      await multiAgentEngine.reportSynchronizationReady('agent-3', 'test-sync')
      
      // Should now resolve
      const syncResult = await syncPromise
      expect(syncResult.success).toBe(true)
      expect(syncResult.participatingAgents).toEqual(['agent-1', 'agent-2', 'agent-3'])
    })

    it('should handle agent communication timeouts', async () => {
      const slowAgent: Agent = {
        id: 'slow-agent',
        name: 'Slow Agent',
        type: 'slow',
        capabilities: [AgentCapability.DATA_PROCESSING],
        metadata: { responseDelay: 15000 }, // 15 second delay
        isOnline: true
      }

      await multiAgentEngine.registerAgent(slowAgent)

      const timeoutTask: Task = {
        id: 'timeout-task',
        type: 'data-processing',
        description: 'Task with timeout',
        requiredCapabilities: [AgentCapability.DATA_PROCESSING],
        input: { data: 'test' },
        dependencies: [],
        priority: 'normal',
        timeout: 5000 // 5 second timeout
      }

      const startTime = Date.now()
      const result = await orchestrationEngine.orchestrate({
        tasks: [timeoutTask],
        strategy: 'timeout-aware',
        timeout: 10000
      })
      const endTime = Date.now()

      expect(result.success).toBe(false)
      expect(endTime - startTime).toBeLessThan(12000) // Should timeout and not wait full 15s
      expect(result.errors[0].type).toBe('timeout')
      expect(result.errors[0].taskId).toBe('timeout-task')
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle 10 concurrent agents efficiently', async () => {
      // Register 10 test agents
      const agents: Agent[] = Array.from({ length: 10 }, (_, i) => ({
        id: `perf-agent-${i}`,
        name: `Performance Agent ${i}`,
        type: 'worker',
        capabilities: [AgentCapability.DATA_PROCESSING],
        metadata: { workerId: i },
        isOnline: true
      }))

      for (const agent of agents) {
        await multiAgentEngine.registerAgent(agent)
      }

      // Create 10 concurrent tasks
      const tasks: Task[] = Array.from({ length: 10 }, (_, i) => ({
        id: `perf-task-${i}`,
        type: 'data-processing',
        description: `Performance task ${i}`,
        requiredCapabilities: [AgentCapability.DATA_PROCESSING],
        input: { data: `test-data-${i}` },
        dependencies: [],
        priority: 'normal'
      }))

      const startTime = Date.now()
      const result = await orchestrationEngine.orchestrate({
        tasks: tasks,
        strategy: 'parallel',
        timeout: 30000
      })
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(10)
      expect(endTime - startTime).toBeLessThan(15000) // Should complete in <15s
      
      // All tasks should have been executed
      expect(result.results.every(r => r.success)).toBe(true)
    })

    it('should maintain memory usage within bounds', async () => {
      const memoryBefore = process.memoryUsage().heapUsed

      // Perform intensive orchestration operations
      for (let i = 0; i < 100; i++) {
        const task: Task = {
          id: `memory-test-${i}`,
          type: 'memory-test',
          description: 'Memory usage test task',
          requiredCapabilities: [AgentCapability.DATA_PROCESSING],
          input: { largeData: 'x'.repeat(1000) }, // 1KB per task
          dependencies: [],
          priority: 'low'
        }

        await orchestrationEngine.orchestrate({
          tasks: [task],
          strategy: 'memory-efficient',
          timeout: 5000
        })

        // Force garbage collection every 10 iterations
        if (i % 10 === 0 && global.gc) {
          global.gc()
        }
      }

      const memoryAfter = process.memoryUsage().heapUsed
      const memoryIncrease = memoryAfter - memoryBefore

      // Memory increase should be reasonable (< 50MB for 100 tasks)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })

    it('should meet SLA for orchestration response time', async () => {
      const slaTests = [
        { taskCount: 1, maxDuration: 1000 },   // 1 task: <1s
        { taskCount: 5, maxDuration: 3000 },   // 5 tasks: <3s  
        { taskCount: 10, maxDuration: 5000 }   // 10 tasks: <5s
      ]

      for (const test of slaTests) {
        const tasks: Task[] = Array.from({ length: test.taskCount }, (_, i) => ({
          id: `sla-task-${i}`,
          type: 'simple',
          description: 'SLA test task',
          requiredCapabilities: [AgentCapability.TEXT_GENERATION],
          input: { text: 'simple task' },
          dependencies: [],
          priority: 'high'
        }))

        const startTime = Date.now()
        const result = await orchestrationEngine.orchestrate({
          tasks: tasks,
          strategy: 'performance-optimized',
          timeout: test.maxDuration * 2 // Set higher timeout for test
        })
        const endTime = Date.now()

        const actualDuration = endTime - startTime
        expect(result.success).toBe(true)
        expect(actualDuration).toBeLessThan(test.maxDuration)
      }
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should recover from agent failures', async () => {
      // Register primary and backup agents
      const primaryAgent: Agent = {
        id: 'primary-agent',
        name: 'Primary Agent',
        type: 'primary',
        capabilities: [AgentCapability.TEXT_GENERATION],
        metadata: { reliability: 0.7 }, // Will fail 30% of time
        isOnline: true
      }

      const backupAgent: Agent = {
        id: 'backup-agent',
        name: 'Backup Agent', 
        type: 'backup',
        capabilities: [AgentCapability.TEXT_GENERATION],
        metadata: { reliability: 0.95 }, // More reliable
        isOnline: true
      }

      await multiAgentEngine.registerAgent(primaryAgent)
      await multiAgentEngine.registerAgent(backupAgent)

      const resilientTask: Task = {
        id: 'resilient-task',
        type: 'text-generation',
        description: 'Task with failure recovery',
        requiredCapabilities: [AgentCapability.TEXT_GENERATION],
        input: { prompt: 'Generate text' },
        dependencies: [],
        priority: 'high'
      }

      // Mock primary agent failure
      vi.spyOn(multiAgentEngine, 'executeTaskOnAgent')
        .mockRejectedValueOnce(new Error('Primary agent failed'))
        .mockResolvedValueOnce({
          taskId: 'resilient-task',
          agentId: 'backup-agent',
          success: true,
          result: { text: 'Generated by backup agent' },
          startedAt: Date.now(),
          completedAt: Date.now() + 1000
        })

      const result = await orchestrationEngine.orchestrate({
        tasks: [resilientTask],
        strategy: 'fault-tolerant',
        retryPolicy: {
          maxRetries: 1,
          backoffMs: 500
        },
        timeout: 10000
      })

      expect(result.success).toBe(true)
      expect(result.results[0].agentId).toBe('backup-agent') // Should use backup
      expect(result.failoverCount).toBe(1) // Should record failover
    })

    it('should handle network partition scenarios', async () => {
      const distributedAgents: Agent[] = [
        {
          id: 'region-a-agent',
          name: 'Region A Agent',
          type: 'distributed',
          capabilities: [AgentCapability.DATA_PROCESSING],
          metadata: { region: 'A', networkPartition: false },
          isOnline: true
        },
        {
          id: 'region-b-agent', 
          name: 'Region B Agent',
          type: 'distributed',
          capabilities: [AgentCapability.DATA_PROCESSING],
          metadata: { region: 'B', networkPartition: true }, // Simulated partition
          isOnline: false // Appears offline due to partition
        }
      ]

      for (const agent of distributedAgents) {
        await multiAgentEngine.registerAgent(agent)
      }

      const distributedTask: Task = {
        id: 'distributed-task',
        type: 'data-processing',
        description: 'Task requiring network communication',
        requiredCapabilities: [AgentCapability.DATA_PROCESSING],
        input: { data: 'distributed-data' },
        dependencies: [],
        priority: 'normal'
      }

      const result = await orchestrationEngine.orchestrate({
        tasks: [distributedTask],
        strategy: 'network-aware',
        timeout: 15000
      })

      expect(result.success).toBe(true)
      expect(result.results[0].agentId).toBe('region-a-agent') // Should use available agent
      expect(result.networkPartitionDetected).toBe(true) // Should detect partition
    })

    it('should implement circuit breaker pattern for failing agents', async () => {
      const unstableAgent: Agent = {
        id: 'unstable-agent',
        name: 'Unstable Agent',
        type: 'unstable',
        capabilities: [AgentCapability.CODE_ANALYSIS],
        metadata: { failureRate: 0.8 }, // 80% failure rate
        isOnline: true
      }

      await multiAgentEngine.registerAgent(unstableAgent)

      // Execute multiple tasks to trigger circuit breaker
      const tasks: Task[] = Array.from({ length: 10 }, (_, i) => ({
        id: `circuit-breaker-task-${i}`,
        type: 'code-analysis',
        description: 'Circuit breaker test task',
        requiredCapabilities: [AgentCapability.CODE_ANALYSIS],
        input: { code: `console.log(${i})` },
        dependencies: [],
        priority: 'normal'
      }))

      // Mock failures for first few tasks
      const executeTaskSpy = vi.spyOn(multiAgentEngine, 'executeTaskOnAgent')
      for (let i = 0; i < 5; i++) {
        executeTaskSpy.mockRejectedValueOnce(new Error('Agent failure'))
      }

      const results: OrchestrationResult[] = []
      for (const task of tasks) {
        const result = await orchestrationEngine.orchestrate({
          tasks: [task],
          strategy: 'circuit-breaker',
          timeout: 5000
        })
        results.push(result)
      }

      // After multiple failures, circuit breaker should open
      const laterResults = results.slice(5)
      const circuitBreakerActive = laterResults.some(r => 
        r.errors.some(e => e.type === 'circuit-breaker-open')
      )
      
      expect(circuitBreakerActive).toBe(true)
      
      // Verify agent was marked as degraded
      const agentStatus = await multiAgentEngine.getAgentStatus('unstable-agent')
      expect(agentStatus.circuitBreakerState).toBe('open')
    })
  })
})

/**
 * Integration Tests - Cross-system workflows
 */
describe('Orchestration Integration Tests', () => {
  let orchestrationEngine: OrchestrationEngine

  beforeEach(async () => {
    orchestrationEngine = createOrchestrationEngine({
      maxConcurrentOrchestrations: 3,
      planningTimeout: 20000,
      executionTimeout: 60000
    })
    
    await orchestrationEngine.initialize()
  })

  afterEach(async () => {
    await orchestrationEngine.shutdown()
  })

  it('should handle complete end-to-end orchestration workflow', async () => {
    // Register agents for complete workflow
    const workflowAgents: Agent[] = [
      {
        id: 'planner-agent',
        name: 'Planning Agent',
        type: 'planner', 
        capabilities: [AgentCapability.PLANNING, AgentCapability.TASK_COORDINATION],
        metadata: { role: 'orchestrator' },
        isOnline: true
      },
      {
        id: 'analyzer-agent',
        name: 'Analysis Agent',
        type: 'analyzer',
        capabilities: [AgentCapability.CODE_ANALYSIS, AgentCapability.TEXT_ANALYSIS],
        metadata: { role: 'analyzer' },
        isOnline: true
      },
      {
        id: 'generator-agent',
        name: 'Generation Agent', 
        type: 'generator',
        capabilities: [AgentCapability.CODE_GENERATION, AgentCapability.TEXT_GENERATION],
        metadata: { role: 'generator' },
        isOnline: true
      },
      {
        id: 'validator-agent',
        name: 'Validation Agent',
        type: 'validator',
        capabilities: [AgentCapability.VALIDATION, AgentCapability.QUALITY_ASSURANCE],
        metadata: { role: 'validator' },
        isOnline: true
      }
    ]

    for (const agent of workflowAgents) {
      await orchestrationEngine.registerAgent(agent)
    }

    // Define complete workflow
    const workflowTasks: Task[] = [
      {
        id: 'plan-project',
        type: 'planning',
        description: 'Plan the development project',
        requiredCapabilities: [AgentCapability.PLANNING],
        input: { 
          requirements: 'Build a REST API for user management',
          constraints: { timeline: '2 weeks', technology: 'Node.js' }
        },
        dependencies: [],
        priority: 'high'
      },
      {
        id: 'analyze-requirements',
        type: 'analysis',
        description: 'Analyze project requirements',
        requiredCapabilities: [AgentCapability.TEXT_ANALYSIS],
        input: { requirements: 'From plan-project output' },
        dependencies: ['plan-project'],
        priority: 'high'
      },
      {
        id: 'generate-code',
        type: 'code-generation',
        description: 'Generate API implementation',
        requiredCapabilities: [AgentCapability.CODE_GENERATION],
        input: { specification: 'From analyze-requirements output' },
        dependencies: ['analyze-requirements'],
        priority: 'normal'
      },
      {
        id: 'validate-implementation',
        type: 'validation',
        description: 'Validate generated code',
        requiredCapabilities: [AgentCapability.VALIDATION],
        input: { code: 'From generate-code output' },
        dependencies: ['generate-code'],
        priority: 'high'
      }
    ]

    const startTime = Date.now()
    const result = await orchestrationEngine.orchestrate({
      tasks: workflowTasks,
      strategy: 'end-to-end',
      timeout: 120000 // 2 minutes
    })
    const endTime = Date.now()

    // Comprehensive validation
    expect(result.success).toBe(true)
    expect(result.results).toHaveLength(4)
    expect(endTime - startTime).toBeLessThan(60000) // Should complete in <1 minute
    
    // Verify execution order respected dependencies
    expect(result.executionOrder).toEqual([
      'plan-project',
      'analyze-requirements', 
      'generate-code',
      'validate-implementation'
    ])
    
    // All tasks should have succeeded
    expect(result.results.every(r => r.success)).toBe(true)
    
    // Verify data flow between tasks
    const planResult = result.results.find(r => r.taskId === 'plan-project')
    const analysisResult = result.results.find(r => r.taskId === 'analyze-requirements')
    const codeResult = result.results.find(r => r.taskId === 'generate-code')
    const validationResult = result.results.find(r => r.taskId === 'validate-implementation')
    
    expect(planResult!.result).toBeDefined()
    expect(analysisResult!.result).toBeDefined()
    expect(codeResult!.result).toBeDefined()
    expect(validationResult!.result).toBeDefined()
  })
})

/**
 * CI Gates Configuration  
 */
export const CI_GATES = {
  coverage: {
    statements: 90,
    branches: 90,
    functions: 90, 
    lines: 90
  },
  performance: {
    'single-task-orchestration': { p95: 1000 }, // 1s P95
    'multi-task-orchestration': { p95: 5000 }, // 5s P95  
    'agent-registration': { p95: 100 }, // 100ms P95
    'task-coordination': { p95: 2000 } // 2s P95
  },
  reliability: {
    'orchestration-success-rate': 0.95, // 95% success rate
    'agent-failover-time': 3000, // <3s failover
    'memory-leak-threshold': 50 * 1024 * 1024 // <50MB increase
  },
  scalability: {
    'max-concurrent-agents': 10,
    'max-concurrent-tasks': 20,
    'max-orchestration-duration': 300000 // 5 minutes
  }
}