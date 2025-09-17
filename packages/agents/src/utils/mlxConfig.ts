import fs from 'node:fs/promises';
import path from 'node:path';
import { createLogger } from '../mocks/voltagent-logger';

const logger = createLogger('MLXConfig');

export interface MLXModelConfig {
	name: string;
	path: string;
	transformers_model: string;
	quantization?: string;
	context_length: number;
	memory_gb: number;
	priority: number;
	recommended_for: string[];
	coding_tasks?: string[];
	supports_vision?: boolean;
}

export interface MLXConfig {
	chat_models: Record<string, MLXModelConfig>;
	default_models: {
		chat: string;
		coding: string;
		[key: string]: string;
	};
	task_routing: Record<string, string>;
}

let cachedConfig: MLXConfig | null = null;

export async function loadMLXConfig(configPath?: string): Promise<MLXConfig> {
	if (cachedConfig) {
		return cachedConfig;
	}

	try {
		const configDir = configPath || '/Users/jamiecraik/.Cortex-OS/config';
		const configFile = path.join(configDir, 'mlx-models.json');

		const configData = await fs.readFile(configFile, 'utf-8');
		const config = JSON.parse(configData) as MLXConfig;

		cachedConfig = config;
		logger.info('MLX configuration loaded successfully');
		return config;
	} catch (error) {
		logger.error('Failed to load MLX configuration:', error);
		throw error;
	}
}

export function getMLXModelByName(
	modelName: string,
	config: MLXConfig,
): MLXModelConfig | null {
	// Try direct lookup first
	if (config.chat_models[modelName]) {
		return config.chat_models[modelName];
	}

	// Try to find by name match
	for (const [, model] of Object.entries(config.chat_models)) {
		if (model.name.toLowerCase().includes(modelName.toLowerCase())) {
			return model;
		}
	}

	return null;
}

export function getRecommendedModelForTask(
	taskType: string,
	config: MLXConfig,
): string {
	// Check task routing first
	if (config.task_routing[taskType]) {
		return config.task_routing[taskType];
	}

	// Fall back to defaults
	if (taskType.includes('code') || taskType.includes('programming')) {
		return config.default_models.coding;
	}

	return config.default_models.chat;
}
