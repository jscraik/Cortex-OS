import {
  createChildSpan,
  createTraceContext,
  type TraceContext,
} from '@cortex-os/a2a-contracts/trace-context';
import { randomBytes } from 'crypto';
import { Redis } from 'ioredis';
import { z } from 'zod';
import { type CleanupConfig } from './cleanup';
import { createStreamStore, type SerializedState, type StreamStore } from './store';

type ValidationResult<T> =
  | { success: true; data: T & { traceparent: string; tracestate?: string; baggage?: string } }
  | { success: false; error: { message: string; traceparent: string } };

/**
 * Generate a random stream ID.
 * Pure function for ID generation.
 */
function generateStreamId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Format trace headers from context.
 * Pure function for trace context formatting.
 */
function formatTraceHeaders(trace: TraceContext) {
  return {
    traceparent: `00-${trace.traceId}-${trace.spanId}-${trace.traceFlags.toString(16)}`,
    tracestate: trace.traceState,
    baggage: trace.baggage,
  };
}

/**
 * Update stream last active timestamp.
 * Pure function for activity tracking.
 */
function touchStream(state: SerializedState): SerializedState {
  return {
    ...state,
    lastActive: Date.now(),
  };
}

// Dependency-injected store instance
let store: StreamStore | undefined;
export function setStreamStore(s: StreamStore) {
  store = s;
}

function getStore(): StreamStore {
  if (!store) throw new Error('StreamStore not initialized');
  return store;
}

/**
 * Start a new stream with trace context.
 * Returns a new stream ID and initializes state in the distributed store.
 */
export async function startStream({
  trace = createTraceContext(),
}: {
  trace?: TraceContext;
}): Promise<ValidationResult<{ streamId: string }>> {
  const streamId = generateStreamId();
  const childTrace = createChildSpan(trace);
  const initialState: SerializedState = {
    id: streamId,
    status: 'initialized',
    messageCount: 0,
    error: null,
    lastActive: Date.now(),
  };
  await getStore().set(streamId, initialState);
  return {
    success: true,
    data: {
      streamId,
      ...formatTraceHeaders(childTrace),
    },
  };
}

// Schema for stream messages
const streamMessageSchema = z.object({
  type: z.string(),
  data: z.record(z.any()),
});

/**
 * Send a message on an existing stream.
 * Updates state in the distributed store.
 */
export async function sendStreamMessage({
  streamId,
  message,
  trace = createTraceContext(),
}: {
  streamId: string;
  message: unknown;
  trace?: TraceContext;
}): Promise<ValidationResult<{ sent: boolean }>> {
  const state = await getStore().get(streamId);
  const childTrace = createChildSpan(trace);
  // Validate stream exists and is active
  if (!state || state.status !== 'streaming') {
    return {
      success: false,
      error: {
        message: `Invalid stream ID: ${streamId}`,
        traceparent: formatTraceHeaders(childTrace).traceparent,
      },
    };
  }

  // Validate message format
  const messageResult = streamMessageSchema.safeParse(message);
  if (!messageResult.success) {
    return {
      success: false,
      error: {
        message: 'Invalid message format',
        traceparent: formatTraceHeaders(childTrace).traceparent,
      },
    };
  }

  // Update stream state
  await getStore().set(streamId, {
    ...state,
    messageCount: state.messageCount + 1,
    lastActive: Date.now(),
  });

  return {
    success: true,
    data: {
      sent: true,
      ...formatTraceHeaders(childTrace),
    },
  };
}

/**
 * End an active stream.
 * Updates state in the distributed store.
 */
export async function endStream({
  streamId,
  trace = createTraceContext(),
}: {
  streamId: string;
  trace?: TraceContext;
}): Promise<ValidationResult<{ completed: boolean }>> {
  const state = await getStore().get(streamId);
  const childTrace = createChildSpan(trace);

  // Validate stream exists
  if (!state) {
    return {
      success: false,
      error: {
        message: `Invalid stream ID: ${streamId}`,
        traceparent: formatTraceHeaders(childTrace).traceparent,
      },
    };
  }

  // Update stream state
  await getStore().set(streamId, {
    ...state,
    status: 'completed',
    lastActive: Date.now(),
  });

  return {
    success: true,
    data: {
      completed: true,
      ...formatTraceHeaders(childTrace),
    },
  };
}

/**
 * Clean up abandoned streams using distributed store.
 */
export async function cleanupStreams(config: CleanupConfig) {
  return await getStore().cleanup({
    maxInactiveTime: config.maxInactiveTime,
    minMessageCount: config.minMessageCount,
  });
}

// Example: Inject Redis-backed store at startup
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: 0,
});
setStreamStore(createStreamStore({ redis, prefix: 'stream' }));
