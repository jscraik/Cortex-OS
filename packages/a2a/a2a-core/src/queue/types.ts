import { z } from 'zod';
import type { Envelope } from '../../../a2a-contracts/src/envelope.js';

export const QueueMessageStatus = z.enum(['pending', 'processing', 'completed', 'failed']);

export const QueueMessageSchema = z.object({
	id: z.string().uuid(),
	envelope: z.unknown(), // Will be parsed as Envelope
	status: QueueMessageStatus,
	createdAt: z.string().datetime(),
	lockedUntil: z.string().datetime().nullable(),
	retryCount: z.number().int().min(0).default(0),
	lastError: z.string().nullable(),
	maxRetries: z.number().int().min(0).default(3),
});

export type QueueMessage = z.infer<typeof QueueMessageSchema>;
export type QueueMessageStatusType = z.infer<typeof QueueMessageStatus>;

export interface QueueConfig {
	connectionString: string;
	tableName: string;
	lockTimeoutMs: number;
	maxRetries: number;
}

export interface DurableQueue {
	initialize(): Promise<void>;
	enqueue(envelope: Envelope): Promise<string>;
	dequeue(lockDuration?: number): Promise<QueueMessage | null>;
	acknowledge(messageId: string): Promise<void>;
	reject(messageId: string, error: Error): Promise<void>;
	getDepth(): Promise<number>;
	getMaxDepth(): Promise<number>;
	shutdown(): Promise<void>;
}

export interface TransactionalQueue {
	enqueue(envelope: Envelope): Promise<string>;
	dequeue(lockDuration?: number): Promise<QueueMessage | null>;
	acknowledge(messageId: string): Promise<void>;
	reject(messageId: string, error: Error): Promise<void>;
}

export interface QueueTransaction {
	queue: TransactionalQueue;
	commit(): Promise<void>;
	rollback(): Promise<void>;
}
