import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');

const dist = await import(path.join(pkgRoot, 'dist', 'index.js'));
const { createMLXProvider, createFallbackChain, createEventBusForEnvironment } = dist;

const results = [];

async function testMLXProvider() {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ content: 'hello world' }) });
    const p = createMLXProvider({ modelPath: 'mixtral' });
    const res = await p.generate('hi');
    assert.strictEqual(res.text, 'hello world', 'MLX provider should return gateway content');
    assert.strictEqual(res.provider, 'mlx');
    console.log('[PASS] MLX provider happy path');
    results.push(true);
  } catch (e) {
    console.error('[FAIL] MLX provider happy path', e);
    results.push(false);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testFallbackChainEvent() {
  const events = [];
  const bus = createEventBusForEnvironment('test');
  bus.subscribe('provider.fallback', (evt) => events.push(evt));

  const failingProvider = {
    name: 'primary-fail',
    generate: async () => {
      throw new Error('simulated failure');
    },
  };

  const workingProvider = {
    name: 'secondary-ok',
    generate: async () => ({ text: 'ok', provider: 'secondary-ok', latencyMs: 10 }),
  };

  try {
    const chain = createFallbackChain({
      providers: [failingProvider, workingProvider],
      eventBus: bus,
      retryAttempts: 2,
      retryDelay: 10,
    });
    const res = await chain.generate('hello');
    assert.strictEqual(res.text, 'ok', 'Fallback chain should return result from working provider');
    await new Promise((r) => setTimeout(r, 50));
    const found = events.find(
      (e) => e.type === 'provider.fallback' || e.type === 'agents.provider.fallback'
    );
    assert.ok(found, 'provider.fallback event should be published');
    const data = found.data;
    assert.strictEqual(data.failedProvider, 'primary-fail');
    console.log('[PASS] Fallback chain event emission');
    results.push(true);
  } catch (e) {
    console.error('[FAIL] Fallback chain event emission', e);
    results.push(false);
  }
}

(async () => {
  await testMLXProvider();
  await testFallbackChainEvent();

  const allPassed = results.every(Boolean);
  if (!allPassed) {
    console.error('Some tests failed');
    process.exit(2);
  }
  console.log('All tests passed');
  process.exit(0);
})();
