// WebSocket service for real-time communication

import { API_BASE_URL } from '../constants';

type Listener = (data?: unknown) => void;

class SocketService {
	private socket: WebSocket | null = null;
	private readonly listeners: Map<string, Set<Listener>> = new Map();
	private reconnectAttempts = 0;
	private readonly maxReconnectAttempts = 5;
	private readonly reconnectDelay = 1000;

	connect(token: string) {
		if (this.socket?.readyState === WebSocket.OPEN) {
			return;
		}

		// Close existing connection if any
		this.disconnect();

		const wsUrl = API_BASE_URL.replace('http', 'ws') + '/ws?token=' + token;
		this.socket = new WebSocket(wsUrl);

		this.socket.onopen = () => {
			console.log('WebSocket connected');
			this.reconnectAttempts = 0;
			this.emit('connected');
		};

		this.socket.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				this.emit(data.type, data.payload);
			} catch (error) {
				console.error('Error parsing WebSocket message:', error);
			}
		};

		this.socket.onclose = () => {
			console.log('WebSocket disconnected');
			this.emit('disconnected');

			// Attempt to reconnect
			if (this.reconnectAttempts < this.maxReconnectAttempts) {
				this.reconnectAttempts++;
				setTimeout(() => {
					console.log(
						`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
					);
					this.connect(token);
				}, this.reconnectDelay * this.reconnectAttempts);
			}
		};

		this.socket.onerror = (error) => {
			console.error('WebSocket error:', error);
			this.emit('error', error);
		};
	}

	disconnect() {
		if (this.socket) {
			this.socket.close();
			this.socket = null;
		}
	}

	send(type: string, payload: unknown = {}) {
		if (this.socket?.readyState === WebSocket.OPEN) {
			this.socket.send(JSON.stringify({ type, payload }));
		} else {
			console.warn('WebSocket is not connected. Message not sent:', type);
		}
	}

	on(event: string, callback: Listener) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)?.add(callback);
	}

	off(event: string, callback: Listener) {
		const listeners = this.listeners.get(event);
		if (listeners) {
			listeners.delete(callback);
		}
	}

	private emit(event: string, data?: unknown) {
		const listeners = this.listeners.get(event);
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

	isConnected(): boolean {
		return this.socket?.readyState === WebSocket.OPEN;
	}
}

// Export singleton instance
export default new SocketService();
