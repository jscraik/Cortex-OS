import { describe, it, expect } from 'vitest';
import { Envelope } from './src/envelope';

describe('Envelope source URI validation', () => {
  it('accepts valid source URI', () => {
    const env = Envelope.parse({
      id: '1',
      type: 'test',
      source: 'https://example.com',
      specversion: '1.0',
    });
    expect(env.source).toBe('https://example.com');
  });

  it('throws on invalid source URI', () => {
    expect(() =>
      Envelope.parse({
        id: '1',
        type: 'test',
        source: 'not a url',
        specversion: '1.0',
      }),
    ).toThrowError('Invalid source URI');
  });
});
