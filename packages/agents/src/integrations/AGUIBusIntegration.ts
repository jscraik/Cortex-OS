/**
 * AGUI A2A Bus Integration
 *
 * Handles AGUI events and A2A bus communication for UI interactions
 * following the brAInwav Cortex-OS A2A native communication pattern.
 *
 * Co-authored-by: brAInwav Development Team
 */

import { EventEmitter } from 'node:events';
import type { Envelope } from '@cortex-os/a2a-contracts';
import { createEnvelope } from '@cortex-os/a2a-contracts';

// AGUI Event Types following Cortex-OS patterns
export const AGUI_EVENT_TYPES = {
	COMPONENT_RENDERED: 'agui.component.rendered',
	USER_INTERACTION: 'agui.user.interaction',
	AI_RECOMMENDATION: 'agui.ai.recommendation',
	STATE_CHANGED: 'agui.state.changed',
	VIEW_RENDERED: 'agui.view.rendered',
	COMPONENT_UPDATED: 'agui.component.updated',
} as const;

export type AguiEventType = (typeof AGUI_EVENT_TYPES)[keyof typeof AGUI_EVENT_TYPES];

// AGUI Event Data Interfaces
export interface ComponentRenderedEventData {
	componentId: string;
	type: 'button' | 'form' | 'modal' | 'chart' | 'table' | 'custom';
	name: string;
	properties?: Record<string, unknown>;
	parentId?: string;
	renderedBy: string;
	renderedAt: string;
}

export interface UserInteractionEventData {
	interactionId: string;
	componentId: string;
	action: 'click' | 'hover' | 'focus' | 'input' | 'submit' | 'drag' | 'scroll';
	value?: unknown;
	coordinates?: { x: number; y: number };
	userId?: string;
	sessionId?: string;
	interactedAt: string;
}

export interface ViewRenderedEventData {
	viewId: string;
	components: string[];
	layout: 'grid' | 'flex' | 'stack';
	responsive: boolean;
	renderedBy: string;
	renderedAt: string;
}

export interface ComponentUpdatedEventData {
	componentId: string;
	updates: {
		properties?: Record<string, unknown>;
		styling?: Record<string, unknown>;
		visible?: boolean;
	};
	updatedBy: string;
	updatedAt: string;
}

/**
 * AGUI Bus Integration Class
 */
export class AGUIBusIntegration extends EventEmitter {
	private agentId: string;
	private busConnected = false;

	constructor(agentId: string) {
		super();
		this.agentId = agentId;
	}

	/**
	 * Initialize A2A bus connection for AGUI events
	 */
	async initialize(): Promise<void> {
		try {
			// Set up event listeners for AGUI events
			this.setupEventHandlers();
			this.busConnected = true;

			this.emit('bus:connected', {
				agentId: this.agentId,
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			this.emit('bus:connection-failed', {
				agentId: this.agentId,
				error: error instanceof Error ? error.message : String(error),
				timestamp: new Date().toISOString(),
			});
			throw error;
		}
	}

	/**
	 * Publish component rendered event
	 */
	async publishComponentRendered(data: ComponentRenderedEventData): Promise<void> {
		const envelope = this.createEventEnvelope(AGUI_EVENT_TYPES.COMPONENT_RENDERED, data);
		await this.publishEvent(envelope);
	}

	/**
	 * Publish user interaction event
	 */
	async publishUserInteraction(data: UserInteractionEventData): Promise<void> {
		const envelope = this.createEventEnvelope(AGUI_EVENT_TYPES.USER_INTERACTION, data);
		await this.publishEvent(envelope);
	}

	/**
	 * Publish view rendered event
	 */
	async publishViewRendered(data: ViewRenderedEventData): Promise<void> {
		const envelope = this.createEventEnvelope(AGUI_EVENT_TYPES.VIEW_RENDERED, data);
		await this.publishEvent(envelope);
	}

	/**
	 * Publish component updated event
	 */
	async publishComponentUpdated(data: ComponentUpdatedEventData): Promise<void> {
		const envelope = this.createEventEnvelope(AGUI_EVENT_TYPES.COMPONENT_UPDATED, data);
		await this.publishEvent(envelope);
	}

	/**
	 * Handle incoming AGUI events from the bus
	 */
	handleIncomingEvent(envelope: Envelope): void {
		try {
			switch (envelope.type) {
				case AGUI_EVENT_TYPES.COMPONENT_RENDERED:
					this.emit('component:rendered', envelope.data);
					break;
				case AGUI_EVENT_TYPES.USER_INTERACTION:
					this.emit('user:interaction', envelope.data);
					break;
				case AGUI_EVENT_TYPES.VIEW_RENDERED:
					this.emit('view:rendered', envelope.data);
					break;
				case AGUI_EVENT_TYPES.COMPONENT_UPDATED:
					this.emit('component:updated', envelope.data);
					break;
				default:
					this.emit('event:unknown', {
						type: envelope.type,
						data: envelope.data,
					});
			}
		} catch (error) {
			this.emit('event:error', {
				error: error instanceof Error ? error.message : String(error),
				envelope,
			});
		}
	}

	/**
	 * Create UI component and publish rendered event
	 */
	async createUIComponent(componentData: {
		type: string;
		properties: Record<string, unknown>;
		parentId?: string;
	}): Promise<string> {
		const componentId = `ui-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		// Publish component rendered event
		await this.publishComponentRendered({
			componentId,
			type: componentData.type as any,
			name: `${componentData.type}-${componentId}`,
			properties: componentData.properties,
			parentId: componentData.parentId,
			renderedBy: this.agentId,
			renderedAt: new Date().toISOString(),
		});

		return componentId;
	}

	/**
	 * Render UI view and publish rendered event
	 */
	async renderUIView(viewData: {
		components: string[];
		layout?: 'grid' | 'flex' | 'stack';
		responsive?: boolean;
	}): Promise<string> {
		const viewId = `view-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		// Publish view rendered event
		await this.publishViewRendered({
			viewId,
			components: viewData.components,
			layout: viewData.layout || 'flex',
			responsive: viewData.responsive ?? true,
			renderedBy: this.agentId,
			renderedAt: new Date().toISOString(),
		});

		return viewId;
	}

	/**
	 * Process user interaction
	 */
	async processUserInteraction(interactionData: {
		componentId: string;
		action: string;
		value?: unknown;
		coordinates?: { x: number; y: number };
	}): Promise<string> {
		const interactionId = `int-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		// Publish user interaction event
		await this.publishUserInteraction({
			interactionId,
			componentId: interactionData.componentId,
			action: interactionData.action as any,
			value: interactionData.value,
			coordinates: interactionData.coordinates,
			interactedAt: new Date().toISOString(),
		});

		return interactionId;
	}

	/**
	 * Get integration status
	 */
	getStatus(): {
		agentId: string;
		connected: boolean;
		timestamp: string;
	} {
		return {
			agentId: this.agentId,
			connected: this.busConnected,
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Shutdown bus integration
	 */
	async shutdown(): Promise<void> {
		this.busConnected = false;
		this.removeAllListeners();

		this.emit('bus:disconnected', {
			agentId: this.agentId,
			timestamp: new Date().toISOString(),
		});
	}

	// Private helper methods

	private setupEventHandlers(): void {
		// Set up internal event handlers
		this.on('component:rendered', () => {
			// Handle component rendered internally
		});

		this.on('user:interaction', () => {
			// Handle user interaction internally
		});

		this.on('view:rendered', () => {
			// Handle view rendered internally
		});

		this.on('component:updated', () => {
			// Handle component updated internally
		});
	}

	private createEventEnvelope(eventType: AguiEventType, data: unknown): Envelope {
		return createEnvelope({
			type: eventType,
			source: `urn:cortex:agent:${this.agentId}`,
			data,
		});
	}

	private async publishEvent(envelope: Envelope): Promise<void> {
		if (!this.busConnected) {
			throw new Error('Bus not connected');
		}

		// Simulate publishing to A2A bus
		// In real implementation, this would use the actual A2A bus
		this.emit('event:published', {
			type: envelope.type,
			source: envelope.source,
			timestamp: envelope.time,
		});
	}
}

/**
 * Factory function to create AGUI bus integration
 */
export function createAGUIBusIntegration(agentId: string): AGUIBusIntegration {
	return new AGUIBusIntegration(agentId);
}
