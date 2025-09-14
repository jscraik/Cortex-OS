import { describe, expect, it } from 'vitest';
import { createEnvelope } from '../../a2a-contracts/src/envelope.js';
import { createBus } from '../src/bus.js';

// Simple inproc transport stub
function createInprocTransport() {
    const subs: { topics: string[]; handler: (m: any) => Promise<void> }[] = [];
    return {
        publish: async (msg: any) => {
            for (const s of subs) {
                if (s.topics.includes(msg.type)) {
                    await s.handler(msg);
                }
            }
        },
        subscribe: async (topics: string[], handler: (m: any) => Promise<void>) => {
            subs.push({ topics, handler });
            return { close: async () => { } };
        },
    };
}

describe('bus idempotency & correlation edge cases', () => {
    it('drops duplicate events with same id when idempotency enabled', async () => {
        const received: string[] = [];
        const transport = createInprocTransport();
        const bus = createBus(transport as any, undefined as any, undefined, { 'evt.test': { publish: true, subscribe: true } });

        await bus.bind([{ type: 'evt.test', handle: async (m) => { received.push(m.id); } }]);

        const env = createEnvelope({ type: 'evt.test', source: 'test', data: { n: 1 }, id: 'dup-1' });
        await bus.publish(env);
        await bus.publish(env); // duplicate

        expect(received).toEqual(['dup-1']);
    });

    it('processes duplicates when idempotency disabled', async () => {
        const received: string[] = [];
        const transport = createInprocTransport();
        const bus = createBus(transport as any, undefined as any, undefined, { 'evt.test2': { publish: true, subscribe: true } }, { enableIdempotency: false });
        await bus.bind([{ type: 'evt.test2', handle: async (m) => { received.push(m.id); } }]);
        const env = createEnvelope({ type: 'evt.test2', source: 'test', data: {}, id: 'x-1' });
        await bus.publish(env);
        await bus.publish(env);
        expect(received).toEqual(['x-1', 'x-1']);
    });

    it('auto-generates correlationId when missing', async () => {
        let observed: { id?: string; correlationId?: string } | undefined;
        const transport = createInprocTransport();
        const bus = createBus(transport as any, undefined as any, undefined, { 'evt.corr': { publish: true, subscribe: true } });
        await bus.bind([{ type: 'evt.corr', handle: async (m) => { observed = { id: m.id, correlationId: m.correlationId }; } }]);
        const env = createEnvelope({ type: 'evt.corr', source: 'test', data: {} });
        await bus.publish(env);
        expect(observed?.correlationId).toBe(observed?.id);
    });

    it('preserves provided correlationId', async () => {
        let observed: { id?: string; correlationId?: string } | undefined;
        const transport = createInprocTransport();
        const bus = createBus(transport as any, undefined as any, undefined, { 'evt.corr2': { publish: true, subscribe: true } });
        await bus.bind([{ type: 'evt.corr2', handle: async (m) => { observed = { id: m.id, correlationId: m.correlationId }; } }]);
        const env = createEnvelope({ type: 'evt.corr2', source: 'test', data: {}, correlationId: 'fixed-corr' });
        await bus.publish(env);
        expect(observed?.correlationId).toBe('fixed-corr');
    });
});
