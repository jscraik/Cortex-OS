import { expect, test } from 'vitest';
import {
  validateRegistry,
  validateSecurity,
  validateServerManifest,
  registrySchema,
  serverManifestSchema,
} from './index.js';

const manifest = {
  id: 'x',
  name: 'x',
  owner: 'x',
  category: 'utility',
  transports: { stdio: { command: 'x' } },
  install: { claude: 'x' },
  scopes: ['x:y'],
};

test('exports work', () => {
  expect(validateServerManifest(manifest).valid).toBe(true);
  expect(validateRegistry({
    version: '2025-01-01',
    metadata: { updatedAt: new Date().toISOString(), serverCount: 1 },
    servers: [manifest],
    signing: { sigstoreBundleUrl: 'https://example.com/bundle', publicKey: 'key' },
  }).valid).toBe(true);
  expect(validateSecurity(manifest).valid).toBe(true);
  expect(registrySchema.$schema).toMatch('2020-12');
  expect(serverManifestSchema.$schema).toMatch('2020-12');
});
