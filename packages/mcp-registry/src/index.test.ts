import { expect, test } from 'vitest';
import { validateRegistry, registrySchema, serverManifestSchema } from './index.js';

// Accessibility: no color-only output; using plain assertions

test('exports schemas and validator', () => {
  expect(typeof validateRegistry).toBe('function');
  expect(typeof registrySchema).toBe('object');
  expect(typeof serverManifestSchema).toBe('object');
});
