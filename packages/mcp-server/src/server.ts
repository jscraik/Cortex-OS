import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
// no additional node imports

const ROOT = process.env.CORTEX_MCP_ROOT || process.cwd();
const TOKEN = process.env.CORTEX_MCP_TOKEN;

if (!TOKEN) {
  // eslint-disable-next-line no-console
  console.error(
    '[cortex-mcp] ERROR: CORTEX_MCP_TOKEN is not set. Refusing to start without authentication token.',
  );
  process.exit(1);
}

// Allowlist of permitted hostnames for http_get tool
const HTTP_GET_ALLOWLIST = ['example.com', 'api.example.com'];

const PingToolInputSchema = z.object({
  text: z.string().default('Hello from Cortex MCP!'),
});

const HttpGetToolInputSchema = z.object({
  url: z.string().url(),
});

const RepoFileToolInputSchema = z.object({
  relpath: z.string(),
});

const tools = [
  {
    name: 'ping',
    description: 'Test connectivity with a simple ping response',
    inputSchema: PingToolInputSchema,
    run: async (args: z.infer<typeof PingToolInputSchema>) => {
      return {
        content: [
          {
            type: 'text',
            text: `Pong! ${args.text}`,
          },
        ],
      };
    },
  },
  {
    name: 'http_get',
    description: 'Fetch JSON/text by GET (2MB limit, allowlisted hosts only)',
    inputSchema: HttpGetToolInputSchema,
    run: async (args: z.infer<typeof HttpGetToolInputSchema>) => {
      const url = new URL(args.url);

      if (!HTTP_GET_ALLOWLIST.includes(url.hostname)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Hostname '${url.hostname}' not in allowlist. Permitted hosts: ${HTTP_GET_ALLOWLIST.join(', ')}`,
        );
      }

      const response = await fetch(url.toString(), {
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
      if (Buffer.byteLength(content, 'utf8') > maxBytes) {
        throw new McpError(
          ErrorCode.InternalError,
          `Response body exceeds ${maxBytes} bytes limit`,
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
    },
  },
  {
    name: 'repo_file',
    description: 'Read a file from the repository (read-only, secure path validation)',
    inputSchema: RepoFileToolInputSchema,
    run: async (args: z.infer<typeof RepoFileToolInputSchema>) => {
      const rootPath = path.resolve(ROOT);
      const requestedPath = path.join(rootPath, args.relpath);

      // Normalize paths to prevent traversal attacks
      const normalizedRoot = path.normalize(rootPath);
      const normalizedPath = path.normalize(requestedPath);


      if (!normalizedPath.startsWith(normalizedRoot)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Path escapes repository root',
        );
      }

      // Check for existence before reading
      try {
        await fs.access(normalizedPath);
      } catch {
        throw new McpError(ErrorCode.InvalidParams, 'File not found');
      }


      const data = await fs.readFile(normalizedPath, 'utf8');
      return {
        content: [
          {
            type: 'text',
            text: data,
          },
        ],
      };
    },
  },
];

export const app = express();
app.use(express.json());

export const mcpServer = new Server({ name: 'cortex-mcp', version: '0.1.1' });
// Register minimal capabilities (tools only)
mcpServer.registerCapabilities({ tools: {} });

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  // Provide JSON Schema directly instead of relying on zod.openapi
  const schemas: Record<string, unknown> = {
    ping: {
      type: 'object',
      properties: {
        text: { type: 'string', default: 'Hello from Cortex MCP!' },
      },
      additionalProperties: false,
    },
    http_get: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri' },
      },
      required: ['url'],
      additionalProperties: false,
    },
    repo_file: {
      type: 'object',
      properties: {
        relpath: { type: 'string' },
      },
      required: ['relpath'],
      additionalProperties: false,
    },
  };
  return {
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: schemas[tool.name] ?? { type: 'object' },
    })),
  };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }

  try {
    const validatedArgs = tool.inputSchema.parse(args);
    return await tool.run(validatedArgs);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const details = error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      const msg = `Invalid parameters for tool '${name}': ${details}`;
      throw new McpError(ErrorCode.InvalidParams, msg);
    }
    if (error instanceof McpError) {
      throw error;
    }
    const msg = `Failed to execute tool '${name}': ${toErrorMessage(error)}`;
    throw new McpError(ErrorCode.InternalError, msg);
  }
});

app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;

if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  const { SSEServerTransport } = await import('@modelcontextprotocol/sdk/server/sse.js');

  // Establish SSE endpoint and POST receiver using SDK transport
  app.get('/sse', async (_req, res) => {
    try {
      const transport = new SSEServerTransport('/message', res);
      await mcpServer.connect(transport);
      await transport.start();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to start SSE:', toErrorMessage(e));
      res.status(500).json({ error: 'Failed to start SSE' });
    }
  });

  app.post('/message', express.json({ limit: '2mb' }), async (req, res) => {
    try {
      // Proxy posted JSON-RPC messages to the SSE transport session
      const { SSEServerTransport } = await import('@modelcontextprotocol/sdk/server/sse.js');
      // In a fuller implementation, you'd route by sessionId. For now, accept single session.
      const transport = (mcpServer as unknown as { transport?: InstanceType<typeof SSEServerTransport> }).transport;
      if (!transport) {
        res.status(400).json({ error: 'No active SSE session' });
        return;
      }
      await transport.handlePostMessage(req as unknown as Parameters<typeof transport.handlePostMessage>[0], res as unknown as Parameters<typeof transport.handlePostMessage>[1], req.body);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to handle message:', toErrorMessage(e));
      res.status(500).json({ error: 'Failed to handle message' });
    }
  });

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Cortex MCP Server running on http://localhost:${PORT}`);
  });
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return '[unknown error]';
  }
}
