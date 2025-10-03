/**
 * Session Persistence Tests - brAInwav Agent Toolkit
 *
 * Tests for session metadata persistence to Local Memory
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionMetadata, ToolCallRecord } from '../src/session/SessionContextManager.js';
import { createSessionPersistence } from '../src/session/SessionPersistence.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('brAInwav Session Persistence', () => {
	const baseUrl = 'http://localhost:3028/api/v1';
	const apiKey = 'test-key';

	beforeEach(() => {
		mockFetch.mockReset();
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ success: true, data: [] }),
		});
	});

	describe('Session Metadata Storage', () => {
		it('should persist session metadata to Local Memory', async () => {
			const persistence = createSessionPersistence({ baseUrl, apiKey });

			const metadata: SessionMetadata = {
				sessionId: 'test-session-123',
				startedAt: new Date().toISOString(),
				lastActivityAt: new Date().toISOString(),
				toolCallCount: 5,
				totalTokens: 1500,
				namespace: 'test',
				tags: ['test-tag'],
			};

			await persistence.storeSessionMetadata(metadata);

			expect(mockFetch).toHaveBeenCalledWith(
				`${baseUrl}/store`,
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Content-Type': 'application/json',
						Authorization: `Bearer ${apiKey}`,
					}),
				}),
			);

			const callArgs = mockFetch.mock.calls[0][1];
			const body = JSON.parse(callArgs.body as string);

			expect(body.content).toContain('brAInwav agent-toolkit session');
			expect(body.content).toContain(metadata.sessionId);
			expect(body.tags).toContain('agent-toolkit');
			expect(body.tags).toContain('session');
			expect(body.metadata.sessionId).toBe(metadata.sessionId);
			expect(body.metadata.toolCallCount).toBe(5);
			expect(body.metadata.totalTokens).toBe(1500);
		});

		it('should not persist when disabled', async () => {
			const persistence = createSessionPersistence({
				baseUrl,
				apiKey,
				enabled: false,
			});

			const metadata: SessionMetadata = {
				sessionId: 'test-session',
				startedAt: new Date().toISOString(),
				lastActivityAt: new Date().toISOString(),
				toolCallCount: 0,
				totalTokens: 0,
			};

			await persistence.storeSessionMetadata(metadata);

			expect(mockFetch).not.toHaveBeenCalled();
			expect(persistence.isEnabled()).toBe(false);
		});

		it('should handle persistence errors gracefully', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				statusText: 'Internal Server Error',
			});

			const persistence = createSessionPersistence({ baseUrl });
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const metadata: SessionMetadata = {
				sessionId: 'test-session',
				startedAt: new Date().toISOString(),
				lastActivityAt: new Date().toISOString(),
				toolCallCount: 0,
				totalTokens: 0,
			};

			await persistence.storeSessionMetadata(metadata);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Failed to persist session metadata'),
			);

			consoleSpy.mockRestore();
		});
	});

	describe('Tool Call Summary Storage', () => {
		it('should persist tool call summary with aggregated stats', async () => {
			const persistence = createSessionPersistence({ baseUrl, apiKey });

			const toolCalls: ToolCallRecord[] = [
				{
					id: 'call-1',
					kind: 'search',
					params: { pattern: 'test' },
					tokenCount: 100,
					createdAt: Date.now() - 1000,
				},
				{
					id: 'call-2',
					kind: 'search',
					params: { pattern: 'foo' },
					tokenCount: 150,
					createdAt: Date.now(),
				},
				{
					id: 'call-3',
					kind: 'codemod',
					params: { find: 'old', replace: 'new' },
					tokenCount: 200,
					createdAt: Date.now() + 1000,
				},
			];

			await persistence.storeToolCallSummary('test-session', toolCalls);

			expect(mockFetch).toHaveBeenCalled();

			const callArgs = mockFetch.mock.calls[0][1];
			const body = JSON.parse(callArgs.body as string);

			expect(body.content).toContain('3 tool calls');
			expect(body.content).toContain('450 tokens');
			expect(body.metadata.summary.totalCalls).toBe(3);
			expect(body.metadata.summary.totalTokens).toBe(450);
			expect(body.metadata.summary.byKind.search).toBe(2);
			expect(body.metadata.summary.byKind.codemod).toBe(1);
			expect(body.tags).toContain('tool:search');
			expect(body.tags).toContain('tool:codemod');
		});

		it('should not persist empty tool call list', async () => {
			const persistence = createSessionPersistence({ baseUrl });

			await persistence.storeToolCallSummary('test-session', []);

			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	describe('Diagnostics Storage', () => {
		it('should persist diagnostics with error priority', async () => {
			const persistence = createSessionPersistence({ baseUrl, apiKey });

			const diagnostics = {
				errors: 3,
				warnings: 5,
				duration: 1500,
				details: { failedTools: ['search', 'codemod'] },
			};

			await persistence.storeDiagnostics('test-session', diagnostics);

			expect(mockFetch).toHaveBeenCalled();

			const callArgs = mockFetch.mock.calls[0][1];
			const body = JSON.parse(callArgs.body as string);

			expect(body.importance).toBe(9); // High importance for errors
			expect(body.content).toContain('3 errors');
			expect(body.content).toContain('5 warnings');
			expect(body.tags).toContain('has-errors');
			expect(body.metadata.diagnostics.errors).toBe(3);
		});

		it('should use lower importance for clean diagnostics', async () => {
			const persistence = createSessionPersistence({ baseUrl });

			const diagnostics = {
				errors: 0,
				warnings: 2,
				duration: 500,
				details: {},
			};

			await persistence.storeDiagnostics('test-session', diagnostics);

			const callArgs = mockFetch.mock.calls[0][1];
			const body = JSON.parse(callArgs.body as string);

			expect(body.importance).toBe(5); // Lower importance
			expect(body.tags).toContain('clean');
		});
	});

	describe('Session History Retrieval', () => {
		it('should retrieve session history from Local Memory', async () => {
			const mockHistory = [
				{ id: '1', content: 'Session data 1' },
				{ id: '2', content: 'Session data 2' },
			];

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ success: true, data: mockHistory }),
			});

			const persistence = createSessionPersistence({ baseUrl, apiKey });
			const result = await persistence.getSessionHistory('test-session');

			expect(result.success).toBe(true);
			expect(result.data).toEqual(mockHistory);

			expect(mockFetch).toHaveBeenCalledWith(
				`${baseUrl}/search`,
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						Authorization: `Bearer ${apiKey}`,
					}),
				}),
			);

			const callArgs = mockFetch.mock.calls[0][1];
			const body = JSON.parse(callArgs.body as string);

			expect(body.query).toContain('session:test-session');
			expect(body.limit).toBe(50);
		});

		it('should handle retrieval errors gracefully', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				statusText: 'Not Found',
			});

			const persistence = createSessionPersistence({ baseUrl });
			const result = await persistence.getSessionHistory('nonexistent');

			expect(result.success).toBe(false);
			expect(result.data).toBeUndefined();
		});

		it('should return failure when persistence disabled', async () => {
			const persistence = createSessionPersistence({
				baseUrl,
				enabled: false,
			});

			const result = await persistence.getSessionHistory('test-session');

			expect(result.success).toBe(false);
			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	describe('Configuration', () => {
		it('should include namespace in requests when specified', async () => {
			const persistence = createSessionPersistence({
				baseUrl,
				namespace: 'custom-namespace',
			});

			const metadata: SessionMetadata = {
				sessionId: 'test',
				startedAt: new Date().toISOString(),
				lastActivityAt: new Date().toISOString(),
				toolCallCount: 0,
				totalTokens: 0,
			};

			await persistence.storeSessionMetadata(metadata);

			const callArgs = mockFetch.mock.calls[0][1];
			const body = JSON.parse(callArgs.body as string);

			expect(body.namespace).toBe('custom-namespace');
		});

		it('should work without API key', async () => {
			const persistence = createSessionPersistence({ baseUrl });

			const metadata: SessionMetadata = {
				sessionId: 'test',
				startedAt: new Date().toISOString(),
				lastActivityAt: new Date().toISOString(),
				toolCallCount: 0,
				totalTokens: 0,
			};

			await persistence.storeSessionMetadata(metadata);

			const callArgs = mockFetch.mock.calls[0][1];
			const headers = callArgs.headers as Record<string, string>;

			expect(headers['Authorization']).toBeUndefined();
		});
	});
});
