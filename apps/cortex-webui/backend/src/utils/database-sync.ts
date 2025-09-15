// Database utility using synchronous sqlite3 operations for Cortex WebUI backend
// Simple sqlite3 wrapper to match better-sqlite3-style API

import fs from 'node:fs';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import { DATABASE_PATH } from '../config/constants';
import { ConversationModel } from '../models/conversation';
import { MessageModel } from '../models/message';
import { ModelModel } from '../models/model';
import { UserModel } from '../models/user';

// Custom database wrapper that mimics better-sqlite3 API
class Database {
	private db: sqlite3.Database;

	constructor(dbPath: string) {
		this.db = new sqlite3.Database(
			dbPath,
			sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
		);

		// Create tables synchronously
		this.db.exec(
			[
				UserModel.createTableSQL,
				ConversationModel.createTableSQL,
				MessageModel.createTableSQL,
				ModelModel.createTableSQL,
			].join(';'),
		);
	}

	// Synchronous prepare method that returns a statement-like object
	prepare(sql: string) {
		return {
			all: (...params: any[]) => {
				let result: any[] = [];
				let error: Error | null = null;
				let finished = false;

				this.db.all(sql, params, (err, rows) => {
					error = err;
					result = rows || [];
					finished = true;
				});

				// Busy wait until callback completes (not ideal but works for now)
				while (!finished) {
					require('deasync').runLoopOnce();
				}

				if (error) {
					throw error;
				}

				return result;
			},
			get: (...params: any[]) => {
				let result: any = null;
				let error: Error | null = null;
				let finished = false;

				this.db.get(sql, params, (err, row) => {
					error = err;
					result = row;
					finished = true;
				});

				// Busy wait until callback completes
				while (!finished) {
					require('deasync').runLoopOnce();
				}

				if (error) {
					throw error;
				}

				return result;
			},
			run: (...params: any[]) => {
				let error: Error | null = null;
				let finished = false;

				this.db.run(sql, params, (err) => {
					error = err;
					finished = true;
				});

				// Busy wait until callback completes
				while (!finished) {
					require('deasync').runLoopOnce();
				}

				if (error) {
					throw error;
				}

				return { lastID: (this as any).lastID, changes: (this as any).changes };
			},
		};
	}

	close() {
		this.db.close();
	}
}

let db: Database | null = null;

export const initializeDatabase = (): Database => {
	if (db) {
		return db;
	}

	const dbDir = path.dirname(DATABASE_PATH);
	if (!fs.existsSync(dbDir)) {
		fs.mkdirSync(dbDir, { recursive: true });
	}

	db = new Database(DATABASE_PATH);
	return db;
};

export const getDatabase = (): Database => {
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
