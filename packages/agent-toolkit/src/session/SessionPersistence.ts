/**
 * Session Persistence Layer - brAInwav Agent Toolkit
 *
 * Persists session metadata and diagnostics to Local Memory
 * for cross-session context and audit trails.
 */

import type { ToolCallRecord } from './SessionContextManager.js';

export interface SessionMetadata {
	sessionId: string;
	startedAt: string;
	lastActivityAt: string;
	toolCallCount: number;
	totalTokens: number;
	namespace?: string;
	tags?: string[];
}

export interface SessionPersistenceOptions {
	/** Base URL for Local Memory API */
	baseUrl: string;
	/** Optional API key for authentication */
	apiKey?: string;
	/** Optional namespace for session data */
	namespace?: string;
	/** Enable/disable persistence */
	enabled?: boolean;
}

/**
 * Persists session metadata to Local Memory
 */
export const createSessionPersistence = (opts: SessionPersistenceOptions) => {
	const enabled = opts.enabled !== false;
	const headers: HeadersInit = {
		'Content-Type': 'application/json',
	};

	if (opts.apiKey) {
		headers['Authorization'] = `Bearer ${opts.apiKey}`;
	}

	const storeSessionMetadata = async (metadata: SessionMetadata): Promise<void> => {
		if (!enabled) return;

		try {
			const response = await fetch(`${opts.baseUrl}/store`, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					content: `brAInwav agent-toolkit session: ${metadata.sessionId}`,
					importance: 7,
					tags: [
						'agent-toolkit',
						'session',
						`session:${metadata.sessionId}`,
						...(metadata.tags || []),
					],
					domain: 'agent-sessions',
					namespace: opts.namespace || metadata.namespace || 'agent-toolkit',
					metadata: {
						sessionId: metadata.sessionId,
						startedAt: metadata.startedAt,
						lastActivityAt: metadata.lastActivityAt,
						toolCallCount: metadata.toolCallCount,
						totalTokens: metadata.totalTokens,
					},
				}),
			});

			if (!response.ok) {
				console.warn(`brAInwav: Failed to persist session metadata: ${response.statusText}`);
			}
		} catch (error) {
			console.warn(`brAInwav: Error persisting session metadata:`, error);
		}
	};

	const storeToolCallSummary = async (
		sessionId: string,
		toolCalls: ToolCallRecord[],
	): Promise<void> => {
		if (!enabled || toolCalls.length === 0) return;

		try {
			const summary = {
				totalCalls: toolCalls.length,
				byKind: toolCalls.reduce(
					(acc, call) => {
						acc[call.kind] = (acc[call.kind] || 0) + 1;
						return acc;
					},
					{} as Record<string, number>,
				),
				totalTokens: toolCalls.reduce((sum, call) => sum + call.tokenCount, 0),
				timeRange: {
					start: Math.min(...toolCalls.map((c) => c.createdAt)),
					end: Math.max(...toolCalls.map((c) => c.createdAt)),
				},
			};

			const response = await fetch(`${opts.baseUrl}/store`, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					content: `brAInwav agent-toolkit session ${sessionId} summary: ${summary.totalCalls} tool calls, ${summary.totalTokens} tokens`,
					importance: 6,
					tags: [
						'agent-toolkit',
						'session-summary',
						`session:${sessionId}`,
						...Object.keys(summary.byKind).map((kind) => `tool:${kind}`),
					],
					domain: 'agent-diagnostics',
					namespace: opts.namespace || 'agent-toolkit',
					metadata: {
						sessionId,
						summary,
					},
				}),
			});

			if (!response.ok) {
				console.warn(`brAInwav: Failed to persist tool call summary: ${response.statusText}`);
			}
		} catch (error) {
			console.warn(`brAInwav: Error persisting tool call summary:`, error);
		}
	};

	const storeDiagnostics = async (
		sessionId: string,
		diagnostics: {
			errors: number;
			warnings: number;
			duration: number;
			details: Record<string, unknown>;
		},
	): Promise<void> => {
		if (!enabled) return;

		try {
			const response = await fetch(`${opts.baseUrl}/store`, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					content: `brAInwav agent-toolkit diagnostics for session ${sessionId}: ${diagnostics.errors} errors, ${diagnostics.warnings} warnings`,
					importance: diagnostics.errors > 0 ? 9 : 5,
					tags: [
						'agent-toolkit',
						'diagnostics',
						`session:${sessionId}`,
						diagnostics.errors > 0 ? 'has-errors' : 'clean',
					],
					domain: 'agent-diagnostics',
					namespace: opts.namespace || 'agent-toolkit',
					metadata: {
						sessionId,
						diagnostics,
					},
				}),
			});

			if (!response.ok) {
				console.warn(`brAInwav: Failed to persist diagnostics: ${response.statusText}`);
			}
		} catch (error) {
			console.warn(`brAInwav: Error persisting diagnostics:`, error);
		}
	};

	const getSessionHistory = async (
		sessionId: string,
	): Promise<{ success: boolean; data?: unknown[] }> => {
		if (!enabled) {
			return { success: false };
		}

		try {
			const response = await fetch(`${opts.baseUrl}/search`, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: `session:${sessionId}`,
					namespace: opts.namespace || 'agent-toolkit',
					limit: 50,
				}),
			});

			if (!response.ok) {
				return { success: false };
			}

			const result = await response.json();
			return {
				success: true,
				data: result.data || [],
			};
		} catch (error) {
			console.warn(`brAInwav: Error retrieving session history:`, error);
			return { success: false };
		}
	};

	return {
		storeSessionMetadata,
		storeToolCallSummary,
		storeDiagnostics,
		getSessionHistory,
		isEnabled: () => enabled,
	};
};

export type SessionPersistence = ReturnType<typeof createSessionPersistence>;
