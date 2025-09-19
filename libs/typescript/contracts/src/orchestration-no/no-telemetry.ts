import { z } from 'zod';

export const NoTelemetryEventSchema = z.object({
	ts: z.string().datetime({ offset: true }),
	kind: z.enum([
		'scheduler.decision',
		'scheduler.plan.created',
		'scheduler.schedule.created',
		'scheduler.strategy.adjusted',
		'agent.coordination.started',
		'agent.coordination.completed',
		'tool.layer.invoked',
	]),
	traceparent: z.string().optional(),
	correlation_id: z.string().optional(),
	data: z.object({
		decision: z.string().optional(),
		input: z.record(z.unknown()).optional(),
		output: z.record(z.unknown()).optional(),
		metrics: z.record(z.number()).optional(),
	}),
});
