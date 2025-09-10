import type { Transport } from '@cortex-os/a2a-core/transport';
import { describe, expectTypeOf, it } from 'vitest';
import { fsQueue } from '../src/fsq.js';
import { inproc } from '../src/inproc.js';
import { stdio } from '../src/stdio.js';

describe('transports type compatibility', () => {
	it('factories return Transport', () => {
		expectTypeOf(inproc()).toMatchTypeOf<Transport>();
		expectTypeOf(fsQueue()).toMatchTypeOf<Transport>();
		expectTypeOf(stdio).returns.toMatchTypeOf<Transport>();
	});
});
