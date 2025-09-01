import { expect, test } from 'vitest';
import { startRuntime } from '../src/runtime';

test('startRuntime resolves services', () => {
  const services = startRuntime();
  expect(services.memories).toBeDefined();
  expect(services.orchestration).toBeDefined();
  expect(services.mcp).toBeDefined();
});
