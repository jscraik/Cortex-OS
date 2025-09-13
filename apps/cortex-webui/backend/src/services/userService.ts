// User service for Cortex WebUI backend

import type { User, UserRecord } from '@shared/types';
import { UserModel } from '../models/user';
import { getDatabase } from '../utils/database';

export const UserService = {
	getUserById(userId: string): User | null {
		const db = getDatabase();
		const userRecord = db
			.prepare(`SELECT * FROM ${UserModel.tableName} WHERE id = ?`)
			.get(userId) as UserRecord | undefined;

		if (!userRecord) {
			return null;
		}

		return UserModel.fromRecord(userRecord);
	},

	getUserByEmail(email: string): User | null {
		const db = getDatabase();
		const userRecord = db
			.prepare(`SELECT * FROM ${UserModel.tableName} WHERE email = ?`)
			.get(email) as UserRecord | undefined;

		if (!userRecord) {
			return null;
		}

		return UserModel.fromRecord(userRecord);
	},
};
