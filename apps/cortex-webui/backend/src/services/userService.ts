// User service for Cortex WebUI backend

import { User } from '../../../shared/types';
import { UserModel } from '../models/user';
import { getDatabase } from '../utils/database';

export class UserService {
  static async getUserById(id: string): Promise<User | null> {
    const db = await getDatabase();
    const record = await db.get(`SELECT * FROM ${UserModel.tableName} WHERE id = ?`, [id]);

    if (!record) {
      return null;
    }

    const user = UserModel.fromRecord(record);
    // Remove password from returned user object
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    const db = await getDatabase();
    const record = await db.get(`SELECT * FROM ${UserModel.tableName} WHERE email = ?`, [email]);

    if (!record) {
      return null;
    }

    const user = UserModel.fromRecord(record);
    // Remove password from returned user object
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const db = await getDatabase();

    // Build update query
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }

    if (fields.length === 0) {
      // No valid fields to update
      return await this.getUserById(id);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const query = `UPDATE ${UserModel.tableName} SET ${fields.join(', ')} WHERE id = ?`;
    await db.run(query, values);

    return await this.getUserById(id);
  }
}
