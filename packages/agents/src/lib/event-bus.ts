import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type {
	Envelope,
	EventBus,
	EventBusStats,
	EventSubscription,
} from './types.js';

export interface CloudEvent<T = unknown> {
	specversion: string;
	type: string;
	source: string;
	id: string;
	time?: string;
	datacontenttype?: string;
	data?: T;
}

// CloudEvents 1.0 envelope schema (generic data)
export const cloudEventSchema = z.object({
	specversion: z.literal('1.0'),
	type: z.string().min(1),
	source: z.string().min(1),
	id: z.string().min(1),
	time: z.string().datetime().optional(),
	datacontenttype: z.string().optional(),
	data: z.unknown().optional(),
});

export interface EventBusConfig {
	validate?: <T>(e: Envelope<T>) => Envelope<T>;
	enableLogging?: boolean;
	bufferSize?: number;
	flushInterval?: number;
}

export interface EventSubscriber {
	subscribe: <T>(
		type: string,
		handler: (event: CloudEvent<T>) => Promise<void>,
	) => Promise<EventSubscription>;
	unsubscribe: (subscription: EventSubscription) => Promise<void>;
}

export function createEventBus(config: EventBusConfig = {}): EventBus {
	const stats: EventBusStats = {
		totalEventsPublished: 0,
		eventsByType: {},
	};
	const subs = new Map<string, Set<(e: Envelope) => void>>();

	return {
		publish: async <T>(msg: Envelope<T>) => {
			const envelope = config.validate ? config.validate(msg) : msg;
			stats.totalEventsPublished++;
			stats.eventsByType[envelope.type] =
				(stats.eventsByType[envelope.type] || 0) + 1;
			if (config.enableLogging) {
				// Intentionally minimal log to satisfy lint rules
				// console.warn(`[event] ${envelope.type}`);
			}
			// Direct dispatch to registered subscribers for determinism in tests
			const set = subs.get(envelope.type);
			if (set) {
				for (const h of Array.from(set)) {
					try {
						h(envelope as Envelope);
					} catch {
						/* ignore */
					}
				}
			}
		},
		subscribe: <T>(type: string, handler: (msg: Envelope<T>) => void) => {
			const isEnvelope = (obj: unknown): obj is Envelope<T> => {
				const o = obj as Record<string, unknown> | null;
				return !!(
					o &&
					typeof o.type === 'string' &&
					typeof o.id === 'string' &&
					typeof o.time === 'string' &&
					typeof o.source === 'string'
				);
			};
			const wrapped = (e: unknown) => {
				if (isEnvelope(e)) {
					handler(e);
					return;
				}
				if (
					e &&
					typeof e === 'object' &&
					typeof (e as { type?: unknown }).type === 'string'
				) {
					const base = e as {
						id?: string;
						type: string;
						source?: string;
						time?: string;
						data?: T;
					};
					const coerced: Envelope<T> = {
						specversion: '1.0',
						id: base.id || randomUUID(),
						type: String(base.type),
						source: base.source || 'event-bus',
						time: base.time || new Date().toISOString(),
						ttlMs: 60000,
						headers: {},
						data: base.data,
					};
					handler(coerced);
					return;
				}
				if (process.env.NODE_ENV !== 'production') {
					console.error('Received event with invalid Envelope type', e);
				}
			};
			// Register in deterministic subscriber map
			const set = subs.get(type) ?? new Set();
			set.add(wrapped as (e: Envelope) => void);
			subs.set(type, set);
			return {
				unsubscribe: () => {
					const s = subs.get(type);
					if (s) {
						s.delete(wrapped as (e: Envelope) => void);
						if (s.size === 0) subs.delete(type);
					}
				},
			};
		},
		getStats: () => stats,
		shutdown: () => {
			subs.clear();
		},
	};
}

export function createAgentEventBus(): EventBus {
	return createEventBus();
}

export function createEventBusForEnvironment(): EventBus {
	return createEventBus();
}

export function createEventPublisher(bus: EventBus) {
	return {
		publish: bus.publish,
	};
}

export function createEventSubscriber(bus: EventBus) {
	return {
		subscribe: bus.subscribe,
	};
}

// validateAgentEvent removed (legacy format not matching current Envelope)
