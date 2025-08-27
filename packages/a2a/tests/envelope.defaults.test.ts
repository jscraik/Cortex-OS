import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createEnvelope, Envelope } from '../a2a-contracts/src/envelope.js';

const CLEAN_ENV = { ...process.env };

describe('Envelope defaults and normalization', () => {
  beforeEach(() => {
    process.env = { ...CLEAN_ENV };
    delete process.env.A2A_DEFAULT_SOURCE;
  });
  afterEach(() => {
    process.env = { ...CLEAN_ENV };
  });

  it('sets specversion to 1.0 by default via createEnvelope', () => {
    const env = createEnvelope({ type: 'x', source: 'http://localhost/test', data: {} });
    expect(env.specversion).toBe('1.0');
  });

  it('applies default source when not provided', () => {
    process.env.A2A_DEFAULT_SOURCE = 'urn:cortex-os:test';
    const env = createEnvelope({ type: 'x', data: {} });
    expect(env.source).toBe('urn:cortex-os:test');
  });

  it('normalizes empty or whitespace source to default', () => {
    process.env.A2A_DEFAULT_SOURCE = 'urn:cortex-os:default';
    const parsed = Envelope.parse({
      id: '00000000-0000-0000-0000-000000000000',
      type: 't',
      source: '   ',
      specversion: '1.0',
      payload: {},
      headers: {},
      occurredAt: '2024-01-01T00:00:00.000Z',
    });
    expect(parsed.source).toBe('urn:cortex-os:default');
  });

  it('accepts non-URL URI-references as source', () => {
    const parsed = Envelope.parse({
      id: '00000000-0000-0000-0000-000000000000',
      type: 't',
      source: 'urn:cortex-os:unit-test',
      specversion: '1.0',
      payload: {},
      headers: {},
      occurredAt: '2024-01-01T00:00:00.000Z',
    });
    expect(parsed.source).toBe('urn:cortex-os:unit-test');
  });
});
