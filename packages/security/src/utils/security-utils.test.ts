import { describe, it, expect, vi, beforeAll } from 'vitest';
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

  it('throws when crypto unavailable', () => {
    const original = global.crypto;
    vi.stubGlobal('crypto', undefined as unknown);
    expect(() => generateNonce(8)).toThrow('Secure random number generation unavailable');
    vi.stubGlobal('crypto', original as unknown);
  });
});

describe('isCertificateExpired', () => {
  let validCert: string;
  let expiredCert: string;
  beforeAll(() => {
    const makeCert = (offsetMs: number) => {
      const keys = forge.pki.rsa.generateKeyPair(512);
      const cert = forge.pki.createCertificate();
      cert.publicKey = keys.publicKey;
      cert.serialNumber = '01';
      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date(Date.now() + offsetMs);
      const attrs = [{ name: 'commonName', value: 'test' }];
      cert.setSubject(attrs);
      cert.setIssuer(attrs);
      cert.sign(keys.privateKey);
      return forge.pki.certificateToPem(cert);
    };
    validCert = makeCert(60_000);
    expiredCert = makeCert(-60_000);
  });

  it('detects valid certificate', () => {
    expect(isCertificateExpired(validCert)).toBe(false);
  });

  it('detects expired certificate', () => {
    expect(isCertificateExpired(expiredCert)).toBe(true);
  });
});
