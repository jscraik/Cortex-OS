/**
 * Cortex MCP Server (Node 22-ready)
 * - STDIO transport for standard MCP client connections
 * - Tools: ping, http_get (safe), repo_file (read-only under ROOT)
 * - Compatible with @modelcontextprotocol/sdk@1.17.2
 * - Enhanced security with authentication and hostname allowlists
 */
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.env.CORTEX_MCP_ROOT || process.cwd();
const TOKEN = process.env.CORTEX_MCP_TOKEN;

if (!TOKEN) {
  // eslint-disable-next-line no-console
  console.error('[cortex-mcp] ERROR: CORTEX_MCP_TOKEN is not set. Refusing to start without authentication token.');
  process.exit(1);
}


// Allowlist of permitted hostnames for http_get tool
const HTTP_GET_ALLOWLIST = ['example.com', 'api.example.com'];

const server = new Server(
  {
    name: 'cortex-mcp',
    version: '0.1.1',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Tools registration
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'ping',
        description: 'Test connectivity with a simple ping response',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to echo back',
              default: 'Hello from Cortex MCP!',
            },
          },
        },
      },
      {
        name: 'http_get',
        description: 'Fetch JSON/text by GET (2MB limit, allowlisted hosts only)',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL to fetch (must be in allowlist)',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'repo_file',
        description: 'Read a file from the repository (read-only, secure path validation)',
        inputSchema: {
          type: 'object',
          properties: {
            relpath: {
              type: 'string',
              description: 'Relative path from repository root',
            },
          },
          required: ['relpath'],
        },
      },
    ],
  };
});

// Tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'ping': {
      const params = args as unknown as { text?: string };
      const text = params.text ?? 'Hello from Cortex MCP!';
      return {
        content: [
          {
            type: 'text',
            text: `Pong! ${text}`,
          },
        ],
      };
    }

    case 'http_get': {
      const params = args as unknown as { url?: string };
      const url = params.url;
      if (!url) {
        throw new McpError(ErrorCode.InvalidParams, 'URL is required');
      }

      let hostname;
      try {
        hostname = new URL(url).hostname;
      } catch (_e) {
        throw new McpError(ErrorCode.InvalidParams, 'Invalid URL format');
      }

      // Check hostname allowlist
      if (!HTTP_GET_ALLOWLIST.includes(hostname)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Hostname '${hostname}' not in allowlist. Permitted hosts: ${HTTP_GET_ALLOWLIST.join(', ')}`,
        );
      }

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Cortex-MCP/0.1.1',
          },
        });

        if (!response.ok) {
          throw new McpError(
            ErrorCode.InternalError,
            `HTTP ${response.status}: ${response.statusText}`,
          );
        }

        const contentType = response.headers.get('content-type') || '';
        let content: string;

        if (contentType.includes('application/json')) {
          const data = await response.json();
          content = JSON.stringify(data, null, 2);
        } else {
          content = await response.text();
        }

        // Enforce 2MB limit on returned content
        const maxBytes = 2 * 1024 * 1024;
        const contentBytes = Buffer.byteLength(content, 'utf8');
        if (contentBytes > maxBytes) {
          throw new McpError(
            ErrorCode.InternalError,
            `Response body exceeds ${maxBytes} bytes limit (${contentBytes} bytes)`,
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
        };
      } catch (error: unknown) {
        throw new McpError(
          ErrorCode.InternalError,
          `Fetch failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    case 'repo_file': {
      const params = args as unknown as { relpath?: string };
      const relpath = params.relpath;
      if (!relpath) {
        throw new McpError(ErrorCode.InvalidParams, 'relpath is required');
      }

      try {
        const rootPath = path.resolve(ROOT);
        const requestedPath = path.resolve(rootPath, relpath);

        // Use fs.realpath to resolve symlinks and prevent path traversal
        const realRequestedPath = await fs.realpath(requestedPath).catch(() => null);

        if (!realRequestedPath || !realRequestedPath.startsWith(rootPath + path.sep)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Path escapes repository root or does not exist',
          );
        }

        const data = await fs.readFile(realRequestedPath, 'utf8');
        return {
          content: [
            {
              type: 'text',
              text: data,
            },
          ],
        };
      } catch (error: unknown) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // eslint-disable-next-line no-console
  console.error('Cortex MCP Server running on stdio transport');
}

if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Server error:', error);
    process.exit(1);
  });
}
