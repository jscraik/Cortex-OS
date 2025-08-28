import { expectTypeOf, test } from 'vitest';
import type { Envelope } from '@cortex-os/a2a-contracts/envelope';
import { ReliableOutboxPublisher } from '../src/outbox';

test('publisher transport uses imported Envelope type', () => {
  type PublishParam = Parameters<
    ConstructorParameters<typeof ReliableOutboxPublisher>[0]['publish']
  >[0];
  expectTypeOf<PublishParam>().toEqualTypeOf<Envelope>();
});
