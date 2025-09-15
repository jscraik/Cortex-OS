// Temporary database utility using sqlite3 for Cortex WebUI backend
// Workaround for better-sqlite3 Node.js version compatibility issue

import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { DATABASE_PATH } from '../config/constants';
import { ConversationModel } from '../models/conversation';
import { MessageModel } from '../models/message';
import { ModelModel } from '../models/model';
import { UserModel } from '../models/user';

let db: sqlite3.Database | null = null;

export const initializeDatabase = (): sqlite3.Database => {
    if (db) {
        return db;
    }

    const dbDir = path.dirname(DATABASE_PATH);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new sqlite3.Database(DATABASE_PATH);

    // Create tables synchronously using serialize
    db.serialize(() => {
        if (db) {
            db.exec(UserModel.createTableSQL);
            db.exec(ConversationModel.createTableSQL);
            db.exec(MessageModel.createTableSQL);
            db.exec(ModelModel.createTableSQL);
        }
    });

    return db;
};

export const getDatabase = (): sqlite3.Database => {
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

// Helper functions to promisify sqlite3 operations
export const dbGet = (sql: string, params: unknown[] = []): Promise<unknown> => {
    const database = getDatabase();
    return new Promise((resolve, reject) => {
        database.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

export const dbRun = (sql: string, params: unknown[] = []): Promise<{ lastID: number; changes: number }> => {
    const database = getDatabase();
    return new Promise((resolve, reject) => {
        database.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};
