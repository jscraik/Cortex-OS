import { randomUUID } from 'node:crypto';

/**
 * brAInwav utility functions for telemetry system
 */

/**
 * Create complete AgentEvent with sensible defaults
 */
export function createCompleteEvent(partial: Record<string, unknown>): Record<string, unknown> {
	return {
		timestamp: new Date().toISOString(),
		agentId: partial.agentId || 'brAInwav-unknown-agent',
		phase: partial.phase || 'execution',
		event: partial.event || 'run_started',
		correlationId: partial.correlationId || randomUUID(),
		...partial,
	};
}

/**
 * Safe error message extraction with brAInwav context
 */
export function extractErrorMessage(error: unknown, context: string): string {
	const baseMessage = error instanceof Error ? error.message : String(error);
	return `[brAInwav] ${context}: ${baseMessage}`;
}

/**
 * Generate brAInwav correlation ID with prefix
 */
export function generateCorrelationId(prefix = 'brAInwav'): string {
	return `${prefix}-${randomUUID()}`;
}

/**
 * Validate required fields for AgentEvent
 */
export function hasRequiredFields(event: Record<string, unknown>): boolean {
	const required = ['timestamp', 'agentId', 'phase', 'event', 'correlationId'];
	return required.every((field) => event[field] != null);
}
