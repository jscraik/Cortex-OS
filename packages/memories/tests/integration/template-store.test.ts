import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InMemoryStore } from '../../src/adapters/store.memory.js';
import { TemplateMemoryStore } from '../../src/adapters/store.template.js';
import type { MemoryTemplate } from '../../src/domain/types.js';
import { TemplateRegistry } from '../../src/service/template-registry.js';
import { createMemory } from '../test-utils.js';

describe('TemplateMemoryStore Integration', () => {
	let baseStore: InMemoryStore;
	let store: TemplateMemoryStore;
	let templateRegistry: TemplateRegistry;
	let namespace: string;

	beforeEach(() => {
		baseStore = new InMemoryStore();
		templateRegistry = new TemplateRegistry();
		store = new TemplateMemoryStore(baseStore, templateRegistry);
		namespace = `test-${Math.random().toString(36).substring(7)}`;
	});

	afterEach(async () => {
		// Clean up
		const allMemories = await store.list(namespace);
		for (const memory of allMemories) {
			await store.delete(memory.id, namespace);
		}
	});

	describe('Template Application', () => {
		it('should apply template to memory on upsert', async () => {
			// Define a template
			const template: MemoryTemplate = {
				id: 'task-template',
				name: 'Task Template',
				description: 'Template for task memories',
				version: '1.0.0',
				schema: {
					type: 'object',
					properties: {
						title: { type: 'string' },
						priority: { type: 'string', enum: ['low', 'medium', 'high'] },
						status: { type: 'string', enum: ['todo', 'in-progress', 'done'] },
						dueDate: { type: 'string', format: 'date-time' },
					},
					required: ['title', 'priority', 'status'],
				},
				defaults: {
					priority: 'medium',
					status: 'todo',
				},
				metadata: {
					category: 'task',
					workflow: 'kanban',
				},
			};

			// Register template
			await templateRegistry.register(template);

			// Create memory with template reference
			const memory = createMemory({
				text: 'Complete project documentation',
				metadata: {
					template: 'task-template',
					title: 'Complete project documentation',
					priority: 'high',
					dueDate: '2023-12-31T23:59:59Z',
				},
			});

			const result = await store.upsert(memory, namespace);

			// Should have applied template defaults and validation
			expect(result.metadata?.status).toBe('todo'); // Default value
			expect(result.metadata?.category).toBe('task'); // Template metadata
			expect(result.metadata?.workflow).toBe('kanban'); // Template metadata
			expect(result.metadata?.title).toBe('Complete project documentation');
			expect(result.metadata?.priority).toBe('high');
		});

		it('should validate memory against template schema', async () => {
			const template: MemoryTemplate = {
				id: 'strict-template',
				name: 'Strict Template',
				version: '1.0.0',
				schema: {
					type: 'object',
					properties: {
						value: { type: 'number', minimum: 0 },
					},
					required: ['value'],
				},
			};

			await templateRegistry.register(template);

			const invalidMemory = createMemory({
				text: 'Invalid memory',
				metadata: {
					template: 'strict-template',
					value: -1, // Violates minimum constraint
				},
			});

			// Should reject invalid memory
			await expect(store.upsert(invalidMemory, namespace)).rejects.toThrow();
		});

		it('should support template inheritance', async () => {
			// Parent template
			const parentTemplate: MemoryTemplate = {
				id: 'base-template',
				name: 'Base Template',
				version: '1.0.0',
				schema: {
					type: 'object',
					properties: {
						category: { type: 'string' },
						tags: { type: 'array', items: { type: 'string' } },
					},
					required: ['category'],
				},
				defaults: {
					tags: [],
				},
			};

			// Child template
			const childTemplate: MemoryTemplate = {
				id: 'extended-template',
				name: 'Extended Template',
				version: '1.0.0',
				extends: 'base-template',
				schema: {
					type: 'object',
					properties: {
						category: { type: 'string' },
						tags: { type: 'array', items: { type: 'string' } },
						priority: { type: 'string' },
					},
					required: ['category', 'priority'],
				},
				defaults: {
					priority: 'medium',
				},
			};

			await templateRegistry.register(parentTemplate);
			await templateRegistry.register(childTemplate);

			const memory = createMemory({
				text: 'Extended template memory',
				metadata: {
					template: 'extended-template',
					category: 'work',
					tags: ['urgent', 'frontend'],
				},
			});

			const result = await store.upsert(memory, namespace);

			// Should have properties from both templates
			expect(result.metadata?.category).toBe('work');
			expect(result.metadata?.tags).toEqual(['urgent', 'frontend']);
			expect(result.metadata?.priority).toBe('medium'); // From child template
		});
	});

	describe('Template Registry', () => {
		it('should register and retrieve templates', async () => {
			const template: MemoryTemplate = {
				id: 'test-template',
				name: 'Test Template',
				version: '1.0.0',
				schema: {
					type: 'object',
					properties: {
						name: { type: 'string' },
					},
					required: ['name'],
				},
			};

			await templateRegistry.register(template);

			const retrieved = await templateRegistry.get('test-template');
			expect(retrieved).toEqual(template);
		});

		it('should list templates by category', async () => {
			const template1: MemoryTemplate = {
				id: 'task-template',
				name: 'Task Template',
				version: '1.0.0',
				schema: { type: 'object', properties: {} },
				metadata: { category: 'task' },
			};

			const template2: MemoryTemplate = {
				id: 'note-template',
				name: 'Note Template',
				version: '1.0.0',
				schema: { type: 'object', properties: {} },
				metadata: { category: 'note' },
			};

			await templateRegistry.register(template1);
			await templateRegistry.register(template2);

			const taskTemplates = await templateRegistry.listByCategory('task');
			expect(taskTemplates).toHaveLength(1);
			expect(taskTemplates[0].id).toBe('task-template');
		});

		it('should validate template schema', async () => {
			const invalidTemplate = {
				id: 'invalid-template',
				name: 'Invalid Template',
				version: '1.0.0',
				schema: 'invalid-schema', // Should be an object
			};

			await expect(templateRegistry.register(invalidTemplate as any)).rejects.toThrow();
		});
	});

	describe('Template Versioning', () => {
		it('should support multiple versions of same template', async () => {
			const v1: MemoryTemplate = {
				id: 'versioned-template',
				name: 'Versioned Template',
				version: '1.0.0',
				schema: {
					type: 'object',
					properties: {
						value: { type: 'string' },
					},
				},
			};

			const v2: MemoryTemplate = {
				id: 'versioned-template',
				name: 'Versioned Template',
				version: '2.0.0',
				schema: {
					type: 'object',
					properties: {
						value: { type: 'number' }, // Changed type
					},
				},
			};

			await templateRegistry.register(v1);
			await templateRegistry.register(v2);

			const latest = await templateRegistry.getLatest('versioned-template');
			expect(latest?.version).toBe('2.0.0');

			const specific = await templateRegistry.get('versioned-template', '1.0.0');
			expect(specific?.version).toBe('1.0.0');
		});

		it('should migrate memories when template version changes', async () => {
			// Register v1
			const v1: MemoryTemplate = {
				id: 'migration-template',
				name: 'Migration Template',
				version: '1.0.0',
				schema: {
					type: 'object',
					properties: {
						status: { type: 'string', enum: ['open', 'closed'] },
					},
				},
			};

			await templateRegistry.register(v1);

			// Create memory with v1
			const memory = createMemory({
				text: 'Migration test',
				metadata: {
					template: 'migration-template',
					templateVersion: '1.0.0',
					status: 'open',
				},
			});

			await store.upsert(memory, namespace);

			// Register v2 with different enum values
			const v2: MemoryTemplate = {
				id: 'migration-template',
				name: 'Migration Template',
				version: '2.0.0',
				schema: {
					type: 'object',
					properties: {
						status: { type: 'string', enum: ['active', 'inactive'] },
					},
				},
				migration: {
					from: '1.0.0',
					transform: (data: any) => ({
						...data,
						status: data.status === 'open' ? 'active' : 'inactive',
					}),
				},
			};

			await templateRegistry.register(v2);

			// Trigger migration
			await store.migrateTemplate('migration-template', '2.0.0', namespace);

			// Check that memory was migrated
			const result = await store.get(memory.id, namespace);
			expect(result?.metadata?.status).toBe('active');
			expect(result?.metadata?.templateVersion).toBe('2.0.0');
		});
	});

	describe('Performance Considerations', () => {
		it('should cache compiled schemas', async () => {
			const template: MemoryTemplate = {
				id: 'cached-template',
				name: 'Cached Template',
				version: '1.0.0',
				schema: {
					type: 'object',
					properties: {
						nested: {
							type: 'object',
							properties: {
								value: { type: 'string' },
							},
						},
					},
				},
			};

			await templateRegistry.register(template);

			// Create multiple memories with same template
			const memories = [];
			for (let i = 0; i < 10; i++) {
				const memory = createMemory({
					text: `Memory ${i}`,
					metadata: {
						template: 'cached-template',
						nested: { value: `test-${i}` },
					},
				});
				memories.push(memory);
			}

			const start = Date.now();
			for (const memory of memories) {
				await store.upsert(memory, namespace);
			}
			const duration = Date.now() - start;

			// Should be fast due to schema caching
			expect(duration).toBeLessThan(100);
		});

		it('should handle large templates efficiently', async () => {
			// Create a large template with many properties
			const largeSchema: any = {
				type: 'object',
				properties: {},
				required: [],
			};

			for (let i = 0; i < 100; i++) {
				const propName = `field${i}`;
				largeSchema.properties[propName] = { type: 'string' };
				if (i < 50) largeSchema.required.push(propName);
			}

			const largeTemplate: MemoryTemplate = {
				id: 'large-template',
				name: 'Large Template',
				version: '1.0.0',
				schema: largeSchema,
			};

			await templateRegistry.register(largeTemplate);

			const memory = createMemory({
				text: 'Large template test',
				metadata: {
					template: 'large-template',
				},
			});

			// Add required fields
			for (let i = 0; i < 50; i++) {
				memory.metadata![`field${i}`] = `value${i}`;
			}

			const start = Date.now();
			const result = await store.upsert(memory, namespace);
			const duration = Date.now() - start;

			expect(result).toBeDefined();
			expect(duration).toBeLessThan(200); // Should handle large schemas efficiently
		});
	});
});
