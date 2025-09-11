import { rateLimiter } from '@cortex-os/a2a-common';
import express from 'express';
import { type OutboxMessage, OutboxMessageStatus } from './schema';

type OutboxMessageExt = OutboxMessage & { _simulateFailure?: boolean };

const outbox: OutboxMessage[] = [];
const poisonQueue: OutboxMessage[] = [];
const MAX_RETRIES = 3;
const retries = new Map<string, number>();

export function createService() {
	const app = express();
	app.use(express.json());
	app.use(rateLimiter);

	app.post('/messages', (req, res) => {
		const message = req.body as OutboxMessageExt;
		message.status = OutboxMessageStatus.enum.pending;
		// Persist a test-only flag to force deterministic failure during processing
		message._simulateFailure = req.query.simulateFailure === 'true';
		outbox.push(message);
		res.status(202).json(message);
	});

	app.get('/messages/:id', (req, res) => {
		const { id } = req.params;
		const message =
			outbox.find((m) => m.id === id) || poisonQueue.find((m) => m.id === id);
		if (message) {
			res.json(message);
		} else {
			res.status(404).send('Message not found');
		}
	});

	app.get('/poison-messages', (_req, res) => {
		res.json(poisonQueue);
	});

	app.post('/fail', (_req, res) => {
		res.status(500).send('Internal Server Error');
	});

	app.post('/process-outbox', (_req, res) => {
		const pendingMessages = outbox.filter(
			(m) =>
				m.status === OutboxMessageStatus.enum.pending ||
				m.status === OutboxMessageStatus.enum.failed,
		);
		for (const message of pendingMessages as OutboxMessageExt[]) {
			// In a real application, this would send the message to the destination
			console.warn(`Sending message ${message.id} to ${message.source}`);
			try {
				// Simulate sending message
				// If sending fails, throw an error
				// throw new Error('Simulated sending failure');
				message.status = OutboxMessageStatus.enum.sent;
				retries.delete(message.id);
			} catch (error) {
				console.warn('Send failed', error);
				const retryCount = (retries.get(message.id) || 0) + 1;
				retries.set(message.id, retryCount);

				if (retryCount >= MAX_RETRIES) {
					message.status = OutboxMessageStatus.enum.poisoned;
					poisonQueue.push(message);
					// Remove from outbox
					const index = outbox.indexOf(message);
					if (index > -1) {
						outbox.splice(index, 1);
					}
					retries.delete(message.id);
				} else {
					message.status = OutboxMessageStatus.enum.failed; // Mark as failed for now, will retry later
				}
			}
		}
		res.status(200).send('Outbox processed');
	});

	return app;
}

export function createTestService() {
	const app = express();
	app.use(express.json());

	app.post('/messages', (req, res) => {
		const message = req.body as OutboxMessageExt;
		message.status = OutboxMessageStatus.enum.pending;
		message._simulateFailure = req.query.simulateFailure === 'true';
		outbox.push(message);
		res.status(202).json(message);
	});

	app.get('/messages/:id', (req, res) => {
		const { id } = req.params;
		const message =
			outbox.find((m) => m.id === id) || poisonQueue.find((m) => m.id === id);
		if (message) {
			res.json(message);
		} else {
			res.status(404).send('Message not found');
		}
	});

	app.get('/poison-messages', (_req, res) => {
		res.json(poisonQueue);
	});

	app.post('/fail', (_req, res) => {
		res.status(500).send('Internal Server Error');
	});

	app.post('/process-outbox', (req, res) => {
		const pendingMessages = outbox.filter(
			(m) =>
				m.status === OutboxMessageStatus.enum.pending ||
				m.status === OutboxMessageStatus.enum.failed,
		);
		for (const message of pendingMessages as OutboxMessageExt[]) {
			// In a real application, this would send the message to the destination
			console.warn(`Sending message ${message.id} to ${message.source}`);

			// Deterministic failure for tests when simulateFailure flag is present on the enqueue URL
			const simulateFailureFlag =
				message._simulateFailure === true ||
				req.query.simulateFailure === 'true';
			// Deterministic failure behavior for tests
			const shouldFail = simulateFailureFlag;

			if (shouldFail) {
				const retryCount = (retries.get(message.id) || 0) + 1;
				retries.set(message.id, retryCount);

				if (retryCount >= MAX_RETRIES) {
					message.status = OutboxMessageStatus.enum.poisoned;
					poisonQueue.push(message);
					// Remove from outbox
					const index = outbox.indexOf(message);
					if (index > -1) {
						outbox.splice(index, 1);
					}
					retries.delete(message.id);
				} else {
					message.status = OutboxMessageStatus.enum.failed; // Mark as failed for now, will retry later
				}
			} else {
				// Message sent successfully
				message.status = OutboxMessageStatus.enum.sent;
				retries.delete(message.id);
			}
		}
		res.status(200).send('Outbox processed');
	});

	return app;
}
