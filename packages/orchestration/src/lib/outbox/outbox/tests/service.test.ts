import type { Server } from 'node:http';
import type { Envelope } from '@cortex-os/a2a-contracts/envelope';
import { send } from '@cortex-os/a2a-core/send';
import axios from 'axios';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestService } from '../src/service';

// SSRF protection for test environment
function validateTestUrl(url: string): void {
	const parsed = new URL(url);
	// Only allow localhost for tests
	if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
		throw new Error(
			`Test request blocked: hostname ${parsed.hostname} not allowed`,
		);
	}
}

// Safe axios wrapper for tests
const safeAxios: Pick<typeof axios, 'get' | 'post'> = {
        get: (url, config) => {
                validateTestUrl(url);
                return axios.get(url, config);
        },
        post: (url, data, config) => {
                validateTestUrl(url);
                return axios.post(url, data, config);
        },
};

type PoisonMessage = { id: string; status: string } & Record<string, unknown>;

const isPoisonMessage = (value: unknown): value is PoisonMessage =>
        typeof value === 'object' &&
        value !== null &&
        'id' in value &&
        typeof (value as { id?: unknown }).id === 'string' &&
        'status' in value &&
        typeof (value as { status?: unknown }).status === 'string';

const MAX_RETRIES = 3;

describe('Outbox Service', () => {
	let app: Express.Application;
	let server: Server;

	beforeAll(() => {
		app = createTestService();
		server = app.listen(3002);
		vi.useFakeTimers();
	});

	afterAll(() => {
		server.close();
		vi.useRealTimers();
	});

	it('should send a message and update its status', async () => {
		const outboxUrl = 'http://localhost:3002/messages';

		const sentEnvelope = await send({
			type: 'test-event',
			source: 'http://example.com/test',
			data: { foo: 'bar' },
			outboxUrl,
		});

		// In a real application, we would not use a timeout
		await safeAxios.post('http://localhost:3002/process-outbox');

		const res = await safeAxios.get(`${outboxUrl}/${sentEnvelope.id}`);
		const message = res.data;

		expect(message.status).toBe('sent');
	}, 10000);

	it('should move a message to the poison queue after multiple failures', async () => {
		const outboxUrl = 'http://localhost:3002/messages';

		let sentEnvelope: Envelope | null = null;
                try {
                        sentEnvelope = await send({
                                type: 'test-event',
                                source: 'http://example.com/test',
                                data: { foo: 'bar' },
                                outboxUrl,
                                simulateFailure: true,
                        });
                } catch {
                        // Expected to fail
                }

		// Wait for multiple retry attempts and then for the message to be moved to the poison queue
		for (let i = 0; i < MAX_RETRIES + 1; i++) {
			await safeAxios.post('http://localhost:3002/process-outbox');
		}

                const res = await safeAxios.get(`http://localhost:3002/poison-messages`);
                const poisonMessages = Array.isArray(res.data) ? res.data.filter(isPoisonMessage) : [];

                expect(sentEnvelope).toBeDefined();
                const poisonedMessage = poisonMessages.find(
                        (message) => message.id === sentEnvelope?.id,
                );
                expect(poisonedMessage).toBeDefined();
                expect(poisonedMessage?.status).toBe('poisoned');
	}, 30000); // Increased timeout for poison queue test

	it('should trip the circuit breaker when the service fails', async () => {
		const outboxUrl = 'http://localhost:3002/fail';

		// Make multiple requests to trip the circuit breaker
		for (let i = 0; i < 10; i++) {
                        try {
                                await send({
                                        type: 'test-event',
                                        source: 'http://example.com/test',
                                        data: { foo: 'bar' },
                                        outboxUrl,
                                });
                        } catch {
                                // Expected to fail
                        }
                }

		// The next request should be rejected by the circuit breaker
		await expect(
			send({
				type: 'test-event',
				source: 'http://example.com/test',
				data: { foo: 'bar' },
				outboxUrl,
			}),
		).rejects.toThrow('Breaker is open');
	}, 20000); // Increased timeout for circuit breaker test
});
