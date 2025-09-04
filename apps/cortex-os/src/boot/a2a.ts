import { createEnvelope } from "@cortex-os/a2a-contracts/envelope";
import { createBus } from "@cortex-os/a2a-core/bus";
import { healthHandler } from "@cortex-os/a2a-handlers/health.handler";
import { inproc } from "@cortex-os/a2a-transport/inproc";
import type { McpTelemetryEvent } from "@cortex-os/contracts";
import { configureAuditPublisherWithBus } from "@cortex-os/orchestration";

export interface A2AWiring {
        bus: ReturnType<typeof createBus>;
        publish: (type: string, data: Record<string, unknown>, source?: string) => void;
        publishMcp?: (event: McpTelemetryEvent) => void;
}

export function wireA2A(): A2AWiring {
        const bus = createBus(inproc());
        bus.bind([healthHandler]);
        // Audit events -> A2A 'audit.event'
        configureAuditPublisherWithBus((evt) => {
                void bus.publish(
                        createEnvelope({
                                type: "audit.event",
                                data: evt,
                                source: "urn:cortex-os:audit",
                        }),
                );
        });

        // Optional: MCP telemetry -> A2A when enabled
        let publishMcp: ((event: McpTelemetryEvent) => void) | undefined;
        if (process.env.CORTEX_MCP_A2A_TELEMETRY === "1") {
                publishMcp = (evt: McpTelemetryEvent) => void bus.publish(
                        createEnvelope({
                                type: evt.type,
                                data: evt.payload,
                                source: "urn:cortex-os:mcp",
                        }),
                );
        }

        const publish = (
                type: string,
                data: Record<string, unknown>,
                source = "urn:cortex-os:runtime",
        ) => {
                void bus.publish(createEnvelope({ type, data, source }));
        };

        return { bus, publish, publishMcp };
}
