import { Envelope } from '../../a2a-contracts/src/envelope.js';
import type { TopicACL } from '../../a2a-contracts/src/topic-acl.js';
import type { SchemaRegistry } from './schema-registry.js';
import type { Transport } from './transport.js';
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
export declare function createBus(transport: Transport, validate?: (e: Envelope) => Envelope, schemaRegistry?: SchemaRegistry, acl?: TopicACL, options?: BusOptions): {
    publish: (msg: Envelope) => Promise<void>;
    bind: (handlers: Handler[]) => Promise<() => Promise<void>>;
};
//# sourceMappingURL=bus.d.ts.map