// User model for Cortex WebUI backend

import type { UserRecord, UserWithPassword } from '@shared/types';

export const UserModel = {
	tableName: 'users' as const,

	createTableSQL: `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  ` as const,

	toRecord(user: UserWithPassword): Omit<UserRecord, 'created_at' | 'updated_at'> & {
		created_at: string;
		updated_at: string;
	} {
		return {
			id: user.id,
			email: user.email,
			name: user.name,
			password: user.password,
			created_at: user.createdAt,
			updated_at: user.updatedAt,
		};
	},

	fromRecord(record: UserRecord): UserWithPassword {
		return {
			id: record.id,
			email: record.email,
			name: record.name,
			password: record.password,
			createdAt: record.created_at,
			updatedAt: record.updated_at,
		};
	},
} as const;
