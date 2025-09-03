// Database utility for Cortex WebUI backend

import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { DATABASE_PATH } from '../../../shared/constants';
import { ConversationModel } from '../models/conversation';
import { MessageModel } from '../models/message';
import { ModelModel } from '../models/model';
import { UserModel } from '../models/user';

let db: Database | null = null;

export const initializeDatabase = async (): Promise<Database> => {
  if (db) {
    return db;
  }

  db = await open({
    filename: DATABASE_PATH,
    driver: sqlite3.Database,
  });

  // Create tables
  await db.exec(UserModel.createTableSQL);
  await db.exec(ConversationModel.createTableSQL);
  await db.exec(MessageModel.createTableSQL);
  await db.exec(ModelModel.createTableSQL);

  return db;
};

export const getDatabase = async (): Promise<Database> => {
  if (!db) {
    return await initializeDatabase();
  }
  return db;
};

export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.close();
    db = null;
  }
};
