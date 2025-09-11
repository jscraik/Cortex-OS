/**
 * @fileoverview Tests for stdio transport with structured logging
 * Tests systematic improvements to error handling
 */

import type { Envelope } from "@cortex-os/a2a-contracts/envelope";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stdio } from "../stdio";

// Mock child_process.spawn
vi.mock("node:child_process", () => ({
	spawn: vi.fn(() => ({
		stdout: {
			on: vi.fn(),
		},
		stderr: {
			on: vi.fn(),
		},
		stdin: {
			write: vi.fn(),
			end: vi.fn(),
		},
		on: vi.fn(),
		kill: vi.fn(),
	})),
}));

// Mock the logger
vi.mock("@cortex-os/observability", () => ({
	createLogger: vi.fn(() => ({
		warn: vi.fn(),
		info: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	})),
}));

describe("Stdio Transport", () => {
	let mockSpawn: any;
	let mockLogger: any;

	beforeEach(() => {
		mockSpawn = vi.mocked((await import("node:child_process")).spawn);
		mockLogger = {
			warn: vi.fn(),
			info: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		};

		const { createLogger } = vi.mocked(
			await import("@cortex-os/observability"),
		);
		createLogger.mockReturnValue(mockLogger);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Transport creation", () => {
		it("should create transport with default arguments", () => {
			stdio("test-command");

			expect(mockSpawn).toHaveBeenCalledWith(
				"test-command",
				["stdio"],
				expect.objectContaining({
					stdio: ["pipe", "pipe", "pipe"],
					env: expect.any(Object),
				})
			);
		});

		it("should create transport with custom arguments", () => {
			stdio("custom-command", ["arg1", "arg2"], { ENV_VAR: "value" });

			expect(mockSpawn).toHaveBeenCalledWith(
				"custom-command",
				["arg1", "arg2"],
				expect.objectContaining({
					env: expect.objectContaining({ ENV_VAR: "value" }),
				})
			);
		});
	});

	describe("Message parsing with structured logging", () => {
		it("should handle valid JSON messages", () => {
			const transport = stdio("test-command");
			const mockSubscribe = vi.fn();
			const mockChild = {
				stdout: { on: vi.fn() },
				stderr: { on: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn(),
				kill: vi.fn(),
			};

			mockSpawn.mockReturnValue(mockChild);

			// Simulate data event
			const dataHandler = mockChild.stdout.on.mock.calls.find(
				([event]) => event === "data"
			)?.[1];

			if (dataHandler) {
				// Simulate receiving valid JSON
				dataHandler(Buffer.from('{"type":"test","data":"valid"}\\n'));
			}

			// Should not call logger.warn for valid JSON
			expect(mockLogger.warn).not.toHaveBeenCalled();
		});

		it("should log structured warnings for invalid JSON", () => {
			const transport = stdio("test-command");
			const mockChild = {
				stdout: { on: vi.fn() },
				stderr: { on: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn(),
				kill: vi.fn(),
			};

			mockSpawn.mockReturnValue(mockChild);

			// Get the data handler
			const dataHandler = mockChild.stdout.on.mock.calls.find(
				([event]) => event === "data"
			)?.[1];

			if (dataHandler) {
				// Simulate receiving invalid JSON
				dataHandler(Buffer.from("invalid-json\\n"));
			}

			// Should call structured logging for invalid JSON
			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.objectContaining({
					error: expect.any(String),
					context: "stdio-message-parsing",
				}),
				"Failed to parse JSON message from stdio"
			);
		});

		it("should handle multiple lines with mixed valid/invalid JSON", () => {
			const transport = stdio("test-command");
			const mockChild = {
				stdout: { on: vi.fn() },
				stderr: { on: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn(),
				kill: vi.fn(),
			};

			mockSpawn.mockReturnValue(mockChild);

			const dataHandler = mockChild.stdout.on.mock.calls.find(
				([event]) => event === "data"
			)?.[1];

			if (dataHandler) {
				// Simulate mixed valid/invalid messages
				const mixedData = [
					'{"type":"valid","data":"message1"}',
					"invalid-json-line",
					'{"type":"valid","data":"message2"}',
					"another-invalid-line"
				].join("\\n");

				dataHandler(Buffer.from(mixedData));
			}

			// Should log warnings for both invalid lines
			expect(mockLogger.warn).toHaveBeenCalledTimes(2);
		});

		it("should handle empty lines gracefully", () => {
			const transport = stdio("test-command");
			const mockChild = {
				stdout: { on: vi.fn() },
				stderr: { on: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn(),
				kill: vi.fn(),
			};

			mockSpawn.mockReturnValue(mockChild);

			const dataHandler = mockChild.stdout.on.mock.calls.find(
				([event]) => event === "data"
			)?.[1];

			if (dataHandler) {
				// Simulate empty lines and whitespace
				dataHandler(Buffer.from("\\n\\n  \\n\\t\\n"));
			}

			// Should handle gracefully without logging errors
			expect(mockLogger.warn).not.toHaveBeenCalled();
		});
	});

	describe("Transport lifecycle", () => {
		it("should provide terminate functionality", async () => {
			const transport = stdio("test-command");
			const mockChild = {
				stdout: { on: vi.fn() },
				stderr: { on: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn(),
				kill: vi.fn(),
			};

			mockSpawn.mockReturnValue(mockChild);

			// Should have terminate method
			expect(typeof transport.terminate).toBe("function");

			// Should call kill on child process
			await transport.terminate();
			expect(mockChild.kill).toHaveBeenCalledWith("SIGTERM");
		});

		it("should handle publish operations", () => {
			const transport = stdio("test-command");
			const mockChild = {
				stdout: { on: vi.fn() },
				stderr: { on: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn(),
				kill: vi.fn(),
			};

			mockSpawn.mockReturnValue(mockChild);

			const envelope: Envelope = {
				spec: "A2A/1.0",
				type: "test.message",
				source: "/test/source",
				id: "test-id-123",
				time: new Date().toISOString(),
				data: { message: "test" },
			};

			// Should not throw when publishing
			expect(() => transport.publish(envelope)).not.toThrow();
		});
	});

	describe("Error handling and resilience", () => {
		it("should handle process spawn errors", () => {
			mockSpawn.mockImplementation(() => {
				throw new Error("Spawn failed");
			});

			expect(() => stdio("failing-command")).toThrow("Spawn failed");
		});

		it("should handle unexpected data types", () => {
			const transport = stdio("test-command");
			const mockChild = {
				stdout: { on: vi.fn() },
				stderr: { on: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn(),
				kill: vi.fn(),
			};

			mockSpawn.mockReturnValue(mockChild);

			const dataHandler = mockChild.stdout.on.mock.calls.find(
				([event]) => event === "data"
			)?.[1];

			if (dataHandler) {
				// Simulate non-Buffer data (edge case)
				expect(() => dataHandler("string-data")).not.toThrow();
			}
		});
	});

	describe("Logging integration", () => {
		it("should create logger with correct component name", () => {
			stdio("test-command");

			const { createLogger } = vi.mocked(
				await import("@cortex-os/observability"),
			);
			expect(createLogger).toHaveBeenCalledWith("a2a-stdio-transport");
		});

		it("should include error context in structured logs", () => {
			const transport = stdio("test-command");
			const mockChild = {
				stdout: { on: vi.fn() },
				stderr: { on: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn(),
				kill: vi.fn(),
			};

			mockSpawn.mockReturnValue(mockChild);

			const dataHandler = mockChild.stdout.on.mock.calls.find(
				([event]) => event === "data"
			)?.[1];

			if (dataHandler) {
				dataHandler(Buffer.from("{invalid-json}"));
			}

			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.objectContaining({
					context: "stdio-message-parsing",
					error: expect.stringMatching(/unexpected token/i),
				}),
				expect.any(String)
			);
		});
	});
});
