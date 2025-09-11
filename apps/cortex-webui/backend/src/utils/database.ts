// Database utility for Cortex WebUI backend

import fs from 'fs';
import path from 'path';
import Database, { Database as DatabaseType } from 'better-sqlite3';
import { getServerConfig } from '../config/config';
import { ConversationModel } from '../models/conversation';
import { MessageModel } from '../models/message';
import { ModelModel } from '../models/model';
import { UserModel } from '../models/user';

let db: DatabaseType | null = null;

export const initializeDatabase = (): DatabaseType => {
  if (db) {
    return db;
  }

    const { databasePath } = getServerConfig();
    const dbDir = path.dirname(databasePath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(databasePath);

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
