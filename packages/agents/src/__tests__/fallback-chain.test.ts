import { describe, expect, it } from 'vitest';
import { createEventBusForEnvironment } from '../lib/event-bus.js';
import { createFallbackChain } from '../providers/fallback-chain.js';

describe('fallback chain events', () => {
  it('publishes provider.fallback when primary fails and fallback succeeds', async () => {
    const events: any[] = [];

    const bus = createEventBusForEnvironment('test');
    bus.subscribe('provider.fallback', (evt: any) => {
      events.push(evt);
    });

    const failingProvider = {
      name: 'primary-fail',
      generate: async () => {
        throw new Error('simulated failure');
      },
    };

    const workingProvider = {
      name: 'secondary-ok',
      generate: async (prompt: string) => ({
        text: 'ok',
        provider: 'secondary-ok',
        latencyMs: 10,
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      }),
    };

    const chain = createFallbackChain({
      providers: [failingProvider as any, workingProvider as any],
      eventBus: bus,
      retryAttempts: 2,
      retryDelay: 10,
    });

    const result = await chain.generate('hello', {} as any);

    expect(result.text).toBe('ok');
    expect(events.length).toBeGreaterThanOrEqual(1);
    const fallbackEvent = events.find(
      (e) => e.type === 'provider.fallback' || e.type === 'agents.provider.fallback',
    );
    expect(fallbackEvent).toBeDefined();
    const data = fallbackEvent?.data;
    expect(data.failedProvider).toBe('primary-fail');
  });
});
