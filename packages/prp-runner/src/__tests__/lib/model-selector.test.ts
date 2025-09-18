import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModelSelector, type ModelConfig } from '../../lib/model-selector.js';
import { ASBRAIIntegration } from '../../asbr-ai-integration.js';

// Mock ASBRAIIntegration
vi.mock('../../asbr-ai-integration.js');

describe('ModelSelector', () => {
	let modelSelector: ModelSelector;
	let mockAIIntegration: any;

	beforeEach(() => {
		mockAIIntegration = new ASBRAIIntegration();
		modelSelector = new ModelSelector(mockAIIntegration);
	});

	describe('constructor', () => {
		it('should create a ModelSelector instance', () => {
			expect(modelSelector).toBeInstanceOf(ModelSelector);
		});
	});

	describe('selectOptimalModel', () => {
		it('should select MLX model when available', () => {
			// Mock MLX as available
			vi.spyOn(modelSelector as any, 'mlxAvailable', 'get').returnValue(true);

			const model = modelSelector.selectOptimalModel('code-analysis');

			expect(model).toBeDefined();
			expect(model?.provider).toBe('mlx');
			expect(model?.id).toBe('glm-4.5-mlx');
		});

		it('should fallback to Ollama when MLX is unavailable', () => {
			// Mock MLX as unavailable, Ollama as available
			vi.spyOn(modelSelector as any, 'mlxAvailable', 'get').returnValue(false);
			vi.spyOn(modelSelector as any, 'ollamaAvailable', 'get').returnValue(true);

			const model = modelSelector.selectOptimalModel('code-analysis');

			expect(model).toBeDefined();
			expect(model?.provider).toBe('ollama');
		});

		it('should select preferred model when specified', () => {
			const model = modelSelector.selectOptimalModel('code-analysis', undefined, [], 'gpt-4o-mini');

			expect(model?.id).toBe('gpt-4o-mini');
		});

		it('should return null when no models meet requirements', () => {
			// Mock all providers as unavailable
			vi.spyOn(modelSelector as any, 'mlxAvailable', 'get').returnValue(false);
			vi.spyOn(modelSelector as any, 'ollamaAvailable', 'get').returnValue(false);

			const model = modelSelector.selectOptimalModel(
				'code-analysis',
				undefined,
				['multimodal'], // No models have multimodal capability in our test setup
			);

			expect(model).toBeNull();
		});
	});

	describe('detectTaskType', () => {
		it('should detect code analysis task', () => {
			const taskType = modelSelector.detectTaskType('Please analyze this code for bugs');
			expect(taskType).toBe('code-analysis');
		});

		it('should detect test generation task', () => {
			const taskType = modelSelector.detectTaskType('Write unit tests for this function');
			expect(taskType).toBe('test-generation');
		});

		it('should detect documentation task', () => {
			const taskType = modelSelector.detectTaskType('Generate README documentation');
			expect(taskType).toBe('documentation');
		});

		it('should detect security analysis task', () => {
			const taskType = modelSelector.detectTaskType('Check for security vulnerabilities');
			expect(taskType).toBe('security-analysis');
		});

		it('should detect multimodal task', () => {
			const taskType = modelSelector.detectTaskType('Analyze this screenshot of the UI');
			expect(taskType).toBe('multimodal');
		});

		it('should default to general task type', () => {
			const taskType = modelSelector.detectTaskType('Some random task');
			expect(taskType).toBe('general');
		});
	});

	describe('getAvailableModels', () => {
		it('should return available models for task type', () => {
			const models = modelSelector.getAvailableModels('code-analysis');

			expect(Array.isArray(models)).toBe(true);
			expect(models.length).toBeGreaterThan(0);
			expect(models[0].capabilities).toContain('code-analysis');
		});
	});

	describe('getProviderStatus', () => {
		it('should return provider availability status', () => {
			vi.spyOn(modelSelector as any, 'mlxAvailable', 'get').returnValue(true);
			vi.spyOn(modelSelector as any, 'ollamaAvailable', 'get').returnValue(false);

			const status = modelSelector.getProviderStatus();

			expect(status).toEqual({
				mlx: true,
				ollama: false,
			});
		});
	});
});
