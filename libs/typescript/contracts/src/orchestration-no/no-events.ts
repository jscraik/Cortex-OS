import { z } from 'zod';

export const AgentCoordinationStartedEventSchema = z.object({
	coordinationId: z.string().min(1),
	planId: z.string().min(1),
	startedAt: z.string().datetime({ offset: true }),
});

export const ScheduleAdjustedEventSchema = z.object({
	planId: z.string().min(1),
	reason: z.enum(['resource-constraints', 'feedback', 'failure', 'optimization']),
	adjustedAt: z.string().datetime({ offset: true }),
});

export const ToolLayerInvokedEventSchema = z.object({
	tool: z.string().min(1),
	level: z.enum(['dashboard', 'execution', 'primitive']),
	requestId: z.string().optional(),
	ts: z.string().datetime({ offset: true }),
});
