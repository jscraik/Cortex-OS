import { describe, expect, it } from 'vitest';
import { createWorkerRegistry } from '../../../../src/modern-agent-system/worker-registry.js';
import type { WorkerDefinition } from '../../../../src/modern-agent-system/types.js';

const createWorker = (overrides: Partial<WorkerDefinition> = {}): WorkerDefinition => ({
        name: 'test-worker',
        description: 'handles testing capability',
        capabilities: ['test'],
        handler: async () => ({ capability: 'test', worker: 'test-worker', output: 'ok' }),
        ...overrides,
});

describe('createWorkerRegistry', () => {
        it('indexes workers by name and capability', () => {
                const registry = createWorkerRegistry([
                        createWorker({ name: 'alpha', capabilities: ['plan'] }),
                        createWorker({ name: 'beta', capabilities: ['gather'] }),
                ]);

                expect(registry.getWorker('alpha')?.name).toBe('alpha');
                expect(registry.findByCapability('gather')?.name).toBe('beta');
        });

        it('prevents duplicate worker registration', () => {
                const registry = createWorkerRegistry([createWorker({ name: 'alpha' })]);
                expect(() => registry.register(createWorker({ name: 'alpha' }))).toThrow(/already registered/);
        });

        it('throws when capability is missing', () => {
                const registry = createWorkerRegistry([createWorker({ capabilities: ['plan'] })]);
                expect(registry.findByCapability('unknown')).toBeUndefined();
        });
});
