/**
 * @file Shutdown unit tests
 * @description Tests for bridge shutdown and resource cleanup
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { PythonAgentBridge } from '../../src/bridges/python-agent-bridge.js';
import { createIdGenerator } from '../../src/lib/message-id.js';
import { MockProcess } from '../utils/mock-child-process.js';

describe('PythonAgentBridge - Shutdown', () => {
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

  it('rejects all pending promises during shutdown', async () => {
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

    // Start a task but don't respond
    const taskPromise = bridge.executeAgentTask(task);

    // Shutdown should reject pending task
    const shutdownPromise = bridge.shutdown();

    const result = await taskPromise;
    expect(result.success).toBe(false);
    expect(result.error).toBe('Bridge shutting down');

    await shutdownPromise;
  });

  it('kills process with SIGTERM then SIGKILL if needed', async () => {
    const initPromise = bridge.initialize();
    mockProcess.simulateReady();
    await initPromise;

    let killSignals: string[] = [];
    const originalKill = mockProcess.kill.bind(mockProcess);
    mockProcess.kill = (signal?: string) => {
      killSignals.push(signal || 'SIGTERM');
      return originalKill(signal);
    };

    await bridge.shutdown();

    expect(killSignals).toContain('SIGTERM');
    expect(mockProcess.killed).toBe(true);
  });

  it('emits shutdown event', async () => {
    const initPromise = bridge.initialize();
    mockProcess.simulateReady();
    await initPromise;

    const events: string[] = [];
    bridge.on('shutdown', () => events.push('shutdown'));

    await bridge.shutdown();

    expect(events).toContain('shutdown');
  });

  it('handles shutdown when not initialized', async () => {
    // Should not throw
    await bridge.shutdown();

    // Should remain uninitialized
    expect(bridge.getStatistics()).toEqual(
      expect.objectContaining({
        isInitialized: false,
      }),
    );
  });

  it('gracefully handles process already killed', async () => {
    const initPromise = bridge.initialize();
    mockProcess.simulateReady();
    await initPromise;

    // Kill process externally
    mockProcess.simulateExit(0, 'SIGTERM');

    // Wait for async handling
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Shutdown should still work
    await bridge.shutdown();
  });
});
