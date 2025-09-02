/**
 * @file MCP Bridge - Main exports
 * @description Bridge utilities for MCP transport interoperability
 */

export {
	type BridgeConfig,
	BridgeConfigSchema,
	bridgeHttpToStdio,
	bridgeStdioToHttp,
	createBridge,
	McpBridge,
} from "./bridge.js";
