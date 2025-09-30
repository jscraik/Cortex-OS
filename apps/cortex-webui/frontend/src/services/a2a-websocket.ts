/**
 * A2A WebSocket Manager for Cortex WebUI Frontend
 *
 * Handles real-time A2A event communication between frontend and backend,
 * providing React-friendly hooks and event management.
 */

import { API_BASE_URL } from '../constants';

// ================================
// A2A Event Types
// ================================

export interface A2AEvent {
	id: string;
	type: string;
	source: string;
	data: unknown;
	timestamp: string;
	sessionId?: string;
	severity?: 'info' | 'warning' | 'error' | 'critical';
}

export interface WebUIUserEvent {
	sessionId: string;
	userId?: string;
	timestamp: string;
	eventType: 'user_connected' | 'user_disconnected' | 'user_message';
	message?: string;
	metadata?: Record<string, any>;
}

export interface WebUISystemEvent {
	sessionId: string;
	timestamp: string;
	eventType: 'system_status' | 'model_update' | 'error_notification';
	status?: string;
	modelInfo?: any;
	error?: string;
	metadata?: Record<string, any>;
}

export interface WebUIAgentEvent {
	sessionId: string;
	timestamp: string;
	eventType: 'agent_response' | 'agent_thinking' | 'agent_error';
	agentId: string;
	response?: string;
	thinking?: boolean;
	error?: string;
	metadata?: Record<string, any>;
}

export interface MLXThermalEvent {
	deviceId: string;
	temperature: number;
	threshold: number;
	status: 'normal' | 'warning' | 'critical';
	actionTaken?: string;
	timestamp: number;
}

export interface MLXModelEvent {
	modelName: string;
	eventType: 'loaded' | 'unloaded' | 'error';
	modelPath?: string;
	loadTime?: number;
	memoryUsage?: number;
	error?: string;
	timestamp: number;
}

export interface MLXEmbeddingEvent {
	requestId: string;
	textCount: number;
	totalChars: number;
	processingTime: number;
	modelUsed: string;
	dimension: number;
	success: boolean;
	error?: string;
	timestamp: number;
}

// ================================
// Event Listener Types
// ================================

export type A2AEventListener<T = any> = (event: A2AEvent & { data: T }) => void;
export type WebSocketEventListener = (data?: unknown) => void;

// ================================
// A2A WebSocket Manager
// ================================

export class A2AWebSocketManager {
	private socket: WebSocket | null = null;
	private readonly eventListeners: Map<string, Set<A2AEventListener>> = new Map();
	private readonly wsListeners: Map<string, Set<WebSocketEventListener>> = new Map();
	private reconnectAttempts = 0;
	private readonly maxReconnectAttempts = 5;
	private readonly reconnectDelay = 1000;
	private readonly eventHistory: A2AEvent[] = [];
	private readonly maxHistorySize = 1000;
	private sessionId: string;

	constructor() {
		this.sessionId = this.generateSessionId();
	}

	// ================================
	// Connection Management
	// ================================

	connect(token: string): void {
		if (this.socket?.readyState === WebSocket.OPEN) {
			return;
		}

		// Close existing connection if any
		this.disconnect();

		const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/ws?token=${token}&sessionId=${this.sessionId}`;
		this.socket = new WebSocket(wsUrl);

		this.socket.onopen = () => {
			console.log('A2A WebSocket connected');
			this.reconnectAttempts = 0;
			this.emitWebSocketEvent('connected');

			// Send initial connection event
			this.publishUserEvent({
				sessionId: this.sessionId,
				timestamp: new Date().toISOString(),
				eventType: 'user_connected',
			});
		};

		this.socket.onmessage = (event) => {
			try {
				const message = JSON.parse(event.data);
				this.handleIncomingMessage(message);
			} catch (error) {
				console.error('Error parsing A2A WebSocket message:', error);
			}
		};

		this.socket.onclose = () => {
			console.log('A2A WebSocket disconnected');
			this.emitWebSocketEvent('disconnected');

			// Attempt to reconnect
			if (this.reconnectAttempts < this.maxReconnectAttempts) {
				this.reconnectAttempts++;
				setTimeout(() => {
					console.log(
						`Attempting A2A WebSocket reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
					);
					this.connect(token);
				}, this.reconnectDelay * this.reconnectAttempts);
			}
		};

		this.socket.onerror = (error) => {
			console.error('A2A WebSocket error:', error);
			this.emitWebSocketEvent('error', error);
		};
	}

	disconnect(): void {
		if (this.socket) {
			// Send disconnection event
			this.publishUserEvent({
				sessionId: this.sessionId,
				timestamp: new Date().toISOString(),
				eventType: 'user_disconnected',
			});

			this.socket.close();
			this.socket = null;
		}
	}

	isConnected(): boolean {
		return this.socket?.readyState === WebSocket.OPEN;
	}

	// ================================
	// Message Handling
	// ================================

	private handleIncomingMessage(message: any): void {
		// Handle different message types
		switch (message.type) {
			case 'a2a_event':
				this.handleA2AEvent(message.data);
				break;
			case 'user_event':
				this.handleUserEvent(message.data);
				break;
			case 'system_event':
				this.handleSystemEvent(message.data);
				break;
			case 'agent_event':
				this.handleAgentEvent(message.data);
				break;
			case 'mlx_thermal_warning':
			case 'mlx_thermal_critical':
				this.handleMLXThermalEvent(message);
				break;
			case 'mlx_model_update':
				this.handleMLXModelEvent(message);
				break;
			case 'mlx_embedding_completed':
			case 'mlx_embedding_batch':
				this.handleMLXEmbeddingEvent(message);
				break;
			default:
				// Handle as generic A2A event
				this.handleGenericA2AEvent(message);
		}
	}

	private handleA2AEvent(eventData: A2AEvent): void {
		this.addToHistory(eventData);
		this.emitA2AEvent(eventData.type, eventData);
	}

	private handleUserEvent(data: WebUIUserEvent): void {
		const event: A2AEvent = {
			id: this.generateEventId(),
			type: 'webui.user.event',
			source: 'cortex.webui.backend',
			data,
			timestamp: new Date().toISOString(),
			sessionId: data.sessionId,
		};
		this.handleA2AEvent(event);
	}

	private handleSystemEvent(data: WebUISystemEvent): void {
		const event: A2AEvent = {
			id: this.generateEventId(),
			type: 'webui.system.event',
			source: 'cortex.webui.backend',
			data,
			timestamp: new Date().toISOString(),
			sessionId: data.sessionId,
		};
		this.handleA2AEvent(event);
	}

	private handleAgentEvent(data: WebUIAgentEvent): void {
		const event: A2AEvent = {
			id: this.generateEventId(),
			type: 'webui.agent.event',
			source: 'cortex.webui.backend',
			data,
			timestamp: new Date().toISOString(),
			sessionId: data.sessionId,
		};
		this.handleA2AEvent(event);
	}

	private handleMLXThermalEvent(message: any): void {
		const event: A2AEvent = {
			id: this.generateEventId(),
			type: 'mlx.thermal',
			source: 'cortex.py.mlx',
			data: message.data,
			timestamp: new Date().toISOString(),
			severity: message.severity,
		};
		this.handleA2AEvent(event);
	}

	private handleMLXModelEvent(message: any): void {
		const event: A2AEvent = {
			id: this.generateEventId(),
			type: 'mlx.model',
			source: 'cortex.py.mlx',
			data: message.data,
			timestamp: new Date().toISOString(),
		};
		this.handleA2AEvent(event);
	}

	private handleMLXEmbeddingEvent(message: any): void {
		const event: A2AEvent = {
			id: this.generateEventId(),
			type: 'mlx.embedding',
			source: 'cortex.py.mlx',
			data: message.data,
			timestamp: new Date().toISOString(),
		};
		this.handleA2AEvent(event);
	}

	private handleGenericA2AEvent(message: any): void {
		const event: A2AEvent = {
			id: this.generateEventId(),
			type: message.type || 'unknown',
			source: message.source || 'unknown',
			data: message.data || message,
			timestamp: new Date().toISOString(),
		};
		this.handleA2AEvent(event);
	}

	// ================================
	// Event Publishing
	// ================================

	publishUserEvent(data: WebUIUserEvent): void {
		this.sendMessage('user_event', data);
	}

	publishSystemEvent(data: WebUISystemEvent): void {
		this.sendMessage('system_event', data);
	}

	publishAgentEvent(data: WebUIAgentEvent): void {
		this.sendMessage('agent_event', data);
	}

	private sendMessage(type: string, payload: unknown): void {
		if (this.socket?.readyState === WebSocket.OPEN) {
			this.socket.send(JSON.stringify({ type, payload }));
		} else {
			console.warn('A2A WebSocket is not connected. Message not sent:', type);
		}
	}

	// ================================
	// Event Subscription
	// ================================

	// A2A event subscription
	onA2AEvent<T = any>(eventType: string, callback: A2AEventListener<T>): () => void {
		if (!this.eventListeners.has(eventType)) {
			this.eventListeners.set(eventType, new Set());
		}
		this.eventListeners.get(eventType)?.add(callback as A2AEventListener);

		// Return unsubscribe function
		return () => {
			this.offA2AEvent(eventType, callback);
		};
	}

	offA2AEvent<T = any>(eventType: string, callback: A2AEventListener<T>): void {
		const listeners = this.eventListeners.get(eventType);
		if (listeners) {
			listeners.delete(callback as A2AEventListener);
		}
	}

	// WebSocket connection event subscription
	onWebSocketEvent(event: string, callback: WebSocketEventListener): () => void {
		if (!this.wsListeners.has(event)) {
			this.wsListeners.set(event, new Set());
		}
		this.wsListeners.get(event)?.add(callback);

		// Return unsubscribe function
		return () => {
			this.offWebSocketEvent(event, callback);
		};
	}

	offWebSocketEvent(event: string, callback: WebSocketEventListener): void {
		const listeners = this.wsListeners.get(event);
		if (listeners) {
			listeners.delete(callback);
		}
	}

	private emitA2AEvent(eventType: string, event: A2AEvent): void {
		const listeners = this.eventListeners.get(eventType);
		if (listeners) {
			listeners.forEach((callback) => {
				try {
					callback(event);
				} catch (error) {
					console.error(`Error in A2A event listener for ${eventType}:`, error);
				}
			});
		}

		// Also emit to wildcard listeners
		const wildcardListeners = this.eventListeners.get('*');
		if (wildcardListeners) {
			wildcardListeners.forEach((callback) => {
				try {
					callback(event);
				} catch (error) {
					console.error('Error in wildcard A2A event listener:', error);
				}
			});
		}
	}

	private emitWebSocketEvent(event: string, data?: unknown): void {
		const listeners = this.wsListeners.get(event);
		if (listeners) {
			listeners.forEach((callback) => {
				try {
					callback(data);
				} catch (error) {
					console.error(`Error in WebSocket listener for ${event}:`, error);
				}
			});
		}
	}

	// ================================
	// Event History Management
	// ================================

	private addToHistory(event: A2AEvent): void {
		this.eventHistory.push(event);

		// Keep history size manageable
		if (this.eventHistory.length > this.maxHistorySize) {
			this.eventHistory.splice(0, this.eventHistory.length - this.maxHistorySize);
		}
	}

	getEventHistory(): A2AEvent[] {
		return [...this.eventHistory];
	}

	getEventsByType(eventType: string): A2AEvent[] {
		return this.eventHistory.filter((event) => event.type === eventType);
	}

	getRecentEvents(limit: number = 50): A2AEvent[] {
		return this.eventHistory.slice(-limit);
	}

	clearEventHistory(): void {
		this.eventHistory.length = 0;
	}

	// ================================
	// Session Management
	// ================================

	getSessionId(): string {
		return this.sessionId;
	}

	private generateSessionId(): string {
		const randomBytes = crypto.getRandomValues(new Uint8Array(7));
		const randomStr = Array.from(randomBytes, (byte) => byte.toString(36))
			.join('')
			.slice(0, 9);
		return `webui-${Date.now()}-${randomStr}`;
	}

	private generateEventId(): string {
		const randomBytes = crypto.getRandomValues(new Uint8Array(7));
		const randomStr = Array.from(randomBytes, (byte) => byte.toString(36))
			.join('')
			.slice(0, 9);
		return `event-${Date.now()}-${randomStr}`;
	}

	// ================================
	// Statistics and Analytics
	// ================================

	getConnectionStats(): {
		connected: boolean;
		sessionId: string;
		reconnectAttempts: number;
		eventCount: number;
		eventTypes: string[];
	} {
		const eventTypes = Array.from(new Set(this.eventHistory.map((e) => e.type)));
		return {
			connected: this.isConnected(),
			sessionId: this.sessionId,
			reconnectAttempts: this.reconnectAttempts,
			eventCount: this.eventHistory.length,
			eventTypes,
		};
	}
}

// ================================
// Singleton Instance
// ================================

export const a2aWebSocketManager = new A2AWebSocketManager();
export default a2aWebSocketManager;
