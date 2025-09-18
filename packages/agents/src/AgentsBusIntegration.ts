/**
 * @file Agents Bus Integration
 * @description A2A bus integration for agents package following standardized pattern
 * @author brAInwav Cortex-OS Team
 * @version 1.0.0
 */

import { randomUUID } from 'node:crypto';
import { type AgentsBusConfig, createAgentsBus } from './a2a.js';

/**
 * Agents Bus Integration - handles agent coordination events via A2A
 */
export class AgentsBusIntegration {
	private bus: ReturnType<typeof createAgentsBus>;
	private isInitialized = false;

	constructor(config: AgentsBusConfig = {}) {
		this.bus = createAgentsBus(config);
	}

	/**
	 * Initialize the bus integration
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) return;

		// Set up event handlers
		this.setupEventHandlers();

		this.isInitialized = true;
		console.log('[AgentsBusIntegration] Initialized A2A bus integration');
	}

	/**
	 * Set up event handlers for cross-package communication
	 */
	private setupEventHandlers(): void {
		// Listen for agent lifecycle events
		this.bus.onAgentCreated((data) => {
			console.log(`[AgentsBusIntegration] Agent created: ${data.agentId}`);
		});

		this.bus.onTaskStarted((data) => {
			console.log(
				`[AgentsBusIntegration] Task started: ${data.taskId} for agent ${data.agentId}`,
			);
		});

		this.bus.onTaskCompleted((data) => {
			console.log(
				`[AgentsBusIntegration] Task completed: ${data.taskId} with status ${data.status}`,
			);
		});

		this.bus.onCommunication((data) => {
			console.log(
				`[AgentsBusIntegration] Communication: ${data.fromAgent} -> ${data.toAgent}`,
			);
		});
	}

	/**
	 * Notify about agent creation
	 */
	async notifyAgentCreated(
		agentId: string,
		agentType: string,
		capabilities: string[],
	): Promise<void> {
		await this.bus.emitAgentCreated({
			agentId,
			agentType,
			capabilities,
			configuration: {},
			createdBy: 'cortex-agents',
			createdAt: new Date().toISOString(),
		});
	}

	/**
	 * Notify about task start
	 */
	async notifyTaskStarted(
		taskId: string,
		agentId: string,
		taskType: string,
		description: string,
		priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
	): Promise<void> {
		await this.bus.emitTaskStarted({
			taskId,
			agentId,
			taskType,
			description,
			priority,
			startedAt: new Date().toISOString(),
		});
	}

	/**
	 * Notify about task completion
	 */
	async notifyTaskCompleted(
		taskId: string,
		agentId: string,
		taskType: string,
		status: 'success' | 'failed' | 'cancelled',
		durationMs: number,
		result?: Record<string, unknown>,
		errorMessage?: string,
	): Promise<void> {
		await this.bus.emitTaskCompleted({
			taskId,
			agentId,
			taskType,
			status,
			durationMs,
			result,
			errorMessage,
			completedAt: new Date().toISOString(),
		});
	}

	/**
	 * Notify about agent communication
	 */
	async notifyCommunication(
		fromAgent: string,
		toAgent: string,
		messageType: string,
		content: Record<string, unknown>,
		correlationId?: string,
	): Promise<void> {
		await this.bus.emitCommunication({
			communicationId: randomUUID(),
			fromAgent,
			toAgent,
			messageType,
			content,
			correlationId,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Get bus instance for direct access
	 */
	getBus(): ReturnType<typeof createAgentsBus> {
		return this.bus;
	}

	/**
	 * Clean up resources
	 */
	async destroy(): Promise<void> {
		await this.bus.destroy();
		this.isInitialized = false;
		console.log('[AgentsBusIntegration] Bus integration destroyed');
	}
}

/**
 * Create agents bus integration instance
 */
export function createAgentsBusIntegration(
	config: AgentsBusConfig = {},
): AgentsBusIntegration {
	return new AgentsBusIntegration(config);
}
