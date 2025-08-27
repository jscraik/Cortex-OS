/**
 * @file Handle response unit tests
 * @description Tests for message response handling with Zod validation
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { PythonAgentBridge } from '../../src/bridges/python-agent-bridge.js';
import { createIdGenerator } from '../../src/lib/message-id.js';
import { MockProcess } from '../utils/mock-child-process.js';

describe('PythonAgentBridge - Handle Response', () => {
  let mockProcess: MockProcess;
  let bridge: PythonAgentBridge;
  let loggedErrors: any[];

  beforeEach(() => {
    mockProcess = new MockProcess();
    loggedErrors = [];

    bridge = new PythonAgentBridge({
      scriptPath: '/test/path/script.py',
      processFactory: {
        spawn: () => mockProcess,
      },
      idGenerator: createIdGenerator('test'),
      logger: {
        error: (...args: any[]) => loggedErrors.push(args),
        log: () => {},
      } as any,
    });
  });

  it('resolves pending promise with valid response', async () => {
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

    const taskPromise = bridge.executeAgentTask(task);

    // Send valid response
    mockProcess.simulateStdout(
      JSON.stringify({
        message_id: 'test_1_' + Date.now(),
        result: { data: 'test-result' },
      }) + '\n',
    );

    const result = await taskPromise;
    expect(result.success).toBe(true);

    await bridge.shutdown();
  });

  it('rejects pending promise with error response', async () => {
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

    const taskPromise = bridge.executeAgentTask(task);

    // Send error response
    mockProcess.simulateStdout(
      JSON.stringify({
        message_id: 'test_1_' + Date.now(),
        error: 'Python execution failed',
      }) + '\n',
    );

    const result = await taskPromise;
    expect(result.success).toBe(false);
    expect(result.error).toBe('Python execution failed');

    await bridge.shutdown();
  });

  it('logs error for malformed JSON response', async () => {
    const initPromise = bridge.initialize();
    mockProcess.simulateReady();
    await initPromise;

    // Send malformed JSON
    mockProcess.simulateStdout('{ invalid json\n');

    // Wait a bit for async handling
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(loggedErrors.length).toBeGreaterThan(0);
    expect(loggedErrors[0][0]).toContain('Failed to parse Python response');

    await bridge.shutdown();
  });

  it('logs error for invalid response schema', async () => {
    const initPromise = bridge.initialize();
    mockProcess.simulateReady();
    await initPromise;

    // Send response missing required message_id
    mockProcess.simulateStdout(
      JSON.stringify({
        result: 'some result',
      }) + '\n',
    );

    // Wait a bit for async handling
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(loggedErrors.length).toBeGreaterThan(0);
    expect(loggedErrors[0][0]).toBe('Invalid response from Python process:');

    await bridge.shutdown();
  });

  it('emits message event for unsolicited responses', async () => {
    const initPromise = bridge.initialize();
    mockProcess.simulateReady();
    await initPromise;

    const messages: any[] = [];
    bridge.on('message', (msg) => messages.push(msg));

    // Send response with unknown message_id
    mockProcess.simulateStdout(
      JSON.stringify({
        message_id: 'unknown-id',
        result: 'unsolicited-data',
      }) + '\n',
    );

    // Wait for async handling
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(messages).toHaveLength(1);
    expect(messages[0].message_id).toBe('unknown-id');
    expect(messages[0].result).toBe('unsolicited-data');

    await bridge.shutdown();
  });
});
