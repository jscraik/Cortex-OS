import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import type { A2AEventEnvelope } from '@cortex-os/a2a-core';

// Mock MCP server for testing
class MockMCPServer extends EventEmitter {
	private isConnected = false;
	
	connect() {
		this.isConnected = true;
		this.emit('connected');
	}
	
	disconnect() {
		this.isConnected = false;
		this.emit('disconnected');
	}
	
	subscribe(eventType: string) {
		if (!this.isConnected) {
			throw new Error('brAInwav MCP server not connected');
		}
		this.emit('subscribed', eventType);
	}
	
	simulateEvent(event: A2AEventEnvelope) {
		if (this.isConnected) {
			this.emit('event', event);
		}
	}
}

// Import the streaming client (needs to be implemented)
import { MCPStreamingClient } from '../../../a2a-core/src/streaming/mcp-client.js';

describe('MCP Streaming Subscription', () => {
	let mockServer: MockMCPServer;
	let streamingClient: MCPStreamingClient;
	
	beforeEach(() => {
		mockServer = new MockMCPServer();
		streamingClient = new MCPStreamingClient({
			serverUrl: 'ws://localhost:8080/mcp',
			retryInterval: 100,
			maxRetries: 3
		});
	});
	
	afterEach(() => {
		vi.clearAllMocks();
		mockServer.removeAllListeners();
		streamingClient.disconnect();
	});
	
	it('establishes connection and receives event stream updates', async () => {
		const eventReceived = vi.fn();
		streamingClient.on('event', eventReceived);
		
		// Connect to mock server
		await streamingClient.connect(mockServer);
		
		// Subscribe to event type
		await streamingClient.subscribe('user_action');
		
		// Simulate server sending events
		const testEvent: A2AEventEnvelope = {
			id: 'stream-test-001',
			type: 'user_action',
			source: 'brAInwav-ui',
			timestamp: Date.now(),
			data: {
				action: 'click',
				target: 'submit-button',
				userId: 'user-123'
			},
			metadata: {
				sessionId: 'session-456',
				userAgent: 'brAInwav-client/1.0.0'
			}
		};
		
		mockServer.simulateEvent(testEvent);
		
		// Wait for event processing
		await new Promise(resolve => setTimeout(resolve, 50));
		
		expect(eventReceived).toHaveBeenCalledTimes(1);
		expect(eventReceived).toHaveBeenCalledWith(testEvent);
	});
	
	it('handles multiple event types and filtering', async () => {
		const userActionEvents = vi.fn();
		const systemEvents = vi.fn();
		const allEvents = vi.fn();
		
		streamingClient.on('user_action', userActionEvents);
		streamingClient.on('system_event', systemEvents);
		streamingClient.on('*', allEvents); // Wildcard listener
		
		await streamingClient.connect(mockServer);
		await streamingClient.subscribe('user_action');
		await streamingClient.subscribe('system_event');
		
		// Send different event types
		const userEvent: A2AEventEnvelope = {
			id: 'user-001',
			type: 'user_action',
			source: 'brAInwav-ui',
			timestamp: Date.now(),
			data: { action: 'navigation' }
		};
		
		const systemEvent: A2AEventEnvelope = {
			id: 'system-001',
			type: 'system_event',
			source: 'brAInwav-monitor',
			timestamp: Date.now(),
			data: { status: 'healthy', uptime: 3600 }
		};
		
		mockServer.simulateEvent(userEvent);
		mockServer.simulateEvent(systemEvent);
		
		await new Promise(resolve => setTimeout(resolve, 50));
		
		expect(userActionEvents).toHaveBeenCalledTimes(1);
		expect(userActionEvents).toHaveBeenCalledWith(userEvent);
		
		expect(systemEvents).toHaveBeenCalledTimes(1);
		expect(systemEvents).toHaveBeenCalledWith(systemEvent);
		
		expect(allEvents).toHaveBeenCalledTimes(2);
	});
	
	it('implements reconnection logic with exponential backoff', async () => {
		const connectionAttempts = vi.fn();
		streamingClient.on('connection_attempt', connectionAttempts);
		
		// Simulate connection failures
		const failingServer = new MockMCPServer();
		failingServer.connect = vi.fn(() => {
			connectionAttempts();
			throw new Error('brAInwav connection failed');
		});
		
		// Should retry with backoff
		const connectPromise = streamingClient.connect(failingServer);
		
		// Wait for retries
		await new Promise(resolve => setTimeout(resolve, 500));
		
		expect(connectionAttempts).toHaveBeenCalledTimes(3); // Initial + 2 retries
		
		// Should eventually reject
		await expect(connectPromise).rejects.toThrow('brAInwav connection failed');
	});
	
	it('handles WebSocket connection with Server-Sent Events fallback', async () => {
		const messageReceived = vi.fn();
		streamingClient.on('message', messageReceived);
		
		// Test WebSocket connection
		const wsClient = new MCPStreamingClient({
			serverUrl: 'ws://localhost:8080/mcp',
			transport: 'websocket'
		});
		
		await wsClient.connect(mockServer);
		
		// Test SSE fallback
		const sseClient = new MCPStreamingClient({
			serverUrl: 'http://localhost:8080/mcp/events',
			transport: 'sse'
		});
		
		await sseClient.connect(mockServer);
		
		const testMessage = {
			type: 'ping',
			timestamp: Date.now(),
			source: 'brAInwav-heartbeat'
		};
		
		mockServer.emit('message', testMessage);
		
		await new Promise(resolve => setTimeout(resolve, 50));
		
		// Both clients should receive the message
		expect(messageReceived).toHaveBeenCalledWith(testMessage);
		
		wsClient.disconnect();
		sseClient.disconnect();
	});
	
	it('maintains subscription state across reconnections', async () => {
		const subscriptionRestored = vi.fn();
		streamingClient.on('subscription_restored', subscriptionRestored);
		
		await streamingClient.connect(mockServer);
		await streamingClient.subscribe('user_action');
		await streamingClient.subscribe('system_event');
		
		// Simulate connection loss
		mockServer.disconnect();
		
		// Simulate reconnection
		mockServer.connect();
		
		await new Promise(resolve => setTimeout(resolve, 100));
		
		// Should restore both subscriptions
		expect(subscriptionRestored).toHaveBeenCalledTimes(2);
		expect(subscriptionRestored).toHaveBeenCalledWith('user_action');
		expect(subscriptionRestored).toHaveBeenCalledWith('system_event');
	});
	
	it('provides brAInwav branded error handling and diagnostics', async () => {
		const errorHandler = vi.fn();
		streamingClient.on('error', errorHandler);
		
		// Test connection timeout
		const timeoutClient = new MCPStreamingClient({
			serverUrl: 'ws://timeout-server:9999',
			connectionTimeout: 100
		});
		
		await expect(timeoutClient.connect()).rejects.toThrow();
		
		expect(errorHandler).toHaveBeenCalled();
		const errorCall = errorHandler.mock.calls[0];
		const error = errorCall[0];
		
		expect(error.message).toContain('brAInwav');
		expect(error.code).toBeDefined();
		expect(error.timestamp).toBeDefined();
	});
});