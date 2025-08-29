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
MIIBpzCCARCgAwIBAgIUEBg4HaIqwHHPmviDSN5sDG63AcwwDQYJKoZIhvcNAQEL
BQAwDzENMAsGA1UEAwwEdGVzdDAgFw0yNTA4MjgwNjE3MjBaGA8yMTI1MDgwNTA2
MTcyMFowDzENMAsGA1UEAwwEdGVzdDCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkC
gYEAyykHyBAhsVb0Lp8lIcMbW29uBiNzB5KKfFSRimsJnIVMjqUpwUjkwP+yuIEd
SXnHCcU1xVZZJX8+O0jYAHuv4CZRgqTY6PMeT5hnS0EVDgxo6gXQuuCmfz3rG3dk
34RufgvraofnHmlzUvBEmVqCHUyN6uGpxXMc730UF4S+DvUCAwEAATANBgkqhkiG
9w0BAQsFAAOBgQCjVgBkKFXPp+WZNG/y5Mh1hVnGXZ6mFjgVe3b4VjFGU6anlwPN
0oir209o3L32LNZ33nrjTTmzQHaYj9+XnIqZdt4gz8QkQL/b/5z9pQ3mW/BgBB+q
ulJQDwRW1jvWofs9rhKn1ptKozfzF4RGlexRKKNwczdGKAoUHIfyEdN00Q==
-----END CERTIFICATE-----`;
  const expiredCert = `-----BEGIN CERTIFICATE-----
MIIBpTCCAQ6gAwIBAgIUZlCutRy372TnH023IYiw4/7Wx00wDQYJKoZIhvcNAQEL
BQAwDzENMAsGA1UEAwwEdGVzdDAeFw0wNTA5MDMwNjE3MjBaFw0wNjA5MDMwNjE3
MjBaMA8xDTALBgNVBAMMBHRlc3QwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGB
AMspB8gQIbFW9C6fJSHDG1tvbgYjcweSinxUkYprCZyFTI6lKcFI5MD/sriBHUl5
xwnFNcVWWSV/PjtI2AB7r+AmUYKk2OjzHk+YZ0tBFQ4MaOoF0Lrgpn896xt3ZN+E
bn4L62qH5x5pc1LwRJlagh1MjerhqcVzHO99FBeEvg71AgMBAAEwDQYJKoZIhvcN
AQELBQADgYEAGkwghltyXDd4wWuRpMtTpMB9nqwjveNBTvusArwT+qT8vyFDEmb3
6sznUHIHNiUYNymUxwwyUas+h8Db8ySsHw1uOHoqxZQq4R6j3S/lCishPyOTqlrF
ozHeorRz4QAb+p1vUVGTroH0XMHgJAEw/05UcQJwV/zvbsJeLoXi6JM=
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
