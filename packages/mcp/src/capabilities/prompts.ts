/**
 * MCP Prompts Capability
 * Handles prompt registration and listChanged notifications
 */

import type { Server } from '../server.js';

export interface PromptCapability {
	listChanged: boolean;
}

/**
 * Extend server with prompts capability that supports listChanged notifications
 */
export function registerPromptsCapability(server: Server): void {
	// Enable listChanged capability
	const serverInfo = server.getServerInfo();
	if (serverInfo.capabilities) {
		serverInfo.capabilities.prompts = {
			listChanged: true,
		};
	}

	// Log capability registration
	console.log(
		JSON.stringify({
			timestamp: new Date().toISOString(),
			event: 'prompts_capability_registered',
			brand: 'brAInwav',
			service: 'cortex-os-mcp-server',
			capability: 'prompts.listChanged',
			enabled: true,
		}),
	);
}

/**
 * Emit prompts listChanged notification
 */
export function emitPromptsListChanged(_server: Server): void {
	const notification = {
		method: 'notifications/prompts/list_changed',
		params: {},
	};

	// Log notification emission
	console.log(
		JSON.stringify({
			timestamp: new Date().toISOString(),
			event: 'prompts_list_changed_emitted',
			brand: 'brAInwav',
			service: 'cortex-os-mcp-server',
			notification,
		}),
	);

	// Server-specific implementation would emit via transport
	// For now, just log the notification
}

/**
 * Check if prompts listChanged capability is enabled
 */
export function hasPromptsListChanged(server: Server): boolean {
	const serverInfo = server.getServerInfo();
	return !!serverInfo.capabilities?.prompts?.listChanged;
}
