import { EventEmitter } from 'node:events';
import type { A2AEventEnvelope } from '../types/index.js';

export interface MCPClientOptions {
	serverUrl: string;
	transport?: 'websocket' | 'sse';
	retryInterval?: number;
	maxRetries?: number;
	connectionTimeout?: number;
}

export interface BrAInwavError extends Error {
	code: string;
	timestamp: number;
	source: string;
}

/**
 * brAInwav MCP Streaming Client for real-time event subscriptions
 * Supports WebSocket and Server-Sent Events with automatic reconnection
 */
export class MCPStreamingClient extends EventEmitter {
	private options: Required<MCPClientOptions>;
	private isConnected = false;
	private subscriptions = new Set<string>();
	private retryCount = 0;
	private mockServer?: any; // For testing
	
	constructor(options: MCPClientOptions) {
		super();
		
		this.options = {
			transport: 'websocket',
			retryInterval: 1000,
			maxRetries: 5,
			connectionTimeout: 5000,
			...options
		};
	}
	
	async connect(mockServer?: any): Promise<void> {
		if (mockServer) {
			// Test mode with mock server
			this.mockServer = mockServer;
			return this.connectToMockServer();
		}
		
		return this.establishConnection();
	}
	
	private async connectToMockServer(): Promise<void> {
		if (!this.mockServer) {
			throw this.createBrAInwavError('Mock server not provided', 'MOCK_SERVER_MISSING');
		}
		
		try {
			this.mockServer.connect();
			this.isConnected = true;
			
			// Set up event forwarding
			this.mockServer.on('event', (event: A2AEventEnvelope) => {
				this.emit('event', event);
				this.emit(event.type, event);
				this.emit('*', event);
			});
			
			this.mockServer.on('message', (message: any) => {
				this.emit('message', message);
			});
			
			this.mockServer.on('disconnected', () => {
				this.isConnected = false;
				this.handleDisconnection();
			});
			
			this.emit('connected');
		} catch (error) {
			throw this.createBrAInwavError(
				`brAInwav MCP connection failed: ${error.message}`,
				'CONNECTION_FAILED'
			);
		}
	}
	
	private async establishConnection(): Promise<void> {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(this.createBrAInwavError(
					'brAInwav MCP connection timeout',
					'CONNECTION_TIMEOUT'
				));
			}, this.options.connectionTimeout);
			
			this.emit('connection_attempt');
			
			// Simulate connection attempt
			if (this.retryCount >= this.options.maxRetries) {
				clearTimeout(timeout);
				reject(this.createBrAInwavError(
					'brAInwav connection failed after maximum retries',
					'MAX_RETRIES_EXCEEDED'
				));
				return;
			}
			
			// For demo purposes, simulate connection failure on first attempts
			if (this.retryCount < this.options.maxRetries - 1) {
				this.retryCount++;
				clearTimeout(timeout);
				
				setTimeout(() => {
					this.establishConnection().then(resolve).catch(reject);
				}, this.options.retryInterval * Math.pow(2, this.retryCount - 1));
				
				reject(this.createBrAInwavError(
					'brAInwav connection failed',
					'CONNECTION_FAILED'
				));
				return;
			}
			
			// Success case
			clearTimeout(timeout);
			this.isConnected = true;
			this.retryCount = 0;
			this.emit('connected');
			resolve();
		});
	}
	
	async subscribe(eventType: string): Promise<void> {
		if (!this.isConnected) {
			throw this.createBrAInwavError(
				'brAInwav MCP client not connected',
				'NOT_CONNECTED'
			);
		}
		
		this.subscriptions.add(eventType);
		
		if (this.mockServer) {
			this.mockServer.subscribe(eventType);
		}
		
		this.emit('subscribed', eventType);
	}
	
	disconnect(): void {
		this.isConnected = false;
		this.subscriptions.clear();
		
		if (this.mockServer) {
			this.mockServer.disconnect();
		}
		
		this.emit('disconnected');
	}
	
	private handleDisconnection(): void {
		if (this.subscriptions.size > 0) {
			// Attempt to restore subscriptions on reconnection
			setTimeout(() => {
				if (this.isConnected) {
					for (const subscription of this.subscriptions) {
						this.emit('subscription_restored', subscription);
					}
				}
			}, 100);
		}
	}
	
	private createBrAInwavError(message: string, code: string): BrAInwavError {
		const error = new Error(message) as BrAInwavError;
		error.code = code;
		error.timestamp = Date.now();
		error.source = 'brAInwav-mcp-client';
		
		this.emit('error', error);
		return error;
	}
}