import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalMemoryClient } from '../LocalMemoryClient.js';

describe('LocalMemoryClient', () => {
	let client: LocalMemoryClient;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		client = new LocalMemoryClient({ baseUrl: 'http://localhost:3002' });
		fetchSpy = vi.spyOn(global, 'fetch');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('storeWorkflowInsight', () => {
		it('should store completion insight with brAInwav branding', async () => {
			fetchSpy.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ id: 'mem-123' }),
			} as Response);

			await client.storeWorkflowInsight({
				workflowId: 'wf-123',
				featureName: 'OAuth 2.1',
				priority: 'P1',
				status: 'completed',
				qualityMetrics: { coverage: 96, security: { critical: 0, high: 0, medium: 2 } },
			});

			expect(fetchSpy).toHaveBeenCalledWith(
				'http://localhost:3002/memories',
				expect.objectContaining({
					method: 'POST',
					body: expect.stringContaining('brAInwav Workflow Completed'),
				}),
			);

			const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
			expect(body.metadata.branding).toBe('brAInwav');
			expect(body.tags).toContain('workflow');
			expect(body.tags).toContain('completed');
		});

		it('should set importance based on priority', async () => {
			fetchSpy.mockResolvedValue({ ok: true, json: async () => ({}) } as Response);

			await client.storeWorkflowInsight({ priority: 'P0', status: 'completed' });
			let body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
			expect(body.importance).toBe(10); // P0 = highest

			await client.storeWorkflowInsight({ priority: 'P3', status: 'completed' });
			body = JSON.parse(fetchSpy.mock.calls[1][1]?.body as string);
			expect(body.importance).toBe(5); // P3 = lower
		});
	});

	describe('storeApprovalDecision', () => {
		it('should store approval with high importance', async () => {
			fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);

			await client.storeApprovalDecision({
				workflowId: 'wf-123',
				gateId: 'G0',
				approver: 'alice',
				role: 'product-owner',
				decision: 'approved',
				rationale: 'Aligns with product strategy',
			});

			const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
			expect(body.importance).toBe(8);
			expect(body.content).toContain('brAInwav Gate Approval');
			expect(body.tags).toContain('approval');
			expect(body.tags).toContain('gate-G0');
		});
	});

	describe('queryRelatedWorkflows', () => {
		it('should query by feature name', async () => {
			fetchSpy.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					results: [{ id: 'mem-1', content: 'OAuth workflow completed', score: 0.95 }],
				}),
			} as Response);

			const results = await client.queryRelatedWorkflows('OAuth authentication');

			expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/memories/search'));
			expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('OAuth'));
			expect(results).toHaveLength(1);
		});
	});

	describe('Error Handling', () => {
		it('should gracefully handle service unavailable', async () => {
			fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));

			// Should not throw, just log warning
			await expect(client.storeWorkflowInsight({ status: 'completed' })).resolves.not.toThrow();

			// Should queue for retry
			expect(client.getPendingInsights()).toHaveLength(1);
		});

		it('should log brAInwav-branded warning when unavailable', async () => {
			const consoleSpy = vi.spyOn(console, 'warn');
			fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));

			await client.storeWorkflowInsight({ status: 'completed' });

			expect(consoleSpy).toHaveBeenCalled();
			const call = consoleSpy.mock.calls[0];
			expect(call[0]).toContain('brAInwav: Local memory unavailable');
		});

		it('should retry queued insights', async () => {
			// First call fails
			fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));
			await client.storeWorkflowInsight({ status: 'completed' });
			expect(client.getPendingInsights()).toHaveLength(1);

			// Second call succeeds
			fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'mem-1' }) } as Response);
			await client.retryPending();

			expect(client.getPendingInsights()).toHaveLength(0);
		});
	});
});
