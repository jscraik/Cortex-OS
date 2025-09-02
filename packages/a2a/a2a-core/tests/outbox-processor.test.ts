import { describe, expect, it, vi } from "vitest";
import { processPendingMessages, processRetryMessages } from "../src/outbox.js";

const config = {
	maxRetries: 3,
	initialRetryDelayMs: 100,
	maxRetryDelayMs: 1000,
	backoffMultiplier: 2,
	batchSize: 10,
	processingIntervalMs: 1000,
	dlqThreshold: 2,
	messageTtlMs: 0,
	enableIdempotency: false,
} as const;

describe("processPendingMessages", () => {
	it("processes messages and dead-letters failures", async () => {
		const messages = [
			{ id: "1", retryCount: 0 } as unknown,
			{ id: "2", retryCount: 2 } as any,
		];
		const repo = {
			findByStatus: vi.fn().mockResolvedValue(messages),
			updateStatus: vi.fn().mockResolvedValue(undefined),
			markProcessed: vi.fn().mockResolvedValue(undefined),
			moveToDeadLetter: vi.fn().mockResolvedValue(undefined),
			incrementRetry: vi.fn().mockResolvedValue(undefined),
		} as unknown;

		const processMessage = vi
			.fn<[(typeof messages)[number]], Promise<void>>()
			.mockResolvedValueOnce()
			.mockRejectedValueOnce(new Error("boom"));

		const handleError = vi
			.fn<(typeof messages)[number], string, Promise<void>>()
			.mockImplementation(async (msg, err) => {
				await repo.incrementRetry(msg.id, err);
			});

		const result = await processPendingMessages(
			repo,
			config,
			processMessage,
			handleError,
		);

		expect(repo.updateStatus).toHaveBeenCalledTimes(2);
		expect(repo.markProcessed).toHaveBeenCalledTimes(1);
		expect(repo.moveToDeadLetter).toHaveBeenCalledWith(
			"2",
			"Max retries exceeded",
		);
		expect(repo.incrementRetry).toHaveBeenCalledWith("2", "boom");
		expect(result).toMatchObject({
			processed: 2,
			successful: 1,
			failed: 1,
			deadLettered: 1,
		});
		expect(result.duration).toBeGreaterThanOrEqual(0);
	});
});

describe("processRetryMessages", () => {
	it("processes retryable messages", async () => {
		const messages = [
			{ id: "1", retryCount: 0 } as unknown,
			{ id: "2", retryCount: 1 } as any,
		];
		const repo = {
			findReadyForRetry: vi.fn().mockResolvedValue(messages),
			markProcessed: vi.fn().mockResolvedValue(undefined),
			incrementRetry: vi.fn().mockResolvedValue(undefined),
		} as unknown;

		const processMessage = vi
			.fn<[(typeof messages)[number]], Promise<void>>()
			.mockResolvedValueOnce()
			.mockRejectedValueOnce(new Error("boom"));

		const handleError = vi
			.fn<(typeof messages)[number], string, Promise<void>>()
			.mockImplementation(async (msg, err) => {
				await repo.incrementRetry(msg.id, err);
			});

		const result = await processRetryMessages(
			repo,
			config,
			processMessage,
			handleError,
		);

		expect(repo.markProcessed).toHaveBeenCalledTimes(1);
		expect(repo.incrementRetry).toHaveBeenCalledWith("2", "boom");
		expect(result).toMatchObject({
			processed: 2,
			successful: 1,
			failed: 1,
			deadLettered: 0,
		});
		expect(result.duration).toBeGreaterThanOrEqual(0);
	});
});
