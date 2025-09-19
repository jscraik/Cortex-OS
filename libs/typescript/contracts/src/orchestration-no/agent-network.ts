import { z } from 'zod';

export const AgentMessageSchema = z.object({
	from: z.string().min(1),
	to: z.string().min(1),
	kind: z.enum(['text', 'event', 'control']).default('text'),
	payload: z.record(z.unknown()),
});

export const BroadcastMessageSchema = z.object({
	from: z.string().min(1),
	topic: z.string().min(1),
	payload: z.record(z.unknown()),
});

export const SubscriptionRequestSchema = z.object({
	topic: z.string().min(1),
	agentId: z.string().min(1),
});

// Represent unsubscribe function contract with a branded string token
export const UnsubscribeFnSchema = z.string().brand<'UnsubscribeFn'>();

export const AgentNetworkSchema = z.object({});
