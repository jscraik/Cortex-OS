/// <reference path="../types/external.d.ts" />

import type { Envelope } from '@cortex-os/a2a-contracts/envelope';
import { v4 as uuid } from 'uuid';
import { describe, expect, test } from 'vitest';
import { createNatsTransport } from '../../src/transport/nats-transport.js';

const shouldAttempt = process.env.CORTEX_SKIP_NATS_TEST !== '1';
const suite = shouldAttempt ? describe : describe.skip;

suite('A2A NATS transport integration', () => {
	test('publishes and consumes cortex.* events over NATS', async () => {
		let container: { stop: () => Promise<void> } | undefined;
		let connection: { drain: () => Promise<void>; close: () => Promise<void> } | undefined;

		try {
			const [{ NatsContainer }, nats] = await Promise.all([
				import('@testcontainers/nats'),
				import('nats'),
			]);

			container = await new NatsContainer().start();
			const url = `nats://${container.getHost()}:${container.getPort()}`;
			connection = await nats.connect({ servers: url });

			const messages: Envelope[] = [];
			const codec = nats.StringCodec();
			const subscription = connection.subscribe('cortex.test.event');
			(async () => {
				for await (const m of subscription) {
					messages.push(JSON.parse(codec.decode(m.data)) as Envelope);
				}
			})();

			const transport = await createNatsTransport({
				servers: url,
				subjectPrefix: 'cortex',
			});

			const envelope: Envelope = {
				id: uuid(),
				type: 'test.event',
				source: 'vitest',
				time: new Date().toISOString(),
				data: { hello: 'world' },
			} as Envelope;

			await transport.publish(envelope);

			// Give NATS a moment to deliver the message
			await new Promise((resolve) => setTimeout(resolve, 500));

			expect(messages.some((msg) => msg.id === envelope.id && msg.data?.hello === 'world')).toBe(
				true,
			);

			await subscription.unsubscribe();
			await transport.close();
		} finally {
			if (connection) {
				await connection.drain().catch(() => {
					/* ignore */
				});
				await connection.close().catch(() => {
					/* ignore */
				});
			}
			if (container) {
				await container.stop().catch(() => {
					/* ignore */
				});
			}
		}
	}, 30_000);
});
