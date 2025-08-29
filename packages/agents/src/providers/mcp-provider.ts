/**
 * MCP (Model Context Protocol) Provider Implementation
 *
 * Provides model access through MCP servers with automatic discovery
 */

import type { ModelProvider, GenerateOptions, GenerateResult, MCPClient } from '../lib/types.js';
import { withTimeout, estimateTokens } from '../lib/utils.js';

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

const generateViaMCP = async (
  prompt: string,
  options: GenerateOptions,
  config: MCPProviderConfig,
): Promise<GenerateResult> => {
  const startTime = Date.now();
  const mergedOptions = { ...DEFAULT_OPTIONS, ...config.defaultOptions, ...options };

  try {
    const result = await config.mcpClient.callTool('text-generation', 'generate', {
      model: config.modelName,
      prompt,
      ...mergedOptions,
    });

    const endTime = Date.now();

    if (!result || typeof result.text !== 'string') {
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
    throw new Error(
      `MCP generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
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
    const tools = await mcpClient.listTools();
    const textGenTools = tools.filter(
      (tool) => tool.name === 'text-generation' && tool.schema?.properties?.model,
    );

    if (textGenTools.length === 0) {
      return [];
    }

    const modelOptions = textGenTools[0].schema?.properties?.model?.enum || ['default'];

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
