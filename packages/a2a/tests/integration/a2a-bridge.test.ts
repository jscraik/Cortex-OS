/**
 * @file A2A Bridge integration tests with mocked Python process
 * @description Integration tests that simulate real bridge behavior without external dependencies
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PythonAgentBridge } from '../../src/bridges/python-agent-bridge.js';
import { createIdGenerator } from '../../src/lib/message-id.js';
import { MockProcess } from '../utils/mock-child-process.js';

describe('A2A Bridge Integration (Mocked)', () => {
  let mockProcess: MockProcess;
  let bridge: PythonAgentBridge;

  beforeEach(() => {
    mockProcess = new MockProcess();

    bridge = new PythonAgentBridge({
      scriptPath: '/test/path/bridge_server.py',
      processFactory: {
        spawn: () => mockProcess,
      },
      idGenerator: createIdGenerator('integration-test'),
      logger: { error: () => {}, log: () => {} } as any,
    });
  });

  afterEach(async () => {
    if (bridge) {
      await bridge.shutdown();
    }
  });

  it('initializes bridge and waits for ready handshake', async () => {
    const initPromise = bridge.initialize();

    // Simulate Python process sending ready signal
    setTimeout(() => {
      mockProcess.simulateReady();
    }, 10);

    await initPromise;

    const stats = bridge.getStatistics();
    expect(stats?.isInitialized).toBe(true);
  });

  it('executes agent task with proper message structure', async () => {
    // Initialize
    const initPromise = bridge.initialize();
    mockProcess.simulateReady();
    await initPromise;

    const task = {
      coordinationId: 'coord-123',
      phaseId: 'phase-456',
      phaseName: 'Test Phase',
      requirements: ['requirement-1', 'requirement-2'],
      agentType: 'langgraph' as const,
    };

    // Track messages sent to Python
    const stdinData: string[] = [];
    mockProcess.on('stdin-data', (data: string) => stdinData.push(data));

    // Execute task and simulate response
    const taskPromise = bridge.executeAgentTask(task);

    // Verify message structure sent to Python
    expect(stdinData).toHaveLength(1);
    const sentMessage = JSON.parse(stdinData[0]);

    expect(sentMessage).toMatchObject({
      type: 'execute_task',
      task: task,
      message_id: expect.stringMatching(/^integration-test_\d+_\d+$/),
      timestamp: expect.any(Number),
    });

    // Simulate Python response
    mockProcess.simulateStdout(
      JSON.stringify({
        message_id: sentMessage.message_id,
        result: {
          success: true,
          agent_id: 'langgraph-test',
          data: { output: 'task completed' },
        },
      }) + '\n',
    );

    const result = await taskPromise;

    expect(result).toMatchObject({
      success: true,
      agent_id: 'langgraph-agent',
      result: expect.any(Object),
      metadata: {
        coordination_id: 'coord-123',
        phase_id: 'phase-456',
        agent_type: 'langgraph',
      },
    });
  });

  it('handles agent execution errors gracefully', async () => {
    const initPromise = bridge.initialize();
    mockProcess.simulateReady();
    await initPromise;

    const task = {
      coordinationId: 'error-coord',
      phaseId: 'error-phase',
      phaseName: 'Error Phase',
      requirements: ['failing-requirement'],
      agentType: 'crewai' as const,
    };

    const stdinData: string[] = [];
    mockProcess.on('stdin-data', (data: string) => stdinData.push(data));

    const taskPromise = bridge.executeAgentTask(task);

    // Simulate error response from Python
    const sentMessage = JSON.parse(stdinData[0]);
    mockProcess.simulateStdout(
      JSON.stringify({
        message_id: sentMessage.message_id,
        error: 'Agent execution failed: module not found',
      }) + '\n',
    );

    const result = await taskPromise;

    expect(result).toMatchObject({
      success: false,
      agent_id: 'crewai-agent',
      error: 'Agent execution failed: module not found',
      metadata: {
        coordination_id: 'error-coord',
        phase_id: 'error-phase',
        agent_type: 'crewai',
      },
    });
  });

  it('handles process crash during task execution', async () => {
    const initPromise = bridge.initialize();
    mockProcess.simulateReady();
    await initPromise;

    const task = {
      coordinationId: 'crash-coord',
      phaseId: 'crash-phase',
      phaseName: 'Crash Phase',
      requirements: ['crash-requirement'],
      agentType: 'autogen' as const,
    };

    const taskPromise = bridge.executeAgentTask(task);

    // Simulate process crash
    setTimeout(() => {
      mockProcess.simulateExit(1, 'SIGKILL');
    }, 10);

    const result = await taskPromise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
    expect(result.agent_id).toBe('autogen-agent');
  });

  it('supports multiple concurrent tasks', async () => {
    const initPromise = bridge.initialize();
    mockProcess.simulateReady();
    await initPromise;

    const tasks = [
      {
        coordinationId: 'task1',
        phaseId: 'phase1',
        phaseName: 'Phase 1',
        requirements: ['req1'],
        agentType: 'langgraph' as const,
      },
      {
        coordinationId: 'task2',
        phaseId: 'phase2',
        phaseName: 'Phase 2',
        requirements: ['req2'],
        agentType: 'crewai' as const,
      },
    ];

    const stdinData: string[] = [];
    mockProcess.on('stdin-data', (data: string) => stdinData.push(data));

    // Start both tasks
    const taskPromises = tasks.map((task) => bridge.executeAgentTask(task));

    // Verify both messages were sent
    expect(stdinData).toHaveLength(2);

    const messages = stdinData.map((data) => JSON.parse(data));

    // Respond to both in reverse order to test concurrent handling
    mockProcess.simulateStdout(
      JSON.stringify({
        message_id: messages[1].message_id,
        result: { success: true, agent_id: 'crewai-test' },
      }) + '\n',
    );

    mockProcess.simulateStdout(
      JSON.stringify({
        message_id: messages[0].message_id,
        result: { success: true, agent_id: 'langgraph-test' },
      }) + '\n',
    );

    const results = await Promise.all(taskPromises);

    expect(results[0].success).toBe(true);
    expect(results[0].agent_id).toBe('langgraph-agent');
    expect(results[1].success).toBe(true);
    expect(results[1].agent_id).toBe('crewai-agent');
  });
});
