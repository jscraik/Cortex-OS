// AI Model service for Cortex WebUI backend

import type { Model } from '@shared/types';
import { ModelModel, type ModelRecord } from '../models/model';
import { getDatabase } from '../utils/database';

export class ModelService {
	static getAllModels(): Model[] {
		const db = getDatabase();
		const records = db
			.prepare(`SELECT * FROM ${ModelModel.tableName} ORDER BY name ASC`)
			.all() as ModelRecord[];

		return records.map(ModelModel.fromRecord);
	}

	static getModelById(id: string): Model | null {
		const db = getDatabase();
		const record = db
			.prepare(`SELECT * FROM ${ModelModel.tableName} WHERE id = ?`)
			.get(id) as ModelRecord | undefined;

		if (!record) {
			return null;
		}

		return ModelModel.fromRecord(record);
	}

	static createModel(
		model: Omit<Model, 'id' | 'createdAt' | 'updatedAt'>,
	): Model {
		const db = getDatabase();

		const modelId = `model_${Date.now()}`;
		const now = new Date().toISOString();
		const modelRecord: ModelRecord = {
			id: modelId,
			name: model.name,
			description: model.description,
			provider: model.provider,
			capabilities: JSON.stringify(model.capabilities),
			created_at: now,
			updated_at: now,
		};

		db.prepare(
			`INSERT INTO ${ModelModel.tableName} (id, name, description, provider, capabilities, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		).run(
			modelRecord.id,
			modelRecord.name,
			modelRecord.description,
			modelRecord.provider,
			modelRecord.capabilities,
			modelRecord.created_at,
			modelRecord.updated_at,
		);

		return ModelModel.fromRecord(modelRecord);
	}

	static initializeDefaultModels(): void {
		const models = ModelService.getAllModels();

		if (models.length === 0) {
			// Insert default models if none exist
			ModelService.createModel({
				name: 'GPT-4',
				description: 'OpenAI GPT-4 model',
				provider: 'openai',
				capabilities: ['text-generation', 'reasoning'],
			});

			ModelService.createModel({
				name: 'Claude 2',
				description: 'Anthropic Claude 2 model',
				provider: 'anthropic',
				capabilities: ['text-generation', 'analysis'],
			});

			ModelService.createModel({
				name: 'Llama 2',
				description: 'Meta Llama 2 model',
				provider: 'local',
				capabilities: ['text-generation'],
			});
		}
	}
}
