import { createEnvelope, type Envelope } from "@cortex-os/a2a-contracts";
import { withSpan, logWithSpan } from "@cortex-os/telemetry";

export interface PolicyRouter {
        enforce(event: Envelope): Promise<void>;
}

export interface ContractRegistry {
        validate(schemaId: string, data: unknown): Promise<boolean>;
}

export interface SecurityEventOptions<T = unknown> {
        type: string;
        source: string;
        schemaId: string;
        data: T;
        evidence?: unknown[];
}

export class SecurityEventEmitter {
        constructor(
                private readonly deps: {
                        registry: ContractRegistry;
                        policyRouter: PolicyRouter;
                },
        ) {}

        async emit<T>(options: SecurityEventOptions<T>): Promise<Envelope> {
                return withSpan("security.event.emit", async (span) => {
                        const eventData = { ...options.data, evidence: options.evidence ?? [] };

                        const envelope = createEnvelope({
                                type: options.type,
                                source: options.source,
                                data: eventData,
                                dataschema: options.schemaId,
                        });

                        const valid = await this.deps.registry.validate(
                                options.schemaId,
                                eventData,
                        );
                        if (!valid) {
                                logWithSpan(
                                        "error",
                                        "Contract validation failed",
                                        { schemaId: options.schemaId },
                                        span,
                                );
                                throw new Error("Contract validation failed");
                        }

                        await this.deps.policyRouter.enforce(envelope);

                        logWithSpan(
                                "info",
                                "Security event emitted",
                                { type: envelope.type },
                                span,
                        );
                        return envelope;
                });
        }
}
