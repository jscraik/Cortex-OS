import { z } from 'zod';

const CORTEX_ROUTING_SOURCE = 'cortex-orchestration';

const RoutingCandidateSchema = z
        .object({
                agent: z.string(),
                score: z.number(),
                reasons: z.array(z.string()),
        })
        .strict();

export const RoutingPlanEventSchema = z
        .object({
                event_id: z.string().uuid(),
                event_type: z.literal('cortex.routing.plan'),
                source: z.literal(CORTEX_ROUTING_SOURCE),
                timestamp: z.string().datetime(),
                requestId: z.string(),
                interfaceId: z.string(),
                capabilities: z.array(z.string()),
                tags: z.array(z.string()),
                candidates: z.array(RoutingCandidateSchema),
                appliedRules: z.array(z.string()),
        })
        .strict();

export type RoutingPlanEvent = z.infer<typeof RoutingPlanEventSchema>;

export const RoutingDecisionEventSchema = z
        .object({
                event_id: z.string().uuid(),
                event_type: z.literal('cortex.routing.decision'),
                source: z.literal(CORTEX_ROUTING_SOURCE),
                timestamp: z.string().datetime(),
                requestId: z.string(),
                interfaceId: z.string(),
                policyVersion: z.string(),
                selectedAgent: z.string(),
                candidates: z.array(RoutingCandidateSchema),
                appliedRules: z.array(z.string()),
                approval: z
                        .object({
                                required: z.boolean(),
                                approvers: z.array(z.string()),
                                policies: z.array(z.string()),
                        })
                        .strict(),
        })
        .strict();

export type RoutingDecisionEvent = z.infer<typeof RoutingDecisionEventSchema>;

export const RoutingFallbackEventSchema = z
        .object({
                event_id: z.string().uuid(),
                event_type: z.literal('cortex.routing.fallback'),
                source: z.literal(CORTEX_ROUTING_SOURCE),
                timestamp: z.string().datetime(),
                requestId: z.string(),
                interfaceId: z.string(),
                agent: z.string(),
                reason: z.string(),
        })
        .strict();

export type RoutingFallbackEvent = z.infer<typeof RoutingFallbackEventSchema>;
