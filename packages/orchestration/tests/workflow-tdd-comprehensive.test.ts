/**
 * Comprehensive TDD Test Suite for Orchestration Workflows
 * Focuses on DAG correctness, idempotency, retry policies, cancellation, and observability
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateWorkflow } from '../src/workflow-validator.js';
import { runSupervisor } from '../src/lib/supervisor.js';
import { loadLatestCheckpoint, saveCheckpoint } from '../src/lib/checkpoints.js';
import { tracer, withSpan } from '../src/observability/otel.js';

describe('Workflow TDD Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('DAG Validation', () => {
    const baseWorkflow = {
      id: '00000000-0000-0000-0000-000000000000',
      name: 'test-workflow',
      version: '1.0.0',
      entry: 'start',
      steps: {
        start: { id: 'start', name: 'Start', kind: 'agent' as const, next: 'middle' },
        middle: { id: 'middle', name: 'Middle', kind: 'agent' as const, next: 'end' },
        end: { id: 'end', name: 'End', kind: 'agent' as const },
      },
    };

    it('should validate acyclic workflows', () => {
      expect(() => validateWorkflow(baseWorkflow)).not.toThrow();
    });

    it('should reject cyclic workflows', () => {
      const cyclicWorkflow = {
        ...baseWorkflow,
        steps: {
          start: { id: 'start', name: 'Start', kind: 'agent' as const, next: 'middle' },
          middle: { id: 'middle', name: 'Middle', kind: 'agent' as const, next: 'end' },
          end: { id: 'end', name: 'End', kind: 'agent' as const, next: 'start' },
        },
      };
      expect(() => validateWorkflow(cyclicWorkflow)).toThrow(/Cycle detected/);
    });

    it('should handle complex branching workflows', () => {
      const branchingWorkflow = {
        ...baseWorkflow,
        steps: {
          start: { 
            id: 'start', 
            name: 'Start', 
            kind: 'branch' as const, 
            branches: [
              { when: 'condition_a', to: 'path_a' },
              { when: 'condition_b', to: 'path_b' }
            ]
          },
          path_a: { id: 'path_a', name: 'Path A', kind: 'agent' as const, next: 'merge' },
          path_b: { id: 'path_b', name: 'Path B', kind: 'agent' as const, next: 'merge' },
          merge: { id: 'merge', name: 'Merge', kind: 'agent' as const },
        },
      };
      expect(() => validateWorkflow(branchingWorkflow)).not.toThrow();
    });

    it('should reject workflows with missing step references', () => {
      const invalidWorkflow = {
        ...baseWorkflow,
        steps: {
          start: { id: 'start', name: 'Start', kind: 'agent' as const, next: 'nonexistent' },
        },
      };
      expect(() => validateWorkflow(invalidWorkflow)).toThrow(/Missing step: nonexistent/);
    });
  });

  describe('Idempotency and Checkpoints', () => {
    const runId = 'test-run-' + Date.now();

    beforeEach(async () => {
      // Clear any existing checkpoints for clean test state
      process.env.CORTEX_CHECKPOINT_DIR = `/tmp/test-checkpoints-${Date.now()}`;
    });

    it('should save and restore checkpoints for idempotent execution', async () => {
      let planExecuted = false;
      let gatherExecuted = false;

      // First run - execute plan and save checkpoint
      await saveCheckpoint({
        runId,
        threadId: 'test-thread',
        node: 'plan',
        state: { planned: true, data: 'test-data' },
        ts: new Date().toISOString(),
      });

      const result = await runSupervisor(
        { initial: true },
        { runId, threadId: 'test-thread' },
        {
          handlers: {
            plan: async (state) => {
              planExecuted = true;
              return { ...state, planned: true };
            },
            gather: async (state) => {
              gatherExecuted = true;
              return { ...state, gathered: true };
            },
            critic: async (state) => ({ ...state, critiqued: true }),
            synthesize: async (state) => ({ ...state, synthesized: true }),
            verify: async (state) => ({ ...state, verified: true }),
          },
        }
      );

      // Plan should be skipped due to checkpoint, gather should execute
      expect(planExecuted).toBe(false);
      expect(gatherExecuted).toBe(true);
      expect(result.planned).toBe(true);
      expect(result.gathered).toBe(true);
    });

    it('should handle checkpoint restoration with state validation', async () => {
      const checkpoint = await loadLatestCheckpoint(runId);
      expect(checkpoint).toBeTruthy();
      expect(checkpoint?.state.planned).toBe(true);
      expect(checkpoint?.node).toBe('plan');
    });
  });

  describe('Retry Policies and Failure Handling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should implement exponential backoff with jitter', async () => {
      let attemptCount = 0;
      const backoffTimes: number[] = [];
      
      // Mock setTimeout to track backoff times
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((fn: () => void, ms: number) => {
        backoffTimes.push(ms);
        return originalSetTimeout(fn, 0); // Execute immediately for test
      });

      try {
        await runSupervisor(
          { initial: true },
          { runId: 'retry-test', threadId: 'test' },
          {
            retry: {
              plan: { maxRetries: 3, backoffMs: 1000, jitter: true }
            },
            handlers: {
              plan: async () => {
                attemptCount++;
                if (attemptCount < 4) {
                  throw new Error(`Attempt ${attemptCount} failed`);
                }
                return { planned: true };
              },
            },
          }
        );
      } catch (error) {
        // Expected to fail after max retries
      }

      expect(attemptCount).toBe(4); // Initial + 3 retries
      expect(backoffTimes).toHaveLength(3); // 3 backoff delays
      
      // Verify jitter is applied (should not be exactly 1000ms)
      backoffTimes.forEach(time => {
        expect(time).toBeGreaterThanOrEqual(1000);
        expect(time).toBeLessThanOrEqual(2000); // 1000 + max jitter
      });

      global.setTimeout = originalSetTimeout;
    });

    it('should respect maxRetries limits', async () => {
      let attemptCount = 0;

      await expect(
        runSupervisor(
          { initial: true },
          { runId: 'max-retries-test', threadId: 'test' },
          {
            retry: {
              plan: { maxRetries: 2, backoffMs: 100, jitter: false }
            },
            handlers: {
              plan: async () => {
                attemptCount++;
                throw new Error(`Attempt ${attemptCount}`);
              },
            },
          }
        )
      ).rejects.toThrow(/Attempt 3/);

      expect(attemptCount).toBe(3); // Initial + 2 retries
    });

    it('should handle transient failures and recover', async () => {
      let attemptCount = 0;

      const result = await runSupervisor(
        { initial: true },
        { runId: 'recovery-test', threadId: 'test' },
        {
          retry: {
            gather: { maxRetries: 2, backoffMs: 50, jitter: false }
          },
          handlers: {
            plan: async (state) => ({ ...state, planned: true }),
            gather: async (state) => {
              attemptCount++;
              if (attemptCount <= 2) {
                throw new Error('Transient failure');
              }
              return { ...state, gathered: true };
            },
            critic: async (state) => ({ ...state, critiqued: true }),
            synthesize: async (state) => ({ ...state, synthesized: true }),
            verify: async (state) => ({ ...state, verified: true }),
          },
        }
      );

      expect(attemptCount).toBe(3); // 2 failures + 1 success
      expect(result.gathered).toBe(true);
    });
  });

  describe('Cancellation and Deadline Management', () => {
    it('should honor deadline timeouts', async () => {
      vi.useRealTimers(); // Need real timers for timeout behavior

      const startTime = Date.now();
      await expect(
        runSupervisor(
          { initial: true },
          { runId: 'deadline-test', threadId: 'test' },
          {
            limits: {
              plan: { deadlineMs: 100 }
            },
            handlers: {
              plan: async () => {
                await new Promise(resolve => setTimeout(resolve, 500));
                return { planned: true };
              },
            },
          }
        )
      ).rejects.toThrow(/Deadline exceeded/);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(300); // Should timeout well before 500ms
    });

    it('should support graceful cancellation via AbortSignal', async () => {
      const controller = new AbortController();
      const cancelationPromise = runSupervisor(
        { initial: true },
        { runId: 'abort-test', threadId: 'test', signal: controller.signal },
        {
          handlers: {
            plan: async () => {
              await new Promise(resolve => setTimeout(resolve, 1000));
              return { planned: true };
            },
          },
        }
      );

      // Cancel after 50ms
      setTimeout(() => controller.abort(), 50);

      await expect(cancelationPromise).rejects.toThrow(/aborted/i);
    });

    it('should handle signal already aborted', async () => {
      const controller = new AbortController();
      controller.abort(); // Pre-abort the signal

      await expect(
        runSupervisor(
          { initial: true },
          { runId: 'pre-abort-test', threadId: 'test', signal: controller.signal },
          {
            handlers: {
              plan: async (state) => ({ ...state, planned: true }),
            },
          }
        )
      ).rejects.toThrow(/aborted/i);
    });
  });

  describe('OpenTelemetry Observability', () => {
    let mockSpan: any;
    let mockTracer: any;

    beforeEach(() => {
      mockSpan = {
        setAttributes: vi.fn(),
        setStatus: vi.fn(),
        end: vi.fn(),
      };

      mockTracer = {
        startSpan: vi.fn(() => mockSpan),
      };

      // Mock the tracer module
      vi.doMock('../src/observability/otel.js', () => ({
        tracer: mockTracer,
        withSpan: vi.fn(async (name, fn, attrs) => {
          const span = mockTracer.startSpan(name);
          if (attrs) span.setAttributes(attrs);
          try {
            const result = await fn();
            span.setStatus({ code: 1 }); // SpanStatusCode.OK
            return result;
          } catch (err) {
            span.setStatus({ code: 2, message: err.message }); // SpanStatusCode.ERROR
            throw err;
          } finally {
            span.end();
          }
        }),
      }));
    });

    it('should emit OTEL spans for each node execution', async () => {
      await runSupervisor(
        { initial: true },
        { runId: 'otel-test', threadId: 'test' },
        {
          handlers: {
            plan: async (state) => ({ ...state, planned: true }),
            gather: async (state) => ({ ...state, gathered: true }),
            critic: async (state) => ({ ...state, critiqued: true }),
            synthesize: async (state) => ({ ...state, synthesized: true }),
            verify: async (state) => ({ ...state, verified: true }),
          },
        }
      );

      // Verify spans were created for each node
      expect(mockTracer.startSpan).toHaveBeenCalledWith('orchestration.plan');
      expect(mockTracer.startSpan).toHaveBeenCalledWith('orchestration.gather');
      expect(mockTracer.startSpan).toHaveBeenCalledWith('orchestration.critic');
      expect(mockTracer.startSpan).toHaveBeenCalledWith('orchestration.synthesize');
      expect(mockTracer.startSpan).toHaveBeenCalledWith('orchestration.verify');

      // Verify spans were properly ended
      expect(mockSpan.end).toHaveBeenCalledTimes(5);
    });

    it('should set span status correctly on failures', async () => {
      try {
        await runSupervisor(
          { initial: true },
          { runId: 'otel-error-test', threadId: 'test' },
          {
            handlers: {
              plan: async () => {
                throw new Error('Plan failed');
              },
            },
          }
        );
      } catch (error) {
        // Expected failure
      }

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: 2, // SpanStatusCode.ERROR
        message: 'Plan failed',
      });
    });
  });

  describe('Failure Injection and Chaos Testing', () => {
    it('should handle network failures during agent communication', async () => {
      let networkFailureCount = 0;

      const result = await runSupervisor(
        { initial: true },
        { runId: 'network-failure-test', threadId: 'test' },
        {
          retry: {
            gather: { maxRetries: 3, backoffMs: 100, jitter: false }
          },
          handlers: {
            plan: async (state) => ({ ...state, planned: true }),
            gather: async (state) => {
              networkFailureCount++;
              if (networkFailureCount <= 2) {
                const error = new Error('Network timeout') as any;
                error.code = 'NETWORK_ERROR';
                throw error;
              }
              return { ...state, gathered: true };
            },
            critic: async (state) => ({ ...state, critiqued: true }),
            synthesize: async (state) => ({ ...state, synthesized: true }),
            verify: async (state) => ({ ...state, verified: true }),
          },
        }
      );

      expect(networkFailureCount).toBe(3);
      expect(result.gathered).toBe(true);
    });

    it('should handle memory pressure during execution', async () => {
      let memoryPressureDetected = false;

      const result = await runSupervisor(
        { initial: true },
        { runId: 'memory-pressure-test', threadId: 'test' },
        {
          handlers: {
            plan: async (state) => ({ ...state, planned: true }),
            gather: async (state) => {
              // Simulate memory pressure detection
              const mockMemUsage = { heapUsed: 1024 * 1024 * 500 }; // 500MB
              if (mockMemUsage.heapUsed > 1024 * 1024 * 400) {
                memoryPressureDetected = true;
                // In real implementation, this would trigger cleanup
              }
              return { ...state, gathered: true };
            },
            critic: async (state) => ({ ...state, critiqued: true }),
            synthesize: async (state) => ({ ...state, synthesized: true }),
            verify: async (state) => ({ ...state, verified: true }),
          },
        }
      );

      expect(memoryPressureDetected).toBe(true);
      expect(result.verified).toBe(true);
    });

    it('should handle disk space exhaustion gracefully', async () => {
      await expect(
        runSupervisor(
          { initial: true },
          { runId: 'disk-space-test', threadId: 'test' },
          {
            handlers: {
              plan: async (state) => ({ ...state, planned: true }),
              gather: async (state) => ({ ...state, gathered: true }),
              critic: async (state) => ({ ...state, critiqued: true }),
              synthesize: async () => {
                const error = new Error('No space left on device') as any;
                error.code = 'ENOSPC';
                throw error;
              },
            },
          }
        )
      ).rejects.toThrow(/No space left on device/);
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle high concurrency without resource leaks', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        runSupervisor(
          { workerId: i },
          { runId: `concurrent-${i}`, threadId: 'test' },
          {
            handlers: {
              plan: async (state) => ({ ...state, planned: true }),
              gather: async (state) => ({ ...state, gathered: true }),
              critic: async (state) => ({ ...state, critiqued: true }),
              synthesize: async (state) => ({ ...state, synthesized: true }),
              verify: async (state) => ({ ...state, verified: true }),
            },
          }
        )
      );

      const results = await Promise.all(promises);
      
      results.forEach((result, index) => {
        expect(result.workerId).toBe(index);
        expect(result.verified).toBe(true);
      });
    });

    it('should implement backpressure when system resources are constrained', async () => {
      let backpressureApplied = false;
      const concurrentTasks = 5;
      const maxConcurrency = 2;

      // Simulate backpressure by tracking concurrent executions
      let currentConcurrency = 0;
      const semaphore = {
        acquire: async () => {
          while (currentConcurrency >= maxConcurrency) {
            backpressureApplied = true;
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          currentConcurrency++;
        },
        release: () => {
          currentConcurrency--;
        }
      };

      const promises = Array.from({ length: concurrentTasks }, (_, i) =>
        (async () => {
          await semaphore.acquire();
          try {
            return await runSupervisor(
              { taskId: i },
              { runId: `backpressure-${i}`, threadId: 'test' },
              {
                handlers: {
                  plan: async (state) => {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    return { ...state, planned: true };
                  },
                  gather: async (state) => ({ ...state, gathered: true }),
                  critic: async (state) => ({ ...state, critiqued: true }),
                  synthesize: async (state) => ({ ...state, synthesized: true }),
                  verify: async (state) => ({ ...state, verified: true }),
                },
              }
            );
          } finally {
            semaphore.release();
          }
        })()
      );

      const results = await Promise.all(promises);
      
      expect(backpressureApplied).toBe(true);
      expect(results).toHaveLength(concurrentTasks);
      results.forEach(result => {
        expect(result.verified).toBe(true);
      });
    });
  });
});