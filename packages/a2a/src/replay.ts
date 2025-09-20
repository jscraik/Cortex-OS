import type { OutboxRepository } from '@cortex-os/a2a-contracts/outbox-types';
import { OutboxMessageStatus } from '@cortex-os/a2a-contracts/outbox-types';
export interface ReplayOptions {
  batchSize?: number;
  onBeforeReplay?: (id: string) => void | Promise<void>;
  onAfterReplay?: (id: string, success: boolean) => void | Promise<void>;
}
export interface ReplayContext {
  repository: OutboxRepository;
  publish: (message: any) => Promise<void>;
}
export async function replayPending(ctx: ReplayContext, opts: ReplayOptions = {}): Promise<number> {
  const batchSize = opts.batchSize ?? 50;
  let processed = 0;
  const pending = await ctx.repository.findByStatus(OutboxMessageStatus.PENDING, batchSize);
  for (const msg of pending.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    await opts.onBeforeReplay?.(msg.id);
    let ok = false;
    try {
      await ctx.publish(msg);
      await ctx.repository.markProcessed(msg.id, new Date());
      ok = true;
    } catch (e) {
      await ctx.repository.incrementRetry(msg.id, (e as Error).message);
    } finally {
      await opts.onAfterReplay?.(msg.id, ok);
      processed++;
    }
  }
  return processed;
}
