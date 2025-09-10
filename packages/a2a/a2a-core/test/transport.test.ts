import type { Transport } from '@cortex-os/a2a-core/transport';
import { describe, expectTypeOf, it } from 'vitest';

describe('transport export', () => {
	it('type is available', () => {
		expectTypeOf<Transport>().toBeObject();
	});
});
