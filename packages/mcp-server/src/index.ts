#!/usr/bin/env node

import { createMemoryProviderFromEnv } from '@cortex-os/memory-core';
import {
  MemoryAnalysisInputSchema,
  MemoryRelationshipsInputSchema,
  MemorySearchInputSchema,
  MemoryStatsInputSchema,
  MemoryStoreInputSchema,
} from '@cortex-os/tool-spec';
import { FastMCP } from 'fastmcp';
import { pino } from 'pino';

const logger = pino({ level: process.env.MEMORY_LOG_LEVEL || 'info' });

// Initialize memory provider
const memoryProvider = createMemoryProviderFromEnv();

// Create the FastMCP server with authentication
const server = new FastMCP({
  name: 'brainwav-cortex-memory',
  version: '3.0.0',
  authenticate: async (req) => {
    const apiKey = process.env.MCP_API_KEY;
    if (apiKey) {
      const providedKey = Array.isArray(req.headers?.['x-api-key'])
        ? req.headers['x-api-key'][0]
        : req.headers?.['x-api-key'];

      if (providedKey !== apiKey) {
        throw new Error('Invalid API key');
      }
    }
    return { user: req.headers?.['x-user-id'] || 'anonymous' };
  },
  ping: {
    enabled: true,
    intervalMs: 20000,
    logLevel: 'debug',
  },
});

// Add memory.store tool
server.addTool({
  name: 'memory.store',
  description: 'Store a memory with metadata and optional embedding',
  parameters: MemoryStoreInputSchema,
  annotations: {
    idempotentHint: false,
    title: 'brAInwav Memory Storage',
  },
  async execute(args, { reportProgress }) {
    try {
      await reportProgress({ progress: 0, total: 2 });
      logger.info('Storing memory');

      const result = await memoryProvider.store(args);

      await reportProgress({ progress: 2, total: 2 });
      return JSON.stringify(result, null, 2);
    } catch (error) {
      logger.error('Failed to store memory');
      throw error;
    }
  },
});

// Add memory.search tool
server.addTool({
  name: 'memory.search',
  description: 'Search memories using semantic or keyword search',
  parameters: MemorySearchInputSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    title: 'brAInwav Memory Search',
  },
  async execute(args, { reportProgress }) {
    try {
      await reportProgress({ progress: 0, total: 2 });
      logger.info('Searching memories');

      const result = await memoryProvider.search(args);

      await reportProgress({ progress: 2, total: 2 });
      return JSON.stringify(result, null, 2);
    } catch (error) {
      logger.error('Failed to search memories');
      throw error;
    }
  },
});

// Add memory.analysis tool with streaming
server.addTool({
  name: 'memory.analysis',
  description: 'Analyze memories with AI-powered insights (streaming)',
  parameters: MemoryAnalysisInputSchema,
  annotations: {
    streamingHint: true,
    readOnlyHint: true,
    title: 'brAInwav Memory Analysis',
  },
  async execute(args, { streamContent, reportProgress }) {
    try {
      await streamContent({ type: 'text', text: 'Starting analysis...\n' });
      await reportProgress({ progress: 0, total: 3 });

      logger.info('Analyzing memories');

      await streamContent({ type: 'text', text: 'Processing memories...\n' });
      await reportProgress({ progress: 1, total: 3 });

      const result = await memoryProvider.analysis(args);

      await streamContent({ type: 'text', text: 'Analysis complete!\n' });
      await reportProgress({ progress: 3, total: 3 });

      return JSON.stringify(result, null, 2);
    } catch (error) {
      logger.error('Failed to analyze memories');
      throw error;
    }
  },
});

// Add memory.relationships tool
server.addTool({
  name: 'memory.relationships',
  description: 'Manage and query relationships between memories',
  parameters: MemoryRelationshipsInputSchema,
  annotations: {
    destructiveHint: true,
    idempotentHint: false,
    title: 'brAInwav Memory Relationships',
  },
  async execute(args, { reportProgress }) {
    try {
      await reportProgress({ progress: 0, total: 2 });
      logger.info('Managing relationships');

      const result = await memoryProvider.relationships(args);

      await reportProgress({ progress: 2, total: 2 });
      return JSON.stringify(result, null, 2);
    } catch (error) {
      logger.error('Failed to manage relationships');
      throw error;
    }
  },
});

// Add memory.stats tool
server.addTool({
  name: 'memory.stats',
  description: 'Get statistics and metrics about stored memories',
  parameters: MemoryStatsInputSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    title: 'brAInwav Memory Statistics',
  },
  async execute(args, { reportProgress }) {
    try {
      await reportProgress({ progress: 0, total: 2 });
      logger.info('Fetching statistics');

      const result = await memoryProvider.stats(args);

      await reportProgress({ progress: 2, total: 2 });
      return JSON.stringify(result, null, 2);
    } catch (error) {
      logger.error('Failed to fetch statistics');
      throw error;
    }
  },
});

// Add resource for recent memories
server.addResource({
  uri: 'memory://recent',
  name: 'Recent Memories',
  mimeType: 'application/json',
  description: 'List of recently stored memories',
  async load() {
    const result = await memoryProvider.search({
      query: '*',
      search_type: 'hybrid',
      limit: 10,
      offset: 0,
      session_filter_mode: 'all',
      score_threshold: 0,
      hybrid_weight: 0.5,
    });
    return {
      uri: 'memory://recent',
      mimeType: 'application/json',
      text: JSON.stringify(result, null, 2),
    };
  },
});

// Add prompt template for memory analysis
server.addPrompt({
  name: 'analyze_domain',
  description: 'Generate analysis prompt for a specific domain',
  arguments: [
    {
      name: 'domain',
      description: 'Domain to analyze',
      required: true,
    },
    {
      name: 'depth',
      description: 'Analysis depth',
      required: false,
      enum: ['shallow', 'medium', 'deep'],
    },
  ],
  async load(args) {
    const depth = args.depth || 'medium';
    return `Analyze all memories in domain "${args.domain}" with ${depth} analysis depth. Provide insights, patterns, and recommendations.`;
  },
});

// Server lifecycle events
server.on('connect', (_event) => {
  logger.info('brAInwav MCP client connected');
});

server.on('disconnect', (_event) => {
  logger.info('brAInwav MCP client disconnected');
});

// Main entry point
async function main(): Promise<void> {
  const transport =
    process.env.MCP_TRANSPORT || process.argv.includes('--transport')
      ? process.argv[process.argv.indexOf('--transport') + 1]
      : 'httpStream';

  const portArg = process.argv.indexOf('--port');
  const port = portArg >= 0 ? Number(process.argv[portArg + 1]) : Number(process.env.PORT || 3024);

  if (transport === 'stdio') {
    server.start({
      transportType: 'stdio',
    });
    logger.info('brAInwav FastMCP v3 server started with STDIO transport');
  } else {
    server.start({
      transportType: 'httpStream',
      httpStream: {
        port,
        endpoint: '/sse',  // Changed from /mcp to /sse for ChatGPT compatibility
      },
    });
    logger.info(`brAInwav FastMCP v3 server started with HTTP/SSE transport on port ${port} at /sse`);
  }

  // Graceful shutdown handlers
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT - Shutting down brAInwav MCP server...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM - Shutting down brAInwav MCP server...');
    await server.stop();
    process.exit(0);
  });

  logger.info('brAInwav FastMCP v3 server is running');

  // Keep process alive - wait forever until signal received
  await new Promise(() => { }); // Never resolves
}

main().catch((err) => {
  logger.error('Failed to start brAInwav MCP server');
  console.error(err);
  process.exit(1);
});

// Catch unhandled errors
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled rejection');
});
