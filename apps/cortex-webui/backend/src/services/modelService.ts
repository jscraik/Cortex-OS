// AI Model service for Cortex WebUI backend

import type { Model } from '@shared/types';

export class ModelService {
	// Simplified implementation for sqlite3 compatibility
	// Return empty models for now until database connection is working
	static getAllModels(): Model[] {
		return [];
	}

	static getModelById(_id: string): Model | null {
		// Return null for now
		return null;
	}

	static createModel(model: Omit<Model, 'id' | 'createdAt' | 'updatedAt'>): Model {
		const now = new Date().toISOString();
		return {
			id: `model_${Date.now()}`,
			...model,
			createdAt: now,
			updatedAt: now,
		};
	}

	static initializeDefaultModels(): void {
		// Simplified - just log that we're initializing
		console.log('ModelService: Initializing default models (simplified)');
	}
}
