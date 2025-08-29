import { describe, it, expectTypeOf } from 'vitest';
import { inproc } from '../src/inproc.js';
import { fsQueue } from '../src/fsq.js';
import { stdio } from '../src/stdio.js';
import type { Transport } from '@cortex-os/a2a-core/transport';

describe('transports type compatibility', () => {
  it('factories return Transport', () => {
    expectTypeOf(inproc()).toMatchTypeOf<Transport>();
    expectTypeOf(fsQueue()).toMatchTypeOf<Transport>();
    expectTypeOf(stdio).returns.toMatchTypeOf<Transport>();
  });
});
