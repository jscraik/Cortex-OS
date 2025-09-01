import { expect, test } from 'vitest';
import { validateServerManifest, validateRegistry, validateSecurity } from './validator.js';

const baseManifest = {
  id: 'test',
  name: 'Test Server',
  owner: 'cortex',
  category: 'utility',
  transports: { stdio: { command: 'echo' } },
  install: { claude: 'npm i test' },
  scopes: ['test:scope'],
};

test('accepts valid manifest', () => {
  const result = validateServerManifest(baseManifest);
  expect(result.valid).toBe(true);
});

test('rejects non-https transport', () => {
  const manifest = {
    ...baseManifest,
    transports: { sse: { url: 'http://insecure' } },
  };
  const result = validateServerManifest(manifest);
  expect(result.valid).toBe(false);
});

test('rejects invalid repo URL', () => {
  const manifest = { ...baseManifest, repo: 'not a url' };
  const result = validateServerManifest(manifest);
  expect(result.valid).toBe(false);
});

test('detects duplicate server ids and mismatched count', () => {
  const registry = {
    version: '2025-01-01',
    metadata: { updatedAt: new Date().toISOString(), serverCount: 1 },
    servers: [baseManifest, baseManifest],
    signing: { sigstoreBundleUrl: 'https://example.com/bundle', publicKey: 'key' },
  };
  const result = validateRegistry(registry);
  expect(result.errors.some((e) => e.code === 'duplicate_id')).toBe(true);
  expect(result.warnings.some((w) => w.path === 'metadata.serverCount')).toBe(true);
});

test('validateSecurity warns on license and missing sbom', () => {
  const manifest = { ...baseManifest, license: 'Proprietary', security: {} };
  const result = validateSecurity(manifest);
  expect(result.valid).toBe(true);
  expect(result.warnings.some((w) => w.path === 'license')).toBe(true);
  expect(result.warnings.some((w) => w.path === 'security.sbom')).toBe(true);
});
