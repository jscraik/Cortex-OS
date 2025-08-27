import { Envelope } from '@cortex-os/a2a-contracts/envelope';
import { createTraceContext, injectTraceContext } from '@cortex-os/a2a-contracts/trace-context';
import { SchemaRegistry } from './schema-registry';
import { getCurrentTraceContext } from './trace-context-manager';
import { Transport } from './transport';

export type Handler = { type: string; handle: (msg: Envelope) => Promise<void> };

export class Bus {
  constructor(
    private readonly transport: Transport,
    private readonly validate: (e: Envelope) => Envelope = Envelope.parse,
    private readonly schemaRegistry?: SchemaRegistry,
  ) {}

  async publish(msg: Envelope) {
    // Validate envelope structure
    const validatedMsg = this.validate(msg);

    // Validate against schema registry if available
    if (this.schemaRegistry) {
      this.validateAgainstSchema(validatedMsg);
    }

    // Ensure trace context is present
    const currentContext = getCurrentTraceContext();
    if (currentContext) {
      injectTraceContext(validatedMsg, currentContext);
    } else {
      // Create a new trace context if none exists
      const newContext = createTraceContext();
      injectTraceContext(validatedMsg, newContext);
    }

    await this.transport.publish(validatedMsg);
  }

  async bind(handlers: Handler[]) {
    const map = new Map(handlers.map((h) => [h.type, h.handle] as const));
    return this.transport.subscribe([...map.keys()], async (m) => {
      this.validate(m);
      const handler = map.get(m.type);
      if (handler) {
        // Set up trace context for the handler execution
        const currentContext = getCurrentTraceContext();
        if (currentContext) {
          injectTraceContext(m, currentContext);
        }
        await handler(m);
      }
    });
  }

  private validateAgainstSchema(msg: Envelope) {
    if (!this.schemaRegistry) return;

    const result = this.schemaRegistry.validate(msg.type, msg.data);
    if (!result.valid) {
      throw new Error(`Schema validation failed: ${result.errors.join(', ')}`);
    }
  }
}
