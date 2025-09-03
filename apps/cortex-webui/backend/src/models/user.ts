// User model for Cortex WebUI backend

import { User } from '../../../shared/types';

export interface UserRecord extends User {
  id: string;
  email: string;
  name: string;
  password: string;
  createdAt: string;
  updatedAt: string;
}

export class UserModel {
  static tableName = 'users';

  static createTableSQL = `
    CREATE TABLE IF NOT EXISTS ${this.tableName} (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;

  static toRecord(user: User): UserRecord {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      password: user.password,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static fromRecord(record: UserRecord): User {
    return {
      id: record.id,
      email: record.email,
      name: record.name,
      password: record.password,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
