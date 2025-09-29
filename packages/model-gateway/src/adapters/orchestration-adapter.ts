/**
 * brAInwav Cortex-OS Orchestration Adapter for Model Gateway
 * Integrates orchestration hybrid router with model gateway routing
 */

import {
	createOrchestrationRouter,
	type IOrchestrationHybridRouter,
	type ModelSelectionOptions,
	type OrchestrationModelConfig,
} from '@cortex-os/orchestration';
import type { HybridMode, ModelCapability, ModelConfig } from '../model-router.js';

/**
 * Adapter that bridges orchestration router with model gateway
 */
export class OrchestrationAdapter {
	private orchestrationRouter: IOrchestrationHybridRouter;

	constructor() {
		this.orchestrationRouter = createOrchestrationRouter();
	}

	/**
	 * Convert orchestration model config to gateway model config
	 */
	private convertToGatewayModel(orchModel: OrchestrationModelConfig): ModelConfig {
		return {
			name: orchModel.name,
			provider: orchModel.provider as 'mlx' | 'ollama' | 'ollama-cloud',
			capabilities: orchModel.capabilities as ModelCapability[],
			priority: orchModel.priority,
			fallback: orchModel.fallback,
			conjunction: orchModel.conjunction,
			verification: orchModel.verification,
			context_threshold: orchModel.context_length,
			complexity_threshold: this.mapComplexityThreshold(orchModel.recommended_for),
		};
	}

	/**
	 * Map orchestration complexity to gateway complexity threshold
	 */
	private mapComplexityThreshold(
		recommendedFor: string[],
	): 'simple' | 'moderate' | 'complex' | 'enterprise' {
		if (
			recommendedFor.includes('enterprise_architecture') ||
			recommendedFor.includes('system_design')
		) {
			return 'enterprise';
		}
		if (
			recommendedFor.includes('complex_refactoring') ||
			recommendedFor.includes('large_context')
		) {
			return 'complex';
		}
		if (recommendedFor.includes('coding') || recommendedFor.includes('refactoring')) {
			return 'moderate';
		}
		return 'simple';
	}

	/**
	 * Get model for specific capability using orchestration router
	 */
	getModelForCapability(
		capability: ModelCapability,
		options?: ModelSelectionOptions,
	): ModelConfig | null {
		try {
			let orchModel: OrchestrationModelConfig | null = null;

			switch (capability) {
				case 'embedding':
					orchModel = this.orchestrationRouter.getEmbeddingModel();
					break;
				case 'reranking':
					orchModel = this.orchestrationRouter.getRerankingModel();
					break;
				case 'vision':
					orchModel = this.orchestrationRouter.getVisionModel();
					break;
				case 'chat':
				case 'coding':
					// For chat/coding, use task-based selection
					orchModel = this.orchestrationRouter.selectModel('code_generation', options);
					break;
				default:
					orchModel = this.orchestrationRouter.selectModel('default', options);
			}

			if (!orchModel) {
				console.warn(
					`brAInwav Cortex-OS: No orchestration model found for capability: ${capability}`,
				);
				return null;
			}

			return this.convertToGatewayModel(orchModel);
		} catch (error) {
			console.error(`brAInwav Cortex-OS: Error getting model for capability ${capability}:`, error);
			return null;
		}
	}

	/**
	 * Get all available models from orchestration router
	 */
	getAllModels(): ModelConfig[] {
		try {
			const orchModels = this.orchestrationRouter.getAllModels();
			return orchModels.map((model) => this.convertToGatewayModel(model));
		} catch (error) {
			console.error('brAInwav Cortex-OS: Error getting all models:', error);
			return [];
		}
	}

	/**
	 * Set privacy mode on orchestration router
	 */
	setPrivacyMode(enabled: boolean): void {
		this.orchestrationRouter.setPrivacyMode(enabled);
	}

	/**
	 * Set hybrid mode on orchestration router
	 */
	setHybridMode(mode: HybridMode): void {
		this.orchestrationRouter.setHybridMode(mode);
	}

	/**
	 * Validate models using orchestration router
	 */
	validateModels(): { valid: boolean; missing: string[] } {
		return this.orchestrationRouter.validateModels();
	}

	/**
	 * Get model for specific task using orchestration routing
	 */
	getModelForTask(task: string, options?: ModelSelectionOptions): ModelConfig | null {
		try {
			const orchModel = this.orchestrationRouter.selectModel(task, options);
			if (!orchModel) {
				console.warn(`brAInwav Cortex-OS: No orchestration model found for task: ${task}`);
				return null;
			}
			return this.convertToGatewayModel(orchModel);
		} catch (error) {
			console.error(`brAInwav Cortex-OS: Error getting model for task ${task}:`, error);
			return null;
		}
	}

	/**
	 * Get health status including orchestration model validation
	 */
	getHealthStatus() {
		const validation = this.validateModels();
		const allModels = this.getAllModels();

		return {
			orchestrationIntegration: true,
			modelValidation: validation,
			availableModels: allModels.length,
			totalModels: 7, // Expected 7 models from orchestration
			status: validation.valid ? 'healthy' : 'degraded',
			branding: 'brAInwav Cortex-OS Orchestration Adapter',
		};
	}
}

/**
 * Create a new orchestration adapter instance
 */
export const createOrchestrationAdapter = (): OrchestrationAdapter => {
	return new OrchestrationAdapter();
};
