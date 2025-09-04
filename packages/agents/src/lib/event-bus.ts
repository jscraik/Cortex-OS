import { EventEmitter } from "events";
import type {
        Envelope,
        EventBus,
        EventBusStats,
        EventSubscription,
} from "./types.js";

export interface CloudEvent<T = unknown> {
        specversion: string;
        type: string;
        source: string;
        id: string;
        time?: string;
        datacontenttype?: string;
        data?: T;
}

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
        const emitter = new EventEmitter();
        const stats: EventBusStats = {
                totalEventsPublished: 0,
                eventsByType: {},
        };

        return {
                publish: async <T>(msg: Envelope<T>) => {
                        const envelope = config.validate ? config.validate(msg) : msg;
                        stats.totalEventsPublished++;
                        stats.eventsByType[envelope.type] =
                                (stats.eventsByType[envelope.type] || 0) + 1;
                        if (config.enableLogging) {
                                console.debug("event", envelope);
                        }
                        emitter.emit(envelope.type, envelope);
                },
                subscribe: <T>(type: string, handler: (msg: Envelope<T>) => void) => {
                        const wrapped = (e: Envelope) => handler(e as Envelope<T>);
                        emitter.on(type, wrapped);
                        return {
                                unsubscribe: () => {
                                        emitter.off(type, wrapped);
                                },
                        };
                },
                getStats: () => stats,
                shutdown: () => {
                        emitter.removeAllListeners();
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
        if (!event.type || event.data === undefined) {
                throw new Error("Invalid event: missing type or data");
        }

        return {
                type: event.type,
                data: event.data,
                id:
                        event.id ||
                        `event_${Date.now()}_${Math.random()
                                .toString(36)
                                .substring(2, 9)}`,
                timestamp: event.timestamp || new Date().toISOString(),
                source: event.source || "agents",
        };
}

