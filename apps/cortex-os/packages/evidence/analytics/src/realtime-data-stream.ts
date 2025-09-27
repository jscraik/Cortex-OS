/**
 * @file_path packages/orchestration-analytics/src/realtime-data-stream.ts
 * @description WebSocket-based real-time data streaming for analytics dashboard
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-04
 * @version 1.0.0
 * @status active
 * @ai_generated_by human
 * @ai_provenance_hash N/A
 */

import { EventEmitter } from 'node:events';
import * as net from 'node:net';
import WebSocket, { WebSocketServer } from 'ws';
import type { AnalyticsConfig, DashboardData } from './types.js';

/**
 * Find an available port starting from a base port
 */
async function _findAvailablePort(startPort: number = 9000): Promise<number> {
	for (let port = startPort; port < startPort + 100; port++) {
		if (await isPortAvailable(port)) {
			return port;
		}
	}
	throw new Error(`No available port found starting from ${startPort}`);
}

/**
 * Check if a port is available
 */
async function isPortAvailable(port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const server = net.createServer();

		server.listen(port, 'localhost', () => {
			server.close(() => {
				resolve(true);
			});
		});

		server.on('error', () => {
			resolve(false);
		});
	});
}

/**
 * Real-time data streaming service for analytics dashboard
 */
export class RealtimeDataStream extends EventEmitter {
	private server?: WebSocketServer;
	private readonly clients: Set<WebSocket> = new Set();

	constructor(
		_config: AnalyticsConfig,
		private readonly port: number = 8080,
	) {
		super();
	}

	/**
	 * Start WebSocket server for real-time data streaming
	 */
	start(): void {
		this.server = new WebSocketServer({ port: this.port });

		this.server.on('connection', (ws: WebSocket) => {
			this.clients.add(ws);

			ws.on('close', () => {
				this.clients.delete(ws);
			});
		});
	}

	/**
	 * Broadcast data to all connected clients
	 */
	broadcast(data: DashboardData): void {
		const message = JSON.stringify(data);

		this.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(message);
			}
		});
	}

	/**
	 * Stop the WebSocket server
	 */
	stop(): void {
		if (this.server) {
			this.server.close();
		}
		this.clients.clear();
	}
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
