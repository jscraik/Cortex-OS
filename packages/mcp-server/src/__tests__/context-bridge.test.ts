/**
 * Pieces Context Bridge Tests
 *
 * Unit tests for the context bridge functionality including
 * event capture, service status tracking, and analytics.
 */

import type { Logger } from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPiecesContextBridge, PiecesContextBridge } from '../context-bridge.js';

describe('PiecesContextBridge', () => {
	let contextBridge: PiecesContextBridge;
	let mockLogger: Logger;

	beforeEach(() => {
		mockLogger = {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		} as any;

		contextBridge = new PiecesContextBridge({
			logger: mockLogger,
			enableEventCapture: true,
			enableTelemetry: true,
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Event Capture', () => {
		it('should capture hybrid search events', () => {
			const event = {
				timestamp: '2024-01-01T00:00:00.000Z',
				query: 'test query',
				sources: {
					local: true,
					pieces: true,
					drive: false,
					copilot: false,
				},
				results: {
					local: 5,
					pieces: 3,
					drive: 0,
					copilot: 0,
					total: 8,
				},
				duration: 150,
				errors: [],
			};

			contextBridge.captureHybridSearchEvent(event);

			const recentEvents = contextBridge.getRecentEvents();
			expect(recentEvents).toHaveLength(1);
			expect(recentEvents[0]).toEqual(event);
		});

		it('should limit event history size', () => {
			// Create a bridge with small history limit for testing
			const smallBridge = new PiecesContextBridge({
				logger: mockLogger,
				enableEventCapture: true,
				enableTelemetry: true,
			});
			(smallBridge as any).maxEventHistory = 3;

			// Add 5 events
			for (let i = 0; i < 5; i++) {
				smallBridge.captureHybridSearchEvent({
					timestamp: `2024-01-01T00:00:0${i}.000Z`,
					query: `query ${i}`,
					sources: { local: true, pieces: true, drive: false, copilot: false },
					results: { local: 1, pieces: 1, drive: 0, copilot: 0, total: 2 },
					duration: 100,
					errors: [],
				});
			}

			const recentEvents = smallBridge.getRecentEvents();
			expect(recentEvents).toHaveLength(3);
			expect(recentEvents[0].query).toBe('query 2'); // Should keep only last 3
		});

		it('should not capture events when disabled', () => {
			const disabledBridge = new PiecesContextBridge({
				logger: mockLogger,
				enableEventCapture: false,
				enableTelemetry: true,
			});

			disabledBridge.captureHybridSearchEvent({
				timestamp: '2024-01-01T00:00:00.000Z',
				query: 'test',
				sources: { local: true, pieces: true, drive: false, copilot: false },
				results: { local: 1, pieces: 1, drive: 0, copilot: 0, total: 2 },
				duration: 100,
				errors: [],
			});

			const recentEvents = disabledBridge.getRecentEvents();
			expect(recentEvents).toHaveLength(0);
		});
	});

	describe('Service Status', () => {
		it('should update service status', () => {
			contextBridge.updateServiceStatus('pieces', true);
			contextBridge.updateServiceStatus('drive', false, 'Connection failed');
			contextBridge.updateServiceStatus('copilot', true);

			const status = contextBridge.getServiceStatus();
			expect(status.pieces.connected).toBe(true);
			expect(status.drive.connected).toBe(false);
			expect(status.drive.lastError).toBe('Connection failed');
			expect(status.copilot.connected).toBe(true);
		});

		it('should update status from hybrid search events', () => {
			const event = {
				timestamp: '2024-01-01T00:00:00.000Z',
				query: 'test',
				sources: {
					local: true,
					pieces: true,
					drive: true,
					copilot: true,
				},
				results: { local: 1, pieces: 1, drive: 1, copilot: 1, total: 4 },
				duration: 100,
				errors: ['Pieces Drive query failed; continuing'],
			};

			contextBridge.captureHybridSearchEvent(event);

			const status = contextBridge.getServiceStatus();
			expect(status.pieces.connected).toBe(true);
			expect(status.drive.connected).toBe(false);
			expect(status.copilot.connected).toBe(true);
		});
	});

	describe('Analytics', () => {
		it('should calculate aggregated stats', () => {
			// Add some test events
			for (let i = 0; i < 3; i++) {
				contextBridge.captureHybridSearchEvent({
					timestamp: `2024-01-01T00:00:0${i}.000Z`,
					query: `query ${i}`,
					sources: {
						local: true,
						pieces: i < 2, // First 2 events use pieces
						drive: i === 0, // First event uses drive
						copilot: i === 2, // Last event uses copilot
					},
					results: {
						local: 2,
						pieces: i < 2 ? 1 : 0,
						drive: i === 0 ? 1 : 0,
						copilot: i === 2 ? 1 : 0,
						total: 3,
					},
					duration: 100 + i * 50,
					errors: i === 1 ? ['Some error'] : [],
				});
			}

			const stats = contextBridge.getAggregatedStats();
			expect(stats.totalSearches).toBe(3);
			expect(stats.averageResults).toBe(3);
			expect(stats.averageDuration).toBe(150); // (100 + 150 + 200) / 3
			expect(stats.sourceUsage.local).toBe(3);
			expect(stats.sourceUsage.pieces).toBe(2);
			expect(stats.sourceUsage.drive).toBe(1);
			expect(stats.sourceUsage.copilot).toBe(1);
			expect(stats.errorRate).toBe(1 / 3); // 1 error out of 3 searches
		});

		it('should return empty stats when no events', () => {
			const stats = contextBridge.getAggregatedStats();
			expect(stats.totalSearches).toBe(0);
			expect(stats.averageResults).toBe(0);
			expect(stats.averageDuration).toBe(0);
			expect(stats.errorRate).toBe(0);
		});
	});

	describe('Context Building', () => {
		it('should build context string from recent activity', () => {
			// Add test events
			contextBridge.captureHybridSearchEvent({
				timestamp: '2024-01-01T00:00:00.000Z',
				query: 'first query',
				sources: { local: true, pieces: true, drive: false, copilot: false },
				results: { local: 2, pieces: 1, drive: 0, copilot: 0, total: 3 },
				duration: 100,
				errors: [],
			});

			const context = contextBridge.buildPiecesContext('current search');
			expect(context).toContain('brAInwav Pieces Integration Context');
			expect(context).toContain('Service Status:');
			expect(context).toContain('Recent Activity:');
			expect(context).toContain('Current Search: "current search"');
			expect(context).toContain('first query');
		});

		it('should build context without search query', () => {
			const context = contextBridge.buildPiecesContext();
			expect(context).toContain('brAInwav Pieces Integration Context');
			expect(context).not.toContain('Current Search:');
		});
	});
});

describe('createPiecesContextBridge', () => {
	it('should create context bridge with default options', () => {
		const mockLogger = { info: vi.fn() } as any;
		const bridge = createPiecesContextBridge(mockLogger);

		expect(bridge).toBeInstanceOf(PiecesContextBridge);
	});

	it('should create context bridge with custom options', () => {
		const mockLogger = { info: vi.fn() } as any;
		const bridge = createPiecesContextBridge(mockLogger, {
			enableEventCapture: false,
			enableTelemetry: false,
		});

		expect(bridge).toBeInstanceOf(PiecesContextBridge);
	});
});
