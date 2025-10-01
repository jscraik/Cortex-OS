import { OutboxMessageStatus } from '@cortex-os/a2a-contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SqliteOutboxRepository } from '../src/sqlite-outbox-repository.js';

describe('SqliteOutboxRepository', () => {
	let repository: SqliteOutboxRepository;

	// Mock message data
	const mockMessage = {
		aggregateType: 'user',
		aggregateId: '123',
		eventType: 'user.created',
		payload: { id: '123', name: 'John Doe' },
		metadata: { source: 'test' },
		status: OutboxMessageStatus.PENDING,
		retryCount: 0,
		maxRetries: 3,
		idempotencyKey: 'idemp-123',
	};

	beforeEach(() => {
		// Use in-memory database for testing
		repository = new SqliteOutboxRepository(':memory:');
	});

	afterEach(() => {
		// Clean up is handled automatically for in-memory databases
	});

	it('should save and retrieve a message', async () => {
		// Save the message
		const savedMessage = await repository.save(mockMessage);

		// Retrieve the message by status
		const messages = await repository.findByStatus(OutboxMessageStatus.PENDING);

		expect(messages).toHaveLength(1);
		expect(messages[0].id).toBe(savedMessage.id);
		expect(messages[0].aggregateType).toBe(mockMessage.aggregateType);
		expect(messages[0].aggregateId).toBe(mockMessage.aggregateId);
		expect(messages[0].eventType).toBe(mockMessage.eventType);
		expect(messages[0].payload).toEqual(mockMessage.payload);
		expect(messages[0].metadata).toEqual(mockMessage.metadata);
		expect(messages[0].status).toBe(OutboxMessageStatus.PENDING);
	});

	it('should save and retrieve a batch of messages', async () => {
		// Save batch of messages
		const messagesToSave = [
			{ ...mockMessage, aggregateId: '1' },
			{ ...mockMessage, aggregateId: '2' },
			{ ...mockMessage, aggregateId: '3' },
		];

		const savedMessages = await repository.saveBatch(messagesToSave);

		expect(savedMessages).toHaveLength(3);

		// Retrieve all pending messages
		const pendingMessages = await repository.findByStatus(OutboxMessageStatus.PENDING);

		expect(pendingMessages).toHaveLength(3);
		expect(pendingMessages.map((m) => m.aggregateId)).toContain('1');
		expect(pendingMessages.map((m) => m.aggregateId)).toContain('2');
		expect(pendingMessages.map((m) => m.aggregateId)).toContain('3');
	});

	it('should find messages by aggregate', async () => {
		// Save messages for the same aggregate
		const message1 = await repository.save({
			...mockMessage,
			aggregateId: 'user-123',
		});
		const message2 = await repository.save({
			...mockMessage,
			aggregateId: 'user-123',
		});
		const message3 = await repository.save({
			...mockMessage,
			aggregateId: 'user-456',
		});

		// Find messages by aggregate
		const messages = await repository.findByAggregate('user', 'user-123');

		expect(messages).toHaveLength(2);
		expect(messages.map((m) => m.id)).toContain(message1.id);
		expect(messages.map((m) => m.id)).toContain(message2.id);
		expect(messages.map((m) => m.id)).not.toContain(message3.id);
	});

	it('should update message status', async () => {
		// Save a message
		const savedMessage = await repository.save(mockMessage);

		// Update status
		await repository.updateStatus(savedMessage.id, OutboxMessageStatus.PROCESSING);

		// Retrieve the message
		const messages = await repository.findByStatus(OutboxMessageStatus.PROCESSING);

		expect(messages).toHaveLength(1);
		expect(messages[0].id).toBe(savedMessage.id);
		expect(messages[0].status).toBe(OutboxMessageStatus.PROCESSING);
	});

	it('should mark message as processed', async () => {
		// Save a message
		const savedMessage = await repository.save(mockMessage);

		// Mark as processed
		const publishedAt = new Date();
		await repository.markProcessed(savedMessage.id, publishedAt);

		// Retrieve the message
		const messages = await repository.findByStatus(OutboxMessageStatus.PUBLISHED);

		expect(messages).toHaveLength(1);
		expect(messages[0].id).toBe(savedMessage.id);
		expect(messages[0].status).toBe(OutboxMessageStatus.PUBLISHED);
		expect(messages[0].publishedAt).toEqual(publishedAt);
	});

	it('should increment retry count', async () => {
		// Save a message
		const savedMessage = await repository.save(mockMessage);

		// Increment retry
		await repository.incrementRetry(savedMessage.id, 'Test error');

		// Retrieve the message
		const messages = await repository.findByStatus(OutboxMessageStatus.FAILED);

		expect(messages).toHaveLength(1);
		expect(messages[0].id).toBe(savedMessage.id);
		expect(messages[0].status).toBe(OutboxMessageStatus.FAILED);
		expect(messages[0].retryCount).toBe(1);
		expect(messages[0].lastError).toBe('Test error');
		expect(messages[0].nextRetryAt).toBeDefined();
	});

	it('should move message to dead letter queue', async () => {
		// Save a message
		const savedMessage = await repository.save(mockMessage);

		// Move to dead letter
		const error = 'Max retries exceeded';
		await repository.moveToDeadLetter(savedMessage.id, error);

		// Retrieve the message
		const messages = await repository.findByStatus(OutboxMessageStatus.DEAD_LETTER);

		expect(messages).toHaveLength(1);
		expect(messages[0].id).toBe(savedMessage.id);
		expect(messages[0].status).toBe(OutboxMessageStatus.DEAD_LETTER);
		expect(messages[0].lastError).toBe(error);
	});

	it('should check idempotency key existence', async () => {
		// Save a message with idempotency key
		await repository.save(mockMessage);

		// Check if idempotency key exists
		const exists = await repository.existsByIdempotencyKey('idemp-123');
		const notExists = await repository.existsByIdempotencyKey('non-existent');

		expect(exists).toBe(true);
		expect(notExists).toBe(false);
	});

	it('should cleanup old processed messages', async () => {
		// Save and process messages
		const message1 = await repository.save({
			...mockMessage,
			aggregateId: '1',
		});
		const message2 = await repository.save({
			...mockMessage,
			aggregateId: '2',
		});

		// Mark as processed with different dates
		const oldDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
		await repository.markProcessed(message1.id, oldDate);
		await repository.markProcessed(message2.id);

		// Cleanup messages older than 12 hours
		const cutoffDate = new Date(Date.now() - 12 * 60 * 60 * 1000);
		const deletedCount = await repository.cleanup(cutoffDate);

		expect(deletedCount).toBe(1);

		// Check that only the newer message remains
		const remainingMessages = await repository.findByStatus(OutboxMessageStatus.PUBLISHED);
		expect(remainingMessages).toHaveLength(1);
		expect(remainingMessages[0].id).toBe(message2.id);
	});

	it('should find messages ready for retry', async () => {
		// Save messages
		const message1 = await repository.save({
			...mockMessage,
			aggregateId: '1',
		});
		const message2 = await repository.save({
			...mockMessage,
			aggregateId: '2',
		});

		// Fail messages with different retry times
		await repository.incrementRetry(message1.id, 'Error 1');

		// Set message2's next retry time to the past
		const db = (repository as any).db;
		const pastTime = Date.now() - 1000;
		const stmt = db.prepare('UPDATE outbox_messages SET next_retry_at = ? WHERE id = ?');
		stmt.run(pastTime, message2.id);

		// Increment retry for message2
		await repository.incrementRetry(message2.id, 'Error 2');

		// Find messages ready for retry
		const messages = await repository.findReadyForRetry();

		expect(messages).toHaveLength(1);
		expect(messages[0].id).toBe(message2.id);
	});
});
