import { expect, test } from 'vitest';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import registrySchema from '../../schemas/registry.schema.json' assert { type: 'json' };
import serverManifestSchema from '../../schemas/server-manifest.schema.json' assert { type: 'json' };
import { validateServerManifest } from './validateServerManifest.js';

function createAjv() {
  const ajv = new Ajv({ allErrors: true, verbose: true, strict: false });
  addFormats(ajv);
  ajv.addFormat('uri', {
    type: 'string',
    validate: (uri: string) => {
      try {
        new URL(uri);
        return true;
      } catch {
        return false;
      }
    },
  });
  ajv.addSchema(registrySchema, 'registry');
  ajv.addSchema(serverManifestSchema, 'server-manifest');
  return ajv;
}

const ajv = createAjv();

const baseManifest = {
  id: 'test',
  name: 'Test Server',
  owner: 'cortex',
  category: 'utility',
  transports: { stdio: { command: 'echo' } },
  install: { claude: 'npm i test' },
  scopes: ['test:scope'],
  repo: 'https://example.com',
  logo: 'https://example.com/logo.png',
};

test('accepts valid manifest', () => {
  const result = validateServerManifest(ajv, baseManifest);
  expect(result.valid).toBe(true);
});

test('fails JSON schema validation', () => {
  const invalid = { ...baseManifest };
  delete (invalid as any).id;
  const result = validateServerManifest(ajv, invalid);
  expect(result.valid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
});

test('emits warnings for missing repo', () => {
  const noRepo = { ...baseManifest };
  delete (noRepo as any).repo;
  const result = validateServerManifest(ajv, noRepo);
  expect(result.valid).toBe(true);
  expect(result.warnings.some((w) => w.path === 'repo')).toBe(true);
});

test('warns on missing logo and dangerous scope', () => {
  const m = { ...baseManifest };
  delete (m as any).logo;
  m.scopes = ['system:exec'];
  const result = validateServerManifest(ajv, m);
  expect(result.warnings.some((w) => w.path === 'logo')).toBe(true);
  expect(result.warnings.some((w) => w.path === 'scopes')).toBe(true);
});

test('errors on insecure transports', () => {
  const m = {
    ...baseManifest,
    transports: {
      // eslint-disable-next-line sonarjs/no-clear-text-protocols
      sse: { url: 'http://insecure' },
      // eslint-disable-next-line sonarjs/no-clear-text-protocols
      streamableHttp: { url: 'http://also-insecure' },
    },
  };
  const result = validateServerManifest(ajv, m);
  expect(result.errors.some((e) => e.path === 'transports.sse.url')).toBe(true);
  expect(result.errors.some((e) => e.path === 'transports.streamableHttp.url')).toBe(true);
});
