/**
 * OutboxService (Domain Interface Scaffold)
 *
 * This interface abstracts the transactional outbox + DLQ processing lifecycle
 * behind a narrow contract suitable for exposure via MCP tools (e.g. a2a_outbox_sync)
 * without leaking repository / transport implementation details.
 *
 * Rationale:
 * - Decouple MCP layer from concrete outbox integration wiring
 * - Allow alternative persistence (SQLite, Postgres, cloud queue) without API churn
 * - Provide focused result shapes aligning with A2AOutboxSyncResultSchema
 *
 * Notes:
 * - All numeric counts are non-negative integers
 * - Duration & timing metrics are calculated at caller boundary (MCP handler) to avoid clock skew layering
 * - Additional OPTIONAL metrics (oldestAgeMs, byErrorCode histogram) will be added later when real integration lands.
 */

export interface ProcessResultMetrics {
	processed: number; // total processed (pending + retries)
	successful: number; // successfully dispatched
	failed: number; // failed this attempt (may retry)
	deadLettered: number; // moved permanently to DLQ
	// Future OPTIONAL metrics (keep optional when introduced):
	// oldestAgeMs?: number;
	// byErrorCode?: Record<string, { count: number; lastSeen: string }>;
}

export interface CleanupResultMetrics {
	cleanupDeleted: number; // number of purged (aged or succeeded) entries
}

export interface DlqStatsMetrics {
	size: number; // current DLQ size
	// Potential extensions: oldestAgeMs, byErrorCode histogram, recent sample, etc.
}

export type OutboxSyncAction = 'processPending' | 'processRetries' | 'cleanup' | 'dlqStats';

export interface OutboxService {
	/**
	 * Process newly pending messages (first-attempt dispatch). Returns aggregated counters.
	 */
	processPending(): Promise<ProcessResultMetrics>;

	/**
	 * Process messages scheduled for retry (exponential backoff logic lies behind implementation boundary).
	 */
	processRetries(): Promise<ProcessResultMetrics>;

	/**
	 * Cleanup aged or terminally completed messages. Accepts retention window (days).
	 * @param olderThanDays defaults to 30 if omitted.
	 */
	cleanup(olderThanDays?: number): Promise<CleanupResultMetrics>;

	/**
	 * Return DLQ statistics snapshot.
	 */
	dlqStats(): Promise<DlqStatsMetrics>;
}

/**
 * In-memory no-op stub OutboxService implementation.
 * Provides stable shape with zeroed metrics for early integration & tests.
 * Replace with real wiring once persistence + processor logic is integrated.
 */
export function createInMemoryOutboxService(): OutboxService {
	return {
		async processPending() {
			await Promise.resolve();
			return { processed: 0, successful: 0, failed: 0, deadLettered: 0 };
		},
		async processRetries() {
			await Promise.resolve();
			return { processed: 0, successful: 0, failed: 0, deadLettered: 0 };
		},
		async cleanup() {
			await Promise.resolve();
			return { cleanupDeleted: 0 };
		},
		async dlqStats() {
			await Promise.resolve();
			return { size: 0 };
		},
	};
}

// FUTURE: add factory adapting existing createA2AOutboxIntegration once metrics contract solidifies.
