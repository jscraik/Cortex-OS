import { PendingRequests } from '../pendingRequests';

export async function waitForQueue(
  pending: PendingRequests,
  delay: (ms: number) => Promise<void>,
  limit: number,
  interval: number,
): Promise<void> {
  while (pending.size() >= limit) {
    await delay(interval);
  }
}
