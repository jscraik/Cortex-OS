/**
 * Helper to send a JSON-RPC request with timeout, retry and metrics tracking
 */
import type { JsonRpcRequest, McpMetrics } from './mcp-client';
import { PendingRequests } from './pendingRequests';
import { waitForQueue } from './lib/wait-for-queue';
import { REQUEST_QUEUE_LIMIT, QUEUE_CHECK_INTERVAL } from './lib/constants';

interface TrackOptions {
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export async function trackRequest<T>(
  request: JsonRpcRequest,
  method: string,
  options: TrackOptions,
  send: (data: string) => void,
  pending: PendingRequests,
  metrics: McpMetrics,
  responseTimes: number[],
  delay: (ms: number) => Promise<void>,
  recordError: (error: Error, method?: string) => void,
): Promise<T> {
  await waitForQueue(pending, delay, REQUEST_QUEUE_LIMIT, QUEUE_CHECK_INTERVAL);
  metrics.requestCount++;
  const startTime = Date.now();
  let attempt = 0;

  const sendOnce = () =>
    new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(request.id);
        reject(new Error(`Request timeout for method: ${method}`));
      }, options.timeout);

      pending.add(request.id, {
        resolve: (value: unknown) => {
          responseTimes.push(Date.now() - startTime);
          if (responseTimes.length > 100) responseTimes.shift();
          resolve(value as T);
        },
        reject: (err: Error) => reject(err),
        timeout,
        method,
        timestamp: startTime,
      });

      try {
        send(JSON.stringify(request));
      } catch (err) {
        clearTimeout(timeout);
        pending.delete(request.id);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });

  while (true) {
    try {
      return await sendOnce();
    } catch (error) {
      attempt++;
      const err = error instanceof Error ? error : new Error(String(error));
      if (!err.message.startsWith('Request timeout')) {
        throw err;
      }
      if (attempt > options.retryAttempts) {
        recordError(err, method);
        throw err;
      }
      await delay(options.retryDelay * Math.pow(2, attempt - 1));
    }
  }
}
