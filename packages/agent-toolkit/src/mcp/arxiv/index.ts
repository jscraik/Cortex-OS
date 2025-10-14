/**
 * @fileoverview arXiv MCP Tool Integration for LangGraph
 * 
 * Phase D.1: GREEN Implementation - MCP Tool Loading
 * 
 * This module integrates arXiv MCP server as LangGraph tools using
 * simplified HTTP client approach following brAInwav production standards.
 * 
 * @see tasks/arxiv-mcp-tool-integration/tdd-plan.md - Phase D.1
 * @see .cortex/rules/RULES_OF_AI.md - brAInwav production standards
 * @see .cortex/rules/agentic-phase-policy.md - Phase policy compliance
 */

import { randomUUID } from 'node:crypto';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import { ArxivSearchInput, type ArxivSearchInputType } from './schema.js';
import { normalizeArxivResponse } from './normalize.js';
import { withRateLimit, type RateLimitConfig } from './rateLimit.js';

/**
 * arXiv MCP configuration interface
 */
export interface ArxivMcpConfig {
  url: string;
  headers?: Record<string, string>;
  minIntervalMs?: number;
  userAgent: string;
  enabled?: boolean;
  timeout?: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  minIntervalMs: 3000, // 3 seconds per arXiv requirements
  enabled: true,
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  backoffFactor: 2,
} as const;

/**
 * Generate correlation ID for request tracking
 */
const generateCorrelationId = (): string => {
  return `arxiv_${Date.now()}_${randomUUID().substring(0, 8)}`;
};

/**
 * Prepare HTTP request configuration
 * 
 * @param config - MCP configuration
 * @param input - Search parameters
 * @param correlationId - Request correlation ID
 * @returns Request configuration object
 */
const prepareHttpRequest = (
  config: ArxivMcpConfig,
  input: ArxivSearchInputType,
  correlationId: string
) => {
  const requestBody = {
    method: 'tools/call',
    params: {
      name: 'arxiv_search',
      arguments: input,
    },
  };

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': config.userAgent,
    'X-Request-ID': correlationId,
    ...config.headers,
  };

  return { requestBody, headers };
};

/**
 * Execute HTTP request with timeout and error handling
 * 
 * @param config - MCP configuration
 * @param requestBody - Request payload
 * @param headers - Request headers
 * @param correlationId - Request correlation ID
 * @returns Response data
 */
const executeHttpRequest = async (
  config: ArxivMcpConfig,
  requestBody: Record<string, unknown>,
  headers: Record<string, string>,
  correlationId: string
): Promise<unknown> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout || DEFAULT_CONFIG.timeout);

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `brAInwav: arXiv MCP server error ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    
    console.info('[brAInwav] arXiv MCP request completed', {
      brand: 'brAInwav',
      correlationId,
      status: response.status,
      hasData: !!data,
      timestamp: new Date().toISOString(),
    });

    return data;

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `brAInwav: arXiv MCP request timeout after ${config.timeout}ms`
      );
    }
    
    console.error('[brAInwav] arXiv MCP request failed', {
      brand: 'brAInwav',
      correlationId,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
};

/**
 * Make HTTP request to arXiv MCP server
 * 
 * @param config - MCP configuration
 * @param input - Search parameters
 * @returns Raw MCP response
 */
const makeArxivRequest = async (
  config: ArxivMcpConfig,
  input: ArxivSearchInputType
): Promise<unknown> => {
  const correlationId = generateCorrelationId();
  
  console.info('[brAInwav] arXiv MCP request starting', {
    brand: 'brAInwav',
    correlationId,
    url: config.url,
    query: input.query.substring(0, 50) + (input.query.length > 50 ? '...' : ''),
    maxResults: input.maxResults,
    timestamp: new Date().toISOString(),
  });

  const { requestBody, headers } = prepareHttpRequest(config, input, correlationId);
  return executeHttpRequest(config, requestBody, headers, correlationId);
};

/**
 * Handle tool execution logic
 * 
 * @param input - Validated input parameters
 * @param config - MCP configuration
 * @param rateLimitConfig - Rate limiting configuration
 * @returns Tool execution result as JSON string
 */
const handleToolExecution = async (
  input: ArxivSearchInputType,
  config: ArxivMcpConfig,
  rateLimitConfig: RateLimitConfig
): Promise<string> => {
  try {
    // Validate input
    const validationResult = ArxivSearchInput.safeParse(input);
    if (!validationResult.success) {
      throw new Error(
        `brAInwav: Invalid arXiv search input: ${validationResult.error.message}`
      );
    }

    // Execute with rate limiting
    const rawResponse = await withRateLimit(
      'arxiv-mcp-search',
      () => makeArxivRequest(config, validationResult.data),
      rateLimitConfig
    );

    // Normalize response
    const normalizedResponse = normalizeArxivResponse(rawResponse);

    // Return as string for LangGraph compatibility
    return JSON.stringify(normalizedResponse, null, 2);

  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : `brAInwav: arXiv search failed: ${String(error)}`;
    
    console.error('[brAInwav] arXiv tool execution failed', {
      brand: 'brAInwav',
      query: input.query,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });

    // Return error in structured format
    return JSON.stringify({
      items: [],
      source: 'arxiv',
      brand: 'brAInwav',
      error: errorMessage,
    }, null, 2);
  }
};

/**
 * Create arXiv search tool for LangGraph
 * 
 * @param config - MCP configuration
 * @returns LangGraph DynamicStructuredTool
 */
const createArxivSearchTool = (config: ArxivMcpConfig): DynamicStructuredTool => {
  const rateLimitConfig: RateLimitConfig = {
    minIntervalMs: config.minIntervalMs || DEFAULT_CONFIG.minIntervalMs,
    maxRetries: DEFAULT_CONFIG.maxRetries,
    backoffFactor: DEFAULT_CONFIG.backoffFactor,
  };

  return new DynamicStructuredTool({
    name: 'arxiv_search',
    description: 'brAInwav arXiv academic paper search tool. Search for academic papers by query terms, with optional sorting and pagination. Returns structured paper metadata including titles, authors, abstracts, and URLs.',
    schema: ArxivSearchInput,
    func: async (input: ArxivSearchInputType) => 
      handleToolExecution(input, config, rateLimitConfig),
  });
};

/**
 * Load arXiv MCP tools for LangGraph integration
 * 
 * Creates and configures arXiv search tools with proper rate limiting,
 * error handling, and brAInwav branding compliance.
 * 
 * @param config - arXiv MCP configuration
 * @returns Array of LangGraph tools
 */
export const loadArxivMcpTools = async (
  config: ArxivMcpConfig
): Promise<DynamicStructuredTool[]> => {
  // Check if feature is enabled
  if (config.enabled === false) {
    console.info('[brAInwav] arXiv MCP tools disabled by configuration', {
      brand: 'brAInwav',
      timestamp: new Date().toISOString(),
    });
    return [];
  }

  // Validate configuration
  if (!config.url || !config.userAgent) {
    throw new Error(
      'brAInwav: arXiv MCP configuration missing required fields (url, userAgent)'
    );
  }

  try {
    const tools = [createArxivSearchTool(config)];
    
    console.info('[brAInwav] arXiv MCP tools loaded successfully', {
      brand: 'brAInwav',
      toolCount: tools.length,
      url: config.url,
      rateLimitMs: config.minIntervalMs || DEFAULT_CONFIG.minIntervalMs,
      timestamp: new Date().toISOString(),
    });

    return tools;

  } catch (error) {
    console.error('[brAInwav] arXiv MCP tools loading failed', {
      brand: 'brAInwav',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    
    throw error;
  }
};

/**
 * Get default arXiv MCP configuration
 * 
 * @param overrides - Configuration overrides
 * @returns Complete configuration with defaults
 */
export const getDefaultArxivConfig = (
  overrides: Partial<ArxivMcpConfig> = {}
): ArxivMcpConfig => {
  return {
    url: process.env.MCP_ARXIV_URL || 'http://localhost:3001/mcp',
    userAgent: process.env.ARXIV_USER_AGENT || 'brAInwav/agents (+contact@brainwav.ai)',
    minIntervalMs: Number(process.env.ARXIV_RATE_LIMIT_MS) || DEFAULT_CONFIG.minIntervalMs,
    enabled: process.env.FEATURE_ARXIV_MCP !== 'false',
    timeout: DEFAULT_CONFIG.timeout,
    ...overrides,
  };
};