import { describe, it, expect } from 'vitest';
import { Envelope } from '@cortex-os/a2a-contracts/envelope';

const base = {
  id: '00000000-0000-0000-0000-000000000000',
  type: 'event.test.v1',
  occurredAt: '2024-01-01T00:00:00.000Z',
  headers: {},
  payload: {},
};

describe('Envelope schema', () => {
  it('defaults schemaVersion to 1', () => {
    const env = Envelope.parse(base);
    expect(env.schemaVersion).toBe(1);
  });

  it('rejects non-positive schemaVersion', () => {
    expect(() => Envelope.parse({ ...base, schemaVersion: 0 })).toThrow();
  });
});
