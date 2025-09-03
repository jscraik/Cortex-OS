// Conversation service for Cortex WebUI backend

import { v4 as uuidv4 } from 'uuid';
import { Conversation } from '../../../shared/types';
import { ConversationModel } from '../models/conversation';
import { getDatabase } from '../utils/database';

export class ConversationService {
  static async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    const db = await getDatabase();
    const records = await db.all(
      `SELECT * FROM ${ConversationModel.tableName} WHERE user_id = ? ORDER BY updated_at DESC`,
      [userId],
    );

    return records.map(ConversationModel.fromRecord);
  }

  static async getConversationById(id: string): Promise<Conversation | null> {
    const db = await getDatabase();
    const record = await db.get(`SELECT * FROM ${ConversationModel.tableName} WHERE id = ?`, [id]);

    if (!record) {
      return null;
    }

    return ConversationModel.fromRecord(record);
  }

  static async createConversation(userId: string, title: string): Promise<Conversation> {
    const db = await getDatabase();

    const conversationId = uuidv4();
    const now = new Date().toISOString();
    const conversationRecord = {
      id: conversationId,
      title,
      user_id: userId,
      created_at: now,
      updated_at: now,
    };

    await db.run(
      `INSERT INTO ${ConversationModel.tableName} (id, title, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      [
        conversationRecord.id,
        conversationRecord.title,
        conversationRecord.user_id,
        conversationRecord.created_at,
        conversationRecord.updated_at,
      ],
    );

    return ConversationModel.fromRecord(conversationRecord);
  }

  static async updateConversation(
    id: string,
    updates: Partial<Conversation>,
  ): Promise<Conversation | null> {
    const db = await getDatabase();

    // Build update query
    const fields = [];
    const values = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }

    if (fields.length === 0) {
      // No valid fields to update
      return await this.getConversationById(id);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const query = `UPDATE ${ConversationModel.tableName} SET ${fields.join(', ')} WHERE id = ?`;
    await db.run(query, values);

    return await this.getConversationById(id);
  }

  static async deleteConversation(id: string): Promise<void> {
    const db = await getDatabase();

    // Delete associated messages first
    await db.run(`DELETE FROM messages WHERE conversation_id = ?`, [id]);

    // Delete conversation
    await db.run(`DELETE FROM ${ConversationModel.tableName} WHERE id = ?`, [id]);
  }
}
