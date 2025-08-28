export interface QueueMessage<T = unknown> {
  id: string;
  body: T;
  visibleAt: number;
  attempts: number;
}

export interface Queue<T = unknown> {
  enqueue(body: T, delayMs?: number): Promise<void>;
  reserve(nowMs: number): Promise<QueueMessage<T> | null>;
  ack(id: string): Promise<void>;
  nack(id: string, delayMs: number): Promise<void>;
}
