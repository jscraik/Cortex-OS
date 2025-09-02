import { describe, expect, it } from "vitest";
import { createCodeAnalysisAgent } from "../../src/agents/code-analysis-agent.js";
import { createDocumentationAgent } from "../../src/agents/documentation-agent.js";
import { createSecurityAgent } from "../../src/agents/security-agent.js";
import { createTestGenerationAgent } from "../../src/agents/test-generation-agent.js";

const makeProvider = (captures: any[]) => ({
	name: "mock",
	async generate(_prompt: string, options: any) {
		captures.push(options);
		// Return a minimal valid JSON for each agent to parse
		return {
			text: JSON.stringify({
				suggestions: [],
				complexity: { cyclomatic: 1, maintainability: "good" },
				security: { vulnerabilities: [], riskLevel: "low" },
				performance: { bottlenecks: [], memoryUsage: "low" },
				confidence: 0.9,
				analysisTime: 1,
			}),
			usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
			provider: "mock",
		} as any;
	},
});

const bus = {
	publish: async () => {},
	subscribe: () => ({ unsubscribe() {} }),
	unsubscribe: () => {},
} as any;
const mcp = {
	callTool: async () => ({}),
	callToolWithFallback: async () => ({}),
	discoverServers: async () => [],
	isConnected: async () => true,
} as any;

describe("maxTokens cap", () => {
	it("never exceeds 4096 across agents", async () => {
		const caps: any[] = [];
		const provider = makeProvider(caps);

		const code = createCodeAnalysisAgent({
			provider,
			eventBus: bus,
			mcpClient: mcp,
		});
		await code.execute({
			sourceCode: "x".repeat(100000),
			language: "javascript",
			analysisType: "review",
		} as any);

		const test = createTestGenerationAgent({
			provider,
			eventBus: bus,
			mcpClient: mcp,
		});
		await test.execute({
			sourceCode: "x".repeat(100000),
			language: "javascript",
			testType: "unit",
			framework: "vitest",
		} as any);

		const doc = createDocumentationAgent({
			provider,
			eventBus: bus,
			mcpClient: mcp,
		});
		await doc.execute({
			sourceCode: "x".repeat(100000),
			language: "javascript",
			documentationType: "readme",
			outputFormat: "markdown",
		} as any);

		const secProv = {
			...provider,
			async generate() {
				return {
					text: JSON.stringify({
						decision: "allow",
						risk: "low",
						categories: [],
						findings: [],
						labels: {},
						confidence: 0.9,
						processingTime: 1,
					}),
					usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
					provider: "mock",
				} as any;
			},
		} as any;
		const sec = createSecurityAgent({
			provider: secProv,
			eventBus: bus,
			mcpClient: mcp,
		});
		await sec.execute({ content: "hello", phase: "prompt" } as any);

		// Assert all captured options have maxTokens <= 4096
		for (const opt of caps) {
			expect(opt.maxTokens).toBeLessThanOrEqual(4096);
		}
	});
});
