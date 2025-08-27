import { describe, expect, it } from 'vitest';
import { Envelope } from '../a2a-contracts/src/envelope.js';

const base = {
  id: '00000000-0000-0000-0000-000000000000',
  type: 'event.test.v1',
  source: 'http://localhost/test',
  specversion: '1.0',
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
