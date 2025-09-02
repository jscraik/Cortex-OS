import { logWithSpan, withSpan } from "@cortex-os/telemetry";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeadLetterStore } from "../dlq";
import { DeadLetterQueue } from "../dlq";
import { SagaOrchestrator } from "../saga";

beforeEach(() => {
	vi.clearAllMocks();
});

describe("DeadLetterQueue telemetry", () => {
	it("creates span and logs when handling failed message", async () => {
		const store: DeadLetterStore = {
			enqueue: vi.fn(),
			dequeueBatch: vi.fn(),
			requeue: vi.fn(),
			remove: vi.fn(),
			findByCorrelationId: vi.fn(),
			findByQuarantineLevel: vi.fn(),
			findByErrorCategory: vi.fn(),
			findExpiredQuarantine: vi.fn(),
			getStats: vi.fn(),
			updateCircuitBreaker: vi.fn(),
		};

		const dlq = new DeadLetterQueue(store);
		const result = await dlq.handleFailed(
			{ id: "1", type: "test", payload: {}, headers: {} } as unknown,
			new Error("network timeout"),
		);

		expect(result).toBe("retry");
		expect(withSpan).toHaveBeenCalledWith(
			"dlq.handleFailed",
			expect.any(Function),
		);
		expect(logWithSpan).toHaveBeenCalledWith(
			"info",
			"Retrying message",
			expect.objectContaining({ envelopeId: "1", retryCount: 1 }),
			expect.any(Object),
		);
	});
});

describe("SagaOrchestrator telemetry", () => {
	it("records error span and logs when step fails", async () => {
		const orchestrator = new SagaOrchestrator<{ count: number }>();
		orchestrator.addStep({
			id: "s1",
			name: "step1",
			execute: async () => {
				throw new Error("boom");
			},
		});

		const result = await orchestrator.execute({ count: 0 });

		expect(result.success).toBe(false);
		expect(withSpan).toHaveBeenCalledWith(
			"saga.step.step1",
			expect.any(Function),
		);
		expect(logWithSpan).toHaveBeenCalledWith(
			"error",
			"Saga step failed",
			expect.objectContaining({ step: "step1" }),
			expect.any(Object),
		);
	});
});
