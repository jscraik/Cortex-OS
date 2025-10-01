import type { Envelope } from '@cortex-os/a2a-contracts';
import { expectTypeOf, test } from 'vitest';
import type { ReliableOutboxPublisher } from '../src/outbox.js';

test('publisher transport uses imported Envelope type', () => {
	type PublishParam = Parameters<
		ConstructorParameters<typeof ReliableOutboxPublisher>[0]['publish']
	>[0];
	expectTypeOf<PublishParam>().toEqualTypeOf<Envelope>();
});
