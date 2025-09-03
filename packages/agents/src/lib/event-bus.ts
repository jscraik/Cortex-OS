// Simple event bus implementation that doesn't depend on a2a packages
// This is a minimal implementation for the agents package

export interface Envelope {
	type: string;
	data: any;
	id: string;
	timestamp: string;
	source: string;
}

export interface EventBus {
	publish: (msg: Envelope) => Promise<void>;
	bind: (handlers: Array<{ type: string; handle: (msg: Envelope) => Promise<void> }>) => Promise<void>;
}

export interface EventSubscription {
	unsubscribe: () => Promise<void>;
}

export interface CloudEvent {
	specversion: string;
	type: string;
	source: string;
	id: string;
	time?: string;
	datacontenttype?: string;
	data?: any;
}

export interface EventBusConfig {
	transport?: any;
	validate?: (e: Envelope) => Envelope;
	schemaRegistry?: any;
	retryAttempts?: number;
	timeoutMs?: number;
}

export interface EventSubscriber {
	subscribe: (type: string, handler: (event: CloudEvent) => Promise<void>) => Promise<EventSubscription>;
	unsubscribe: (subscription: EventSubscription) => Promise<void>;
}

export function createEventBus(config: EventBusConfig = {}): EventBus {
	// Create a minimal in-memory transport
	const transport = config.transport || {
		publish: async (msg: Envelope) => {
			// In-memory transport for testing
			console.log('Publishing event:', msg);
		},
		subscribe: async (types: string[], handler: (msg: Envelope) => Promise<void>) => {
			// In-memory subscription for testing
			return { unsubscribe: async () => {} };
		}
	};

	return {
		publish: async (msg: Envelope) => {
			if (config.validate) {
				config.validate(msg);
			}
			await transport.publish(msg);
		},
		bind: async (handlers: Array<{ type: string; handle: (msg: Envelope) => Promise<void> }>) => {
			const types = handlers.map(h => h.type);
			const handlerMap = new Map(handlers.map(h => [h.type, h.handle]));

			return transport.subscribe(types, async (msg: Envelope) => {
				const handler = handlerMap.get(msg.type);
				if (handler) {
					await handler(msg);
				}
			});
		}
	};
}

export function createAgentEventBus(): EventBus {
	return createEventBus({});
}

export function createEventBusForEnvironment(env: string): EventBus {
	return createEventBus({
		// Configure based on environment
	});
}

export function createEventPublisher(bus: EventBus) {
	return {
		publish: bus.publish
	};
}

export function createEventSubscriber(bus: EventBus) {
	return {
		bind: bus.bind
	};
}

export function validateAgentEvent(event: any): Envelope {
	// Basic validation
	if (!event.type || !event.data) {
		throw new Error('Invalid event: missing type or data');
	}

	return {
		type: event.type,
		data: event.data,
		id: event.id || `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
		timestamp: event.timestamp || new Date().toISOString(),
		source: event.source || 'agents'
	};
}
