/**
 * brAInwav Cortex-OS Orchestration Hybrid Model Integration Tests
 * Unit tests for TDD compliance and critical getter methods
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
	createBalancedModel,
	createEmbeddingModel,
	createGLMModel,
	createLargeContextModel,
	createLightweightModel,
	createOrchestrationRouter,
	createRerankingModel,
	createVisionModel,
	ORCHESTRATION_MODELS,
	OrchestrationHybridRouter,
	selectModelForTask,
	validateRequiredModels,
} from '../hybrid-model-integration.js';

describe('OrchestrationHybridRouter', () => {
	let router: OrchestrationHybridRouter;

	beforeEach(() => {
		router = new OrchestrationHybridRouter();
	});

	describe('getAlwaysOnModel', () => {
		it('should return gemma-2-2b model', () => {
			const model = router.getAlwaysOnModel();
			expect(model.name).toBe('mlx-community/gemma-2-2b-it-4bit');
			expect(model.provider).toBe('mlx');
			expect(model.priority).toBe(90);
		});

		it('should throw error if model not found', () => {
			// Mock missing model scenario
			router['models'].delete('gemma-2-2b');
			expect(() => router.getAlwaysOnModel()).toThrow(
				'brAInwav Cortex-OS: Always-on model (gemma-2-2b) not found',
			);
		});
	});

	describe('getEmbeddingModel', () => {
		it('should return qwen3-embedding-4b model', () => {
			const model = router.getEmbeddingModel();
			expect(model.name).toBe('Qwen3-Embedding-4B');
			expect(model.provider).toBe('mlx');
			expect(model.capabilities).toContain('embedding');
		});

		it('should throw error if embedding model not found', () => {
			router['models'].delete('qwen3-embedding-4b');
			expect(() => router.getEmbeddingModel()).toThrow(
				'brAInwav Cortex-OS: Embedding model (qwen3-embedding-4b) not found',
			);
		});
	});

	describe('getVisionModel', () => {
		it('should return qwen2.5-vl vision model', () => {
			const model = router.getVisionModel();
			expect(model.name).toBe('mlx-community/Qwen2.5-VL-3B-Instruct-6bit');
			expect(model.supports_vision).toBe(true);
			expect(model.capabilities).toContain('vision');
		});

		it('should throw error if vision model not found', () => {
			router['models'].delete('qwen2.5-vl');
			expect(() => router.getVisionModel()).toThrow(
				'brAInwav Cortex-OS: Vision model (qwen2.5-vl) not found',
			);
		});
	});

	describe('getRerankingModel', () => {
		it('should return qwen3-reranker-4b model', () => {
			const model = router.getRerankingModel();
			expect(model.name).toBe('Qwen3-Reranker-4B');
			expect(model.capabilities).toContain('reranking');
		});

		it('should throw error if reranking model not found', () => {
			router['models'].delete('qwen3-reranker-4b');
			expect(() => router.getRerankingModel()).toThrow(
				'brAInwav Cortex-OS: Reranking model (qwen3-reranker-4b) not found',
			);
		});
	});

	describe('selectModel', () => {
		it('should return glm-4.5 for coding tasks', () => {
			const model = router.selectModel('code_generation');
			expect(model?.name).toBe('GLM-4.5-mlx-4Bit');
		});

		it('should return qwen3-coder-30b for architecture tasks', () => {
			const model = router.selectModel('architecture');
			expect(model?.name).toBe('mlx-community/Qwen3-Coder-30B-A3B-Instruct-4bit');
		});

		it('should return qwen2.5-vl for vision tasks', () => {
			const model = router.selectModel('vision_tasks');
			expect(model?.name).toBe('mlx-community/Qwen2.5-VL-3B-Instruct-6bit');
		});

		it('should fallback to glm-4.5 for unknown tasks', () => {
			const model = router.selectModel('unknown_task');
			expect(model?.name).toBe('GLM-4.5-mlx-4Bit');
		});

		it('should return null when fallback model is also missing', () => {
			// Remove all models
			router['models'].clear();
			const model = router.selectModel('code_generation');
			expect(model).toBeNull();
		});
	});

	describe('validateModels', () => {
		it('should return valid when all models are present', () => {
			const result = router.validateModels();
			expect(result.valid).toBe(true);
			expect(result.missing.length).toBe(0);
		});

		it('should identify missing models', () => {
			router['models'].delete('glm-4.5');
			router['models'].delete('qwen2.5-vl');

			const result = router.validateModels();
			expect(result.valid).toBe(false);
			expect(result.missing).toContain('glm-4.5');
			expect(result.missing).toContain('qwen2.5-vl');
		});
	});

	describe('setPrivacyMode', () => {
		it('should update privacy mode setting', () => {
			router.setPrivacyMode(true);
			expect(router['privacyMode']).toBe(true);
		});
	});

	describe('setHybridMode', () => {
		it('should update hybrid mode setting', () => {
			router.setHybridMode('privacy');
			expect(router['hybridMode']).toBe('privacy');
		});
	});

	describe('getAllModels', () => {
		it('should return all 7 models', () => {
			const models = router.getAllModels();
			expect(models.length).toBe(7);
			expect(models.some((m) => m.name === 'GLM-4.5-mlx-4Bit')).toBe(true);
		});
	});
});

describe('Model Factory Functions', () => {
	describe('createGLMModel', () => {
		it('should create primary GLM model configuration', () => {
			const model = createGLMModel();
			expect(model.name).toBe('GLM-4.5-mlx-4Bit');
			expect(model.priority).toBe(100);
			expect(model.provider).toBe('mlx');
			expect(model.capabilities).toContain('chat');
			expect(model.capabilities).toContain('coding');
		});
	});

	describe('createVisionModel', () => {
		it('should create vision model configuration', () => {
			const model = createVisionModel();
			expect(model.supports_vision).toBe(true);
			expect(model.capabilities).toContain('vision');
			expect(model.priority).toBe(95);
		});
	});

	describe('createBalancedModel', () => {
		it('should create balanced performance model', () => {
			const model = createBalancedModel();
			expect(model.name).toBe('mlx-community/gemma-2-2b-it-4bit');
			expect(model.memory_gb).toBe(4.0);
			expect(model.context_length).toBe(8192);
		});
	});

	describe('createLightweightModel', () => {
		it('should create lightweight model', () => {
			const model = createLightweightModel();
			expect(model.memory_gb).toBe(1.0);
			expect(model.priority).toBe(85);
			expect(model.recommended_for).toContain('ultra_light');
		});
	});

	describe('createLargeContextModel', () => {
		it('should create large context model', () => {
			const model = createLargeContextModel();
			expect(model.memory_gb).toBe(32.0);
			expect(model.recommended_for).toContain('large_context');
			expect(model.conjunction).toContain('qwen3-coder:480b-cloud');
		});
	});

	describe('createEmbeddingModel', () => {
		it('should create embedding model configuration', () => {
			const model = createEmbeddingModel();
			expect(model.capabilities).toContain('embedding');
			expect(model.priority).toBe(100);
		});
	});

	describe('createRerankingModel', () => {
		it('should create reranking model configuration', () => {
			const model = createRerankingModel();
			expect(model.capabilities).toContain('reranking');
			expect(model.fallback).toContain('nomic-embed-text:v1.5');
		});
	});
});

describe('Functional Utilities', () => {
	describe('createOrchestrationRouter', () => {
		it('should create a new router instance', () => {
			const router = createOrchestrationRouter();
			expect(router).toBeInstanceOf(OrchestrationHybridRouter);
		});
	});

	describe('selectModelForTask', () => {
		it('should select appropriate model for task', () => {
			const models = new Map(Object.entries(ORCHESTRATION_MODELS));
			const model = selectModelForTask('code_generation', models);
			expect(model?.name).toBe('GLM-4.5-mlx-4Bit');
		});

		it('should fallback to glm-4.5 for unknown tasks', () => {
			const models = new Map(Object.entries(ORCHESTRATION_MODELS));
			const model = selectModelForTask('unknown_task', models);
			expect(model?.name).toBe('GLM-4.5-mlx-4Bit');
		});
	});

	describe('validateRequiredModels', () => {
		it('should validate all required models are present', () => {
			const models = new Map(Object.entries(ORCHESTRATION_MODELS));
			const result = validateRequiredModels(models);
			expect(result.valid).toBe(true);
			expect(result.missing.length).toBe(0);
		});

		it('should identify missing models', () => {
			const models = new Map(Object.entries(ORCHESTRATION_MODELS));
			models.delete('glm-4.5');

			const result = validateRequiredModels(models);
			expect(result.valid).toBe(false);
			expect(result.missing).toContain('glm-4.5');
		});
	});
});

describe('ORCHESTRATION_MODELS Configuration', () => {
	it('should contain exactly 7 models', () => {
		expect(Object.keys(ORCHESTRATION_MODELS)).toHaveLength(7);
	});

	it('should have all required model keys', () => {
		const expectedKeys = [
			'glm-4.5',
			'qwen2.5-vl',
			'gemma-2-2b',
			'smollm-135m',
			'qwen3-coder-30b',
			'qwen3-embedding-4b',
			'qwen3-reranker-4b',
		];

		expectedKeys.forEach((key) => {
			expect(ORCHESTRATION_MODELS).toHaveProperty(key);
		});
	});

	it('should have valid paths for all models', () => {
		Object.values(ORCHESTRATION_MODELS).forEach((model) => {
			expect(model.path).toMatch(/^\/Volumes\/ExternalSSD\/ai-cache/);
		});
	});

	it('should have brAInwav branding in GLM model path', () => {
		expect(ORCHESTRATION_MODELS['glm-4.5'].path).toContain('brAInwav');
	});
});
