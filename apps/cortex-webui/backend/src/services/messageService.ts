// Message service for Cortex WebUI backend

import { v4 as uuidv4 } from 'uuid';
import { Message } from '../../../shared/types';
import { MessageModel } from '../models/message';
import { getDatabase } from '../utils/database';

export class MessageService {
  static async getMessagesByConversationId(conversationId: string): Promise<Message[]> {
    const db = await getDatabase();
    const records = await db.all(
      `SELECT * FROM ${MessageModel.tableName} WHERE conversation_id = ? ORDER BY created_at ASC`,
      [conversationId],
    );

    return records.map(MessageModel.fromRecord);
  }

  static async createMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
  ): Promise<Message> {
    const db = await getDatabase();

    const messageId = uuidv4();
    const now = new Date().toISOString();
    const messageRecord = {
      id: messageId,
      conversation_id: conversationId,
      role,
      content,
      created_at: now,
    };

    await db.run(
      `INSERT INTO ${MessageModel.tableName} (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)`,
      [
        messageRecord.id,
        messageRecord.conversation_id,
        messageRecord.role,
        messageRecord.content,
        messageRecord.created_at,
      ],
    );

    return MessageModel.fromRecord(messageRecord);
  }

  static async deleteMessagesByConversationId(conversationId: string): Promise<void> {
    const db = await getDatabase();
    await db.run(`DELETE FROM ${MessageModel.tableName} WHERE conversation_id = ?`, [
      conversationId,
    ]);
  }
}
