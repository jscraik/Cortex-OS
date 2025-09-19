/**
 * Agent Toolkit A2A Bus Integration
 *
 * Provides A2A event integration for agent-toolkit events following the
 * brAInwav Cortex-OS Agent-to-Agent communication patterns.
 *
 * Co-authored-by: brAInwav Development Team
 */

import { EventEmitter } from 'node:events';

// Mock bus implementation until proper A2A integration is available
const createMockBus = () => {
	const handlers = new Map<string, Array<(data: unknown) => void>>();

	return {
		publish: async (envelope: any) => {
			const eventHandlers = handlers.get(envelope.type) || [];
			for (const handler of eventHandlers) {
				try {
					handler(envelope.data || envelope);
				} catch (error) {
					console.error(`Error in event handler for ${envelope.type}:`, error);
				}
			}
		},
		bind: async (eventHandlers: Array<{ type: string; handle: (data: unknown) => void }>) => {
			for (const { type, handle } of eventHandlers) {
				const existingHandlers = handlers.get(type) || [];
				existingHandlers.push(handle);
				handlers.set(type, existingHandlers);
			}
			return () => Promise.resolve(); // cleanup function
		},
	};
};

// Agent Toolkit A2A Event Types following Cortex-OS conventions
export const AGENT_TOOLKIT_EVENT_TYPES = {
	SEARCH_STARTED: 'agent_toolkit.search.started',
	SEARCH_COMPLETED: 'agent_toolkit.search.completed',
	CODEMOD_STARTED: 'agent_toolkit.codemod.started',
	CODEMOD_COMPLETED: 'agent_toolkit.codemod.completed',
	VALIDATION_STARTED: 'agent_toolkit.validation.started',
	VALIDATION_COMPLETED: 'agent_toolkit.validation.completed',
	TOOL_EXECUTION_STARTED: 'agent_toolkit.tool.execution.started',
	TOOL_EXECUTION_COMPLETED: 'agent_toolkit.tool.execution.completed',
} as const;

// Basic bus configuration interface
export interface AgentToolkitBusConfig {
	agentId?: string;
}

// Mock envelope creation function
const createMockEnvelope = (data: { type: string; source: string; data: unknown }) => {
	return {
		id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
		type: data.type,
		source: data.source,
		data: data.data,
		occurredAt: new Date().toISOString(),
	};
};

// Event payload interfaces
export interface SearchStartedEvent {
	searchId: string;
	pattern: string;
	path: string;
	toolType: 'search' | 'multi_search';
	timestamp: string;
	requestedBy: string;
}

export interface SearchCompletedEvent {
	searchId: string;
	pattern: string;
	path: string;
	toolType: 'search' | 'multi_search';
	results: {
		matches: Array<{
			file: string;
			line: number;
			content: string;
		}>;
		totalMatches: number;
		searchedFiles: number;
	};
	duration: number;
	success: boolean;
	error?: string;
	timestamp: string;
}

export interface CodemodStartedEvent {
	codemodId: string;
	find: string;
	replace: string;
	path: string;
	timestamp: string;
	requestedBy: string;
}

export interface CodemodCompletedEvent {
	codemodId: string;
	find: string;
	replace: string;
	path: string;
	results: {
		filesModified: number;
		changesApplied: number;
		backupCreated: boolean;
	};
	duration: number;
	success: boolean;
	error?: string;
	timestamp: string;
}

export interface ValidationStartedEvent {
	validationId: string;
	files: string[];
	validators: string[];
	timestamp: string;
	requestedBy: string;
}

export interface ValidationCompletedEvent {
	validationId: string;
	files: string[];
	validators: string[];
	results: {
		filesValidated: number;
		issues: Array<{
			file: string;
			line?: number;
			column?: number;
			severity: 'error' | 'warning' | 'info';
			message: string;
			rule?: string;
		}>;
		totalIssues: number;
		passed: boolean;
	};
	duration: number;
	success: boolean;
	error?: string;
	timestamp: string;
}

export interface ToolExecutionStartedEvent {
	executionId: string;
	toolName: string;
	parameters: Record<string, unknown>;
	timestamp: string;
	requestedBy: string;
}

export interface ToolExecutionCompletedEvent {
	executionId: string;
	toolName: string;
	parameters: Record<string, unknown>;
	result: unknown;
	duration: number;
	success: boolean;
	error?: string;
	timestamp: string;
}

// Union type for all agent toolkit events
export type AgentToolkitEvent =
	| SearchStartedEvent
	| SearchCompletedEvent
	| CodemodStartedEvent
	| CodemodCompletedEvent
	| ValidationStartedEvent
	| ValidationCompletedEvent
	| ToolExecutionStartedEvent
	| ToolExecutionCompletedEvent;

/**
 * Agent Toolkit A2A Bus Integration Class
 * Simplified to follow actual Cortex-OS patterns
 */
export class AgentToolkitBusIntegration extends EventEmitter {
	private bus: ReturnType<typeof createMockBus>;
	private isConnected = false;
	private agentId: string;
	private eventHistory: Map<string, { event: AgentToolkitEvent; timestamp: Date }>;
	private maxHistorySize = 1000;

	constructor(agentId: string) {
		super();
		this.agentId = agentId;
		this.eventHistory = new Map();

		// Initialize bus with mock implementation
		this.bus = createMockBus();

		this.initializeHandlers();
		this.isConnected = true;
		this.emit('bus:connected', { agentId: this.agentId });
	}

	/**
	 * Initialize event handlers for agent toolkit events
	 */
	private initializeHandlers(): void {
		const handlers = Object.values(AGENT_TOOLKIT_EVENT_TYPES).map((eventType) => ({
			type: eventType,
			handle: async (envelope: any) => {
				this.handleIncomingEvent(eventType, envelope.data || envelope);
			},
		}));

		// Bind handlers to bus
		this.bus.bind(handlers).catch((error: any) => {
			this.emit('bus:error', error);
			console.error('Failed to bind Agent Toolkit event handlers:', error);
		});
	}

	/**
	 * Handle incoming A2A events
	 */
	private handleIncomingEvent(eventType: string, eventData: unknown): void {
		try {
			const event = eventData as AgentToolkitEvent;

			// Store in history
			const eventId = this.generateEventId(eventType);
			this.addToHistory(eventId, event);

			// Emit local event
			this.emit('toolkit:event', { type: eventType, data: event });

			// Emit specific event types
			switch (eventType) {
				case AGENT_TOOLKIT_EVENT_TYPES.SEARCH_STARTED:
					this.emit('search:started', event as SearchStartedEvent);
					break;
				case AGENT_TOOLKIT_EVENT_TYPES.SEARCH_COMPLETED:
					this.emit('search:completed', event as SearchCompletedEvent);
					break;
				case AGENT_TOOLKIT_EVENT_TYPES.CODEMOD_STARTED:
					this.emit('codemod:started', event as CodemodStartedEvent);
					break;
				case AGENT_TOOLKIT_EVENT_TYPES.CODEMOD_COMPLETED:
					this.emit('codemod:completed', event as CodemodCompletedEvent);
					break;
				case AGENT_TOOLKIT_EVENT_TYPES.VALIDATION_STARTED:
					this.emit('validation:started', event as ValidationStartedEvent);
					break;
				case AGENT_TOOLKIT_EVENT_TYPES.VALIDATION_COMPLETED:
					this.emit('validation:completed', event as ValidationCompletedEvent);
					break;
				case AGENT_TOOLKIT_EVENT_TYPES.TOOL_EXECUTION_STARTED:
					this.emit('tool:started', event as ToolExecutionStartedEvent);
					break;
				case AGENT_TOOLKIT_EVENT_TYPES.TOOL_EXECUTION_COMPLETED:
					this.emit('tool:completed', event as ToolExecutionCompletedEvent);
					break;
			}
		} catch (error) {
			this.emit('event:error', { error, eventType, eventData });
		}
	}

	/**
	 * Publish search started event
	 */
	async publishSearchStarted(data: Omit<SearchStartedEvent, 'timestamp'>): Promise<void> {
		const event: SearchStartedEvent = {
			...data,
			timestamp: new Date().toISOString(),
		};

		await this.publishEvent(AGENT_TOOLKIT_EVENT_TYPES.SEARCH_STARTED, event);
	}

	/**
	 * Publish search completed event
	 */
	async publishSearchCompleted(data: Omit<SearchCompletedEvent, 'timestamp'>): Promise<void> {
		const event: SearchCompletedEvent = {
			...data,
			timestamp: new Date().toISOString(),
		};

		await this.publishEvent(AGENT_TOOLKIT_EVENT_TYPES.SEARCH_COMPLETED, event);
	}

	/**
	 * Publish codemod started event
	 */
	async publishCodemodStarted(data: Omit<CodemodStartedEvent, 'timestamp'>): Promise<void> {
		const event: CodemodStartedEvent = {
			...data,
			timestamp: new Date().toISOString(),
		};

		await this.publishEvent(AGENT_TOOLKIT_EVENT_TYPES.CODEMOD_STARTED, event);
	}

	/**
	 * Publish codemod completed event
	 */
	async publishCodemodCompleted(data: Omit<CodemodCompletedEvent, 'timestamp'>): Promise<void> {
		const event: CodemodCompletedEvent = {
			...data,
			timestamp: new Date().toISOString(),
		};

		await this.publishEvent(AGENT_TOOLKIT_EVENT_TYPES.CODEMOD_COMPLETED, event);
	}

	/**
	 * Publish validation started event
	 */
	async publishValidationStarted(data: Omit<ValidationStartedEvent, 'timestamp'>): Promise<void> {
		const event: ValidationStartedEvent = {
			...data,
			timestamp: new Date().toISOString(),
		};

		await this.publishEvent(AGENT_TOOLKIT_EVENT_TYPES.VALIDATION_STARTED, event);
	}

	/**
	 * Publish validation completed event
	 */
	async publishValidationCompleted(
		data: Omit<ValidationCompletedEvent, 'timestamp'>,
	): Promise<void> {
		const event: ValidationCompletedEvent = {
			...data,
			timestamp: new Date().toISOString(),
		};

		await this.publishEvent(AGENT_TOOLKIT_EVENT_TYPES.VALIDATION_COMPLETED, event);
	}

	/**
	 * Publish tool execution started event
	 */
	async publishToolExecutionStarted(
		data: Omit<ToolExecutionStartedEvent, 'timestamp'>,
	): Promise<void> {
		const event: ToolExecutionStartedEvent = {
			...data,
			timestamp: new Date().toISOString(),
		};

		await this.publishEvent(AGENT_TOOLKIT_EVENT_TYPES.TOOL_EXECUTION_STARTED, event);
	}

	/**
	 * Publish tool execution completed event
	 */
	async publishToolExecutionCompleted(
		data: Omit<ToolExecutionCompletedEvent, 'timestamp'>,
	): Promise<void> {
		const event: ToolExecutionCompletedEvent = {
			...data,
			timestamp: new Date().toISOString(),
		};

		await this.publishEvent(AGENT_TOOLKIT_EVENT_TYPES.TOOL_EXECUTION_COMPLETED, event);
	}

	/**
	 * Generic event publisher using Cortex-OS envelope pattern
	 */
	private async publishEvent(eventType: string, event: AgentToolkitEvent): Promise<void> {
		if (!this.isConnected) {
			this.emit('publish:error', { error: 'Bus not connected', eventType, event });
			return;
		}

		try {
			const envelope = createMockEnvelope({
				type: eventType,
				source: `urn:cortex:agents:${this.agentId}`,
				data: event,
			});

			await this.bus.publish(envelope);

			// Store in local history
			const eventId = this.generateEventId(eventType);
			this.addToHistory(eventId, event);

			this.emit('event:published', { eventType, event });
		} catch (error) {
			this.emit('publish:error', { error, eventType, event });
		}
	}

	/**
	 * Get event history
	 */
	getEventHistory(): Array<{ id: string; event: AgentToolkitEvent; timestamp: Date }> {
		return Array.from(this.eventHistory.entries()).map(([id, data]) => ({
			id,
			event: data.event,
			timestamp: data.timestamp,
		}));
	}

	/**
	 * Clear event history
	 */
	clearEventHistory(): void {
		this.eventHistory.clear();
	}

	/**
	 * Get connection status
	 */
	isReady(): boolean {
		return this.isConnected;
	}

	/**
	 * Generate unique event ID
	 */
	private generateEventId(eventType: string): string {
		return `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Add event to history with size limit
	 */
	private addToHistory(eventId: string, event: AgentToolkitEvent): void {
		this.eventHistory.set(eventId, {
			event,
			timestamp: new Date(),
		});

		// Maintain history size limit
		if (this.eventHistory.size > this.maxHistorySize) {
			const oldestKey = this.eventHistory.keys().next().value;
			if (oldestKey) {
				this.eventHistory.delete(oldestKey);
			}
		}
	}

	/**
	 * Get statistics about events
	 */
	getEventStats(): {
		totalEvents: number;
		eventsByType: Record<string, number>;
		recentEvents: number; // events in last hour
	} {
		const events = this.getEventHistory();
		const totalEvents = events.length;
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

		const eventsByType: Record<string, number> = {};
		let recentEvents = 0;

		for (const { event, timestamp } of events) {
			// Count by type (extract from event structure)
			const eventType = this.getEventTypeFromEvent(event);
			eventsByType[eventType] = (eventsByType[eventType] || 0) + 1;

			// Count recent events
			if (timestamp > oneHourAgo) {
				recentEvents++;
			}
		}

		return {
			totalEvents,
			eventsByType,
			recentEvents,
		};
	}

	/**
	 * Extract event type from event data
	 */
	private getEventTypeFromEvent(event: AgentToolkitEvent): string {
		if ('searchId' in event) {
			return 'results' in event ? 'search_completed' : 'search_started';
		}
		if ('codemodId' in event) {
			return 'results' in event ? 'codemod_completed' : 'codemod_started';
		}
		if ('validationId' in event) {
			return 'results' in event ? 'validation_completed' : 'validation_started';
		}
		if ('executionId' in event) {
			return 'result' in event ? 'tool_execution_completed' : 'tool_execution_started';
		}
		return 'unknown';
	}
}

/**
 * Factory function to create Agent Toolkit A2A Bus Integration
 */
export function createAgentToolkitBusIntegration(agentId: string): AgentToolkitBusIntegration {
	return new AgentToolkitBusIntegration(agentId);
}
