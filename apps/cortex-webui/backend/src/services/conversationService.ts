// Conversation service for Cortex WebUI backend

import { v4 as uuidv4 } from 'uuid';
import type { Conversation } from '@shared/types';
import {
	ConversationModel,
	type ConversationRecord,
} from '../models/conversation';
import { getDatabase } from '../utils/database';

export class ConversationService {
	static getConversationsByUserId(userId: string): Conversation[] {
		const db = getDatabase();
		const records = db
			.prepare(
				`SELECT * FROM ${ConversationModel.tableName} WHERE user_id = ? ORDER BY updated_at DESC`,
			)
			.all(userId) as ConversationRecord[];

		return records.map(ConversationModel.fromRecord);
	}

	static getConversationById(id: string): Conversation | null {
		const db = getDatabase();
		const record = db
			.prepare(`SELECT * FROM ${ConversationModel.tableName} WHERE id = ?`)
			.get(id) as ConversationRecord | undefined;

		if (!record) {
			return null;
		}

		return ConversationModel.fromRecord(record);
	}

	static createConversation(userId: string, title: string): Conversation {
		const db = getDatabase();

		const conversationId = uuidv4();
		const now = new Date().toISOString();
		const conversationRecord = {
			id: conversationId,
			title,
			user_id: userId,
			created_at: now,
			updated_at: now,
		};

		db.prepare(
			`INSERT INTO ${ConversationModel.tableName} (id, title, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
		).run(
			conversationRecord.id,
			conversationRecord.title,
			conversationRecord.user_id,
			conversationRecord.created_at,
			conversationRecord.updated_at,
		);

		return ConversationModel.fromRecord(conversationRecord);
	}

	static updateConversation(
		id: string,
		updates: Partial<Conversation>,
	): Conversation | null {
		const db = getDatabase();

		// Build update query
		const fields = [];
		const values = [];

		if (updates.title !== undefined) {
			fields.push('title = ?');
			values.push(updates.title);
		}

		if (fields.length === 0) {
			// No valid fields to update
			return ConversationService.getConversationById(id);
		}

		fields.push('updated_at = ?');
		values.push(new Date().toISOString());
		values.push(id);

		const query = `UPDATE ${ConversationModel.tableName} SET ${fields.join(', ')} WHERE id = ?`;
		db.prepare(query).run(...values);

		return ConversationService.getConversationById(id);
	}

	static deleteConversation(id: string): void {
		const db = getDatabase();

		// Delete associated messages first
		db.prepare(`DELETE FROM messages WHERE conversation_id = ?`).run(id);

		// Delete conversation
		db.prepare(`DELETE FROM ${ConversationModel.tableName} WHERE id = ?`).run(
			id,
		);
	}
}
