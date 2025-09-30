#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import cors from 'cors';
import { createMemoryProviderFromEnv, type MemoryProvider } from '@cortex-os/memory-core';
import { TOOL_SPECS, type ToolSpec } from '@cortex-os/tool-spec';
import { pino } from 'pino';
import { randomUUID } from 'node:crypto';

const logger = pino({ level: 'info' });

interface McpServerConfig {
  transport: 'stdio' | 'http';
  port?: number;
  host?: string;
}

class DualMcpServer {
  private server: Server;
  private provider: MemoryProvider;
  private config: McpServerConfig;
  private httpServer?: any;
  private httpTransport?: StreamableHTTPServerTransport;

  constructor(config: McpServerConfig) {
    this.config = config;
    this.provider = createMemoryProviderFromEnv();
    this.server = new Server(
      {
        name: 'cortex-memory',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
    this.setupErrorHandling();
  }

  private setupTools(): void {
    const specs = Object.values(TOOL_SPECS);

    this.server.setRequestHandler('tools/list', async () => ({
      tools: specs.map((spec) => ({
        name: spec.name,
        description: spec.description,
        inputSchema: spec.schema,
      })),
    }));

    this.server.setRequestHandler('tools/call', async (request) => {
      const spec = TOOL_SPECS[request.params.name];
      if (!spec) {
        throw new Error(`Unknown tool: ${request.params.name}`);
      }

      try {
        spec.zodSchema.parse(request.params.arguments);
        const result = await this.handleToolCall(spec.name, request.params.arguments);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Tool call failed', {
          tool: spec.name,
          error: (error as Error).message,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: {
                  code: 'INTERNAL_ERROR',
                  message: (error as Error).message,
                },
              }),
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleToolCall(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'memory.store':
        return await this.provider.store(args);

      case 'memory.search':
        return await this.provider.search(args);

      case 'memory.analysis':
        return await this.provider.analysis(args);

      case 'memory.relationships':
        return await this.provider.relationships(args);

      case 'memory.stats':
        return await this.provider.stats(args);

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => logger.error('MCP Server error', error);
    process.on('SIGINT', async () => {
      logger.info('Shutting down MCP server...');
      await this.stop();
      process.exit(0);
    });
  }

  private setupHttpServer(): void {
    if (this.config.transport === 'http') {
      const app = express();
      app.use(cors());
      app.use(express.json());

      // Health check endpoint
      app.get('/healthz', async (req, res) => {
        try {
          const health = await this.provider.healthCheck();
          res.status(health.healthy ? 200 : 503).json(health);
        } catch (error) {
          res.status(503).json({
            healthy: false,
            error: (error as Error).message,
          });
        }
      });

      // Readiness check
      app.get('/readyz', async (req, res) => {
        const health = await this.provider.healthCheck();
        res.status(health.healthy ? 200 : 503).json(health);
      });

      // MCP HTTP endpoint (streamable)
      app.post('/mcp', async (req, res) => {
        await this.httpTransport!.handleRequest(req, res, req.body);
      });

      app.get('/mcp/stream', async (req, res) => {
        await this.httpTransport!.handleRequest(req, res);
      });

      app.delete('/mcp/session', async (req, res) => {
        await this.httpTransport!.handleRequest(req, res);
      });

      const port = this.config.port || 9600;
      const host = this.config.host || '127.0.0.1';

      this.httpServer = app.listen(port, host, () => {
        logger.info(`MCP HTTP server listening on http://${host}:${port}`);
      });
    }
  }

  async start(): Promise<void> {
    logger.info('Starting MCP server', { transport: this.config.transport });

    if (this.config.transport === 'stdio') {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      logger.info('MCP STDIO server started');
    } else {
      if (this.httpTransport) {
        throw new Error('HTTP transport already initialized');
      }
      this.httpTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });
      await this.server.connect(this.httpTransport);
      this.setupHttpServer();
    }
  }

  async stop(): Promise<void> {
    if (this.httpServer) {
      await new Promise<void>((resolve, reject) => {
        this.httpServer.close((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    await this.httpTransport?.close?.();
    await this.provider.close?.();
    logger.info('MCP server stopped');
  }
}

// Parse command line arguments
function parseArgs(): McpServerConfig {
  const args = process.argv.slice(2);
  const config: McpServerConfig = {
    transport: 'stdio',
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--transport':
        config.transport = args[++i] as 'stdio' | 'http';
        break;
      case '--port':
        config.port = parseInt(args[++i]);
        break;
      case '--host':
        config.host = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
Cortex Memory MCP Server

Usage:
  mcp-server [options]

Options:
  --transport <type>    Transport type: stdio (default) or http
  --port <number>       Port for HTTP transport (default: 9600)
  --host <address>      Host for HTTP transport (default: 127.0.0.1)
  --help, -h           Show this help message

Environment Variables:
  MEMORY_DB_PATH        SQLite database path (default: ./data/unified-memories.db)
  QDRANT_URL           Qdrant URL (optional, enables vector search)
  QDRANT_API_KEY       Qdrant API key (optional)
  QDRANT_COLLECTION    Qdrant collection name (default: local_memory_v1)
  EMBED_DIM            Embedding dimension (default: 384)
  SIMILARITY           Similarity metric: Cosine, Euclidean, Dot (default: Cosine)
  MEMORY_LOG_LEVEL     Log level: silent, error, warn, info, debug (default: info)

Examples:
  # Run with STDIO transport (for Claude Desktop)
  mcp-server --transport stdio

  # Run with HTTP transport
  mcp-server --transport http --port 9600

  # Run with HTTP on all interfaces
  mcp-server --transport http --host 0.0.0.0 --port 9600
        `);
        process.exit(0);
    }
  }

  return config;
}

// Start the server
async function main(): Promise<void> {
  try {
    const config = parseArgs();
    const server = new DualMcpServer(config);
    await server.start();
  } catch (error) {
    logger.error('Failed to start MCP server', { error: (error as Error).message });
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DualMcpServer };
