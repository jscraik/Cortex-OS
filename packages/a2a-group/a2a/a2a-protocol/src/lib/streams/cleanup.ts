import { z } from 'zod';

export const StreamStatus = z.enum(['streaming', 'completed', 'error']);
export type StreamStatus = z.infer<typeof StreamStatus>;

export interface StreamInfo {
  id: string;
  status: StreamStatus;
  lastActive: number;
  messageCount: number;
}

export interface CleanupConfig {
  maxInactiveTime: number;
  minMessageCount?: number;
}

export function cleanupAbandonedStreams(streams: StreamInfo[], config: CleanupConfig): string[] {
  const now = Date.now();
  const { maxInactiveTime, minMessageCount = 0 } = config;

  return streams
    .filter(
      (stream) =>
        stream.status === 'streaming' &&
        now - stream.lastActive > maxInactiveTime &&
        stream.messageCount < minMessageCount,
    )
    .map((stream) => stream.id);
}
