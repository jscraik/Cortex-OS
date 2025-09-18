/**
 * Event Outbox System
 *
 * Production-ready event sourcing pattern with PII redaction,
 * namespace management, and size guardrails. Migrated from agents-backup.
 */

import { randomUUID } from 'node:crypto';
import { createPinoLogger } from '@voltagent/logger';
import { redactSecrets } from '../lib/secret-store.js';
import type { Memory, MemoryStore } from '../lib/types.js';
import type { EventBus } from '../mocks/voltagent-core.js';

const logger = createPinoLogger({ name: 'EventOutbox' });

// Default event types to capture
const DEFAULT_EVENT_TYPES = [
	'agent.started',
	'agent.completed',
	'agent.failed',
	'provider.fallback',
	'provider.error',
	'workflow.started',
	'workflow.completed',
	'workflow.cancelled',
	'tool.executed',
	'tool.failed',
	'memory.stored',
	'memory.retrieved',
	'security.auth_success',
	'security.auth_failed',
	'security.rate_limit_exceeded',
];

export interface OutboxOptions {
	/** Logical namespace tag */
	namespace?: string;
	/** ISO-8601 duration (e.g., 'PT1H') */
	ttl?: string;
	/** Guardrail for payload size */
	maxItemBytes?: number;
	/** Optional tag prefix */
	tagPrefix?: string;
	/** Redact PII before persisting */
	redactPII?: boolean;
}

/** Dynamic options resolver per event type */
type OptionsResolver = (eventType: string, event: any) => OutboxOptions;

/**
 * Subscribe to agent events and persist them via governed MemoryStore
 */
export const wireOutbox = async (
	bus: EventBus,
	store: MemoryStore,
	optionsOrResolver: OutboxOptions | OptionsResolver = {},
	types: string[] = DEFAULT_EVENT_TYPES,
) => {
	const base: OutboxOptions =
		typeof optionsOrResolver === 'function' ? {} : optionsOrResolver || {};
	const resolver: OptionsResolver =
		typeof optionsOrResolver === 'function' ? optionsOrResolver : () => base;

	logger.info(`Setting up event outbox for ${types.length} event types`);

	for (const eventType of types) {
		bus.subscribe(eventType, async (envelope: any) => {
			try {
				const opts = resolver(eventType, envelope) || {};
				const namespace = opts.namespace || 'agents:outbox';
				const ttl = opts.ttl || 'PT1H';
				const maxItemBytes = opts.maxItemBytes ?? 256_000; // 256KB
				const tagPrefix = opts.tagPrefix || 'evt';

				const now = new Date();
				let payload = envelope;

				// Ensure envelope has required structure
				if (!envelope.type) {
					payload = { ...envelope, type: eventType };
				}

				let text = JSON.stringify(payload);

				// Enforce item size guardrail
				if (Buffer.byteLength(text, 'utf8') > maxItemBytes) {
					// Truncate conservatively, preserve JSON validity
					const truncated = text.slice(0, Math.max(0, maxItemBytes - 200));
					text = JSON.stringify({
						type: eventType,
						truncated: true,
						note: 'Payload exceeded maxItemBytes; content truncated',
						preview: truncated,
						timestamp: now.toISOString(),
					});
				}

				// Extract actor information
				let actor = 'unknown';
				if (payload.agentId) actor = payload.agentId;
				else if (payload.serverId) actor = payload.serverId;
				else if (payload.userId) actor = payload.userId;
				else if (payload.provider) actor = payload.provider;

				// Create memory entry
				const memory: Memory = {
					id: randomUUID(),
					kind: 'event',
					text: opts.redactPII === false ? text : redactPII(text),
					vector: undefined,
					tags: [namespace, `${tagPrefix}:${eventType}`],
					ttl,
					createdAt: now.toISOString(),
					updatedAt: now.toISOString(),
					provenance: {
						source: 'agent',
						actor,
					},
					policy: { pii: false, scope: 'session' },
					metadata: {
						eventType,
						envelopeId: envelope.id,
						originalTimestamp: payload.timestamp || envelope.createdAt,
						duration: payload.duration,
						status: payload.status,
						workflowId: payload.workflowId,
					},
				};

				await store.upsert(memory, namespace);

				// Log in development
				if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_OUTBOX) {
					logger.debug(`[outbox] Persisted event ${eventType}`, {
						id: memory.id,
						actor,
						namespace,
						size: Buffer.byteLength(text, 'utf8'),
					});
				}
			} catch (error) {
				logger.error(`[outbox] Failed to persist event ${eventType}:`, error);
				// Don't throw - we don't want event persistence failures to break the main flow
			}
		});
	}

	logger.info('Event outbox setup complete');
};

/**
 * PII redaction utility
 */
function redactPII(text: string): string {
	// Redact common PII patterns
	const patterns = [
		// Email addresses
		/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
		// Phone numbers
		/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
		// SSN
		/\b\d{3}-\d{2}-\d{4}\b/g,
		// Credit cards
		/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
		// API keys (generic pattern)
		/\b[A-Za-z0-9]{32,}\b/g,
		// Personal names in quotes
		/"(?:first_name|last_name|name)":\s*"[^"]+"/gi,
	];

	let redacted = text;

	for (const pattern of patterns) {
		redacted = redacted.replace(pattern, '[REDACTED]');
	}

	// Also apply secret redaction for additional safety
	redacted = redactSecrets(redacted);

	return redacted;
}

/**
 * Outbox statistics and monitoring
 */
export interface OutboxStats {
	totalEvents: number;
	eventsByType: Record<string, number>;
	eventsByNamespace: Record<string, number>;
	totalBytes: number;
	averageSize: number;
	errorCount: number;
	lastEventTime?: string;
}

/**
 * Create an outbox monitor for tracking metrics
 */
export function createOutboxMonitor(store: MemoryStore) {
	const stats: OutboxStats = {
		totalEvents: 0,
		eventsByType: {},
		eventsByNamespace: {},
		totalBytes: 0,
		averageSize: 0,
		errorCount: 0,
	};

	return {
		/**
		 * Get current statistics
		 */
		getStats(): OutboxStats {
			return { ...stats };
		},

		/**
		 * Update statistics with new event
		 */
		async recordEvent(
			eventType: string,
			namespace: string,
			size: number,
		): Promise<void> {
			stats.totalEvents++;
			stats.eventsByType[eventType] = (stats.eventsByType[eventType] || 0) + 1;
			stats.eventsByNamespace[namespace] =
				(stats.eventsByNamespace[namespace] || 0) + 1;
			stats.totalBytes += size;
			stats.averageSize = stats.totalBytes / stats.totalEvents;
			stats.lastEventTime = new Date().toISOString();
		},

		/**
		 * Record an error
		 */
		recordError(): void {
			stats.errorCount++;
		},

		/**
		 * Reset statistics
		 */
		reset(): void {
			stats.totalEvents = 0;
			stats.eventsByType = {};
			stats.eventsByNamespace = {};
			stats.totalBytes = 0;
			stats.averageSize = 0;
			stats.errorCount = 0;
			stats.lastEventTime = undefined;
		},

		/**
		 * Get recent events for debugging
		 */
		async getRecentEvents(limit = 10): Promise<Memory[]> {
			try {
				return await store.searchByText(
					{ text: '', topK: limit },
					'agents:outbox',
				);
			} catch (error) {
				logger.error('Failed to retrieve recent events:', error);
				return [];
			}
		},
	};
}

/**
 * Default outbox configuration
 */
export const DEFAULT_OUTBOX_OPTIONS: OutboxOptions = {
	namespace: 'agents:outbox',
	ttl: 'PT24H', // 24 hours
	maxItemBytes: 256_000, // 256KB
	tagPrefix: 'evt',
	redactPII: true,
};
