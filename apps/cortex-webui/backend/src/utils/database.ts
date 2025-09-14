// Database utility for Cortex WebUI backend

import Database, { type Database as DatabaseType } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { DATABASE_PATH } from '../config/constants';
import { ConversationModel } from '../models/conversation';
import { MessageModel } from '../models/message';
import { ModelModel } from '../models/model';
import { UserModel } from '../models/user';

let db: DatabaseType | null = null;

export const initializeDatabase = (): DatabaseType => {
	if (db) {
		return db;
	}

	const dbDir = path.dirname(DATABASE_PATH);
	if (!fs.existsSync(dbDir)) {
		fs.mkdirSync(dbDir, { recursive: true });
	}

	db = new Database(DATABASE_PATH);

	// Create tables
	db.exec(UserModel.createTableSQL);
	db.exec(ConversationModel.createTableSQL);
	db.exec(MessageModel.createTableSQL);
	db.exec(ModelModel.createTableSQL);

	return db;
};

export const getDatabase = (): DatabaseType => {
	if (!db) {
		return initializeDatabase();
	}
	return db;
};

export const closeDatabase = (): void => {
	if (db) {
		db.close();
		db = null;
	}
};
