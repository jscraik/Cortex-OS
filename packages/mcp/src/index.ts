/**
 * @file_path packages/mcp/src/index.ts
 * @description Main exports for MCP plugin marketplace system
 * @maintainer @jamiescottcraik
 * @last_updated 2025-01-12
 * @version 1.0.0
 * @status active
 * @ai_generated_by human
 * @ai_provenance_hash N/A
 */

// Export shared schemas and types (excluding auth-specific metadata)
export {
  PluginStatusSchema,
  MarketplaceIndexSchema,
  PluginSearchOptionsSchema,
  PluginInstallOptionsSchema,
  PluginValidationResultSchema,
  type PluginStatus,
  type MarketplaceIndex,
  type PluginSearchOptions,
  type PluginInstallOptions,
  type PluginValidationResult,
} from './types.js';

// Export main classes
export {
  McpConfigSchema,
  ToolSchema,
  hashString,
  loadMcpConfigs,
  mergeMcpConfigs,
  type McpConfig,
  type MergeReportEntry,
  type Tool,
} from './config-loader.js';
export { callGitMcp, pickGitMcpBaseUrl } from './gitmcp-client.js';
export type {
  GitMcpAction,
  GitMcpFetchRequest,
  GitMcpRequest,
  GitMcpSearchRequest,
  Visibility,
} from './gitmcp-client.js';
export { PluginRegistry } from './plugin-registry.js';
export { PluginValidator } from './plugin-validator.js';
export {
  McpConnectionManager,
  createConnectionManager,
} from './connection-manager.js';
export { McpDemoServer } from './mcp-demo-server.js';

// Universal MCP System
export { mcpConfigStorage } from './mcp-config-storage.js';
export { UniversalCliHandler, universalCliHandler } from './universal-cli-handler.js';
export { universalMcpManager } from './universal-mcp-manager.js';
export * from './web-mcp-interface.js';

// MLX Integration
export { MLXMcpIntegration, mlxMcpIntegration } from './mlx-mcp-integration.js';
export { MLXMcpServer } from './mlx-mcp-server.js';

// Server bridge (HTTP/WS) for GitMCP
export { installGitMcpBridge } from "./gitmcp-bridge.js";

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
