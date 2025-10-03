// Model service tests
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createModel,
	getAllModels,
	getModelById,
	initializeDefaultModels,
} from '../../services/modelService';

describe('Model Service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getAllModels', () => {
		it('should return an empty array', () => {
			const models = getAllModels();
			expect(models).toEqual([]);
			expect(Array.isArray(models)).toBe(true);
		});

		it('should return the same empty array on multiple calls', () => {
			const models1 = getAllModels();
			const models2 = getAllModels();
			expect(models1).toEqual(models2);
			expect(models1).toHaveLength(0);
		});
	});

	describe('getModelById', () => {
		it('should return null for any ID', () => {
			const model1 = getModelById('any-id');
			const model2 = getModelById('non-existent');
			const model3 = getModelById('');
			const model4 = getModelById('123');

			expect(model1).toBeNull();
			expect(model2).toBeNull();
			expect(model3).toBeNull();
			expect(model4).toBeNull();
		});

		it('should return null for undefined and null IDs', () => {
			// @ts-expect-error - Testing invalid input
			expect(getModelById(undefined)).toBeNull();
			// @ts-expect-error - Testing invalid input
			expect(getModelById(null)).toBeNull();
		});
	});

	describe('createModel', () => {
		it('should create a model with generated ID and timestamps', () => {
			const input = {
				name: 'Test Model',
				description: 'A test model',
				provider: 'test-provider',
			};

			const model = createModel(input);

			expect(model).toHaveProperty('id');
			expect(model).toHaveProperty('createdAt');
			expect(model).toHaveProperty('updatedAt');
			expect(model).toHaveProperty('name', 'Test Model');
			expect(model).toHaveProperty('description', 'A test model');
			expect(model).toHaveProperty('provider', 'test-provider');

			expect(typeof model.id).toBe('string');
			expect(typeof model.createdAt).toBe('string');
			expect(typeof model.updatedAt).toBe('string');
			expect(model.id.length).toBeGreaterThan(0);
		});

		it('should generate IDs with expected format', () => {
			const input = {
				name: 'Test Model',
				provider: 'test',
			};

			const model = createModel(input);

			expect(model.id).toMatch(/^model_\d+$/);
			expect(typeof parseInt(model.id.split('_')[1], 10)).toBe('number');
		});

		it('should create timestamps in ISO format', () => {
			const input = {
				name: 'Test Model',
				provider: 'test',
			};

			const model = createModel(input);

			expect(new Date(model.createdAt).toISOString()).toBe(model.createdAt);
			expect(new Date(model.updatedAt).toISOString()).toBe(model.updatedAt);
		});

		it('should set createdAt and updatedAt to the same value', () => {
			const input = {
				name: 'Test Model',
				provider: 'test',
			};

			const model = createModel(input);

			expect(model.createdAt).toBe(model.updatedAt);
		});

		it('should handle minimal input', () => {
			const input = {
				name: 'Minimal Model',
			};

			const model = createModel(input);

			expect(model.name).toBe('Minimal Model');
			expect(model.id).toBeDefined();
			expect(model.createdAt).toBeDefined();
		});

		it('should handle all allowed properties', () => {
			const input = {
				name: 'Complete Model',
				description: 'Full description',
				provider: 'test-provider',
				version: '1.0.0',
				maxTokens: 2048,
				costPerToken: 0.001,
			};

			const model = createModel(input);

			expect(model).toMatchObject({
				name: 'Complete Model',
				description: 'Full description',
				provider: 'test-provider',
				version: '1.0.0',
				maxTokens: 2048,
				costPerToken: 0.001,
			});
		});
	});

	describe('initializeDefaultModels', () => {
		it('should execute without throwing', () => {
			expect(() => initializeDefaultModels()).not.toThrow();
		});

		it('should return undefined', () => {
			const result = initializeDefaultModels();
			expect(result).toBeUndefined();
		});
	});
});
