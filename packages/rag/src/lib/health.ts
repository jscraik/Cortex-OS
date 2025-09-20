/**
 * Lightweight health aggregation utilities for the RAG package.
 *
 * This module intentionally avoids heavy dependencies and offers
 * a minimal, testable API that callers (like MCP tools) can use
 * to surface health details without requiring a running server.
 */

export interface HealthCheckDetail {
    ok: boolean;
    info?: Record<string, unknown>;
    error?: string;
}

export interface HealthSummary {
    ok: boolean;
    checks: Record<string, HealthCheckDetail>;
    timestamp: string;
    resources?: {
        rssBytes?: number;
        heapUsedBytes?: number;
        heapTotalBytes?: number;
        uptimeSeconds?: number;
    };
}

/**
 * Perform a basic self-health assessment using process metrics.
 *
 * Note: This function provides a sensible default. Callers can
 * augment or replace details (e.g., embedder/store/reranker health)
 * via dependency injection in higher-level modules or tests.
 */
export async function getDefaultRAGHealth(): Promise<HealthSummary> {
    const mem = typeof process !== 'undefined' && process.memoryUsage ? process.memoryUsage() : undefined;
    const uptimeSeconds = typeof process !== 'undefined' && typeof process.uptime === 'function'
        ? process.uptime()
        : undefined;

    const checks: Record<string, HealthCheckDetail> = {
        process: {
            ok: true,
            info: {
                nodeVersion: typeof process !== 'undefined' ? process.version : 'unknown',
                platform: typeof process !== 'undefined' ? process.platform : 'unknown',
            },
        },
        chunkers: {
            ok: true,
            info: { available: ['text', 'pdf', 'ocr', 'unstructured'] },
        },
    };

    return {
        ok: Object.values(checks).every((c) => c.ok),
        checks,
        timestamp: new Date().toISOString(),
        resources: mem
            ? {
                rssBytes: mem.rss,
                heapUsedBytes: mem.heapUsed,
                heapTotalBytes: mem.heapTotal,
                uptimeSeconds,
            }
            : { uptimeSeconds },
    };
}
