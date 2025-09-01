import { expect, test } from 'vitest';
import { validateSecurity } from './validateSecurity.js';

const baseManifest = {
  id: 'test',
  transports: { sse: { url: 'https://secure' } },
  scopes: [],
};

test('flags insecure transports', () => {
  const manifest = { ...baseManifest, transports: { sse: { url: 'http://insecure' } } };
  const result = validateSecurity(manifest);
  expect(result.valid).toBe(false);
  expect(result.errors.some((e) => e.path === 'transports.sse.url')).toBe(true);
});

test('warns on dangerous scopes and missing security info', () => {
  const manifest = { ...baseManifest, scopes: ['system:exec'] };
  const result = validateSecurity(manifest);
  expect(result.valid).toBe(true);
  expect(result.warnings.some((w) => w.path === 'scopes')).toBe(true);
  expect(result.warnings.some((w) => w.path === 'security.sigstoreBundle')).toBe(true);
});

test('returns error when manifest is not an object', () => {
  const result = validateSecurity(null);
  expect(result.valid).toBe(false);
  expect(result.errors[0].code).toBe('invalid_type');
});

test('warns on non-standard license and missing sbom', () => {
  const manifest = { ...baseManifest, license: 'Proprietary', security: {} };
  const result = validateSecurity(manifest);
  expect(result.valid).toBe(true);
  expect(result.warnings.some((w) => w.path === 'license')).toBe(true);
  expect(result.warnings.some((w) => w.path === 'security.sbom')).toBe(true);
});
