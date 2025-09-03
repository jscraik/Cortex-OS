// AI Model model for Cortex WebUI backend

import { Model } from '../../../shared/types';

export interface ModelRecord {
  id: string;
  name: string;
  description: string;
  provider: string;
  capabilities: string;
  created_at: string;
  updated_at: string;
}

export class ModelModel {
  static tableName = 'models';

  static createTableSQL = `
    CREATE TABLE IF NOT EXISTS ${this.tableName} (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      provider TEXT NOT NULL,
      capabilities TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;

  static toRecord(model: Model): ModelRecord {
    return {
      id: model.id,
      name: model.name,
      description: model.description,
      provider: model.provider,
      capabilities: JSON.stringify(model.capabilities),
      created_at: model.createdAt,
      updated_at: model.updatedAt,
    };
  }

  static fromRecord(record: ModelRecord): Model {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      provider: record.provider,
      capabilities: JSON.parse(record.capabilities),
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }
}
