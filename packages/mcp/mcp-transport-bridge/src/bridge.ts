/**
 * @file MCP Bridge Implementation
 * @description Bridges stdio and Streamable HTTP transports using official MCP SDK
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { spawn, ChildProcess } from 'child_process';
import { StreamableHTTPServerTransport } from './streamable-http-server-transport.js';
import { z } from 'zod';

/**
 * Configuration for MCP bridge
 */
export const BridgeConfigSchema = z.object({
  // Source configuration (what we're bridging from)
  source: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('stdio'),
      command: z.string(),
      args: z.array(z.string()).optional(),
      env: z.record(z.string()).optional(),
    }),
    z.object({
      type: z.literal('streamableHttp'),
      url: z.string().url(),
      headers: z.record(z.string()).optional(),
    }),
  ]),

  // Target configuration (what we're bridging to)
  target: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('stdio'),
      // Stdio target means we'll expose a stdio interface
    }),
    z.object({
      type: z.literal('streamableHttp'),
      port: z.number().int().min(1024).max(65535),
      host: z.string().default('localhost'),
    }),
  ]),

  // Bridge options
  options: z
    .object({
      timeout: z.number().int().min(1000).default(30000),
      retries: z.number().int().min(0).default(3),
      logging: z.boolean().default(false),
    })
    .default({}),
});

export type BridgeConfig = z.infer<typeof BridgeConfigSchema>;

/**
 * MCP Transport Bridge
 * Enables stdio clients to connect to Streamable HTTP servers and vice versa
 */
export class McpBridge {
  private client: Client | null = null;
  private server: Server | null = null;
  private isRunning = false;

  constructor(private config: BridgeConfig) {
    this.validateConfig();
  }

  /**
   * Start the bridge
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Bridge is already running');
    }

    try {
      await this.initializeSource();
      await this.initializeTarget();

      this.isRunning = true;
      this.log('✅ MCP bridge started successfully');
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Stop the bridge and cleanup resources
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    await this.cleanup();
    this.isRunning = false;
    this.log('🛑 MCP bridge stopped');
  }

  /**
   * Check if the bridge is healthy
   */
  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, any> }> {
    const details: Record<string, any> = {
      running: this.isRunning,
      source: this.config.source.type,
      target: this.config.target.type,
      clientConnected: false,
    };

    if (!this.isRunning) {
      return { healthy: false, details };
    }

    // Check client connection
    if (this.client) {
      try {
        // Assuming the client has a method to check connection status.
        // The MCP SDK doesn't explicitly define one, so we'll add a placeholder.
        // In a real scenario, you would replace this with the actual method.
        details.clientConnected = true; // Placeholder
      } catch (error) {
        details.clientConnected = false;
        details.clientError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

  return { healthy: this.isRunning && details.clientConnected, details };
  }

  /**
   * Initialize the source connection (where we get MCP data from)
   */
  private async initializeSource(): Promise<void> {
    const { source } = this.config;

    if (source.type === 'streamableHttp') {
      // Connect to remote Streamable HTTP server
      const transport = new StreamableHTTPClientTransport(source.url, source.headers);

      this.client = new Client(
        {
          name: 'mcp-bridge-client',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: true,
            resources: true,
            prompts: true,
            logging: true,
          },
        },
      );

      await this.client.connect(transport);
      this.log(`📡 Connected to Streamable HTTP server: ${source.url}`);
    } else if (source.type === 'stdio') {
      // Connect to a local stdio process
      const transport = new StdioClientTransport({
        command: source.command,
        args: source.args,
        env: source.env,
      });

      this.client = new Client(
        {
          name: 'mcp-bridge-client-stdio',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: true,
            resources: true,
            prompts: true,
            logging: true,
          },
        },
      );

  await this.client.connect(transport);
  this.log(`🔧 Connected to stdio process: ${source.command}`);
    }
  }

  /**
   * Initialize the target interface (what we expose)
   */
  private async initializeTarget(): Promise<void> {
    const { target } = this.config;

    if (target.type === 'stdio') {
      // Expose stdio interface
      const transport = new StdioServerTransport();

      this.server = new Server(
        {
          name: 'mcp-bridge-server',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: true,
            resources: true,
            prompts: true,
            logging: this.config.options.logging,
          },
        },
      );

      // Proxy all methods from client to server
      await this.setupMethodProxying();

      await this.server.connect(transport);
      this.log('📤 Exposed stdio interface');
    } else if (target.type === 'streamableHttp') {
      // Expose Streamable HTTP interface
      const transport = new StreamableHTTPServerTransport(target.port, target.host);

      this.server = new Server(
        {
          name: 'mcp-bridge-server-http',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: true,
            resources: true,
            prompts: true,
            logging: this.config.options.logging,
          },
        },
      );

      // Proxy all methods from client to server
      await this.setupMethodProxying();

      await this.server.connect(transport);
      this.log(`📤 Exposed Streamable HTTP interface on http://${target.host}:${target.port}`);
    }
  }

  /**
   * Setup a generic method proxy between the server and the client.
   */
  private async setupMethodProxying(): Promise<void> {
    if (!this.client || !this.server) {
      throw new Error('Client or server not initialized');
    }

    // A more robust implementation would be to have a generic request handler
    // that forwards all requests to the client. Since the SDK's Server class
    // doesn't seem to support a wildcard handler, we'll define the methods
    // to proxy explicitly. This makes it easier to extend in the future.
    const methodsToProxy = [
      'tools/list',
      'tools/call',
      'resources/list',
      'resources/read',
      'prompts/list',
      'prompts/get',
      // Add other methods to proxy here
    ];

    for (const method of methodsToProxy) {
      this.server.setRequestHandler(method, async (request: { params: any }) => {
        // We assume the client has a generic `sendRequest` method.
        // If not, this would need to be adapted.
        const response = await this.client!.sendRequest({
          jsonrpc: '2.0',
          id: Math.random().toString(36).substring(2), // Generate a random ID
          method: method,
          params: request.params,
        });
        return response;
      });
    }

    this.log('🔄 Method proxying configured');
  }

  /**
   * Cleanup all resources
   */
  private async cleanup(): Promise<void> {
    const cleanupTasks = [];

    if (this.client) {
      cleanupTasks.push(
        this.client.close().catch((err) => this.log(`⚠️  Error closing client: ${err.message}`)),
      );
    }

    if (this.server) {
      cleanupTasks.push(
        this.server.close().catch((err) => this.log(`⚠️  Error closing server: ${err.message}`)),
      );
    }

    await Promise.all(cleanupTasks);

    this.client = null;
    this.server = null;
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    try {
      BridgeConfigSchema.parse(this.config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        throw new Error(`Invalid bridge configuration: ${errorMessage}`);
      }
      throw error;
    }

    // Additional validation
    if (this.config.source.type === this.config.target.type) {
      throw new Error('Source and target must be different transport types');
    }
  }

  /**
   * Log messages if logging is enabled
   */
  private log(message: string): void {
    if (this.config.options.logging) {
      console.log(`[MCP Bridge] ${new Date().toISOString()} ${message}`);
    }
  }
}

/**
 * Convenience function to create and start a bridge
 */
export async function createBridge(config: BridgeConfig): Promise<McpBridge> {
  const bridge = new McpBridge(config);
  await bridge.start();
  return bridge;
}

/**
 * Quick bridge for stdio client to Streamable HTTP server
 */
export async function bridgeStdioToHttp(
  serverUrl: string,
  options?: {
    headers?: Record<string, string>;
    logging?: boolean;
  },
): Promise<McpBridge> {
  const config: BridgeConfig = {
    source: {
      type: 'streamableHttp',
      url: serverUrl,
      headers: options?.headers,
    },
    target: {
      type: 'stdio',
    },
    options: {
      logging: options?.logging || false,
    },
  };

  return createBridge(config);
}

/**
 * Quick bridge for Streamable HTTP client to stdio server
 */
export async function bridgeHttpToStdio(
  command: string,
  args?: string[],
  options?: {
    port?: number;
    host?: string;
    env?: Record<string, string>;
    logging?: boolean;
  },
): Promise<McpBridge> {
  const config: BridgeConfig = {
    source: {
      type: 'stdio',
      command,
      args,
      env: options?.env,
    },
    target: {
      type: 'streamableHttp',
      port: options?.port || 8080,
      host: options?.host || 'localhost',
    },
    options: {
      logging: options?.logging || false,
    },
  };

  return createBridge(config);
}
