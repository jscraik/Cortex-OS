// Message service for Cortex WebUI backend

import { asc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db, messages } from '../db';
import type { NewMessage } from '../db/schema';

export const getMessagesByConversationId = async (conversationId: string) => {
	const records = await db
		.select()
		.from(messages)
		.where(eq(messages.conversationId, conversationId))
		.orderBy(asc(messages.createdAt));

	return records.map((record) => ({
		id: record.id,
		conversationId: record.conversationId,
		role: record.role,
		content: record.content,
		metadata: record.metadata ? JSON.parse(record.metadata) : undefined,
		createdAt: record.createdAt.toISOString(),
	}));
};

export const createMessage = async (
	conversationId: string,
	role: 'user' | 'assistant' | 'system',
	content: string,
	metadata?: Record<string, unknown>,
) => {
	const messageId = uuidv4();
	const now = new Date();

	const result = await db
		.insert(messages)
		.values({
			id: messageId,
			conversationId,
			role,
			content,
			metadata: metadata ? JSON.stringify(metadata) : null,
			createdAt: now,
		} as NewMessage)
		.returning();

	return {
		id: result[0].id,
		conversationId: result[0].conversationId,
		role: result[0].role,
		content: result[0].content,
		metadata: result[0].metadata ? JSON.parse(result[0].metadata) : undefined,
		createdAt: result[0].createdAt.toISOString(),
	};
};

export const deleteMessagesByConversationId = async (conversationId: string): Promise<void> => {
	await db.delete(messages).where(eq(messages.conversationId, conversationId));
};
