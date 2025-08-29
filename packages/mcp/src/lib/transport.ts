/**
 * @file Transport Layer Implementation
 * @description Clean transport implementation with SSE support
 */

import { z } from 'zod';
import { redactSensitiveData } from './security.js';
import type { McpRequest, TransportConfig, Transport } from './types.js';

// Re-export for other modules
export { redactSensitiveData } from './security.js';
export type { Transport } from './types.js';

// Message validation schema
const MessageSchema = z
  .object({
    jsonrpc: z.literal('2.0'),
    id: z.union([z.string(), z.number()]),
    method: z.string().optional(),
    params: z.unknown().optional(),
    result: z.unknown().optional(),
    error: z.unknown().optional(),
  })
  .strict();

/**
 * Validate MCP message format
 */
export function validateMessage(
  message: McpRequest,
  onError?: (err: unknown, msg: McpRequest) => void,
): void {
  try {
    MessageSchema.parse(message);
  } catch (err) {
    if (onError) {
      onError(err, message);
    } else {
      console.error('Malformed message in transport.send:', err, message);
    }
  }
}

/**
 * Create transport instance based on configuration
 */
export async function createTransport(config: TransportConfig): Promise<Transport> {
  // Import SSE transport dynamically to avoid circular dependencies
  if (config.type === 'sse') {
    const { SSETransport } = await import('./sse-transport.js');
    return new SSETransport(config);
  }

  // For stdio and http transports, return a basic implementation
  // In production, this would use the actual MCP SDK transport implementations
  return new BasicTransport(config);
}

/**
 * Basic transport implementation for stdio and HTTP
 * In production, this would use the official MCP SDK transports
 */
class BasicTransport implements Transport {
  private config: TransportConfig;
  private connected = false;

  constructor(config: TransportConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // Basic connection logic
    this.connected = true;
    console.log(`Connected to ${this.config.type} transport`);
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    console.log(`Disconnected from ${this.config.type} transport`);
  }

  send(
    message: McpRequest,
    onError?: (err: unknown, msg: McpRequest) => void,
  ): void {
    validateMessage(message, onError);
    
    if (!this.connected) {
      const error = new Error('Transport not connected');
      if (onError) {
        onError(error, message);
      } else {
        throw error;
      }
      return;
    }

    // Redact sensitive data before sending
    const redactedMessage = redactSensitiveData(message);
    
    // In production, this would actually send the message via the appropriate transport
    console.log(`Sending message via ${this.config.type}:`, redactedMessage);
  }

  isConnected(): boolean {
    return this.connected;
  }
}