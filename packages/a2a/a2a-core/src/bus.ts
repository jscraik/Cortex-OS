import { Envelope } from '@cortex-os/a2a-contracts/envelope';
import { createTraceContext, injectTraceContext } from '@cortex-os/a2a-contracts/trace-context';
import { SchemaRegistry } from './schema-registry';
import { getCurrentTraceContext } from './trace-context-manager';
import type { Transport } from './transport';
export type { Transport } from './transport';

export type Handler = { type: string; handle: (msg: Envelope) => Promise<void> };

export function createBus(
  transport: Transport,
  validate: (e: Envelope) => Envelope = Envelope.parse,
  schemaRegistry?: SchemaRegistry,
) {
  const validateAgainstSchema = (msg: Envelope) => {
    if (!schemaRegistry) return;
    const result = schemaRegistry.validate(msg.type, msg.data);
    if (!result.valid) {
      throw new Error(`Schema validation failed: ${result.errors.join(', ')}`);
    }
  };

  const publish = async (msg: Envelope) => {
    const validatedMsg = validate(msg);

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
  };

  const bind = async (handlers: Handler[]) => {
    const map = new Map(handlers.map((h) => [h.type, h.handle] as const));
    return transport.subscribe([...map.keys()], async (m) => {
      try {
        validate(m);
        const handler = map.get(m.type);
        if (handler) {
          const currentContext = getCurrentTraceContext();
          if (currentContext) {
            injectTraceContext(m, currentContext);
          }
          await handler(m);
        }
      } catch (error) {
        console.error(`[A2A Bus] Error handling message type ${m.type}:`, error);
      }
    });
  };

  return { publish, bind };
}
