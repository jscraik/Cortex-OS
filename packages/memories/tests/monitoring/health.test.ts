import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthMonitor } from '../../src/monitoring/health.js';

describe('HealthMonitor', () => {
	let healthMonitor: HealthMonitor;
	let mockFetch: vi.MockedFunction<typeof global.fetch>;

	beforeEach(() => {
		healthMonitor = new HealthMonitor();
		mockFetch = vi.fn();
		global.fetch = mockFetch;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('checkMLX', () => {
		it('should return healthy when MLX service responds', async () => {
			process.env.MLX_EMBED_BASE_URL = 'http://localhost:8080';
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			} as Response);

			const result = await healthMonitor.checkMLX();

			expect(result.healthy).toBe(true);
			expect(result.latency).toBeDefined();
			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:8080/health',
				expect.objectContaining({
					method: 'GET',
					signal: expect.any(AbortSignal),
				}),
			);
		});

		it('should return unhealthy when MLX service is unavailable', async () => {
			delete process.env.MLX_EMBED_BASE_URL;
			delete process.env.MLX_SERVICE_URL;

			const result = await healthMonitor.checkMLX();

			expect(result.healthy).toBe(false);
			expect(result.error).toContain('not configured');
		});

		it('should handle fetch errors', async () => {
			process.env.MLX_EMBED_BASE_URL = 'http://localhost:8080';
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			const result = await healthMonitor.checkMLX();

			expect(result.healthy).toBe(false);
			expect(result.error).toBe('Network error');
		});
	});

	describe('checkOllama', () => {
		it('should return healthy when Ollama responds', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
			} as Response);

			const result = await healthMonitor.checkOllama();

			expect(result.healthy).toBe(true);
			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:11434/api/tags',
				expect.objectContaining({
					method: 'GET',
					signal: expect.any(AbortSignal),
				}),
			);
		});

		it('should handle non-200 responses', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
			} as Response);

			const result = await healthMonitor.checkOllama();

			expect(result.healthy).toBe(false);
			expect(result.error).toContain('500');
		});
	});

	describe('checkAll', () => {
		it('should check all services', async () => {
			const checkMLXSpy = vi.spyOn(healthMonitor, 'checkMLX');
			const checkOllamaSpy = vi.spyOn(healthMonitor, 'checkOllama');
			const checkDatabaseSpy = vi.spyOn(healthMonitor, 'checkDatabase');

			checkMLXSpy.mockResolvedValue({
				healthy: true,
				timestamp: new Date().toISOString(),
			});
			checkOllamaSpy.mockResolvedValue({
				healthy: true,
				timestamp: new Date().toISOString(),
			});
			checkDatabaseSpy.mockResolvedValue({
				healthy: true,
				timestamp: new Date().toISOString(),
			});

			const result = await healthMonitor.checkAll();

			expect(result.isHealthy).toBe(true);
			expect(result.mlx.healthy).toBe(true);
			expect(result.ollama.healthy).toBe(true);
			expect(result.database.healthy).toBe(true);
			expect(result.uptime).toBeGreaterThanOrEqual(0);
		});

		it('should report unhealthy if any service fails', async () => {
			vi.spyOn(healthMonitor, 'checkMLX').mockResolvedValue({
				healthy: true,
				timestamp: new Date().toISOString(),
			});
			vi.spyOn(healthMonitor, 'checkOllama').mockResolvedValue({
				healthy: false,
				error: 'Service down',
				timestamp: new Date().toISOString(),
			});
			vi.spyOn(healthMonitor, 'checkDatabase').mockResolvedValue({
				healthy: true,
				timestamp: new Date().toISOString(),
			});

			const result = await healthMonitor.checkAll();

			expect(result.isHealthy).toBe(false);
			expect(result.ollama.healthy).toBe(false);
		});
	});
});
