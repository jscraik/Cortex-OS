// Message service for Cortex WebUI backend

import type { Message } from '@shared/types';
import { v4 as uuidv4 } from 'uuid';
import { MessageModel, type MessageRecord } from '../models/message';
import { getDatabase } from '../utils/database';

export class MessageService {
	static getMessagesByConversationId(conversationId: string): Message[] {
		const db = getDatabase();
		const records = db
			.prepare(
				`SELECT * FROM ${MessageModel.tableName} WHERE conversation_id = ? ORDER BY created_at ASC`,
			)
			.all(conversationId) as MessageRecord[];

		return records.map(MessageModel.fromRecord);
	}

	static createMessage(
		conversationId: string,
		role: 'user' | 'assistant' | 'system',
		content: string,
	): Message {
		const db = getDatabase();

		const messageId = uuidv4();
		const now = new Date().toISOString();
		const messageRecord: MessageRecord = {
			id: messageId,
			conversation_id: conversationId,
			role,
			content,
			created_at: now,
		};

		db.prepare(
			`INSERT INTO ${MessageModel.tableName} (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)`,
		).run(
			messageRecord.id,
			messageRecord.conversation_id,
			messageRecord.role,
			messageRecord.content,
			messageRecord.created_at,
		);

		return MessageModel.fromRecord(messageRecord);
	}

	static deleteMessagesByConversationId(conversationId: string): void {
		const db = getDatabase();
		db.prepare(
			`DELETE FROM ${MessageModel.tableName} WHERE conversation_id = ?`,
		).run(conversationId);
	}
}
