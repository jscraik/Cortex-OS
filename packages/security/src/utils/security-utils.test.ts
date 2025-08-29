import { describe, it, expect, vi } from 'vitest';
vi.mock('@cortex-os/telemetry');
import forge from 'node-forge';
import {
  generateNonce,
  extractTrustDomain,
  extractWorkloadPath,
  isCertificateExpired,
} from './security-utils.ts';

describe('SPIFFE helpers', () => {
  it('extracts trust domain and workload path', () => {
    const id = 'spiffe://example.org/my/service';
    expect(extractTrustDomain(id)).toBe('example.org');
    expect(extractWorkloadPath(id)).toBe('/my/service');
  });

  it('returns null for invalid ID', () => {
    expect(extractTrustDomain('invalid')).toBeNull();
    expect(extractWorkloadPath('invalid')).toBeNull();
  });
});

describe('generateNonce', () => {
  it('uses crypto.getRandomValues', () => {
    const spy = vi.spyOn(global.crypto, 'getRandomValues');
    const nonce = generateNonce(16);
    expect(nonce).toHaveLength(32);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('isCertificateExpired', () => {
  vi.useFakeTimers();
  const validCert = `-----BEGIN CERTIFICATE-----
MIIBGjCBxQIUIg0R8WFTzJBlqeqL2U+RJ5WWJycwDQYJKoZIhvcNAQELBQAwDzEN
MAsGA1UEAwwEdGVzdDAeFw0yNTA4MjkwNTAwMzZaFw0yNTA4MzAwNTAwMzZaMA8x
DTALBgNVBAMMBHRlc3QwXDANBgkqhkiG9w0BAQEFAANLADBIAkEAw4YaDB2XkqfS
FnkVmPvwogd8j0TgFJpyMP0su05d8VaM3egVVLm6cw6momE838IT6Qa2df3L5R0+
zzF1C4/J/wIDAQABMA0GCSqGSIb3DQEBCwUAA0EAGzxYNFu/ZYsvjCHu0dlAwFtr
dGhZ2fB2oYg/nYB/AGvMBvj1S00haduOg3DdyA4wMGpJPcoJfJCc6pOpkq7lxw==
-----END CERTIFICATE-----`;
  const expiredCert = `-----BEGIN CERTIFICATE-----
MIIBGjCBxQIUTrS6ERvK0hEZjcPqY/JsImLoJ+kwDQYJKoZIhvcNAQELBQAwDzEN
MAsGA1UEAwwEdGVzdDAeFw0yNTA4MjkwNTAwMzFaFw0yNTA4MjgwNTAwMzFaMA8x
DTALBgNVBAMMBHRlc3QwXDANBgkqhkiG9w0BAQEFAANLADBIAkEAw4YaDB2XkqfS
FnkVmPvwogd8j0TgFJpyMP0su05d8VaM3egVVLm6cw6momE838IT6Qa2df3L5R0+
zzF1C4/J/wIDAQABMA0GCSqGSIb3DQEBCwUAA0EAEFyaAmeAeVzM6Ts2ohZiKFVv
LpgBWWubzYdFsgwUfdt4rXrPSYd/Jxe8/bcWfxywJzjE94PjAoz0q6uTq7HqPw==
-----END CERTIFICATE-----`;

  it('detects valid certificate', () => {
    vi.setSystemTime(new Date('2025-08-29T00:00:00Z'));
    expect(isCertificateExpired(validCert)).toBe(false);
  });

  it('detects expired certificate', () => {
    vi.setSystemTime(new Date('2025-08-30T01:00:00Z'));
    expect(isCertificateExpired(expiredCert)).toBe(true);
  });
  vi.useRealTimers();
});
