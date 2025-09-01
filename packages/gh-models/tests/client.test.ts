import { describe, it, expect } from 'vitest';
import { GhModelsClient } from '../src/client.js';

describe('GhModelsClient', () => {
  it('constructs without token', () => {
    const client = new GhModelsClient();
    expect(client).toBeInstanceOf(GhModelsClient);
  });
});
