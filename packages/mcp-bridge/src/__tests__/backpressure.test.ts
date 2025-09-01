import { describe, expect, test } from 'vitest';
import { PendingRequests } from '../pendingRequests';
import { waitForQueue } from '../lib/wait-for-queue';
import { REQUEST_QUEUE_LIMIT, QUEUE_CHECK_INTERVAL } from '../lib/constants';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('backpressure handling', () => {
  test('waitForQueue blocks until queue below limit', async () => {
    const pending = new PendingRequests();
    const timeouts: NodeJS.Timeout[] = [];
    for (let i = 0; i < REQUEST_QUEUE_LIMIT; i++) {
      const timeout = setTimeout(() => {}, 100);
      timeouts.push(timeout);
      pending.add(i, {
        resolve: () => {},
        reject: () => {},
        timeout,
        method: 'test',
        timestamp: Date.now(),
      });
    }
    setTimeout(() => {
      const timeout = timeouts.pop();
      if (timeout) clearTimeout(timeout);
      pending.delete(REQUEST_QUEUE_LIMIT - 1);
    }, QUEUE_CHECK_INTERVAL * 2);

    const start = Date.now();
    await waitForQueue(pending, delay, REQUEST_QUEUE_LIMIT, QUEUE_CHECK_INTERVAL);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(QUEUE_CHECK_INTERVAL * 2);
    pending.forEach((p) => clearTimeout(p.timeout));
  });
});
