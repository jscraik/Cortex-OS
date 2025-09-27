// Conversation model for Cortex WebUI backend

import type { Conversation } from '@shared/types';

export interface ConversationRecord {
	id: string;
	title: string;
	user_id: string;
	created_at: string;
	updated_at: string;
}

export class ConversationModel {
	static readonly tableName = 'conversations';

	static readonly createTableSQL = `
    CREATE TABLE IF NOT EXISTS ${this.tableName} (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `;

	static toRecord(conversation: Conversation): ConversationRecord {
		return {
			id: conversation.id,
			title: conversation.title,
			user_id: conversation.userId,
			created_at: conversation.createdAt,
			updated_at: conversation.updatedAt,
		};
	}

	static fromRecord(record: ConversationRecord): Conversation {
		return {
			id: record.id,
			title: record.title,
			userId: record.user_id,
			createdAt: record.created_at,
			updatedAt: record.updated_at,
		};
	}
}
