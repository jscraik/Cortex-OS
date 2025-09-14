import { Envelope } from '../../a2a-contracts/src/envelope.js';
import type { TopicACL } from '../../a2a-contracts/src/topic-acl.js';
import {
  createTraceContext,
  injectTraceContext,
} from '../../a2a-contracts/src/trace-context.js';
import { busMetrics } from './metrics.js';
import type { SchemaRegistry } from './schema-registry';
import { getCurrentTraceContext } from './trace-context-manager';
import type { Transport } from './transport';

export type { Transport } from './transport';

export type Handler = {
  type: string;
  handle: (msg: Envelope) => Promise<void>;
};

export interface BusOptions {
  /** Idempotency cache TTL in ms (default 5 min). Set 0 to disable eviction */
  idempotencyTtlMs?: number;
  /** Enable idempotency (dedupe by envelope id) */
  enableIdempotency?: boolean;
  /** Auto-generate correlationId if missing */
  autoCorrelation?: boolean;
}

export function createBus(
  transport: Transport,
  validate: (e: Envelope) => Envelope = Envelope.parse,
  schemaRegistry?: SchemaRegistry,
  acl: TopicACL = {},
  options: BusOptions = {},
) {
  const enableIdempotency = options.enableIdempotency !== false; // default on
  const idempotencyTtlMs = options.idempotencyTtlMs ?? 5 * 60 * 1000;
  const autoCorrelation = options.autoCorrelation !== false; // default on

  // Simple in-memory idempotency store; map id -> expiry timestamp
  const seen = new Map<string, number>();
  function sweepExpired() {
    if (idempotencyTtlMs <= 0) return;
    const now = Date.now();
    for (const [k, exp] of seen.entries()) {
      if (exp <= now) seen.delete(k);
    }
  }
  function markSeen(id: string) {
    if (!enableIdempotency) return;
    const expiry = idempotencyTtlMs > 0 ? Date.now() + idempotencyTtlMs : Number.MAX_SAFE_INTEGER;
    seen.set(id, expiry);
  }
  function hasSeen(id: string): boolean {
    if (!enableIdempotency) return false;
    sweepExpired();
    return seen.has(id);
  }
  const assertPublishAllowed = (type: string) => {
    if (acl[type]?.publish !== true) {
      throw new Error(`Publish not allowed for topic ${type}`);
    }
  };

  const assertSubscribeAllowed = (type: string) => {
    if (acl[type]?.subscribe !== true) {
      throw new Error(`Subscribe not allowed for topic ${type}`);
    }
  };
  const validateAgainstSchema = (msg: Envelope) => {
    if (!schemaRegistry) return;
    const result = schemaRegistry.validate(msg.type, msg.data);
    if (!result.valid) {
      const errs = (result.errors || []).map((e) => {
        if (typeof e === 'object' && e && 'message' in e) {
          return String((e as { message: unknown }).message);
        }
        return String(e);
      });
      throw new Error(
        `Schema validation failed: ${errs.length ? errs.join(', ') : 'unknown error'}`,
      );
    }
  };

  const publish = async (msg: Envelope) => {
    assertPublishAllowed(msg.type);
    const validatedMsg = validate(msg);

    // Ensure correlationId present if requested
    if (autoCorrelation && !validatedMsg.correlationId) {
      // Use existing id as correlation root when missing
      validatedMsg.correlationId = validatedMsg.id;
    }

    if (schemaRegistry) {
      validateAgainstSchema(validatedMsg);
    }

    const currentContext = getCurrentTraceContext();
    if (currentContext) {
      injectTraceContext(validatedMsg, currentContext);
    } else {
      const newContext = createTraceContext();
      injectTraceContext(validatedMsg, newContext);
    }

    await transport.publish(validatedMsg);
    busMetrics().incEvents();
    if (validatedMsg.id) markSeen(validatedMsg.id);
  };

  const bind = async (handlers: Handler[]) => {
    for (const h of handlers) {
      assertSubscribeAllowed(h.type);
    }
    const map = new Map(handlers.map((h) => [h.type, h.handle] as const));
    return transport.subscribe([...map.keys()], async (m) => {
      try {
        validate(m);
        // Idempotency check (drop duplicates silently)
        if (m.id && hasSeen(m.id)) {
          busMetrics().incDuplicates();
          return; // duplicate
        }
        const handler = map.get(m.type);
        if (handler) {
          const currentContext = getCurrentTraceContext();
          if (currentContext) {
            injectTraceContext(m, currentContext);
          }
          if (autoCorrelation && !m.correlationId) {
            m.correlationId = m.id; // derive
          }
          await handler(m);
          if (m.id) markSeen(m.id);
        }
      } catch (error) {
        console.error(
          `[A2A Bus] Error handling message type ${m.type}:`,
          error,
        );
      }
    });
  };

  return { publish, bind };
}
