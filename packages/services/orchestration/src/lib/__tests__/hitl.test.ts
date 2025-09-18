/**
 * @fileoverview Tests for HITL (Human-in-the-Loop) functionality
 * Tests systematic improvements: structured logging and type guards
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	onHitlRequest,
	requiresApproval,
	resetHitl,
	submitDecision,
	waitForApproval,
} from '../hitl';

// Mock the logger to test structured logging
vi.mock('@cortex-os/observability', () => ({
	createLogger: vi.fn(() => ({
		warn: vi.fn(),
		info: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	})),
}));

// Mock utils TypeGuards to avoid cross-package import issues in isolation
vi.mock('@cortex-os/utils', () => ({
	TypeGuards: {
		isProposalShape: (val: unknown) => {
			if (!val || typeof val !== 'object') return false;
			const obj = val as any;
			// Accept objects with optional string fields dataClass/path
			if (obj.dataClass !== undefined && typeof obj.dataClass !== 'string') return false;
			if (obj.path !== undefined && typeof obj.path !== 'string') return false;
			return true;
		},
	},
}));

describe('HITL (Human-in-the-Loop)', () => {
	describe('requiresApproval', () => {
		it('should return true for sensitive data classification', () => {
			const proposal = { dataClass: 'sensitive' };
			expect(requiresApproval(proposal)).toBe(true);
		});

		it('should return true for paths outside cwd', () => {
			const proposal = { path: '/etc/passwd' };
			expect(requiresApproval(proposal)).toBe(true);
		});

		it('should return false for paths inside cwd', () => {
			const cwd = process.cwd();
			const proposal = { path: `${cwd}/local-file.txt` };
			expect(requiresApproval(proposal)).toBe(false);
		});

		it('should return false for public data classification', () => {
			const proposal = { dataClass: 'public' };
			expect(requiresApproval(proposal)).toBe(false);
		});

		it('should return false for empty proposals', () => {
			expect(requiresApproval({})).toBe(false);
		});

		it('should handle invalid proposal shapes gracefully', () => {
			expect(requiresApproval(null)).toBe(false);
			expect(requiresApproval(undefined)).toBe(false);
			expect(requiresApproval('string')).toBe(false);
			expect(requiresApproval(123)).toBe(false);
			expect(requiresApproval([])).toBe(false);
		});

		it('should handle invalid property types gracefully', () => {
			expect(requiresApproval({ dataClass: 123 })).toBe(false);
			expect(requiresApproval({ path: null })).toBe(false);
			expect(requiresApproval({ dataClass: [] })).toBe(false);
		});

		it('should handle complex nested proposals', () => {
			const proposal = {
				dataClass: 'sensitive',
				path: '/safe/path',
				metadata: {
					author: 'test',
					nested: { data: true },
				},
			};
			expect(requiresApproval(proposal)).toBe(true);
		});
	});

	describe('waitForApproval', () => {
		beforeEach(() => {
			vi.clearAllTimers();
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
			resetHitl();
		});

		it('should resolve with approval when decision is submitted', async () => {
			// Register listener BEFORE invoking to catch the emitted request
			const off = onHitlRequest((req) => {
				submitDecision(req.id, true);
			});
			// Ensure we don't leak listeners
			try {
				const result = await waitForApproval('run-123', 'test-node', {
					dataClass: 'sensitive',
				});
				expect(result).toBe(true);
			} finally {
				off();
			}
		});

		it('should resolve with rejection when decision is negative', async () => {
			const off = onHitlRequest((req) => {
				submitDecision(req.id, false);
			});
			try {
				const result = await waitForApproval('run-456', 'test-node', {
					path: '/dangerous',
				});
				expect(result).toBe(false);
			} finally {
				off();
			}
		});

		it('should timeout after configured duration', async () => {
			// Set a short timeout for testing
			vi.stubEnv('CORTEX_HITL_TIMEOUT_MS', '1000');

			const approvalPromise = waitForApproval('run-timeout', 'test-node', {
				dataClass: 'sensitive',
			});

			vi.advanceTimersByTime(1000);

			await expect(approvalPromise).rejects.toThrow('HITL approval timeout');
		});

		it('should emit structured request events', async () => {
			const mockListener = vi.fn((req) => {
				// Resolve immediately to clear pending timers
				submitDecision(req.id, false);
			});
			const off = onHitlRequest(mockListener);

			// Trigger request emission
			await waitForApproval('run-event-test', 'node-1', {
				dataClass: 'sensitive',
				metadata: 'test',
			});

			try {
				expect(mockListener).toHaveBeenCalledWith(
					expect.objectContaining({
						id: expect.any(String),
						runId: 'run-event-test',
						node: 'node-1',
						proposal: expect.objectContaining({
							dataClass: 'sensitive',
							metadata: 'test',
						}),
						ts: expect.any(String),
					}),
				);
			} finally {
				off();
			}
		});
	});

	describe('submitDecision', () => {
		it('should handle valid decision submission', () => {
			// This is mainly tested through waitForApproval integration
			expect(() => submitDecision('test-id', true)).not.toThrow();
		});

		it('should handle unknown request IDs gracefully', () => {
			expect(() => submitDecision('unknown-id', false)).not.toThrow();
		});
	});

	describe('Edge cases and error conditions', () => {
		it('should handle malformed proposal data', () => {
			const malformedProposals = [
				{ dataClass: '' }, // empty string
				{ path: '' }, // empty path
				{ dataClass: 'sensitive', path: '' }, // mixed valid/invalid
				{ extraField: 'ignored', dataClass: 'public' }, // extra fields
			];

			malformedProposals.forEach((proposal) => {
				expect(() => requiresApproval(proposal)).not.toThrow();
			});
		});

		it('should maintain type safety across all operations', () => {
			// Compile-time type checking is handled by TypeScript
			// Runtime verification through systematic testing
			const validProposal = { dataClass: 'sensitive', path: '/test' };
			const result = requiresApproval(validProposal);
			expect(typeof result).toBe('boolean');
		});
	});
});
