import { describe, expect, it, vi } from 'vitest';

vi.mock('@cortex-os/telemetry');

import { spanExporter } from '../../test/setup.ts';
import {
  type WorkloadAPIClient,
  WorkloadIdentityAttestor,
  WorkloadIdentityManager,
} from './workload-identity.ts';

const SAMPLE_ID = 'spiffe://example.org/my/service';

describe('WorkloadIdentityManager', () => {
  it('attests and parses SPIFFE ID', async () => {
    spanExporter.reset();
    const manager = new WorkloadIdentityManager();
    const identity = await manager.attestWorkload(SAMPLE_ID);
    expect(identity.trustDomain).toBe('example.org');
    expect(identity.workloadPath).toBe('/my/service');
    const spans = spanExporter.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe('workload-identity.attest');
    expect(spans[0].status.code).toBe(SpanStatusCode.OK);
  });

  it('throws on invalid SPIFFE ID', async () => {
    spanExporter.reset();
    const manager = new WorkloadIdentityManager();
    await expect(manager.attestWorkload('invalid')).rejects.toThrow('Invalid SPIFFE ID');
    const spans = spanExporter.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe('workload-identity.attest');
    expect(spans[0].status.code).toBe(SpanStatusCode.ERROR);
  });
});

describe('WorkloadIdentityAttestor', () => {
  it('errors when API client not configured', async () => {
    spanExporter.reset();
    const manager = new WorkloadIdentityManager();
    const attestor = new WorkloadIdentityAttestor(manager);
    await expect(attestor.attestWithWorkloadAPI(SAMPLE_ID)).rejects.toThrow(
      'Workload API client not configured',
    );
    const spans = spanExporter.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe('workload-attestor.attest-api');
    expect(spans[0].status.code).toBe(SpanStatusCode.ERROR);
  });

  it('uses provided API client', async () => {
    spanExporter.reset();
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
    const spans = spanExporter.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe('workload-attestor.attest-api');
    expect(spans[0].status.code).toBe(SpanStatusCode.OK);
  });
});
