import { z } from 'zod';
import { extractErrorMessage } from './utils.js';

/**
 * brAInwav Cortex-OS Phase enumeration for agent workflow tracking
 */
export const Phase = z.enum(['planning', 'execution', 'completion']);
export type Phase = z.infer<typeof Phase>;

/**
 * brAInwav agent event types for structured telemetry
 */
export const EventName = z.enum([
	'run_started',
	'run_finished',
	'plan_created',
	'plan_revised',
	'reroute',
	'tool_invoked',
	'tool_result',
]);
export type EventName = z.infer<typeof EventName>;

/**
 * brAInwav structured agent telemetry event schema
 * Provides vendor-neutral observability with privacy-first design
 */
export const AgentEventSchema = z.object({
	timestamp: z.string().datetime(),
	agentId: z.string().min(1),
	phase: Phase,
	event: EventName,
	correlationId: z.string().min(1),
	labels: z.record(z.unknown()).optional(),
	metrics: z.record(z.unknown()).optional(),
	outcome: z.record(z.unknown()).optional(),
});

export type AgentEvent = z.infer<typeof AgentEventSchema>;

/**
 * Validate AgentEvent with enhanced brAInwav error context
 */
export function validateAgentEvent(data: unknown): AgentEvent {
	try {
		return AgentEventSchema.parse(data);
	} catch (error) {
		throw new Error(extractErrorMessage(error, 'AgentEvent validation failed'));
	}
}

/**
 * Type guard for checking if data is a valid AgentEvent
 */
export function isValidAgentEvent(data: unknown): data is AgentEvent {
	try {
		AgentEventSchema.parse(data);
		return true;
	} catch {
		return false;
	}
}
