/**
 * MCP Tools Capability
 * Handles tool registration and listChanged notifications
 */

import type { Server } from '../server.js';

export interface ToolCapability {
	listChanged: boolean;
}

/**
 * Extend server with tools capability that supports listChanged notifications
 */
export function registerToolsCapability(server: Server): void {
	// Enable listChanged capability
	const serverInfo = server.getServerInfo();
	if (serverInfo.capabilities) {
		serverInfo.capabilities.tools = {
			listChanged: true,
		};
	}

	// Log capability registration
	console.log(
		JSON.stringify({
			timestamp: new Date().toISOString(),
			event: 'tools_capability_registered',
			brand: 'brAInwav',
			service: 'cortex-os-mcp-server',
			capability: 'tools.listChanged',
			enabled: true,
		}),
	);
}

/**
 * Emit tools listChanged notification
 */
export function emitToolsListChanged(_server: Server): void {
	const notification = {
		method: 'notifications/tools/list_changed',
		params: {},
	};

	// Log notification emission
	console.log(
		JSON.stringify({
			timestamp: new Date().toISOString(),
			event: 'tools_list_changed_emitted',
			brand: 'brAInwav',
			service: 'cortex-os-mcp-server',
			notification,
		}),
	);

	// Server-specific implementation would emit via transport
	// For now, just log the notification
}

/**
 * Check if tools listChanged capability is enabled
 */
export function hasToolsListChanged(server: Server): boolean {
	const serverInfo = server.getServerInfo();
	return !!serverInfo.capabilities?.tools?.listChanged;
}
