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
        console.debug('event', envelope);
      }
      // Direct dispatch to registered subscribers for determinism in tests
      const set = subs.get(envelope.type);
      if (set) {
        for (const h of Array.from(set)) {
          try {
            h(envelope as any);
          } catch {
            // ignore handler errors
          }
        }
      }
    },
    subscribe: <T>(type: string, handler: (msg: Envelope<T>) => void) => {
      const isEnvelope = (obj: any): obj is Envelope<T> => {
        return (
          obj &&
          typeof obj === 'object' &&
          typeof obj.type === 'string' &&
          'data' in obj &&
          typeof obj.id === 'string' &&
          typeof obj.timestamp === 'string' &&
          typeof obj.source === 'string'
        );
      };
      const wrapped = (e: any) => {
        if (isEnvelope(e)) {
          handler(e as Envelope);
          return;
        }
        // Best-effort coercion: accept objects with { type, data } and fill defaults
        if (e && typeof e === 'object' && typeof e.type === 'string' && 'data' in e) {
          const coerced: Envelope = {
            type: String(e.type),
            data: e.data,
            id: e.id || `event_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            timestamp: e.timestamp || new Date().toISOString(),
            source: e.source || 'event-bus',
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
      set.add(wrapped as any);
      subs.set(type, set);
      return {
        unsubscribe: () => {
          const s = subs.get(type);
          if (s) {
            s.delete(wrapped as any);
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

export function createEventBusForEnvironment(_env: string): EventBus {
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

export function validateAgentEvent<T>(event: {
	type: string;
	data: T;
	id?: string;
	timestamp?: string;
	source?: string;
}): Envelope<T> {
	if (!event.type || !event.data) {
		throw new Error('Invalid event: missing type or data');
	}

	return {
		type: event.type,
		data: event.data,
		id:
			event.id ||
			`event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
		timestamp: event.timestamp || new Date().toISOString(),
		source: event.source || 'agents',
	};
}
