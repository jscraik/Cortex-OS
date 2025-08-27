/**
 * @file Send message unit tests
 * @description Tests for message sending with mocked process
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { PythonAgentBridge } from '../../src/bridges/python-agent-bridge.js';
import { createIdGenerator } from '../../src/lib/message-id.js';
import { MockProcess } from '../utils/mock-child-process.js';

describe('PythonAgentBridge - Send Message', () => {
  let mockProcess: MockProcess;
  let bridge: PythonAgentBridge;

  beforeEach(() => {
    mockProcess = new MockProcess();

    bridge = new PythonAgentBridge({
      scriptPath: '/test/path/script.py',
      processFactory: {
        spawn: () => mockProcess,
      },
      idGenerator: createIdGenerator('test'),
      logger: { error: () => {}, log: () => {} } as any,
    });
  });

  it('sends JSON message with newline to process stdin', async () => {
    const stdinData: string[] = [];
    mockProcess.on('stdin-data', (data: string) => stdinData.push(data));

    // Initialize and send ready signal
    const initPromise = bridge.initialize();
    mockProcess.simulateReady();
    await initPromise;

    const task = {
      coordinationId: 'test-coord',
      phaseId: 'test-phase',
      phaseName: 'test-phase',
      requirements: ['req1'],
      agentType: 'langgraph' as const,
    };

    // Send task and simulate response
    const taskPromise = bridge.executeAgentTask(task);

    // Check stdin received the message
    expect(stdinData).toHaveLength(1);
    const sentMessage = JSON.parse(stdinData[0]);
    expect(sentMessage.type).toBe('execute_task');
    expect(sentMessage.task).toEqual(task);
    expect(sentMessage.message_id).toMatch(/^test_\d+_\d+$/);

    // Simulate response
    mockProcess.simulateStdout(
      JSON.stringify({
        message_id: sentMessage.message_id,
        result: { success: true, agent_id: 'test-agent' },
      }) + '\n',
    );

    const result = await taskPromise;
    expect(result.success).toBe(true);
    expect(result.agent_id).toBe('langgraph-agent');

    await bridge.shutdown();
  });

  it('rejects pending messages on timeout', async () => {
    const bridgeWithShortTimeout = new PythonAgentBridge({
      scriptPath: '/test/path/script.py',
      timeout: 100, // Very short timeout
      processFactory: {
        spawn: () => mockProcess,
      },
      idGenerator: createIdGenerator('test'),
      logger: { error: () => {}, log: () => {} } as any,
    });

    const initPromise = bridgeWithShortTimeout.initialize();
    mockProcess.simulateReady();
    await initPromise;

    const task = {
      coordinationId: 'test-coord',
      phaseId: 'test-phase',
      phaseName: 'test-phase',
      requirements: ['req1'],
      agentType: 'langgraph' as const,
    };

    // Don't simulate response - should timeout
    const result = await bridgeWithShortTimeout.executeAgentTask(task);

    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');

    await bridgeWithShortTimeout.shutdown();
  });

  it('handles process stdin not available', async () => {
    mockProcess.stdin = null;

    const initPromise = bridge.initialize();
    mockProcess.simulateReady();
    await initPromise;

    const task = {
      coordinationId: 'test-coord',
      phaseId: 'test-phase',
      phaseName: 'test-phase',
      requirements: ['req1'],
      agentType: 'langgraph' as const,
    };

    const result = await bridge.executeAgentTask(task);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Process stdin not available');

    await bridge.shutdown();
  });
});
