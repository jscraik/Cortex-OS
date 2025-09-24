import type { CloudEvent } from '../integrations/cloudevents.js';
import { type auditEvent as auditEventType, setAuditPublisher } from './audit.js';

// Minimal event wrapper used by the A2A adapter
export type Event<T = unknown> = { type: string; payload: T };

export type PublishFn = (evt: Event<ReturnType<typeof auditEventType>>) => void;

export function makeA2APublisher(publish: PublishFn) {
	return async (evt: CloudEvent<{ args: unknown; traceId: string }>) => {
		publish({ type: 'audit.event', payload: evt });
	};
}

export function configureAuditPublisherWithBus(publish: PublishFn) {
	setAuditPublisher(makeA2APublisher(publish));
}
