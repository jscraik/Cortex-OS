// Keep import minimal to avoid heavy deps; mirror signature from a2a bus
export type Event<T = unknown> = { type: string; payload: T };

export type PublishFn = (evt: Event) => void;

import { setAuditPublisher } from './audit.js';

export function makeA2APublisher(publish: PublishFn) {
	return async (evt: any) => {
		publish({ type: 'audit.event', payload: evt });
	};
}

export function configureAuditPublisherWithBus(publish: PublishFn) {
	setAuditPublisher(makeA2APublisher(publish));
}
