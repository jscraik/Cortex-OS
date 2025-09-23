// Conversation service for Cortex WebUI backend

import { desc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { conversations, db, messages } from '../db';
import type { NewConversation } from '../db/schema';

export class ConversationService {
	static async getConversationsByUserId(userId: string) {
		const records = await db
			.select()
			.from(conversations)
			.where(eq(conversations.userId, userId))
			.orderBy(desc(conversations.updatedAt));

		return records.map((record) => ({
			id: record.id,
			title: record.title,
			userId: record.userId,
			createdAt: record.createdAt.toISOString(),
			updatedAt: record.updatedAt.toISOString(),
		}));
	}

	static async getConversationById(id: string) {
		const record = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);

		if (!record[0]) {
			return null;
		}

		return {
			id: record[0].id,
			title: record[0].title,
			userId: record[0].userId,
			createdAt: record[0].createdAt.toISOString(),
			updatedAt: record[0].updatedAt.toISOString(),
		};
	}

	static async createConversation(userId: string, title: string) {
		const conversationId = uuidv4();
		const now = new Date();

		const result = await db
			.insert(conversations)
			.values({
				id: conversationId,
				title,
				userId,
				createdAt: now,
				updatedAt: now,
			} as NewConversation)
			.returning();

		return {
			id: result[0].id,
			title: result[0].title,
			userId: result[0].userId,
			createdAt: result[0].createdAt.toISOString(),
			updatedAt: result[0].updatedAt.toISOString(),
		};
	}

	static async updateConversation(id: string, updates: Partial<{ title: string }>) {
		const result = await db
			.update(conversations)
			.set({
				...updates,
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, id))
			.returning();

		if (!result[0]) {
			return null;
		}

		return {
			id: result[0].id,
			title: result[0].title,
			userId: result[0].userId,
			createdAt: result[0].createdAt.toISOString(),
			updatedAt: result[0].updatedAt.toISOString(),
		};
	}

	static async deleteConversation(id: string): Promise<void> {
		// Delete associated messages first (cascade)
		await db.delete(messages).where(eq(messages.conversationId, id));
		// Then delete the conversation
		await db.delete(conversations).where(eq(conversations.id, id));
	}
}
