// Keep import minimal to avoid heavy deps; mirror signature from a2a bus
export type Event<T = unknown> = { type: string; payload: T };

export type PublishFn<T = unknown> = (evt: Event<T>) => void;

import { setAuditPublisher } from './audit';

export function makeA2APublisher<TPayload>(publish: PublishFn<TPayload>) {
        return async (evt: TPayload) => {
                publish({ type: 'audit.event', payload: evt });
        };
}

export function configureAuditPublisherWithBus<TPayload>(publish: PublishFn<TPayload>) {
        setAuditPublisher(makeA2APublisher(publish));
}
