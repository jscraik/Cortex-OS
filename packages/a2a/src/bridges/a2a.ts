/**
 * @file Agent-to-Agent (A2A) Protocol Bridge
 * @description Defines the Agent2Agent (A2A) protocol for standardized agent messaging.
 * Implements JSON-RPC 2.0 compliant messaging between agents.
 */

/**
 * A2A Message interface for agent communication
 */
export interface A2AMessage {
  sender_id: string;
  receiver_id: string;
  action: string;
  params: Record<string, unknown>;
  message_id: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

/**
 * Create a standardized A2A message
 */
export function createA2AMessage(
  sender_id: string,
  receiver_id: string,
  action: string,
  params: Record<string, unknown> = {},
  metadata: Record<string, unknown> = {}
): A2AMessage {
  return {
    sender_id,
    receiver_id,
    action,
    params,
    message_id: generateMessageId(),
    timestamp: new Date().toISOString(),
    metadata: {
      protocol_version: '1.0.0',
      ...metadata
    }
  };
}

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
  return `a2a_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}