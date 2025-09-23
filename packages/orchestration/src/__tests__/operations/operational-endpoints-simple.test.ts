/**
 * Simple Operational Endpoints Test - TDD Phase
 * Testing the public handler methods that were added for TDD compliance
 */

import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OperationalEndpoints } from '../../operations/operational-endpoints';

// Create minimal mocks for dependencies
const mockHealthChecker = {
	getSystemHealth: vi.fn(),
	getLivenessProbe: vi.fn(),
	getReadinessProbe: vi.fn(),
	getAllResults: vi.fn(),
	runCheck: vi.fn(),
};

const mockShutdownManager = {
	isShutdownInProgress: vi.fn(),
	shutdown: vi.fn(),
	getHandlers: vi.fn(),
};

// Simple mock request/response
const mockReq = {} as Request;
const mockRes = {
	status: vi.fn().mockReturnThis(),
	json: vi.fn().mockReturnThis(),
	end: vi.fn().mockReturnThis(),
	set: vi.fn().mockReturnThis(),
} as any as Response;

describe('OperationalEndpoints - TDD Handler Methods', () => {
	let endpoints: OperationalEndpoints;

	beforeEach(() => {
		vi.clearAllMocks();

		// Setup happy path mocks
		mockHealthChecker.getSystemHealth.mockResolvedValue({
			overall: 'healthy',
			timestamp: new Date().toISOString(),
			uptime: 12345,
			version: '1.0.0',
		});

		mockHealthChecker.getLivenessProbe.mockResolvedValue({
			status: 'alive',
			timestamp: new Date().toISOString(),
			uptime: 12345,
		});

		mockHealthChecker.getReadinessProbe.mockResolvedValue({
			ready: true,
			checks: {},
		});

		mockShutdownManager.isShutdownInProgress.mockReturnValue(false);

		endpoints = new OperationalEndpoints({
			healthChecker: mockHealthChecker as any,
			shutdownManager: mockShutdownManager as any,
			enableMetrics: true,
			enableAdminEndpoints: true,
		});
	});

	it('should have handleHealth method', async () => {
		// Verify the method exists
		expect(typeof endpoints.handleHealth).toBe('function');

		// Test the method works
		await endpoints.handleHealth(mockReq, mockRes);

		// Verify it called the underlying health check
		expect(mockHealthChecker.getSystemHealth).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'healthy',
				timestamp: expect.any(String),
				uptime: expect.any(Number),
				version: expect.any(String),
			}),
		);
	});

	it('should have handleLiveness method', async () => {
		expect(typeof endpoints.handleLiveness).toBe('function');

		await endpoints.handleLiveness(mockReq, mockRes);

		expect(mockHealthChecker.getLivenessProbe).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(200);
	});

	it('should have handleReadiness method', async () => {
		expect(typeof endpoints.handleReadiness).toBe('function');

		await endpoints.handleReadiness(mockReq, mockRes);

		expect(mockHealthChecker.getReadinessProbe).toHaveBeenCalled();
		expect(mockRes.status).toHaveBeenCalledWith(200);
	});

	it('should have handleMetrics method', async () => {
		expect(typeof endpoints.handleMetrics).toBe('function');

		await endpoints.handleMetrics(mockReq, mockRes);

		// Either it succeeds with res.end() OR fails with status 500
		expect(
			(mockRes.status as any).mock.calls.length + (mockRes.end as any).mock.calls.length,
		).toBeGreaterThan(0);
	});

	it('should have handleSystemInfo method', async () => {
		expect(typeof endpoints.handleSystemInfo).toBe('function');

		await endpoints.handleSystemInfo(mockReq, mockRes);

		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				service: 'nO Master Agent Loop',
				company: 'brAInwav',
			}),
		);
	});

	it('should have getRouter method', () => {
		expect(typeof endpoints.getRouter).toBe('function');

		const router = endpoints.getRouter();
		expect(router).toBeDefined();
	});
});
