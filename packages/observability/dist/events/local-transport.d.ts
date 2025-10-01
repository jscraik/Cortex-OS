import type { Transport } from '@cortex-os/a2a-core/transport';
/**
 * Minimal in-memory Transport for observability events to avoid cross-package cycles.
 * Not intended for cross-process use; suitable for local testing/default wiring.
 */
export declare const createLocalTransport: () => Transport;
//# sourceMappingURL=local-transport.d.ts.map
