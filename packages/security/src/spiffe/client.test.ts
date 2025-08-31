import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as clientModule from './client';
import { SpiffeClient } from './client';
import type { TrustDomainConfig } from '../types.js';

describe('SpiffeClient', () => {
  const config: TrustDomainConfig = {
    name: 'example',
    spireServerAddress: 'localhost',
    spireServerPort: 8081,
    workloadSocketPath: '/tmp/spire-agent/public/api.sock',
  };

  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches workload identity using fetch', async () => {
    const mockResponse = {
      spiffe_id: 'spiffe://example.org/my/service',
      trust_domain: 'example.org',
      selectors: [{ type: 'env', value: 'prod' }],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }) as any;

    const client = new SpiffeClient(config);
    const identity = await client.fetchWorkloadIdentity();

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8081/workload/identity',
      expect.objectContaining({
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(identity.spiffeId).toBe(mockResponse.spiffe_id);
    expect(identity.trustDomain).toBe(mockResponse.trust_domain);
    expect(identity.selectors).toEqual({ env: 'prod' });
  });

  it('fetches trust bundle and splits certificates', async () => {
    const pem = `-----BEGIN CERTIFICATE-----\nCERT1\n-----END CERTIFICATE-----\n-----BEGIN CERTIFICATE-----\nCERT2\n-----END CERTIFICATE-----`;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ trust_bundle: pem }),
    }) as any;
    const spy = vi.spyOn(clientModule, 'splitPEMCertificates');
    const client = new SpiffeClient(config);
    const certs = await client.fetchTrustBundle();
    expect(spy).toHaveBeenCalledWith(pem);
    expect(certs).toHaveLength(2);
  });
});
