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

import { EventEmitter } from "events";
import WebSocket from "ws";
import { DashboardData, AnalyticsConfig } from "./types.js";

/**
 * Real-time data streaming service for analytics dashboard
 */
export class RealtimeDataStream extends EventEmitter {
  private server?: WebSocket.Server;
  private clients: Set<WebSocket> = new Set();

  constructor(
    private config: AnalyticsConfig,
    private port: number = 8080,
  ) {
    super();
  }

  /**
   * Start WebSocket server for real-time data streaming
   */
  start(): void {
    this.server = new WebSocket.Server({ port: this.port });

    this.server.on("connection", (ws) => {
      this.clients.add(ws);

      ws.on("close", () => {
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
