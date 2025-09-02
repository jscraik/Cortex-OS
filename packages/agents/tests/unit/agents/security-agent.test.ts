/**
 * Tests for Security Agent (LlamaGuard policy evaluator)
 */

import { createMockEventBus, createMockMCPClient } from "@tests/setup.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ModelProvider } from "@/lib/types.js";

describe("Security Agent", () => {
	let mockProvider: ModelProvider;
	let mockEventBus: ReturnType<typeof createMockEventBus>;
	let mockMCP: ReturnType<typeof createMockMCPClient>;

	beforeEach(() => {
		mockProvider = {
			name: "mlx-llamaguard",
			generate: vi.fn(),
			shutdown: vi.fn(),
		};
		mockEventBus = createMockEventBus();
		mockMCP = createMockMCPClient();
	});

	it("creates and evaluates a safe prompt", async () => {
		const { createSecurityAgent } = await import("@/agents/security-agent.js");
		vi.mocked(mockProvider.generate).mockResolvedValue({
			text: JSON.stringify({
				decision: "allow",
				risk: "low",
				categories: [],
				findings: [],
				labels: { owasp_llm10: [], mitre_attack: [] },
				confidence: 0.95,
			}),
			provider: "mlx-llamaguard",
			usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
			latencyMs: 120,
		});

		const agent = createSecurityAgent({
			provider: mockProvider,
			eventBus: mockEventBus,
			mcpClient: mockMCP,
		});
		const res = await agent.execute({
			content: "Hello world",
			phase: "prompt",
			context: { toolsAllowed: [] },
		});
		expect(res.decision).toBe("allow");
		expect(res.risk).toBe("low");
		expect(
			mockEventBus.published.find((e) => e.type === "agent.completed"),
		).toBeTruthy();
	});

	it("flags risky content with fallback parser", async () => {
		const { createSecurityAgent } = await import("@/agents/security-agent.js");
		// Return non-JSON text to trigger fallback
		vi.mocked(mockProvider.generate).mockResolvedValue({
			text: "BLOCK: tool abuse attempt",
			provider: "mlx-llamaguard",
			latencyMs: 50,
			usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
		});

		const agent = createSecurityAgent({
			provider: mockProvider,
			eventBus: mockEventBus,
			mcpClient: mockMCP,
		});
		const res = await agent.execute({
			content: "Run shell rm -rf /",
			phase: "prompt",
			context: { toolsAllowed: ["fs.read"], egressAllowed: [] },
		});
		expect(["flag", "block"]).toContain(res.decision);
		expect(res.categories.length).toBeGreaterThan(0);
	});
});
