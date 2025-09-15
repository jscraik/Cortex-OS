import { describe, expect, it, vi } from 'vitest';
import type { ModelProvider } from '@/lib/types.js';
import { createFallbackChain } from '@/providers/fallback-chain.js';

describe('Fallback Chain', () => {
        it('falls back to next healthy provider on failure', async () => {
                let firstAttempts = 0;
                const p1: ModelProvider = {
                        name: 'p1',
                        generate: vi.fn(async () => {
                                firstAttempts += 1;
                                throw new Error('boom');
                        }),
                        shutdown: vi.fn(async () => {}),
                };
                const p2: ModelProvider = {
                        name: 'p2',
                        generate: vi.fn(async () => ({
                                text: 'ok',
                                provider: 'p2',
                                usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
                        })),
                        shutdown: vi.fn(async () => {}),
                };

		const chain = createFallbackChain({
			providers: [p1, p2],
			circuitBreakerThreshold: 1,
			circuitBreakerTimeout: 10,
			retryAttempts: 1,
			retryDelay: 1,
		});

		const res = await chain.generate('test', {});
		expect(res.text).toBe('ok');
                expect(firstAttempts).toBeGreaterThanOrEqual(1);
                expect((p1.generate as any).mock.calls.length).toBeGreaterThan(0);
                expect((p2.generate as any).mock.calls.length).toBeGreaterThan(0);
        });

        it('invokes shutdown on underlying providers', async () => {
                const p1: ModelProvider = {
                        name: 'p1',
                        generate: vi.fn(async () => ({
                                text: 'a',
                                provider: 'p1',
                                usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
                        })),
                        shutdown: vi.fn(async () => {}),
                };
                const p2: ModelProvider = {
                        name: 'p2',
                        generate: vi.fn(async () => ({
                                text: 'b',
                                provider: 'p2',
                                usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
                        })),
                        shutdown: vi.fn(async () => {}),
                };

		const chain = createFallbackChain({ providers: [p1, p2] });
		await chain.shutdown?.();
		expect(p1.shutdown).toHaveBeenCalled();
		expect(p2.shutdown).toHaveBeenCalled();
	});
});
