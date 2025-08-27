/**
 * @file MCP Core Package
 * @description Core MCP functionality for Cortex-OS
 */

// Core MCP functionality
export { McpClient } from './lib/client.js';
export { createMcpServer, McpServer } from './lib/server.js';
export { McpBridge } from './lib/bridge.js';

// Configuration management
export { 
  validateConfig, 
  loadConfigs, 
  mergeConfigs,
  getDefaultConfig,
  type McpConfig 
} from './lib/config.js';

// Transport layer
export { 
  createTransport,
  type Transport 
} from './lib/transport.js';

// Type definitions
export type { 
  McpRequest, 
  McpResponse, 
  McpError,
  ToolDefinition,
  ResourceDefinition,
  PromptDefinition,
  TransportConfig,
  ServerConfig
} from './lib/types.js';
