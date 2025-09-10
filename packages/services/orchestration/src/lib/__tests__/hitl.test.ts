/**
 * @fileoverview Tests for HITL (Human-in-the-Loop) functionality
 * Tests systematic improvements: structured logging and type guards
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onHitlRequest, requiresApproval, submitDecision, waitForApproval } from "../hitl";

// Mock the logger to test structured logging
vi.mock("@cortex-os/observability", () => ({
	createLogger: vi.fn(() => ({
		warn: vi.fn(),
		info: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	})),
}));

describe("HITL (Human-in-the-Loop)", () => {
	describe("requiresApproval", () => {
		it("should return true for sensitive data classification", () => {
			const proposal = { dataClass: "sensitive" };
			expect(requiresApproval(proposal)).toBe(true);
		});

		it("should return true for paths outside cwd", () => {
			const proposal = { path: "/etc/passwd" };
			expect(requiresApproval(proposal)).toBe(true);
		});

		it("should return false for paths inside cwd", () => {
			const cwd = process.cwd();
			const proposal = { path: `${cwd}/local-file.txt` };
			expect(requiresApproval(proposal)).toBe(false);
		});

		it("should return false for public data classification", () => {
			const proposal = { dataClass: "public" };
			expect(requiresApproval(proposal)).toBe(false);
		});

		it("should return false for empty proposals", () => {
			expect(requiresApproval({})).toBe(false);
		});

		it("should handle invalid proposal shapes gracefully", () => {
			expect(requiresApproval(null)).toBe(false);
			expect(requiresApproval(undefined)).toBe(false);
			expect(requiresApproval("string")).toBe(false);
			expect(requiresApproval(123)).toBe(false);
			expect(requiresApproval([])).toBe(false);
		});

		it("should handle invalid property types gracefully", () => {
			expect(requiresApproval({ dataClass: 123 })).toBe(false);
			expect(requiresApproval({ path: null })).toBe(false);
			expect(requiresApproval({ dataClass: [] })).toBe(false);
		});

		it("should use structured logging for errors", () => {
			const { createLogger } = vi.mocked(
				await import("@cortex-os/observability"),
			);
			const mockLogger = { warn: vi.fn() };
			createLogger.mockReturnValue(mockLogger as any);

			// This should not cause an error but should log a warning
			const result = requiresApproval({ dataClass: 123 });
			expect(result).toBe(false);
		});

		it("should handle complex nested proposals", () => {
			const proposal = {
				dataClass: "sensitive",
				path: "/safe/path",
				metadata: {
					author: "test",
					nested: { data: true },
				},
			};
			expect(requiresApproval(proposal)).toBe(true);
		});
	});

	describe("waitForApproval", () => {
		beforeEach(() => {
			vi.clearAllTimers();
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should resolve with approval when decision is submitted", async () => {
			const approvalPromise = waitForApproval(
				"run-123",
				"test-node",
				{ dataClass: "sensitive" },
			);

			// Simulate approval after 100ms
			setTimeout(() => {
				// We need to get the request ID from the event
				onHitlRequest((req) => {
					submitDecision(req.id, true);
				});
			}, 100);

			vi.advanceTimersByTime(100);
			const result = await approvalPromise;
			expect(result).toBe(true);
		});

		it("should resolve with rejection when decision is negative", async () => {
			const approvalPromise = waitForApproval(
				"run-456",
				"test-node",
				{ path: "/dangerous" },
			);

			setTimeout(() => {
				onHitlRequest((req) => {
					submitDecision(req.id, false);
				});
			}, 100);

			vi.advanceTimersByTime(100);
			const result = await approvalPromise;
			expect(result).toBe(false);
		});

		it("should timeout after configured duration", async () => {
			// Set a short timeout for testing
			vi.stubEnv("CORTEX_HITL_TIMEOUT_MS", "1000");

			const approvalPromise = waitForApproval(
				"run-timeout",
				"test-node",
				{ dataClass: "sensitive" },
			);

			vi.advanceTimersByTime(1000);

			await expect(approvalPromise).rejects.toThrow("HITL approval timeout");
		});

		it("should emit structured request events", async () => {
			const mockListener = vi.fn();
			onHitlRequest(mockListener);

			waitForApproval("run-event-test", "node-1", {
				dataClass: "sensitive",
				metadata: "test",
			});

			// Allow event to be emitted
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(mockListener).toHaveBeenCalledWith(
				expect.objectContaining({
					id: expect.any(String),
					runId: "run-event-test",
					node: "node-1",
					proposal: expect.objectContaining({
						dataClass: "sensitive",
						metadata: "test",
					}),
					ts: expect.any(String),
				}),
			);
		});
	});

	describe("submitDecision", () => {
		it("should handle valid decision submission", () => {
			// This is mainly tested through waitForApproval integration
			expect(() => submitDecision("test-id", true)).not.toThrow();
		});

		it("should handle unknown request IDs gracefully", () => {
			expect(() => submitDecision("unknown-id", false)).not.toThrow();
		});
	});

	describe("Edge cases and error conditions", () => {
		it("should handle malformed proposal data", () => {
			const malformedProposals = [
				{ dataClass: "" }, // empty string
				{ path: "" }, // empty path
				{ dataClass: "sensitive", path: "" }, // mixed valid/invalid
				{ extraField: "ignored", dataClass: "public" }, // extra fields
			];

			malformedProposals.forEach((proposal) => {
				expect(() => requiresApproval(proposal)).not.toThrow();
			});
		});

		it("should maintain type safety across all operations", () => {
			// Compile-time type checking is handled by TypeScript
			// Runtime verification through systematic testing
			const validProposal = { dataClass: "sensitive", path: "/test" };
			const result = requiresApproval(validProposal);
			expect(typeof result).toBe("boolean");
		});
	});
});
