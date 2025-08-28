import { describe, it, expectTypeOf } from 'vitest';
import type { Transport } from '@cortex-os/a2a-core/transport';

describe('transport export', () => {
  it('type is available', () => {
    expectTypeOf<Transport>().toBeObject();
  });
});
