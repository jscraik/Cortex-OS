/**
 * Model configuration validation utilities
 * Extracted from MLXAdapter to follow TDD principles
 */

export interface ModelConfig {
	path: string;
	hf_path: string;
	type: string;
	memory_gb: number;
	max_tokens?: number;
	context_length: number;
	capabilities?: string[];
	dimensions?: number;
}

/**
 * Validates and retrieves model configuration
 * @param models - Available model configurations
 * @param modelName - Name of the model to validate
 * @param expectedType - Expected model type (embedding, chat, reranking)
 * @returns Validated model configuration
 * @throws Error if model is not found or wrong type
 */
export function getValidatedModelConfig(
	models: Record<string, ModelConfig>,
	modelName: string,
	expectedType: string,
): ModelConfig {
	const modelConfig = models[modelName];

	if (!modelConfig) {
		throw new Error(`Model '${modelName}' not found in available models`);
	}

	if (modelConfig.type !== expectedType) {
		throw new Error(
			`Model '${modelName}' is type '${modelConfig.type}', expected '${expectedType}'`,
		);
	}

	return modelConfig;
}

/**
 * Validates file system path exists
 * @param filePath - Path to validate
 * @returns Promise<boolean> - true if path exists
 */
export async function validateModelPath(filePath: string): Promise<boolean> {
	try {
		const fs = await import("node:fs");
		return fs.existsSync(filePath);
	} catch {
		return false;
	}
}

/**
 * Estimates token count for text
 * @param text - Text to count tokens for
 * @returns Estimated token count (chars / 4)
 */
export function estimateTokenCount(text: string): number {
	// Rough approximation: 1 token ≈ 4 characters for most models
	return Math.ceil(text.length / 4);
}

/**
 * Validates array response from Python script
 * @param data - Data to validate
 * @param context - Context for error message
 * @throws Error if data is not a non-empty array
 */
export function validateArrayResponse(data: unknown, context: string): void {
	if (!Array.isArray(data) || data.length === 0) {
		throw new Error(
			`Invalid ${context}: expected non-empty array, got ${typeof data}`,
		);
	}
}
