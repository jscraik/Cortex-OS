// Message model for Cortex WebUI backend

import type { Message } from '@shared/types';

export interface MessageRecord {
	id: string;
	conversation_id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	created_at: string;
}

export class MessageModel {
	static tableName = 'messages';

	static createTableSQL = `
    CREATE TABLE IF NOT EXISTS ${this.tableName} (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations (id)
    )
  `;

	static toRecord(message: Message): MessageRecord {
		return {
			id: message.id,
			conversation_id: message.conversationId,
			role: message.role,
			content: message.content,
			created_at: message.createdAt,
		};
	}

	static fromRecord(record: MessageRecord): Message {
		return {
			id: record.id,
			conversationId: record.conversation_id,
			role: record.role,
			content: record.content,
			createdAt: record.created_at,
		};
	}
}
