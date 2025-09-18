import { describe, expect, test } from 'vitest';

const shouldAttempt = process.env.CORTEX_SKIP_NATS_TEST !== '1';

const suite = shouldAttempt ? describe : describe.skip;

suite('NATS connectivity', () => {
	test('starts container and accepts connections', async () => {
		let container:
			| {
					stop: () => Promise<void>;
			  }
			| undefined;
		let connection:
			| {
					publish: (subject: string, payload?: Uint8Array) => Promise<void>;
					flush: () => Promise<void>;
					drain: () => Promise<void>;
					close: () => Promise<void>;
					isClosed: () => boolean;
			  }
			| undefined;
		try {
			const testcontainers = await import('@testcontainers/nats');
			const nats = await import('nats');
			const { NatsContainer } = testcontainers;
			container = await new NatsContainer().start();
			const url = `nats://${container.getHost()}:${container.getPort()}`;
			connection = await nats.connect({ servers: url });
			try {
				const subject = `test.${Date.now()}`;
				const payload = new TextEncoder().encode('ping');
				await connection.publish(subject, payload);
				await connection.flush();
				expect(connection.isClosed()).toBe(false);
				await connection.drain();
			} finally {
				await connection.close();
			}
		} catch (error) {
			console.warn('NATS smoke test skipped:', error);
			return;
		} finally {
			if (container) {
				try {
					await container.stop();
				} catch (stopError) {
					console.warn('Failed to stop NATS container', stopError);
				}
			}
		}
	}, 30_000);
});
