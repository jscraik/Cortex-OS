/**
 * @file A2A Protocol Types - Aligned with External Specification
 * @description Core type definitions following the official A2A JSON-RPC 2.0 specification
 * Now organized into focused modules for better maintainability
 */

// Re-export all A2A types from organized modules
export * from './types/index.js';

// Import key types for local extensions
import type {
  SendMessageRequest,
  SendMessageResponse,
  Message,
  AgentCapabilities,
} from './external-types.js';

/**
 * Additional A2A configuration for Cortex-OS implementation
 */
export interface A2AConfig {
  agentId: string;
  authentication: 'none' | 'token' | 'mutual-tls';
  encryption: boolean;
  timeout: number;
  retryAttempts: number;
  heartbeatInterval: number;
  discoveryEnabled: boolean;
  endpoint?: string;
  capabilities?: Partial<AgentCapabilities>;
}

/**
 * Security context for A2A operations
 */
export interface A2ASecurityContext {
  agentId: string;
  token?: string;
  certificate?: string;
  keyPair?: {
    publicKey: string;
    privateKey: string;
  };
  permissions: string[];
}

/**
 * Message validation result
 */
export interface A2AValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  securityLevel: 'none' | 'basic' | 'enhanced' | 'maximum';
}

/**
 * Discovery information for agents
 */
export interface A2ADiscoveryInfo {
  agentId: string;
  capabilities: AgentCapabilities;
  endpoint?: string;
  lastSeen: Date;
  status: 'available' | 'busy' | 'offline';
}

/**
 * Route configuration for message routing
 */
export interface A2ARoute {
  id: string;
  pattern: string | RegExp;
  target: string;
  priority: number;
  conditions?: Record<string, unknown>;
  transform?: (message: Message) => Message;
}

/**
 * Audit log entry
 */
export interface A2AAuditLog {
  id: string;
  timestamp: Date;
  event: 'message_sent' | 'message_received' | 'agent_discovered' | 'error' | 'security_violation';
  agentId: string;
  targetAgent?: string;
  messageId?: string;
  action?: string;
  result: 'success' | 'failure' | 'warning';
  details: Record<string, unknown>;
  securityLevel: number;
}

/**
 * Gateway configuration
 */
export interface A2AGatewayConfig {
  id: string;
  port: number;
  protocol: 'http' | 'websocket' | 'tcp' | 'udp';
  security: A2ASecurityContext;
  routes: A2ARoute[];
  middleware: string[];
  rateLimit?: {
    requests: number;
    window: number; // milliseconds
  };
}

// Type aliases for backward compatibility with existing local code
export type A2ARequest = SendMessageRequest;
export type A2AResponse = SendMessageResponse;
export type A2AMessage = Message;

// Additional legacy aliases (to be phased out)
export type TA2AMessage = Message;
export type TA2AResponse = SendMessageResponse;

/**
 * Workflow step definition for orchestration (Cortex-OS specific)
 */
export interface A2AWorkflowStep {
  id: string;
  agent: string;
  action: string;
  params: unknown;
  condition?: string;
  onSuccess?: string;
  onError?: string;
  timeout?: number;
}

/**
 * Orchestration task for multi-agent coordination (Cortex-OS specific)
 */
export interface A2AOrchestrationTask {
  id: string;
  name: string;
  description: string;
  agents: string[];
  workflow: A2AWorkflowStep[];
  timeout: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  dependencies?: string[];
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.