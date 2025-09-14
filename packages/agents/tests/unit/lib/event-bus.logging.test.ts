import { describe, expect, it, vi } from 'vitest';
import { createEventBus } from '../../../src/lib/event-bus.js';
import type { Envelope } from '../../../src/lib/types.js';

// Clean minimal test (file fully replaced to remove prior corruption)
describe('event-bus logging + validate', () => {
	it('invokes validate hook and unsubscribe stops delivery', async () => {
		const validate = vi.fn(<T,>(e: Envelope<T>): Envelope<T> => ({ ...e })) as unknown as <T>(e: Envelope<T>) => Envelope<T>;
		const bus = createEventBus({ enableLogging: true, validate });
		const received: Envelope[] = [];
		const sub = bus.subscribe('demo', (e: Envelope) => { received.push(e); });
		const envelope: Envelope = { specversion: '1.0', id: '1', type: 'demo', source: 't', time: new Date().toISOString(), ttlMs: 1000, headers: {} } as any;
		await bus.publish(envelope);
		expect(received).toHaveLength(1);
		expect(validate).toHaveBeenCalledTimes(1);
		sub.unsubscribe();
		await bus.publish({ ...envelope, id: '2' });
		expect(received).toHaveLength(1); // unchanged after unsubscribe
	});
});

// EOF
