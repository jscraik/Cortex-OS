import { describe, it, expect } from 'vitest';
import {
  WorkloadIdentityManager,
  WorkloadIdentityAttestor,
  WorkloadAPIClient,
} from './workload-identity.ts';

const SAMPLE_ID = 'spiffe://example.org/my/service';

describe('WorkloadIdentityManager', () => {
  it('attests and parses SPIFFE ID', async () => {
    const manager = new WorkloadIdentityManager();
    const identity = await manager.attestWorkload(SAMPLE_ID);
    expect(identity.trustDomain).toBe('example.org');
    expect(identity.workloadPath).toBe('/my/service');
  });

  it('throws on invalid SPIFFE ID', async () => {
    const manager = new WorkloadIdentityManager();
    await expect(manager.attestWorkload('invalid')).rejects.toThrow('Invalid SPIFFE ID');
  });
});

describe('WorkloadIdentityAttestor', () => {
  it('errors when API client not configured', async () => {
    const manager = new WorkloadIdentityManager();
    const attestor = new WorkloadIdentityAttestor(manager);
    await expect(attestor.attestWithWorkloadAPI(SAMPLE_ID)).rejects.toThrow('Workload API client not configured');
  });

  it('uses provided API client', async () => {
    const manager = new WorkloadIdentityManager();
    const client: WorkloadAPIClient = {
      attestWorkload: (id) =>
        Promise.resolve({
          spiffeId: id,
          trustDomain: 'example.org',
          workloadPath: '/my/service',
          selectors: {},
          metadata: {},
        }),
    };
    const attestor = new WorkloadIdentityAttestor(manager, client);
    const result = await attestor.attestWithWorkloadAPI(SAMPLE_ID);
    expect(result.spiffeId).toBe(SAMPLE_ID);
  });
});
