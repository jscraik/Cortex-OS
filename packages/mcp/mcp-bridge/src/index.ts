/**
 * @file MCP Bridge - Main exports
 * @description Bridge utilities for MCP transport interoperability
 */

export { 
  McpBridge, 
  createBridge, 
  bridgeStdioToHttp, 
  bridgeHttpToStdio,
  type BridgeConfig 
} from './bridge.js';

export { BridgeConfigSchema } from './bridge.js';