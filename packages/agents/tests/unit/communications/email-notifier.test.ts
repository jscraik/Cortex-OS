import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createEmailNotifier,
	EmailNotificationError,
	EmailTemplateNotFoundError,
	InMemoryEmailTemplateStore,
	type EmailNotificationRequest,
	type IdempotencyStore,
} from '../../../src/communications/email-notifier.js';

class InMemoryIdempotencyStore implements IdempotencyStore {
	private readonly entries = new Map<string, number>();

	async seen(id: string): Promise<boolean> {
		const expiry = this.entries.get(id);
		if (!expiry) {
			return false;
		}
		if (expiry <= Date.now()) {
			this.entries.delete(id);
			return false;
		}
		return true;
	}

	async remember(id: string, ttlSec: number): Promise<void> {
		this.entries.set(id, Date.now() + ttlSec * 1000);
	}
}

describe('EmailNotifier', () => {
	const templateStore = new InMemoryEmailTemplateStore([
		{
			id: 'welcome-email',
			subject: 'Welcome, {{user.name}}',
			text: 'Hello {{user.name}}, thanks for joining {{product}}.',
			html: '<p>Hello <strong>{{user.name}}</strong>, thanks for joining {{product}}.</p>',
			from: 'test@example.com',
		},
	]);

	const baseRequest: EmailNotificationRequest = {
		to: 'recipient@example.com',
		templateId: 'welcome-email',
		data: {
			user: { name: 'Jamie' },
			product: 'Cortex-OS',
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders template and invokes transport', async () => {
		const sendMock = vi.fn().mockResolvedValue({ id: 'email-123' });
		const notifier = createEmailNotifier({
			templateStore,
			transport: { send: sendMock },
		});

		const result = await notifier.send(baseRequest);

		expect(result).toEqual({
			status: 'sent',
			attempts: 1,
			messageId: 'email-123',
			idempotencyKey: undefined,
		});

		expect(sendMock).toHaveBeenCalledTimes(1);
		expect(sendMock).toHaveBeenCalledWith({
			to: ['recipient@example.com'],
			subject: 'Welcome, Jamie',
			text: 'Hello Jamie, thanks for joining Cortex-OS.',
			html: '<p>Hello <strong>Jamie</strong>, thanks for joining Cortex-OS.</p>',
			from: 'test@example.com',
			cc: undefined,
			bcc: undefined,
			headers: undefined,
			metadata: undefined,
			tags: undefined,
			idempotencyKey: undefined,
		});
	});

	it('throws when template missing', async () => {
		const notifier = createEmailNotifier({
			templateStore,
			transport: { send: vi.fn() },
		});

	await expect(
			notifier.send({ to: 'user@example.com', templateId: 'missing-template' }),
		).rejects.toBeInstanceOf(EmailTemplateNotFoundError);
	});

	it('retries transport on failure', async () => {
		const sendMock = vi
			.fn()
			.mockRejectedValueOnce(new Error('network down'))
			.mockRejectedValueOnce(new Error('still down'))
			.mockResolvedValue({ id: 'recovered' });

		const notifier = createEmailNotifier({
			templateStore,
			transport: { send: sendMock },
			retry: {
				maxAttempts: 3,
				baseDelayMs: 1,
				sleepFn: async () => {
					/* no-op for tests */
				},
			},
		});

		const result = await notifier.send(baseRequest);

		expect(result.status).toBe('sent');
		expect(result.attempts).toBe(3);
		expect(sendMock).toHaveBeenCalledTimes(3);
	});

	it('propagates failure after exhausting retries', async () => {
		const sendMock = vi.fn().mockRejectedValue(new Error('transport offline'));
		const notifier = createEmailNotifier({
			templateStore,
			transport: { send: sendMock },
			retry: {
				maxAttempts: 2,
				baseDelayMs: 1,
				sleepFn: async () => {},
			},
		});

	await expect(notifier.send(baseRequest)).rejects.toBeInstanceOf(EmailNotificationError);
		expect(sendMock).toHaveBeenCalledTimes(2);
	});

	it('skips duplicate sends when idempotency store matches key', async () => {
		const idempotency = new InMemoryIdempotencyStore();
		const sendMock = vi.fn().mockResolvedValue({ id: 'first' });
		const notifier = createEmailNotifier({
			templateStore,
			transport: { send: sendMock },
			idempotency: {
				store: idempotency,
				ttlSeconds: 60,
			},
		});

		const first = await notifier.send({ ...baseRequest, idempotencyKey: 'welcome:1' });
		const second = await notifier.send({ ...baseRequest, idempotencyKey: 'welcome:1' });

		expect(first.status).toBe('sent');
		expect(second.status).toBe('skipped');
		expect(sendMock).toHaveBeenCalledTimes(1);
	});
});
