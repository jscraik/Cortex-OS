/**
 * Tests for the subagent system
 */

import { promises as fsp } from 'node:fs';
import * as path from 'node:path';
import type { Tool, ToolSchema } from '@voltagent/core';
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from 'vitest';
import { CortexAgent } from '../src/CortexAgent';
import { createSubagentSystem } from '../src/subagents';
import { SubagentLoader } from '../src/subagents/loader';
import { SubagentRegistry } from '../src/subagents/registry';
import { DelegationRouter } from '../src/subagents/router';
import { SubagentToolFactory } from '../src/subagents/tools';
import type { IToolRegistry } from '../src/types';

// Mock IToolRegistry for testing
class MockToolRegistry implements IToolRegistry {
	private tools = new Map<string, Tool<ToolSchema>>();

	register(tool: Tool<ToolSchema>): void {
		const id = (tool as unknown as { id?: string }).id ?? tool.name;
		this.tools.set(id, tool);
	}

	unregister(toolId: string): boolean {
		return this.tools.delete(toolId);
	}

	get(toolId: string): Tool<ToolSchema> | null {
		return this.tools.get(toolId) || null;
	}

	list(): Tool<ToolSchema>[] {
		return Array.from(this.tools.values());
	}

	has(toolId: string): boolean {
		return this.tools.has(toolId);
	}
}

describe('Subagent System', () => {
	let tempDir: string;
	let toolRegistry: MockToolRegistry;

	beforeAll(async () => {
		// Create temporary directory for test subagents
		tempDir = path.join(__dirname, '..', 'tmp', 'test-subagents');
		await fsp.mkdir(tempDir, { recursive: true });

		toolRegistry = new MockToolRegistry();
	});

	afterAll(async () => {
		// Clean up temporary directory
		await fsp.rm(tempDir, { recursive: true, force: true });
	});

	describe('SubagentLoader', () => {
		let loader: SubagentLoader;

		beforeEach(() => {
			loader = new SubagentLoader({
				searchPaths: [tempDir],
				extensions: ['.subagent.yml', '.subagent.yaml', '.subagent.md'],
				maxFileSize: 1024 * 1024,
			});
		});

		test('should load YAML subagent configuration', async () => {
			// Create a test YAML file
			const yamlContent = `version: "1"
subagent:
  name: test-agent
  version: "1.0.0"
  description: "Test subagent"
  scope: project
  model: "test-model"
  model_provider: "mlx"
`;

			await fsp.writeFile(path.join(tempDir, 'test.subagent.yml'), yamlContent);

			const subagents = await loader.loadAll();
			expect(subagents.has('test-agent')).toBe(true);
			const config = subagents.get('test-agent');
			expect(config).toBeDefined();
			if (!config) return;
			expect(config.name).toBe('test-agent');
			expect(config.description).toBe('Test subagent');
			expect(config.model).toBe('test-model');
			expect(config.model_provider).toBe('mlx');
		});

		test('should load Markdown subagent configuration', async () => {
			// Create a test Markdown file
			const mdContent = `---
name: test-md-agent
version: "1.0.0"
description: "Test markdown subagent"
scope: project
model: "test-model"
model_provider: "ollama"
---

# Test Subagent

This is a test subagent in markdown format.
`;

			await fsp.writeFile(path.join(tempDir, 'test-md.subagent.md'), mdContent);

			const subagents = await loader.loadAll();
			expect(subagents.has('test-md-agent')).toBe(true);
			const config = subagents.get('test-md-agent');
			expect(config).toBeDefined();
			if (!config) return;
			expect(config.name).toBe('test-md-agent');
			expect(config.description).toBe('Test markdown subagent');
			expect(config.model_provider).toBe('ollama');
		});

		test('should reject invalid configuration', async () => {
			// Create an invalid YAML file
			const invalidContent = `version: "1"
subagent:
  name: ""  # Empty name should fail validation
`;

			await fsp.writeFile(
				path.join(tempDir, 'invalid.subagent.yml'),
				invalidContent,
			);

			await expect(loader.loadAll()).rejects.toThrow();
		});
	});

	describe('SubagentRegistry', () => {
		let registry: SubagentRegistry;
		let toolFactory: SubagentToolFactory;

		beforeEach(() => {
			toolFactory = new SubagentToolFactory(toolRegistry, []);
			registry = new SubagentRegistry(toolFactory);
		});

		test('should register subagent', async () => {
			const config = {
				name: 'test-agent',
				version: '1.0.0',
				description: 'Test agent',
				scope: 'project' as const,
				model: 'test-model',
			};

			await registry.register(config);

			const registered = await registry.get('test-agent');
			expect(registered).toEqual(config);

			const exists = await registry.exists('test-agent');
			expect(exists).toBe(true);
		});

		test('should list subagents', async () => {
			const config1 = {
				name: 'agent1',
				version: '1.0.0',
				description: 'Agent 1',
				scope: 'project' as const,
				tags: ['test'],
			};

			const config2 = {
				name: 'agent2',
				version: '1.0.0',
				description: 'Agent 2',
				scope: 'user' as const,
				tags: ['production'],
			};

			await registry.register(config1);
			await registry.register(config2);

			const all = await registry.list();
			expect(all).toHaveLength(2);

			const projectOnly = await registry.list({ scope: 'project' });
			expect(projectOnly).toHaveLength(1);
			expect(projectOnly[0].name).toBe('agent1');

			const tagged = await registry.list({ tags: ['test'] });
			expect(tagged).toHaveLength(1);
			expect(tagged[0].name).toBe('agent1');
		});

		test('should unregister subagent', async () => {
			const config = {
				name: 'test-agent',
				version: '1.0.0',
				description: 'Test agent',
				scope: 'project' as const,
			};

			await registry.register(config);
			expect(await registry.exists('test-agent')).toBe(true);

			await registry.unregister('test-agent');
			expect(await registry.exists('test-agent')).toBe(false);
		});
	});

	describe('DelegationRouter', () => {
		let router: DelegationRouter;
		let mockRegistry: {
			list: () => Promise<
				Array<{
					name: string;
					allowed_tools?: string[];
					blocked_tools?: string[];
				}>
			>;
		};

		beforeEach(() => {
			mockRegistry = {
				list: async () => [
					{ name: 'code-analysis', allowed_tools: ['read', 'write'] },
					{ name: 'test-generation', allowed_tools: ['read', 'execute'] },
				],
			};

			router = new DelegationRouter(mockRegistry, {
				defaultSubagent: 'general',
				confidenceThreshold: 0.7,
				enableParallel: true,
			});
		});

		test('should route code-related messages to code-analysis', async () => {
			const result = await router.route('Please analyze this code for bugs');

			expect(result.shouldDelegate).toBe(true);
			expect(result.primary).toBe('code-analysis');
			expect(result.candidates[0].subagent).toBe('code-analysis');
			expect(result.candidates[0].confidence).toBeGreaterThan(0.8);
		});

		test('should route test-related messages to test-generation', async () => {
			const result = await router.route(
				'Generate unit tests for this function',
			);

			expect(result.shouldDelegate).toBe(true);
			expect(
				result.candidates.some((c) => c.subagent === 'test-generation'),
			).toBe(true);
		});

		test('should not delegate below confidence threshold', async () => {
			const result = await router.route('Hello world');

			expect(result.shouldDelegate).toBe(false);
			expect(result.strategy).toBe('none');
		});

		test('should create delegation requests', async () => {
			const message = 'Analyze and test this code';
			const routing = await router.route(message);

			if (routing.strategy !== 'none') {
				const requests = await router.createDelegations(
					message,
					routing.strategy,
					routing.candidates,
					{ input: message },
				);

				expect(requests.length).toBeGreaterThan(0);
				expect(requests[0].message).toBe(message);
			}
		});
	});

	describe('SubagentSystem Integration', () => {
		test('should create and initialize subagent system', async () => {
			// Create test subagent files
			const yamlContent = `version: "1"
subagent:
  name: integration-test
  version: "1.0.0"
  description: "Integration test subagent"
  scope: project
  model: "test-model"
`;

			await fsp.writeFile(
				path.join(tempDir, 'integration-test.subagent.yml'),
				yamlContent,
			);

			const system = await createSubagentSystem({
				toolRegistry,
				globalTools: [],
				loader: {
					searchPaths: [tempDir],
				},
				enableDelegation: true,
				watch: false,
			});

			expect(system.getToolNames()).toContain('agent.integration-test');

			const stats = system.getStats();
			expect(stats.totalSubagents).toBe(1);

			await system.shutdown();
		});

		test('should integrate with CortexAgent', async () => {
			const agent = new CortexAgent({
				cortex: {
					subagents: {
						enabled: true,
						enableDelegation: true,
						watch: false,
						searchPaths: [tempDir],
						delegation: {
							confidenceThreshold: 0.7,
							enableParallel: true,
						},
					},
				},
			});

			const status = await agent.getStatus();
			expect(status.subagents).toBeDefined();
			expect(status.subagents?.enabled).toBe(true);
		});
	});
});
