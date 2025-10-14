/**
 * brAInwav telemetry redaction utilities
 * Provides privacy-first data protection with configurable filters
 */

import type { AgentEvent } from './types';

/**
 * Default brAInwav redaction configuration
 * Removes sensitive prompt data while preserving operational context
 */
export const DEFAULT_REDACTION_CONFIG = {
	sensitiveFields: ['prompt', 'query', 'input', 'password', 'token', 'key'],
	redactionMarker: '[brAInwav-REDACTED]',
	preserveKeys: ['tool', 'brAInwav', 'status', 'phase', 'event'],
};

/**
 * Create privacy-first redaction function
 */
export function createRedactionFilter(
	config = DEFAULT_REDACTION_CONFIG,
): (event: AgentEvent) => AgentEvent {
	return (event: AgentEvent): AgentEvent => {
		if (!event.labels) return event;

		const redactedLabels = { ...event.labels };

		// Redact sensitive fields
		for (const field of config.sensitiveFields) {
			if (field in redactedLabels) {
				redactedLabels[field] = config.redactionMarker;
			}
		}

		// Ensure brAInwav context is preserved
		if (!redactedLabels.brAInwav) {
			redactedLabels.brAInwav = 'privacy-redacted';
		}

		return {
			...event,
			labels: redactedLabels,
		};
	};
}

/**
 * Enhanced redaction with field-level granularity
 */
export function createAdvancedRedaction(options: {
	removeFields?: string[];
	maskFields?: string[];
	preserveFields?: string[];
}): (event: AgentEvent) => AgentEvent {
	return (event: AgentEvent): AgentEvent => {
		if (!event.labels) return event;

		const { removeFields = [], maskFields = [], preserveFields = [] } = options;
		const result = { ...event.labels };

		// Remove specified fields completely
		for (const field of removeFields) {
			delete result[field];
		}

		// Mask specified fields
		for (const field of maskFields) {
			if (field in result && !preserveFields.includes(field)) {
				result[field] = '[brAInwav-MASKED]';
			}
		}

		return {
			...event,
			labels: {
				...result,
				brAInwav: result.brAInwav || 'privacy-protected',
			},
		};
	};
}
