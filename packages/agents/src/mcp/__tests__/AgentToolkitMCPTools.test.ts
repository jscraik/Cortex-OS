/**
 * Unit tests for Agent Toolkit MCP Tools Integration
 *
 * Tests the real agent-toolkit integration including A2A bus communication,
 * batch operations for performance optimization, and error handling.
 *
 * Co-authored-by: brAInwav Development Team
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentToolkitMCPTools } from '../AgentToolkitMCPTools.js';

describe('AgentToolkitMCPTools', () => {
	let agentToolkitMCPTools: AgentToolkitMCPTools;
	let mockEventBus: { emit: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		mockEventBus = {
			emit: vi.fn(),
		};
		agentToolkitMCPTools = new AgentToolkitMCPTools(undefined, mockEventBus);
	});

	describe('constructor', () => {
		it('should initialize with default parameters', () => {
			const tools = new AgentToolkitMCPTools();
			expect(tools).toBeInstanceOf(AgentToolkitMCPTools);
			expect(tools.getEventBus()).toBeUndefined();
		});

		it('should initialize with event bus', () => {
			expect(agentToolkitMCPTools.getEventBus()).toBe(mockEventBus);
		});

		it('should initialize with custom tools path', () => {
			const customPath = '/custom/tools/path';
			const tools = new AgentToolkitMCPTools(customPath, mockEventBus);
			expect(tools).toBeInstanceOf(AgentToolkitMCPTools);
		});
	});

	describe('search tool', () => {
		it('should return correct tool definition', () => {
			const searchTool = agentToolkitMCPTools.search();

			expect(searchTool.name).toBe('agent_toolkit_search');
			expect(searchTool.description).toContain('ripgrep');
			expect(searchTool.inputSchema).toBeDefined();
			expect(typeof searchTool.handler).toBe('function');
		});

		it('should validate input schema correctly', async () => {
			const searchTool = agentToolkitMCPTools.search();

			// Valid input should pass
			const validInput = { pattern: 'test', path: '/some/path' };
			const validationResult = searchTool.inputSchema.safeParse(validInput);
			expect(validationResult.success).toBe(true);

			// Invalid input should fail
			const invalidInput = { pattern: '', path: '/some/path' };
			const invalidValidationResult = searchTool.inputSchema.safeParse(invalidInput);
			expect(invalidValidationResult.success).toBe(false);
		});

		it('should execute search successfully', async () => {
			const searchTool = agentToolkitMCPTools.search();
			const input = { pattern: 'function', path: '/src' };

			const result = await searchTool.handler(input);

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.metadata?.tool).toBe('agent_toolkit_search');
			expect(result.metadata?.correlationId).toBeDefined();
		});

		it('should emit A2A events during search execution', async () => {
			const searchTool = agentToolkitMCPTools.search();
			const input = { pattern: 'function', path: '/src' };

			await searchTool.handler(input);

			// Should emit execution started event
			expect(mockEventBus.emit).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'agent_toolkit.execution.started',
					data: expect.objectContaining({
						toolName: 'ripgrep',
						toolType: 'search',
						parameters: input,
					}),
				}),
			);

			// Should emit search results event
			expect(mockEventBus.emit).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'agent_toolkit.search.results',
					data: expect.objectContaining({
						searchType: 'ripgrep',
						query: input.pattern,
					}),
				}),
			);
		});

		it('should handle search errors gracefully', async () => {
			const searchTool = agentToolkitMCPTools.search();
			const invalidInput = { pattern: '', path: '' };

			const result = await searchTool.handler(invalidInput);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.metadata?.tool).toBe('agent_toolkit_search');
		});
	});

	describe('multiSearch tool', () => {
		it('should return correct tool definition', () => {
			const multiSearchTool = agentToolkitMCPTools.multiSearch();

			expect(multiSearchTool.name).toBe('agent_toolkit_multi_search');
			expect(multiSearchTool.description).toContain('comprehensive');
			expect(multiSearchTool.inputSchema).toBeDefined();
		});

		it('should execute multi-search successfully', async () => {
			const multiSearchTool = agentToolkitMCPTools.multiSearch();
			const input = { pattern: 'class', path: '/src' };

			const result = await multiSearchTool.handler(input);

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(Array.isArray(result.data)).toBe(true);
		});

		it('should emit multi-search A2A events', async () => {
			const multiSearchTool = agentToolkitMCPTools.multiSearch();
			const input = { pattern: 'class', path: '/src' };

			await multiSearchTool.handler(input);

			expect(mockEventBus.emit).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'agent_toolkit.execution.started',
					data: expect.objectContaining({
						toolName: 'multi-search',
						toolType: 'search',
					}),
				}),
			);
		});
	});

	describe('codemod tool', () => {
		it('should return correct tool definition', () => {
			const codemodTool = agentToolkitMCPTools.codemod();

			expect(codemodTool.name).toBe('agent_toolkit_codemod');
			expect(codemodTool.description).toContain('Comby');
			expect(codemodTool.inputSchema).toBeDefined();
		});

		it('should execute codemod successfully', async () => {
			const codemodTool = agentToolkitMCPTools.codemod();
			const input = { find: 'old_pattern', replace: 'new_pattern', path: '/src/file.js' };

			const result = await codemodTool.handler(input);

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.metadata?.tool).toBe('agent_toolkit_codemod');
		});

		it('should emit code modification A2A events', async () => {
			const codemodTool = agentToolkitMCPTools.codemod();
			const input = { find: 'old_pattern', replace: 'new_pattern', path: '/src/file.js' };

			await codemodTool.handler(input);

			expect(mockEventBus.emit).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'agent_toolkit.execution.started',
					data: expect.objectContaining({
						toolName: 'comby',
						toolType: 'codemod',
					}),
				}),
			);
		});
	});

	describe('validate tool', () => {
		it('should return correct tool definition', () => {
			const validateTool = agentToolkitMCPTools.validate();

			expect(validateTool.name).toBe('agent_toolkit_validate');
			expect(validateTool.description).toContain('linters');
			expect(validateTool.inputSchema).toBeDefined();
		});

		it('should execute validation successfully', async () => {
			const validateTool = agentToolkitMCPTools.validate();
			const input = { files: ['/src/file1.js', '/src/file2.ts'] };

			const result = await validateTool.handler(input);

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.metadata?.tool).toBe('agent_toolkit_validate');
		});

		it('should emit validation report A2A events', async () => {
			const validateTool = agentToolkitMCPTools.validate();
			const input = { files: ['/src/file1.js'] };

			await validateTool.handler(input);

			expect(mockEventBus.emit).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'agent_toolkit.validation.report',
					data: expect.objectContaining({
						validationType: 'syntax',
						filesValidated: input.files,
					}),
				}),
			);
		});
	});

	describe('batch operations for performance optimization', () => {
		describe('batchSearch', () => {
			it('should execute multiple searches in parallel', async () => {
				const requests = [
					{ pattern: 'function', path: '/src/app' },
					{ pattern: 'class', path: '/src/components' },
					{ pattern: 'interface', path: '/src/types' },
				];

				const startTime = Date.now();
				const results = await agentToolkitMCPTools.batchSearch(requests);
				const endTime = Date.now();

				expect(results).toHaveLength(3);
				expect(results.every((r) => r.success)).toBe(true);
				expect(endTime - startTime).toBeLessThan(1000); // Should be fast due to parallelization
			});

			it('should emit batch completion A2A events', async () => {
				const requests = [{ pattern: 'test', path: '/src' }];

				await agentToolkitMCPTools.batchSearch(requests);

				expect(mockEventBus.emit).toHaveBeenCalledWith(
					expect.objectContaining({
						type: 'agent_toolkit.batch.completed',
						data: expect.objectContaining({
							operationType: 'search',
							totalOperations: 1,
							successfulOperations: 1,
						}),
					}),
				);
			});

			it('should handle batch search errors', async () => {
				// Mock a failing search by providing invalid input
				const requests = [
					{ pattern: '', path: '' }, // Invalid input
				];

				const results = await agentToolkitMCPTools.batchSearch(requests);

				expect(results).toHaveLength(1);
				expect(results[0].success).toBe(false);
				expect(results[0].error).toBeDefined();
			});
		});

		describe('batchValidate', () => {
			it('should execute multiple validations in parallel', async () => {
				const fileBatches = [
					['/src/file1.js', '/src/file2.js'],
					['/src/file3.ts', '/src/file4.ts'],
				];

				const startTime = Date.now();
				const results = await agentToolkitMCPTools.batchValidate(fileBatches);
				const endTime = Date.now();

				expect(results).toHaveLength(2);
				expect(results.every((r) => r.success)).toBe(true);
				expect(endTime - startTime).toBeLessThan(1000); // Should be fast due to parallelization
			});

			it('should emit batch validation completion events', async () => {
				const fileBatches = [['/src/file1.js']];

				await agentToolkitMCPTools.batchValidate(fileBatches);

				expect(mockEventBus.emit).toHaveBeenCalledWith(
					expect.objectContaining({
						type: 'agent_toolkit.batch.completed',
						data: expect.objectContaining({
							operationType: 'validation',
							totalOperations: 1,
						}),
					}),
				);
			});
		});
	});

	describe('event bus integration', () => {
		it('should allow setting event bus after initialization', () => {
			const tools = new AgentToolkitMCPTools();
			expect(tools.getEventBus()).toBeUndefined();

			tools.setEventBus(mockEventBus);
			expect(tools.getEventBus()).toBe(mockEventBus);
		});

		it('should work without event bus (graceful degradation)', async () => {
			const toolsWithoutEventBus = new AgentToolkitMCPTools();
			const searchTool = toolsWithoutEventBus.search();

			const result = await searchTool.handler({ pattern: 'test', path: '/src' });

			expect(result.success).toBe(true);
			// No events should be emitted when no event bus is present
		});
	});

	describe('tool registry methods', () => {
		it('should return all available tools', () => {
			const allTools = agentToolkitMCPTools.getAllTools();

			expect(allTools).toHaveLength(4);
			expect(allTools.map((t) => t.name)).toEqual([
				'agent_toolkit_search',
				'agent_toolkit_multi_search',
				'agent_toolkit_codemod',
				'agent_toolkit_validate',
			]);
		});

		it('should get tool by name', () => {
			const searchTool = agentToolkitMCPTools.getTool('agent_toolkit_search');
			expect(searchTool).toBeDefined();
			expect(searchTool?.name).toBe('agent_toolkit_search');

			const nonExistentTool = agentToolkitMCPTools.getTool('non_existent');
			expect(nonExistentTool).toBeUndefined();
		});

		it('should execute tool by name', async () => {
			const input = { pattern: 'test', path: '/src' };
			const result = await agentToolkitMCPTools.executeTool('agent_toolkit_search', input);

			expect(result.success).toBe(true);
			expect(result.metadata?.tool).toBe('agent_toolkit_search');
		});

		it('should throw error for non-existent tool execution', async () => {
			await expect(agentToolkitMCPTools.executeTool('non_existent', {})).rejects.toThrow(
				"Agent Toolkit MCP tool 'non_existent' not found",
			);
		});
	});

	describe('execution history and monitoring', () => {
		it('should track execution history', async () => {
			const searchTool = agentToolkitMCPTools.search();
			await searchTool.handler({ pattern: 'test', path: '/src' });

			const history = agentToolkitMCPTools.getExecutionHistory();
			expect(history.size).toBe(1);

			const entries = Array.from(history.values());
			expect(entries[0].success).toBe(true);
			expect(entries[0].input).toEqual({ pattern: 'test', path: '/src' });
		});

		it('should clear execution history', async () => {
			const searchTool = agentToolkitMCPTools.search();
			await searchTool.handler({ pattern: 'test', path: '/src' });

			expect(agentToolkitMCPTools.getExecutionHistory().size).toBe(1);

			agentToolkitMCPTools.clearExecutionHistory();
			expect(agentToolkitMCPTools.getExecutionHistory().size).toBe(0);
		});

		it('should provide tool statistics', async () => {
			const searchTool = agentToolkitMCPTools.search();
			const validateTool = agentToolkitMCPTools.validate();

			await searchTool.handler({ pattern: 'test', path: '/src' });
			await validateTool.handler({ files: ['/src/file.js'] });

			const stats = agentToolkitMCPTools.getToolStats();

			expect(stats.totalExecutions).toBe(2);
			expect(stats.successfulExecutions).toBe(2);
			expect(stats.failedExecutions).toBe(0);
			expect(stats.tools).toHaveLength(2);
		});
	});

	describe('large-scale performance optimization', () => {
		it('should handle large batch operations efficiently', async () => {
			// Generate a large number of search requests
			const largeRequestSet = Array.from({ length: 50 }, (_, i) => ({
				pattern: `pattern_${i}`,
				path: `/src/dir_${i}`,
			}));

			const startTime = Date.now();
			const results = await agentToolkitMCPTools.batchSearch(largeRequestSet);
			const endTime = Date.now();

			expect(results).toHaveLength(50);
			expect(results.every((r) => r.success)).toBe(true);
			// Should complete within reasonable time even for large batches
			expect(endTime - startTime).toBeLessThan(5000);
		});

		it('should maintain execution history efficiently', async () => {
			// Execute many operations to test memory efficiency
			const searchTool = agentToolkitMCPTools.search();

			for (let i = 0; i < 100; i++) {
				await searchTool.handler({ pattern: `test_${i}`, path: '/src' });
			}

			const history = agentToolkitMCPTools.getExecutionHistory();
			expect(history.size).toBe(100);

			const stats = agentToolkitMCPTools.getToolStats();
			expect(stats.totalExecutions).toBe(100);
			expect(stats.successfulExecutions).toBe(100);
		});
	});
});
