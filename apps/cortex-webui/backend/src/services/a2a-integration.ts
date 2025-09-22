/**
 * A2A Integration for Cortex WebUI Backend
 *
 * Handles real-time agent communication events and WebSocket broadcasting.
 */

import { ContractEvent } from '@cortex-os/contracts';
import { createBus } from '@cortex-os/a2a-core/bus';
import { A2ATransport } from '@cortex-os/a2a-core';
import type { WebSocket } from 'ws';

export interface WebUIEventData {
	sessionId: string;
	userId?: string;
	timestamp: string;
	metadata?: Record<string, unknown>;
}

export interface WebUIUserEvent extends WebUIEventData {
	eventType: 'user_connected' | 'user_disconnected' | 'user_message';
	message?: string;
}

export interface WebUISystemEvent extends WebUIEventData {
	eventType: 'system_status' | 'model_update' | 'error_notification';
	status?: string;
	modelInfo?: Record<string, unknown>;
	error?: string;
}

export interface WebUIAgentEvent extends WebUIEventData {
	eventType: 'agent_response' | 'agent_thinking' | 'agent_error';
	agentId: string;
	response?: string;
	thinking?: boolean;
	error?: string;
}

// MLX Event Data Interfaces
export interface MLXThermalData {
	device_id: string;
	temperature: number;
	threshold: number;
	status: string;
	action_taken: string;
	timestamp: string;
}

export interface MLXModelData {
	model_id: string;
	model_name: string;
	event_type: string;
	memory_usage?: number;
	load_time?: number;
	error_message?: string;
	timestamp: string;
}

export interface MLXEmbeddingData {
	request_id: string;
	text_count: number;
	processing_time: number;
	model_used: string;
	success: boolean;
	timestamp: string;
}

export const WebUIEventTypes = {
	USER_CONNECTED: 'webui.user.connected' as const,
	USER_DISCONNECTED: 'webui.user.disconnected' as const,
	USER_MESSAGE: 'webui.user.message' as const,
	SYSTEM_STATUS: 'webui.system.status' as const,
	MODEL_UPDATE: 'webui.model.update' as const,
	ERROR_NOTIFICATION: 'webui.system.error' as const,
	AGENT_RESPONSE: 'webui.agent.response' as const,
	AGENT_THINKING: 'webui.agent.thinking' as const,
	AGENT_ERROR: 'webui.agent.error' as const,

	// Subscribe to external events
	MLX_THERMAL: 'mlx.thermal.warning' as const,
	MLX_THERMAL_CRITICAL: 'mlx.thermal.critical' as const,
	MLX_MODEL_LOADED: 'mlx.model.loaded' as const,
	MLX_MODEL_ERROR: 'mlx.model.error' as const,
	MLX_EMBEDDING_COMPLETED: 'mlx.embedding.completed' as const,
	MLX_EMBEDDING_BATCH: 'mlx.embedding.batch.completed' as const,
} as const;

export interface WebSocketManager {
	broadcast(message: any): void;
	sendToSession(sessionId: string, message: any): void;
	addConnection(sessionId: string, ws: WebSocket): void;
	removeConnection(sessionId: string): void;
}

export class WebUIBusIntegration {
	private bus = createBus(inproc());
	private wsManager: WebSocketManager | null = null;
	private source = 'urn:cortex:webui:backend';

	constructor(wsManager?: WebSocketManager) {
		this.wsManager = wsManager || null;
		this.setupEventHandlers();
	}

	/**
	 * Set the WebSocket manager for broadcasting events to frontend
	 */
	setWebSocketManager(wsManager: WebSocketManager): void {
		this.wsManager = wsManager;
	}

	/**
	 * Publish a WebUI event to the A2A bus
	 */
	async publishUserEvent(data: WebUIUserEvent): Promise<void> {
		const eventType = this.mapUserEventType(data.eventType);
		const envelope = createEnvelope({
			type: eventType,
			source: this.source,
			data,
		});

		await this.bus.publish(envelope);

		// Also broadcast to connected WebSocket clients
		if (this.wsManager) {
			this.wsManager.broadcast({
				type: 'user_event',
				data: data,
				timestamp: new Date().toISOString(),
			});
		}
	}

	/**
	 * Publish a system event to the A2A bus
	 */
	async publishSystemEvent(data: WebUISystemEvent): Promise<void> {
		const eventType = this.mapSystemEventType(data.eventType);
		const envelope = createEnvelope({
			type: eventType,
			source: this.source,
			data,
		});

		await this.bus.publish(envelope);

		// Broadcast to WebSocket clients
		if (this.wsManager) {
			this.wsManager.broadcast({
				type: 'system_event',
				data: data,
				timestamp: new Date().toISOString(),
			});
		}
	}

	/**
	 * Publish an agent event to the A2A bus
	 */
	async publishAgentEvent(data: WebUIAgentEvent): Promise<void> {
		const eventType = this.mapAgentEventType(data.eventType);
		const envelope = createEnvelope({
			type: eventType,
			source: this.source,
			data,
		});

		await this.bus.publish(envelope);

		// Broadcast to specific session or all clients
		if (this.wsManager) {
			if (data.sessionId) {
				this.wsManager.sendToSession(data.sessionId, {
					type: 'agent_event',
					data: data,
					timestamp: new Date().toISOString(),
				});
			} else {
				this.wsManager.broadcast({
					type: 'agent_event',
					data: data,
					timestamp: new Date().toISOString(),
				});
			}
		}
	}

	/**
	 * Setup event handlers for external A2A events
	 */
	private setupEventHandlers(): void {
		// Handle MLX thermal events
		this.bus.bind([
			{
				type: WebUIEventTypes.MLX_THERMAL,
				handle: this.handleMLXThermalEvent.bind(this),
			},
			{
				type: WebUIEventTypes.MLX_THERMAL_CRITICAL,
				handle: this.handleMLXThermalCriticalEvent.bind(this),
			},
			{
				type: WebUIEventTypes.MLX_MODEL_LOADED,
				handle: this.handleMLXModelEvent.bind(this),
			},
			{
				type: WebUIEventTypes.MLX_MODEL_ERROR,
				handle: this.handleMLXModelErrorEvent.bind(this),
			},
			{
				type: WebUIEventTypes.MLX_EMBEDDING_COMPLETED,
				handle: this.handleMLXEmbeddingEvent.bind(this),
			},
			{
				type: WebUIEventTypes.MLX_EMBEDDING_BATCH,
				handle: this.handleMLXEmbeddingBatchEvent.bind(this),
			},
		]);
	}

	/**
	 * Handle MLX thermal warning events
	 */
	private async handleMLXThermalEvent(envelope: Envelope): Promise<void> {
		const thermalData = envelope.data as MLXThermalData;

		if (this.wsManager) {
			this.wsManager.broadcast({
				type: 'mlx_thermal_warning',
				data: {
					deviceId: thermalData.device_id,
					temperature: thermalData.temperature,
					threshold: thermalData.threshold,
					status: thermalData.status,
					actionTaken: thermalData.action_taken,
					timestamp: thermalData.timestamp,
				},
				severity: 'warning',
				timestamp: new Date().toISOString(),
			});
		}
	}

	/**
	 * Handle MLX critical thermal events
	 */
	private async handleMLXThermalCriticalEvent(envelope: Envelope): Promise<void> {
		const thermalData = envelope.data as MLXThermalData;

		if (this.wsManager) {
			this.wsManager.broadcast({
				type: 'mlx_thermal_critical',
				data: {
					deviceId: thermalData.device_id,
					temperature: thermalData.temperature,
					threshold: thermalData.threshold,
					status: thermalData.status,
					actionTaken: thermalData.action_taken,
					timestamp: thermalData.timestamp,
				},
				severity: 'critical',
				timestamp: new Date().toISOString(),
			});
		}
	}

	/**
	 * Handle MLX model lifecycle events
	 */
	private async handleMLXModelEvent(envelope: Envelope): Promise<void> {
		const modelData = envelope.data as MLXModelData;

		if (this.wsManager) {
			this.wsManager.broadcast({
				type: 'mlx_model_update',
				data: {
					modelId: modelData.model_id,
					modelName: modelData.model_name,
					eventType: modelData.event_type,
					memoryUsage: modelData.memory_usage,
					loadTime: modelData.load_time,
					timestamp: modelData.timestamp,
				},
				timestamp: new Date().toISOString(),
			});
		}
	}

	/**
	 * Handle MLX model error events
	 */
	private async handleMLXModelErrorEvent(envelope: Envelope): Promise<void> {
		const modelData = envelope.data as MLXModelData;

		if (this.wsManager) {
			this.wsManager.broadcast({
				type: 'mlx_model_error',
				data: {
					modelId: modelData.model_id,
					modelName: modelData.model_name,
					error: modelData.error_message,
					timestamp: modelData.timestamp,
				},
				severity: 'error',
				timestamp: new Date().toISOString(),
			});
		}
	}

	/**
	 * Handle MLX embedding completion events
	 */
	private async handleMLXEmbeddingEvent(envelope: Envelope): Promise<void> {
		const embeddingData = envelope.data as MLXEmbeddingData;

		if (this.wsManager) {
			this.wsManager.broadcast({
				type: 'mlx_embedding_completed',
				data: {
					requestId: embeddingData.request_id,
					textCount: embeddingData.text_count,
					processingTime: embeddingData.processing_time,
					modelUsed: embeddingData.model_used,
					success: embeddingData.success,
					timestamp: embeddingData.timestamp,
				},
				timestamp: new Date().toISOString(),
			});
		}
	}

	/**
	 * Handle MLX batch embedding events
	 */
	private async handleMLXEmbeddingBatchEvent(envelope: Envelope): Promise<void> {
		await this.handleMLXEmbeddingEvent(envelope); // Same handling for now
	}

	/**
	 * Map user event types to A2A event types
	 */
	private mapUserEventType(eventType: string): string {
		switch (eventType) {
			case 'user_connected':
				return WebUIEventTypes.USER_CONNECTED;
			case 'user_disconnected':
				return WebUIEventTypes.USER_DISCONNECTED;
			case 'user_message':
				return WebUIEventTypes.USER_MESSAGE;
			default:
				return WebUIEventTypes.USER_MESSAGE;
		}
	}

	/**
	 * Map system event types to A2A event types
	 */
	private mapSystemEventType(eventType: string): string {
		switch (eventType) {
			case 'system_status':
				return WebUIEventTypes.SYSTEM_STATUS;
			case 'model_update':
				return WebUIEventTypes.MODEL_UPDATE;
			case 'error_notification':
				return WebUIEventTypes.ERROR_NOTIFICATION;
			default:
				return WebUIEventTypes.SYSTEM_STATUS;
		}
	}

	/**
	 * Map agent event types to A2A event types
	 */
	private mapAgentEventType(eventType: string): string {
		switch (eventType) {
			case 'agent_response':
				return WebUIEventTypes.AGENT_RESPONSE;
			case 'agent_thinking':
				return WebUIEventTypes.AGENT_THINKING;
			case 'agent_error':
				return WebUIEventTypes.AGENT_ERROR;
			default:
				return WebUIEventTypes.AGENT_RESPONSE;
		}
	}

	/**
	 * Get health status of the A2A integration
	 */
	getHealthStatus(): Record<string, any> {
		return {
			busConnected: !!this.bus,
			wsManagerConnected: !!this.wsManager,
			source: this.source,
			eventTypes: Object.values(WebUIEventTypes),
		};
	}
}

export function createWebUIBusIntegration(wsManager?: WebSocketManager): WebUIBusIntegration {
	return new WebUIBusIntegration(wsManager);
}
