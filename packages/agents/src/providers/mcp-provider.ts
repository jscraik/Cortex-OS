/**
 * MCP (Model Context Protocol) Provider Implementation
 *
 * Provides model access through MCP servers with automatic discovery
 */

import { redactSecrets } from "../lib/secret-store.js";
import type {
	GenerateOptions,
	GenerateResult,
	MCPClient,
	ModelProvider,
} from "../lib/types.js";
import { estimateTokens, retry, withTimeout } from "../lib/utils.js";

export interface MCPProviderConfig {
	mcpClient: MCPClient;
	modelName: string;
	defaultOptions?: GenerateOptions;
	timeout?: number;
	retries?: number;
}

const DEFAULT_OPTIONS: GenerateOptions = {
	temperature: 0.7,
	maxTokens: 2048,
};

type MCPTextGenResult = {
	text: string;
	usage?: {
		promptTokens?: number;
		completionTokens?: number;
		totalTokens?: number;
	};
};

const generateViaMCP = async (
	prompt: string,
	options: GenerateOptions,
	config: MCPProviderConfig,
): Promise<GenerateResult> => {
	const startTime = Date.now();
	const mergedOptions = {
		...DEFAULT_OPTIONS,
		...config.defaultOptions,
		...options,
	};

	try {
		const call = async () =>
			(await config.mcpClient.callTool("text-generation", {
				model: config.modelName,
				prompt,
				...mergedOptions,
			})) as MCPTextGenResult;
		const result = await retry(call, config.retries ?? 2, 300);

		const endTime = Date.now();

		if (!result || typeof (result as any).text !== "string") {
			throw new Error("Invalid response from MCP server");
		}

		const tokenUsage = {
			promptTokens: result.usage?.promptTokens ?? estimateTokens(prompt),
			completionTokens:
				result.usage?.completionTokens ?? estimateTokens(result.text),
			totalTokens:
				result.usage?.totalTokens ?? estimateTokens(prompt + result.text),
		};
		return {
			content: result.text,
			tokenUsage,
			metadata: {
				latencyMs: endTime - startTime,
				provider: `mcp:${config.modelName}`,
			},
		};
	} catch (error) {
		const anyErr: any = error;
		const status = anyErr?.status || anyErr?.response?.status;
		const title = anyErr?.title || anyErr?.response?.statusText || "mcp_error";
		const detail = anyErr?.detail || anyErr?.message || "";
		const errorMessage = `${title} ${detail}`;
		const err = new Error(
			`MCP generation failed: ${redactSecrets(errorMessage)}`,
		);
		(err as any).code = anyErr?.type || (status ? String(status) : "mcp_error");
		(err as any).status = status;
		throw err;
	}
};

export const createMCPProvider = (
	config: MCPProviderConfig,
): ModelProvider => ({
	name: `mcp:${config.modelName}`,
	generate: (prompt: string, options: GenerateOptions = {}) =>
		withTimeout(
			generateViaMCP(prompt, options, config),
			config.timeout || 30000,
		),
	isAvailable: () => Promise.resolve(true),
	shutdown: () => Promise.resolve(),
});

export const createMCPProviders = async (
	mcpClient: MCPClient,
): Promise<ModelProvider[]> => {
	try {
		const tools = (await mcpClient.listTools?.()) || [];
		const textGenTools = tools.filter(
			(tool: any) =>
				tool.name === "text-generation" &&
				tool.schema?.properties?.model,
		);

		if (textGenTools.length === 0) {
			return [];
		}

		const modelOptions = textGenTools[0].schema?.properties?.model
			?.enum || ["default"];

		return modelOptions.map((model: string) =>
			createMCPProvider({
				mcpClient,
				modelName: model,
				timeout: 30000,
			}),
		);
	} catch (error) {
		console.warn("Failed to discover MCP models:", error);
		return [];
	}
};

export const discoverMCPProviders = async (
	mcpClients: MCPClient[],
): Promise<ModelProvider[]> => {
	const allProviders = await Promise.allSettled(
		mcpClients.map((client) => createMCPProviders(client)),
	);

	return allProviders
		.filter(
			(result): result is PromiseFulfilledResult<ModelProvider[]> =>
				result.status === "fulfilled",
		)
		.flatMap((result) => result.value);
};
