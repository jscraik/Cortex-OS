/**
 * @file MCP-Event Bus Adapter
 * @description Integrates MCP servers as first-class participants in the A2A event bus
 */

import { Bus, Handler } from '@cortex-os/a2a-core/bus';
import { createEnvelope, type Envelope } from '@cortex-os/a2a-contracts/envelope';
import { UniversalMCPManager } from '../universal-mcp-manager';
import { withSpan, logWithSpan } from '@cortex-os/telemetry';
import { z } from 'zod';

/**
 * MCP Tool Call Event Schema
 */
const McpToolCallSchema = z.object({
  toolName: z.string(),
  args: z.record(z.unknown()),
  timeout: z.number().optional(),
  correlationId: z.string().uuid().optional(),
});

type McpToolCall = z.infer<typeof McpToolCallSchema>;

/**
 * MCP Tool Result Event Schema
 */
const McpToolResultSchema = z.object({
  success: z.boolean(),
  result: z.unknown().optional(),
  error: z.string().optional(),
  executionTime: z.number().optional(),
  correlationId: z.string().uuid().optional(),
});

type McpToolResult = z.infer<typeof McpToolResultSchema>;

/**
 * Adapter that integrates MCP servers with the A2A event bus
 */
export class MCPEventBusAdapter {
  private registeredServers = new Map<string, () => Promise<void>>();
  private toolCallHandlers = new Map<string, Handler>();

  constructor(
    private bus: Bus,
    private mcpManager: UniversalMCPManager
  ) {}

  /**
   * Register an MCP server as an event bus participant
   */
  async registerMCPServer(serverId: string, config: {
    endpoint?: string;
    capabilities?: string[];
    description?: string;
  } = {}): Promise<void> {
    return withSpan('mcp.adapter.registerServer', async (span) => {
      span.setAttributes({
        'server.id': serverId,
        'server.endpoint': config.endpoint || 'unknown',
      });

      // Register server availability event
      await this.bus.publish(createEnvelope({
        type: 'mcp.server.registered',
        source: `/mcp/servers/${serverId}`,
        data: {
          serverId,
          endpoint: config.endpoint,
          capabilities: config.capabilities || [],
          description: config.description,
          registeredAt: new Date().toISOString(),
        },
      }));

      // Register tool call handlers for this server
      const toolCallHandler: Handler = {
        type: `mcp.${serverId}.tool.call`,
        handle: async (envelope) => {
          return this.handleToolCall(serverId, envelope);
        },
      };

      this.toolCallHandlers.set(serverId, toolCallHandler);
      const unsubscribe = await this.bus.bind([toolCallHandler]);
      this.registeredServers.set(serverId, unsubscribe);

      logWithSpan('info', `Registered MCP server with event bus`, {
        serverId,
        endpoint: config.endpoint,
      }, span);
    });
  }

  /**
   * Unregister an MCP server from the event bus
   */
  async unregisterMCPServer(serverId: string): Promise<void> {
    return withSpan('mcp.adapter.unregisterServer', async (span) => {
      span.setAttributes({
        'server.id': serverId,
      });

      // Unregister from bus
      const unsubscribe = this.registeredServers.get(serverId);
      if (unsubscribe) {
        await unsubscribe();
        this.registeredServers.delete(serverId);
      }

      // Remove tool call handler
      this.toolCallHandlers.delete(serverId);

      // Publish server unregistration event
      await this.bus.publish(createEnvelope({
        type: 'mcp.server.unregistered',
        source: `/mcp/servers/${serverId}`,
        data: {
          serverId,
          unregisteredAt: new Date().toISOString(),
        },
      }));

      logWithSpan('info', `Unregistered MCP server from event bus`, {
        serverId,
      }, span);
    });
  }

  /**
   * Handle incoming tool call events
   */
  private async handleToolCall(serverId: string, envelope: Envelope): Promise<void> {
    return withSpan('mcp.adapter.handleToolCall', async (span) => {
      span.setAttributes({
        'server.id': serverId,
        'envelope.id': envelope.id,
        'envelope.type': envelope.type,
      });

      try {
        // Parse tool call data
        const toolCall = McpToolCallSchema.parse(envelope.data);

        span.setAttributes({
          'tool.name': toolCall.toolName,
          'tool.timeout': toolCall.timeout || 0,
        });

        // Execute the tool via MCP manager
        const startTime = Date.now();
        const result = await this.mcpManager.callTool(
          toolCall.toolName,
          toolCall.args
        );
        const executionTime = Date.now() - startTime;

        // Create success result
        const toolResult: McpToolResult = {
          success: true,
          result,
          executionTime,
          correlationId: toolCall.correlationId,
        };

        // Publish result event
        await this.bus.publish(createEnvelope({
          type: `mcp.${serverId}.tool.result`,
          source: `/mcp/servers/${serverId}`,
          data: toolResult,
          causationId: envelope.id,
          correlationId: toolCall.correlationId,
        }));

        logWithSpan('info', `MCP tool call completed successfully`, {
          serverId,
          toolName: toolCall.toolName,
          executionTime,
        }, span);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        span.recordException(error as Error);
        span.setStatus({ code: 2, message: errorMessage });

        // Create error result
        const toolResult: McpToolResult = {
          success: false,
          error: errorMessage,
          correlationId: (envelope.data as any)?.correlationId,
        };

        // Publish error result event
        await this.bus.publish(createEnvelope({
          type: `mcp.${serverId}.tool.error`,
          source: `/mcp/servers/${serverId}`,
          data: toolResult,
          causationId: envelope.id,
          correlationId: (envelope.data as any)?.correlationId,
        }));

        logWithSpan('error', `MCP tool call failed`, {
          serverId,
          toolName: (envelope.data as any)?.toolName || 'unknown',
          error: errorMessage,
        }, span);
      }
    });
  }

  /**
   * Call an MCP tool via the event bus (client-side)
   */
  async callToolViaBus(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>,
    options: {
      timeout?: number;
      correlationId?: string;
    } = {}
  ): Promise<unknown> {
    return withSpan('mcp.adapter.callToolViaBus', async (span) => {
      const correlationId = options.correlationId || crypto.randomUUID();

      span.setAttributes({
        'server.id': serverId,
        'tool.name': toolName,
        'correlation.id': correlationId,
      });

      // Create tool call event
      const toolCall: McpToolCall = {
        toolName,
        args,
        timeout: options.timeout,
        correlationId,
      };

      const callEnvelope = createEnvelope({
        type: `mcp.${serverId}.tool.call`,
        source: '/mcp/clients/event-bus-adapter',
        data: toolCall,
        correlationId,
      });

      // Publish tool call event
      await this.bus.publish(callEnvelope);

      // Wait for response (simplified - in production you'd want proper correlation handling)
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Tool call timeout: ${toolName}`));
        }, options.timeout || 30000);

        // Set up response handler (this is a simplified version)
        const responseHandler: Handler = {
          type: `mcp.${serverId}.tool.result`,
          handle: async (responseEnvelope) => {
            if (responseEnvelope.correlationId === correlationId) {
              clearTimeout(timeout);
              const result = McpToolResultSchema.parse(responseEnvelope.data);
              if (result.success) {
                resolve(result.result);
              } else {
                reject(new Error(result.error || 'Tool call failed'));
              }
            }
          },
        };

        // Register temporary handler
        this.bus.bind([responseHandler]).then(unsubscribe => {
          // Clean up after response or timeout
          setTimeout(() => unsubscribe(), (options.timeout || 30000) + 1000);
        });
      });
    });
  }

  /**
   * Get list of registered MCP servers
   */
  getRegisteredServers(): string[] {
    return Array.from(this.registeredServers.keys());
  }

  /**
   * Publish MCP server health status
   */
  async publishHealthStatus(serverId: string, status: {
    healthy: boolean;
    message?: string;
    metrics?: Record<string, number>;
  }): Promise<void> {
    return withSpan('mcp.adapter.publishHealthStatus', async (span) => {
      span.setAttributes({
        'server.id': serverId,
        'health.healthy': status.healthy,
      });

      await this.bus.publish(createEnvelope({
        type: 'mcp.server.health',
        source: `/mcp/servers/${serverId}`,
        data: {
          serverId,
          ...status,
          timestamp: new Date().toISOString(),
        },
      }));
    });
  }
}

/**
 * Factory function to create MCP-Event Bus adapter
 */
export function createMCPEventBusAdapter(
  bus: Bus,
  mcpManager: UniversalMCPManager
): MCPEventBusAdapter {
  return new MCPEventBusAdapter(bus, mcpManager);
}</content>
<parameter name="filePath">/Users/jamiecraik/.Cortex-OS-clean/packages/mcp/src/mcp-event-bus-adapter.ts
