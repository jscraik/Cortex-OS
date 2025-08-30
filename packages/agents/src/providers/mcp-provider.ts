/**
 * MCP (Model Context Protocol) Provider Implementation
 *
 * Provides model access through MCP servers with automatic discovery
 */

import type { ModelProvider, GenerateOptions, GenerateResult, MCPClient } from '../lib/types.js';
import { withTimeout, estimateTokens, retry } from '../lib/utils.js';
import { redactSecrets } from '../lib/secret-store.js';

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

type MCPTextGenResult = { text: string; usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number } };

const generateViaMCP = async (
  prompt: string,
  options: GenerateOptions,
  config: MCPProviderConfig,
): Promise<GenerateResult> => {
  const startTime = Date.now();
  const mergedOptions = { ...DEFAULT_OPTIONS, ...config.defaultOptions, ...options };

  try {
    const call = async () =>
      (await config.mcpClient.callTool('text-generation', 'generate', {
        model: config.modelName,
        prompt,
        ...mergedOptions,
      })) as MCPTextGenResult;
    const result = await retry(call, config.retries ?? 2, 300, 2000);

    const endTime = Date.now();

    if (!result || typeof (result as any).text !== 'string') {
      throw new Error('Invalid response from MCP server');
    }

    return {
      text: result.text,
      usage: result.usage || {
        promptTokens: estimateTokens(prompt),
        completionTokens: estimateTokens(result.text),
        totalTokens: estimateTokens(prompt + result.text),
      },
      latencyMs: endTime - startTime,
      provider: `mcp:${config.modelName}`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`MCP generation failed: ${redactSecrets(msg)}`);
  }
};

export const createMCPProvider = (config: MCPProviderConfig): ModelProvider => ({
  name: `mcp:${config.modelName}`,
  generate: (prompt: string, options: GenerateOptions = {}) =>
    withTimeout(
      generateViaMCP(prompt, options, config),
      config.timeout || 30000,
      `MCP generation timed out after ${config.timeout || 30000}ms`,
    ),
  shutdown: () => Promise.resolve(),
});

export const createMCPProviders = async (mcpClient: MCPClient): Promise<ModelProvider[]> => {
  try {
    const tools = (await mcpClient.listTools?.()) || [];
    const textGenTools = tools.filter(
      (tool) => tool.name === 'text-generation' && (tool as any).schema?.properties?.model,
    );

    if (textGenTools.length === 0) {
      return [];
    }

    const modelOptions = (textGenTools[0] as any).schema?.properties?.model?.enum || ['default'];

    return modelOptions.map((model) =>
      createMCPProvider({
        mcpClient,
        modelName: model,
        timeout: 30000,
      }),
    );
  } catch (error) {
    console.warn('Failed to discover MCP models:', error);
    return [];
  }
};

export const discoverMCPProviders = async (mcpClients: MCPClient[]): Promise<ModelProvider[]> => {
  const allProviders = await Promise.allSettled(
    mcpClients.map((client) => createMCPProviders(client)),
  );

  return allProviders
    .filter(
      (result): result is PromiseFulfilledResult<ModelProvider[]> => result.status === 'fulfilled',
    )
    .flatMap((result) => result.value);
};
