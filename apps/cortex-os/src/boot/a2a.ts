import { createEnvelope } from '@cortex-os/a2a-contracts/envelope';
import { createBus } from '@cortex-os/a2a-core/bus';
import { healthHandler } from '@cortex-os/a2a-handlers/health.handler';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import type { McpTelemetryEvent } from '@cortex-os/contracts';
import { configureAuditPublisherWithBus } from '@cortex-os/orchestration';

// Ambient declaration must be at top-level, not inside a function
declare global {
  // eslint-disable-next-line no-var
  var __CORTEX_MCP_PUBLISH__: ((event: McpTelemetryEvent) => void) | undefined;
  // eslint-disable-next-line no-var
  var __CORTEX_A2A_PUBLISH__:
    | ((type: string, data: Record<string, unknown>, source?: string) => void)
    | undefined;
}

export function wireA2A() {
  const bus = createBus(inproc());
  bus.bind([healthHandler]);
  // Audit events -> A2A 'audit.event'
  configureAuditPublisherWithBus((evt) => {
    void bus.publish(
      createEnvelope({ type: 'audit.event', data: evt, source: 'urn:cortex-os:audit' })
    );
  });

  // Optional: MCP telemetry -> A2A when enabled
  if (process.env.CORTEX_MCP_A2A_TELEMETRY === '1') {
    const publishMcp = (evt: McpTelemetryEvent) =>
      bus.publish(
        createEnvelope({ type: evt.type, data: evt.payload, source: 'urn:cortex-os:mcp' })
      );
    // Expose on global for wiring by MCP manager without cross-imports
    globalThis.__CORTEX_MCP_PUBLISH__ = (event: McpTelemetryEvent) => void publishMcp(event);
  }
  // Expose a lightweight generic publisher for simple events from infra layers
  globalThis.__CORTEX_A2A_PUBLISH__ = (type, data, source = 'urn:cortex-os:runtime') => {
    void bus.publish(createEnvelope({ type, data, source }));
  };
  return bus;
}
