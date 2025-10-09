/**
 * MCP Resources Capability
 * Handles resource registration, subscription, and notifications
 */

import type { Server } from '../server.js';

export interface ResourceCapability {
	subscribe: boolean;
	listChanged: boolean;
}

/**
 * Extend server with resources capability that supports subscription and listChanged notifications
 */
export function registerResourcesCapability(server: Server): void {
	// Enable subscription and listChanged capabilities
	const serverInfo = server.getServerInfo();
	if (serverInfo.capabilities) {
		serverInfo.capabilities.resources = {
			subscribe: true,
			listChanged: true,
		};
	}

	// Log capability registration
	console.log(
		JSON.stringify({
			timestamp: new Date().toISOString(),
			event: 'resources_capability_registered',
			brand: 'brAInwav',
			service: 'cortex-os-mcp-server',
			capability: 'resources.{subscribe,listChanged}',
			enabled: {
				subscribe: true,
				listChanged: true,
			},
		}),
	);
}

/**
 * Emit resources listChanged notification
 */
export function emitResourcesListChanged(_server: Server): void {
	const notification = {
		method: 'notifications/resources/list_changed',
		params: {},
	};

	// Log notification emission
	console.log(
		JSON.stringify({
			timestamp: new Date().toISOString(),
			event: 'resources_list_changed_emitted',
			brand: 'brAInwav',
			service: 'cortex-os-mcp-server',
			notification,
		}),
	);

	// Server-specific implementation would emit via transport
	// For now, just log the notification
}

/**
 * Emit resources updated notification for subscribed URIs
 */
export function emitResourcesUpdated(_server: Server, uri: string): void {
	const notification = {
		method: 'notifications/resources/updated',
		params: {
			uri,
		},
	};

	// Log notification emission
	console.log(
		JSON.stringify({
			timestamp: new Date().toISOString(),
			event: 'resources_updated_emitted',
			brand: 'brAInwav',
			service: 'cortex-os-mcp-server',
			notification,
			uri,
		}),
	);

	// Server-specific implementation would emit via transport
	// For now, just log the notification
}

/**
 * Check if resources subscribe capability is enabled
 */
export function hasResourcesSubscribe(server: Server): boolean {
	const serverInfo = server.getServerInfo();
	return !!serverInfo.capabilities?.resources?.subscribe;
}

/**
 * Check if resources listChanged capability is enabled
 */
export function hasResourcesListChanged(server: Server): boolean {
	const serverInfo = server.getServerInfo();
	return !!serverInfo.capabilities?.resources?.listChanged;
}
