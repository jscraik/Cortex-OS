import fs from 'node:fs/promises';
import path from 'node:path';
import { createPinoLogger } from '@voltagent/logger';

const logger = createPinoLogger({ name: 'OllamaConfig' });

export interface OllamaModelConfig {
	name: string;
	model_tag: string;
	context_length: number;
	memory_gb: number;
	priority: number;
	recommended_for: string[];
	coding_tasks?: string[];
	ollama_model: string;
	quantization?: string;
	type?: string;
}

export interface OllamaConfig {
	embedding_models: Record<string, any>;
	chat_models: Record<string, OllamaModelConfig>;
	reranker_models: Record<string, any>;
	safety_models: Record<string, any>;
	default_models: {
		embedding: string;
		reranker: string;
		chat: string;
		coding: string;
		lightweight: string;
		large_context: string;
		reasoning: string;
		general_purpose: string;
		safety: string;
	};
	task_routing: Record<string, string>;
	service_configuration: {
		ollama_endpoint: string;
		api_timeout_ms: number;
		max_concurrent_requests: number;
		auto_pull_models: boolean;
		model_pull_timeout_ms: number;
		health_check_interval_ms: number;
		retry_attempts: number;
		retry_delay_ms: number;
	};
	fallback_chains: Record<string, string[]>;
	performance_tiers: Record<string, any>;
	model_management: Record<string, any>;
}

let cachedConfig: OllamaConfig | null = null;

export async function loadOllamaConfig(
	configPath?: string,
): Promise<OllamaConfig> {
	if (cachedConfig) {
		return cachedConfig;
	}

	try {
		const configDir = configPath || '/Users/jamiecraik/.Cortex-OS/config';
		const configFile = path.join(configDir, 'ollama-models.json');

		const configData = await fs.readFile(configFile, 'utf-8');
		const config = JSON.parse(configData) as OllamaConfig;

		cachedConfig = config;
		logger.info('Ollama configuration loaded successfully');
		return config;
	} catch (error) {
		logger.error('Failed to load Ollama configuration:', error as Error);
		throw error;
	}
}

export function getOllamaModelByName(
	modelName: string,
	config: OllamaConfig,
): OllamaModelConfig | null {
	// Try direct lookup first
	if (config.chat_models[modelName]) {
		return config.chat_models[modelName];
	}

	// Try to find by name match
	for (const [, model] of Object.entries(config.chat_models)) {
		if (
			model.name.toLowerCase().includes(modelName.toLowerCase()) ||
			model.model_tag.toLowerCase().includes(modelName.toLowerCase())
		) {
			return model;
		}
	}

	return null;
}

export function getRecommendedOllamaModelForTask(
	taskType: string,
	config: OllamaConfig,
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

export function getOllamaBaseUrl(config?: OllamaConfig): string {
	return (
		config?.service_configuration.ollama_endpoint || 'http://localhost:11434'
	);
}
