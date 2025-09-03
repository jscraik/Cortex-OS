// AI Model service for Cortex WebUI backend

import { Model } from '../../../shared/types';
import { ModelModel } from '../models/model';
import { getDatabase } from '../utils/database';

export class ModelService {
  static async getAllModels(): Promise<Model[]> {
    const db = await getDatabase();
    const records = await db.all(`SELECT * FROM ${ModelModel.tableName} ORDER BY name ASC`);

    return records.map(ModelModel.fromRecord);
  }

  static async getModelById(id: string): Promise<Model | null> {
    const db = await getDatabase();
    const record = await db.get(`SELECT * FROM ${ModelModel.tableName} WHERE id = ?`, [id]);

    if (!record) {
      return null;
    }

    return ModelModel.fromRecord(record);
  }

  static async createModel(model: Omit<Model, 'id' | 'createdAt' | 'updatedAt'>): Promise<Model> {
    const db = await getDatabase();

    const modelId = `model_${Date.now()}`;
    const now = new Date().toISOString();
    const modelRecord = {
      id: modelId,
      name: model.name,
      description: model.description,
      provider: model.provider,
      capabilities: JSON.stringify(model.capabilities),
      created_at: now,
      updated_at: now,
    };

    await db.run(
      `INSERT INTO ${ModelModel.tableName} (id, name, description, provider, capabilities, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        modelRecord.id,
        modelRecord.name,
        modelRecord.description,
        modelRecord.provider,
        modelRecord.capabilities,
        modelRecord.created_at,
        modelRecord.updated_at,
      ],
    );

    return ModelModel.fromRecord(modelRecord);
  }

  static async initializeDefaultModels(): Promise<void> {
    const models = await this.getAllModels();

    if (models.length === 0) {
      // Insert default models if none exist
      await this.createModel({
        name: 'GPT-4',
        description: 'OpenAI GPT-4 model',
        provider: 'openai',
        capabilities: ['text-generation', 'reasoning'],
      });

      await this.createModel({
        name: 'Claude 2',
        description: 'Anthropic Claude 2 model',
        provider: 'anthropic',
        capabilities: ['text-generation', 'analysis'],
      });

      await this.createModel({
        name: 'Llama 2',
        description: 'Meta Llama 2 model',
        provider: 'local',
        capabilities: ['text-generation'],
      });
    }
  }
}
