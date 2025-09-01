import { Envelope } from '@cortex-os/a2a-contracts/envelope';
import { createTraceContext, injectTraceContext } from '@cortex-os/a2a-contracts/trace-context';
import { SchemaRegistry } from './schema-registry';
import { getCurrentTraceContext } from './trace-context-manager';
import type { Transport } from './transport';
export type { Transport } from './transport';
import { encrypt, decrypt } from './lib/encryption.js';
import { IdempotencyStore, once } from './idempotency.js';
import { createMemoryIdempotencyStore } from './lib/memory-id-store.js';

export type Handler = { type: string; handle: (msg: Envelope) => Promise<void> };

export function createBus(
  transport: Transport,
  validate: (e: Envelope) => Envelope = Envelope.parse,
  schemaRegistry?: SchemaRegistry,
  options: { key?: Buffer; store?: IdempotencyStore } = {},
) {
  const { key, store = createMemoryIdempotencyStore() } = options;

  const validateAgainstSchema = (msg: Envelope) => {
    if (!schemaRegistry) return;
    const result = schemaRegistry.validate(msg.type, msg.data);
    if (!result.valid) throw new Error(`Schema validation failed: ${result.errors.join(', ')}`);
  };

  const publish = async (msg: Envelope) => {
    const validated = validate(msg);
    if (schemaRegistry) validateAgainstSchema(validated);
    if (key && validated.data !== undefined) {
      const payload = encrypt(validated.data, key);
      validated.data = payload.ciphertext;
      validated.headers = { ...validated.headers, nonce: payload.nonce, tag: payload.tag };
    }
    const ctx = getCurrentTraceContext() || createTraceContext();
    injectTraceContext(validated, ctx);
    await transport.publish(validated);
  };

  const bind = async (handlers: Handler[]) => {
    const map = new Map(handlers.map((h) => [h.type, h.handle] as const));
    const process = async (m: Envelope) => {
      try {
        validate(m);
        const handler = map.get(m.type);
        if (!handler) return;
        const run = async () => {
          if (key && m.data !== undefined) {
            m.data = decrypt({ ciphertext: m.data as string, nonce: m.headers.nonce, tag: m.headers.tag }, key);
          }
          const ctx = getCurrentTraceContext();
          if (ctx) injectTraceContext(m, ctx);
          await handler(m);
        };
        if (store) await once(store, m.id, Math.ceil(m.ttlMs / 1000), run);
        else await run();
      } catch (error) {
        console.error(`[A2A Bus] Error handling message type ${m.type}:`, error);
      }
    };
    return transport.subscribe([...map.keys()], process);
  };

  return { publish, bind };
}
