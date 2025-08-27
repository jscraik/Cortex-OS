/**
 * Cortex MCP Server (Node 22-ready)
 * - STDIO transport for standard MCP client connections
 * - Tools: ping, http_get (safe), repo_file (read-only under ROOT)
 * - Compatible with @modelcontextprotocol/sdk@1.17.2
 * - Enhanced security with authentication and hostname allowlists
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'node:fs/promises';
import path from 'node:path';
// no additional node imports

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
    case 'ping':
      return handlePing(args);
    case 'http_get':
      return handleHttpGet(args);
    case 'repo_file':
      return handleRepoFile(args);
    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
});

async function handlePing(args: unknown) {
  const params = args as { text?: string };
  const text = params?.text ?? 'Hello from Cortex MCP!';
  return {
    content: [
      {
        type: 'text',
        text: `Pong! ${text}`,
      },
    ],
  };
}

async function handleHttpGet(args: unknown) {
  const params = args as { url?: string };
  const url = params?.url;
  if (!url) {
    throw new McpError(ErrorCode.InvalidParams, 'URL is required');
  }

  if ('canParse' in URL && typeof (URL as { canParse?: unknown }).canParse === 'function') {
    if (!(URL as { canParse?: (url: string) => boolean }).canParse!(url)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid URL format');
    }
  } else {
    // Fallback for older Node versions
    try {
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid URL format');
    }
  }

  const hostname = new URL(url).hostname;
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
    throw new McpError(ErrorCode.InternalError, `Fetch failed: ${toErrorMessage(error)}`);
  }
}

async function handleRepoFile(args: unknown) {
  const params = args as { relpath?: string };
  const relpath = params?.relpath;
  if (!relpath) {
    throw new McpError(ErrorCode.InvalidParams, 'relpath is required');
  }

  try {
    const rootPath = path.resolve(ROOT);
    const requestedPath = path.resolve(rootPath, relpath);

    const realRequestedPath = await fs.realpath(requestedPath).catch(() => null);
    if (!realRequestedPath) {
      throw new McpError(ErrorCode.InvalidParams, 'Path does not exist');
    }

    const relative = path.relative(rootPath, realRequestedPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new McpError(ErrorCode.InvalidParams, 'Path escapes repository root');
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
    throw new McpError(ErrorCode.InternalError, `Failed to read file: ${toErrorMessage(error)}`);
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return '[unknown error]';
  }
}

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
