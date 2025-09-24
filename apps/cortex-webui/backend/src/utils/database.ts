// Database utility for Cortex WebUI backend

import fs from 'node:fs';
import path from 'node:path';
import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { DATABASE_PATH } from '../config/constants.js';
import { ConversationModel } from '../models/conversation.js';
import { MessageModel } from '../models/message.js';
import { ModelModel } from '../models/model.js';
import { UserModel } from '../models/user.js';

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
