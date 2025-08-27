import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as checkpoints from '../src/lib/checkpoints';
import { runSupervisor } from '../src/lib/supervisor';

describe('supervisor runtime guarantees', () => {
  beforeEach(async () => {
    // reset timers and clear checkpoints by using a temp dir
    vi.useRealTimers();
    process.env.CORTEX_CHECKPOINT_DIR = undefined;
  });

  it('honors deadline timeouts', async () => {
    const controller = new AbortController();
    const start = Date.now();
    const res = runSupervisor(
      {},
      { runId: 'r1', threadId: 't1', signal: controller.signal },
      {
        limits: { plan: { deadlineMs: 10 } },
        handlers: {
          plan: async () => {
            await new Promise((r) => setTimeout(r, 1000));
            return { ok: true };
          },
        },
      },
    );
    await expect(res).rejects.toThrow(/Deadline exceeded|aborted/i);
    expect(Date.now() - start).toBeLessThan(200);
  });

  it('supports cancellation via AbortSignal', async () => {
    const controller = new AbortController();
    const p = runSupervisor(
      {},
      { runId: 'r2', threadId: 't1', signal: controller.signal },
      {
        handlers: {
          plan: async () => {
            await new Promise((r) => setTimeout(r, 1000));
            return { ok: true };
          },
        },
      },
    );
    controller.abort();
    await expect(p).rejects.toThrow(/aborted/i);
  });

  it('persists checkpoints for idempotent resume', async () => {
    const runId = 'r3';
    // First run should write some checkpoints until fail at verify due to deadline
    await checkpoints.saveCheckpoint({
      runId,
      threadId: 't1',
      node: 'plan',
      state: { a: 1 },
      ts: new Date().toISOString(),
    });
    const latest = await checkpoints.loadLatestCheckpoint(runId);
    expect(latest?.node).toBe('plan');
    // Resume should pick up from plan and progress
    await expect(
      runSupervisor(
        { a: 1 },
        { runId, threadId: 't1' },
        {
          limits: { plan: { deadlineMs: 1000 } },
          handlers: {
            plan: async (s) => ({ ...s, planned: true }),
            gather: async (s) => ({ ...s, gathered: true }),
            critic: async (s) => ({ ...s, critiqued: true }),
            synthesize: async (s) => ({ ...s, built: true }),
            verify: async (s) => ({ ...s, verified: true }),
          },
        },
      ),
    ).resolves.toBeDefined();
  });
});
