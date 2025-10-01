/**
 * Pieces MCP Proxy Client
 * 
 * Connects to Pieces OS MCP server at localhost:39300 and proxies remote tools
 * (e.g., ask_pieces_ltm, ask_pieces_code) into the main MCP hub.
 * 
 * Architecture:
 * - Uses @modelcontextprotocol/sdk SSEClientTransport for streamable HTTP
 * - Maintains persistent connection with automatic reconnection
 * - Exposes remote tools as local tools with "pieces_" prefix
 * - Handles errors gracefully (if Pieces offline, hub continues)
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { Logger } from 'pino';

export interface PiecesMCPProxyConfig {
    endpoint: string;
    enabled: boolean;
    reconnectDelay?: number;
    logger: Logger;
}

export interface PiecesTool {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

export class PiecesMCPProxy {
    private client: Client | null = null;
    private transport: SSEClientTransport | null = null;
    private config: PiecesMCPProxyConfig;
    private connected = false;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private remoteTools: PiecesTool[] = [];

    constructor(config: PiecesMCPProxyConfig) {
        this.config = {
            reconnectDelay: 5000,
            ...config,
        };
    }

    /**
     * Initialize connection to Pieces MCP server
     */
    async connect(): Promise<void> {
        if (!this.config.enabled) {
            this.config.logger.info('Pieces MCP proxy disabled - skipping connection');
            return;
        }

        try {
            this.config.logger.info(
                { endpoint: this.config.endpoint },
                'Connecting to Pieces MCP server...',
            );

            // Create SSE transport for streamable HTTP
            this.transport = new SSEClientTransport(new URL(this.config.endpoint));

            // Create MCP client
            this.client = new Client(
                {
                    name: 'brainwav-cortex-mcp-proxy',
                    version: '1.0.0',
                },
                {
                    capabilities: {
                        tools: {},
                    },
                },
            );

            // Connect to Pieces server
            await this.client.connect(this.transport);

            // Fetch available tools from Pieces
            await this.discoverTools();

            this.connected = true;
            this.config.logger.info(
                { toolCount: this.remoteTools.length },
                'Successfully connected to Pieces MCP server',
            );
        } catch (error) {
            this.connected = false;
            this.config.logger.warn(
                { error: (error as Error).message, endpoint: this.config.endpoint },
                'Failed to connect to Pieces MCP - will retry',
            );

            // Schedule reconnection attempt
            if (this.config.reconnectDelay && this.config.reconnectDelay > 0) {
                this.scheduleReconnect();
            }
        }
    }

    /**
     * Discover available tools from remote Pieces server
     */
    private async discoverTools(): Promise<void> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }

        try {
            const response = await this.client.listTools();
            this.remoteTools = response.tools.map((tool) => ({
                name: tool.name,
                description: tool.description || '',
                inputSchema: tool.inputSchema,
            }));

            this.config.logger.info(
                { tools: this.remoteTools.map((t) => t.name) },
                'Discovered Pieces MCP tools',
            );
        } catch (error) {
            this.config.logger.error(
                { error: (error as Error).message },
                'Failed to discover Pieces tools',
            );
            throw error;
        }
    }

    /**
     * Schedule reconnection attempt
     */
    private scheduleReconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectTimer = setTimeout(async () => {
            this.config.logger.info('Attempting to reconnect to Pieces MCP...');
            await this.connect();
        }, this.config.reconnectDelay);
    }

    /**
     * Get list of available remote tools
     */
    getTools(): PiecesTool[] {
        return this.remoteTools;
    }

    /**
     * Check if proxy is connected and operational
     */
    isConnected(): boolean {
        return this.connected;
    }

    /**
     * Call a remote tool on Pieces server
     */
    async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
        if (!this.client || !this.connected) {
            throw new Error('Pieces MCP proxy not connected');
        }

        try {
            this.config.logger.info(
                { tool: name, args },
                'Calling remote Pieces tool',
            );

            const response = await this.client.callTool({
                name,
                arguments: args,
            });

            return response;
        } catch (error) {
            this.config.logger.error(
                { tool: name, error: (error as Error).message },
                'Failed to call remote Pieces tool',
            );
            throw error;
        }
    }

    /**
     * Disconnect from Pieces server and cleanup
     */
    async disconnect(): Promise<void> {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.client) {
            try {
                await this.client.close();
            } catch (error) {
                this.config.logger.warn(
                    { error: (error as Error).message },
                    'Error closing Pieces MCP client',
                );
            }
            this.client = null;
        }

        this.transport = null;
        this.connected = false;
        this.remoteTools = [];

        this.config.logger.info('Disconnected from Pieces MCP server');
    }
}
