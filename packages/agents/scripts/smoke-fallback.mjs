import { createFallbackChain } from '../src/providers/fallback-chain.js';
import { createEventBusForEnvironment } from '../src/lib/event-bus.js';

const bus = createEventBusForEnvironment('test');
bus.subscribe('provider.fallback', (e) => console.log('EVENT:', e));

const failingProvider = {
  name: 'primary-fail',
  generate: async () => {
    throw new Error('simulated failure');
  },
};

const workingProvider = {
  name: 'secondary-ok',
  generate: async (prompt) => ({ text: 'ok', provider: 'secondary-ok', latencyMs: 10 }),
};

const chain = createFallbackChain({
  providers: [failingProvider, workingProvider],
  eventBus: bus,
  retryAttempts: 2,
  retryDelay: 10,
});

(async () => {
  const res = await chain.generate('hello');
  console.log('RESULT', res);
})();
