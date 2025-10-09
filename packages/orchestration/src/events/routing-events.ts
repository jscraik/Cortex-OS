import { z } from 'zod';

const candidateSchema = z
	.object({
		agent: z.string(),
		score: z.number(),
		reasons: z.array(z.string()),
	})
	.strict();

export const RoutingPlanEventSchema = z
	.object({
		requestId: z.string(),
		interfaceId: z.string(),
		capabilities: z.array(z.string()),
		tags: z.array(z.string()),
		candidates: z.array(candidateSchema),
		appliedRules: z.array(z.string()),
	})
	.strict();

export type RoutingPlanEvent = z.infer<typeof RoutingPlanEventSchema>;

export const RoutingDecisionEventSchema = z
	.object({
		requestId: z.string(),
		interfaceId: z.string(),
		policyVersion: z.string(),
		selectedAgent: z.string(),
		candidates: z.array(candidateSchema),
		appliedRules: z.array(z.string()),
		approval: z
			.object({
				required: z.boolean(),
				approvers: z.array(z.string()),
				policies: z.array(z.string()),
			})
			.strict(),
		timestamp: z.string(),
	})
	.strict();

export type RoutingDecisionEvent = z.infer<typeof RoutingDecisionEventSchema>;

export const RoutingFallbackEventSchema = z
	.object({
		requestId: z.string(),
		interfaceId: z.string(),
		agent: z.string(),
		reason: z.string(),
		timestamp: z.string(),
	})
	.strict();

export type RoutingFallbackEvent = z.infer<typeof RoutingFallbackEventSchema>;

export function createRoutingPlanEvent(event: RoutingPlanEvent): RoutingPlanEvent {
	return RoutingPlanEventSchema.parse(event);
}

export function createRoutingDecisionEvent(event: RoutingDecisionEvent): RoutingDecisionEvent {
	return RoutingDecisionEventSchema.parse(event);
}

export function createRoutingFallbackEvent(
	requestId: string,
	interfaceId: string,
	agent: string,
	reason: string,
): RoutingFallbackEvent {
	return RoutingFallbackEventSchema.parse({
		requestId,
		interfaceId,
		agent,
		reason,
		timestamp: new Date().toISOString(),
	});
}
