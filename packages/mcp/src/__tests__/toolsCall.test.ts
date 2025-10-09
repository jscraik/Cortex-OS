/**
 * Versioned Tool Call Handler Tests
 * Tests for SEP-1575 tool version constraints and validation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MCPToolVersionException } from '../errors.js';
import {
	createToolCallParams,
	createVersionedToolCallHandler,
	extractToolRequirements,
	type ToolCallParams,
	type VersionedToolCallHandler,
} from '../handlers/toolsCall.js';
import { Server } from '../server.js';

describe('VersionedToolCallHandler', () => {
	let server: Server;
	let mockRegistry: any;
	let handler: VersionedToolCallHandler;

	beforeEach(() => {
		server = new Server();

		// Mock registry with tool resolution
		mockRegistry = {
			resolveTool: vi.fn(),
			isConstraintSatisfiable: vi.fn(),
			getStats: vi.fn().mockReturnValue({
				totalTools: 5,
				totalVersions: 12,
				toolsWithVersions: 4,
				unversionedTools: 1,
			}),
		};

		handler = createVersionedToolCallHandler(server, mockRegistry, false);
		vi.clearAllMocks();
	});

	describe('Basic Tool Call Handling', () => {
		it('should handle simple tool calls without versioning', async () => {
			const mockTool = {
				name: 'echo',
				version: '1.0.0',
				description: 'Echo tool',
				handler: vi.fn().mockResolvedValue('echo result'),
				inputSchema: { type: 'object' },
			};

			mockRegistry.resolveTool.mockReturnValue(mockTool);

			const params: ToolCallParams = {
				name: 'echo',
				arguments: { text: 'hello' },
			};

			const result = await handler.handleToolCall(params);

			expect(mockRegistry.resolveTool).toHaveBeenCalledWith('echo', undefined);
			expect(mockTool.handler).toHaveBeenCalledWith({ text: 'hello' }, expect.any(Object));
			expect(result.content).toBeDefined();
			expect(result._correlationId).toBeDefined();
		});

		it('should include tool version in result when available', async () => {
			const mockTool = {
				name: 'echo',
				version: '1.1.0',
				description: 'Echo tool',
				handler: vi.fn().mockResolvedValue('echo result'),
				inputSchema: { type: 'object' },
			};

			mockRegistry.resolveTool.mockReturnValue(mockTool);

			const params: ToolCallParams = {
				name: 'echo',
				arguments: { text: 'hello' },
			};

			const result = await handler.handleToolCall(params);

			expect(result._toolVersion).toBe('1.1.0');
		});

		it('should handle tool calls with correlation ID', async () => {
			const mockTool = {
				name: 'echo',
				description: 'Echo tool',
				handler: vi.fn().mockResolvedValue('echo result'),
				inputSchema: { type: 'object' },
			};

			mockRegistry.resolveTool.mockReturnValue(mockTool);

			const params: ToolCallParams = {
				name: 'echo',
				arguments: { text: 'hello' },
				_meta: {
					correlationId: 'test-correlation-123',
				},
			};

			const result = await handler.handleToolCall(params);

			expect(result._correlationId).toBe('test-correlation-123');
		});
	});

	describe('Version Constraints (SEP-1575)', () => {
		beforeEach(() => {
			handler.setVersioningEnabled(true);
		});

		it('should resolve tools with version constraints', async () => {
			const mockTool = {
				name: 'echo',
				version: '1.2.0',
				description: 'Echo tool',
				handler: vi.fn().mockResolvedValue('echo result'),
				inputSchema: { type: 'object' },
			};

			mockRegistry.resolveTool.mockReturnValue(mockTool);

			const params: ToolCallParams = {
				name: 'echo',
				arguments: { text: 'hello' },
				tool_requirements: {
					echo: '^1.0.0',
				},
			};

			const result = await handler.handleToolCall(params);

			expect(mockRegistry.resolveTool).toHaveBeenCalledWith('echo', '^1.0.0');
			expect(result._toolVersion).toBe('1.2.0');
		});

		it('should use preferred versions from metadata', async () => {
			const mockTool = {
				name: 'echo',
				version: '1.1.0',
				description: 'Echo tool',
				handler: vi.fn().mockResolvedValue('echo result'),
				inputSchema: { type: 'object' },
			};

			mockRegistry.resolveTool.mockReturnValue(mockTool);

			const params: ToolCallParams = {
				name: 'echo',
				arguments: { text: 'hello' },
				_meta: {
					preferredVersions: {
						echo: '~1.1.0',
					},
				},
			};

			const result = await handler.handleToolCall(params);

			expect(mockRegistry.resolveTool).toHaveBeenCalledWith('echo', '~1.1.0');
			expect(result._toolVersion).toBe('1.1.0');
		});

		it('should prioritize tool_requirements over preferredVersions', async () => {
			const mockTool = {
				name: 'echo',
				version: '2.0.0',
				description: 'Echo tool',
				handler: vi.fn().mockResolvedValue('echo result'),
				inputSchema: { type: 'object' },
			};

			mockRegistry.resolveTool.mockReturnValue(mockTool);

			const params: ToolCallParams = {
				name: 'echo',
				arguments: { text: 'hello' },
				tool_requirements: {
					echo: '^2.0.0',
				},
				_meta: {
					preferredVersions: {
						echo: '^1.0.0', // Should be ignored
					},
				},
			};

			await handler.handleToolCall(params);

			expect(mockRegistry.resolveTool).toHaveBeenCalledWith('echo', '^2.0.0');
		});

		it('should validate all tool requirements before execution', async () => {
			mockRegistry.isConstraintSatisfiable
				.mockReturnValueOnce(true) // echo constraint
				.mockReturnValueOnce(false); // calculator constraint

			const params: ToolCallParams = {
				name: 'echo',
				arguments: { text: 'hello' },
				tool_requirements: {
					echo: '^1.0.0',
					calculator: '^2.0.0',
				},
			};

			await expect(handler.handleToolCall(params)).rejects.toThrow(MCPToolVersionException);

			expect(mockRegistry.isConstraintSatisfiable).toHaveBeenCalledWith('echo', '^1.0.0');
			expect(mockRegistry.isConstraintSatisfiable).toHaveBeenCalledWith('calculator', '^2.0.0');
		});

		it('should skip validation when versioning is disabled', async () => {
			handler.setVersioningEnabled(false);

			const mockTool = {
				name: 'echo',
				description: 'Echo tool',
				handler: vi.fn().mockResolvedValue('echo result'),
				inputSchema: { type: 'object' },
			};

			mockRegistry.resolveTool.mockReturnValue(mockTool);

			const params: ToolCallParams = {
				name: 'echo',
				arguments: { text: 'hello' },
				tool_requirements: {
					echo: '^1.0.0', // Should be ignored
				},
			};

			await expect(handler.handleToolCall(params)).resolves.toBeDefined();

			expect(mockRegistry.isConstraintSatisfiable).not.toHaveBeenCalled();
		});
	});

	describe('Error Handling', () => {
		it('should throw error for non-existent tools', async () => {
			mockRegistry.resolveTool.mockReturnValue(null);

			const params: ToolCallParams = {
				name: 'non-existent',
				arguments: {},
			};

			await expect(handler.handleToolCall(params)).rejects.toThrow(MCPToolVersionException);
		});

		it('should throw error for unsatisfiable constraints', async () => {
			mockRegistry.resolveTool.mockReturnValue(null);

			const params: ToolCallParams = {
				name: 'echo',
				arguments: {},
				tool_requirements: {
					echo: '999.999.999',
				},
			};

			await expect(handler.handleToolCall(params)).rejects.toThrow(MCPToolVersionException);
		});

		it('should throw error for tools without handlers', async () => {
			const mockTool = {
				name: 'echo',
				version: '1.0.0',
				description: 'Echo tool',
				inputSchema: { type: 'object' },
				// No handler
			};

			mockRegistry.resolveTool.mockReturnValue(mockTool);

			const params: ToolCallParams = {
				name: 'echo',
				arguments: {},
			};

			await expect(handler.handleToolCall(params)).rejects.toThrow(MCPToolVersionException);
		});

		it('should handle tool execution errors', async () => {
			const mockTool = {
				name: 'echo',
				description: 'Echo tool',
				handler: vi.fn().mockRejectedValue(new Error('Tool execution failed')),
				inputSchema: { type: 'object' },
			};

			mockRegistry.resolveTool.mockReturnValue(mockTool);

			const params: ToolCallParams = {
				name: 'echo',
				arguments: {},
			};

			await expect(handler.handleToolCall(params)).rejects.toThrow(MCPToolVersionException);
		});

		it('should handle tool execution errors with version info', async () => {
			const mockTool = {
				name: 'echo',
				version: '1.2.0',
				description: 'Echo tool',
				handler: vi.fn().mockRejectedValue(new Error('Tool execution failed')),
				inputSchema: { type: 'object' },
			};

			mockRegistry.resolveTool.mockReturnValue(mockTool);

			const params: ToolCallParams = {
				name: 'echo',
				arguments: {},
			};

			try {
				await handler.handleToolCall(params);
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(MCPToolVersionException);
				expect((error as MCPToolVersionException).message).toContain('echo@1.2.0');
			}
		});
	});

	describe('Deprecation Warnings', () => {
		it('should log deprecation warnings for deprecated tools', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const mockTool = {
				name: 'deprecated-tool',
				version: '1.0.0',
				description: 'Deprecated tool',
				handler: vi.fn().mockResolvedValue('result'),
				inputSchema: { type: 'object' },
				metadata: {
					deprecationMessage: 'This tool is deprecated. Use new-tool instead.',
				},
			};

			mockRegistry.resolveTool.mockReturnValue(mockTool);

			const params: ToolCallParams = {
				name: 'deprecated-tool',
				arguments: {},
			};

			await handler.handleToolCall(params);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"tool_deprecation_warning"'),
			);

			consoleSpy.mockRestore();
		});
	});

	describe('Statistics and Monitoring', () => {
		it('should provide handler statistics', () => {
			const stats = handler.getStats();

			expect(stats.versioningEnabled).toBe(false);
			expect(stats.registryStats).toBeDefined();
			expect(mockRegistry.getStats).toHaveBeenCalled();
		});

		it('should reflect versioning state in statistics', () => {
			handler.setVersioningEnabled(true);
			const stats = handler.getStats();

			expect(stats.versioningEnabled).toBe(true);
		});
	});

	describe('Version Control', () => {
		it('should enable versioning dynamically', () => {
			handler.setVersioningEnabled(true);
			expect(handler.isVersioningEnabled()).toBe(true);
		});

		it('should disable versioning dynamically', () => {
			handler.setVersioningEnabled(false);
			expect(handler.isVersioningEnabled()).toBe(false);
		});
	});

	describe('Context and Metadata', () => {
		it('should pass context information to tool handlers', async () => {
			const mockTool = {
				name: 'context-aware-tool',
				description: 'Context aware tool',
				handler: vi.fn().mockResolvedValue('result'),
				inputSchema: { type: 'object' },
			};

			mockRegistry.resolveTool.mockReturnValue(mockTool);

			const params: ToolCallParams = {
				name: 'context-aware-tool',
				arguments: { input: 'test' },
				_meta: {
					correlationId: 'test-123',
					requester: 'test-client',
				},
			};

			await handler.handleToolCall(params);

			expect(mockTool.handler).toHaveBeenCalledWith(
				{ input: 'test' },
				expect.objectContaining({
					correlationId: 'test-123',
					toolName: 'context-aware-tool',
					requester: 'test-client',
				}),
			);
		});

		it('should include version information in context', async () => {
			const mockTool = {
				name: 'versioned-tool',
				version: '2.1.0',
				description: 'Versioned tool',
				handler: vi.fn().mockResolvedValue('result'),
				inputSchema: { type: 'object' },
			};

			mockRegistry.resolveTool.mockReturnValue(mockTool);

			const params: ToolCallParams = {
				name: 'versioned-tool',
				arguments: {},
			};

			await handler.handleToolCall(params);

			expect(mockTool.handler).toHaveBeenCalledWith(
				{},
				expect.objectContaining({
					toolName: 'versioned-tool',
					version: '2.1.0',
				}),
			);
		});
	});
});

describe('Utility Functions', () => {
	describe('extractToolRequirements', () => {
		it('should extract tool requirements from request metadata', () => {
			const request = {
				_meta: {
					tool_requirements: {
						echo: '^1.0.0',
						calculator: '~2.0.0',
					},
				},
			};

			const requirements = extractToolRequirements(request);

			expect(requirements).toEqual({
				echo: '^1.0.0',
				calculator: '~2.0.0',
			});
		});

		it('should handle alternative metadata key names', () => {
			const request = {
				meta: {
					toolRequirements: {
						echo: '^1.0.0',
					},
				},
			};

			const requirements = extractToolRequirements(request);

			expect(requirements).toEqual({
				echo: '^1.0.0',
			});
		});

		it('should return undefined when no requirements found', () => {
			const request = {
				_meta: {
					otherData: 'value',
				},
			};

			const requirements = extractToolRequirements(request);

			expect(requirements).toBeUndefined();
		});

		it('should handle empty requests', () => {
			const requirements = extractToolRequirements({});
			expect(requirements).toBeUndefined();
		});
	});

	describe('createToolCallParams', () => {
		it('should create basic tool call parameters', () => {
			const params = createToolCallParams('echo', { text: 'hello' });

			expect(params).toEqual({
				name: 'echo',
				arguments: { text: 'hello' },
				tool_requirements: undefined,
				_meta: {
					correlationId: undefined,
					requester: undefined,
					preferredVersions: undefined,
				},
			});
		});

		it('should create parameters with all options', () => {
			const toolRequirements = { echo: '^1.0.0' };
			const preferredVersions = { calculator: '~2.0.0' };

			const params = createToolCallParams(
				'echo',
				{ text: 'hello' },
				{
					toolRequirements,
					correlationId: 'test-123',
					requester: 'test-client',
					preferredVersions,
				},
			);

			expect(params).toEqual({
				name: 'echo',
				arguments: { text: 'hello' },
				tool_requirements: toolRequirements,
				_meta: {
					correlationId: 'test-123',
					requester: 'test-client',
					preferredVersions,
				},
			});
		});

		it('should handle parameters without arguments', () => {
			const params = createToolCallParams('no-args-tool');

			expect(params.name).toBe('no-args-tool');
			expect(params.arguments).toBeUndefined();
		});
	});
});

describe('Factory Functions', () => {
	it('should create handler with versioning disabled by default', () => {
		const server = new Server();
		const mockRegistry = { resolveTool: vi.fn() };

		const handler = createVersionedToolCallHandler(server, mockRegistry);

		expect(handler.isVersioningEnabled()).toBe(false);
	});

	it('should create handler with versioning enabled', () => {
		const server = new Server();
		const mockRegistry = { resolveTool: vi.fn() };

		const handler = createVersionedToolCallHandler(server, mockRegistry, true);

		expect(handler.isVersioningEnabled()).toBe(true);
	});
});

describe('Integration Scenarios', () => {
	it('should handle complex tool call with version constraints and context', async () => {
		const server = new Server();
		const mockRegistry = {
			resolveTool: vi.fn().mockReturnValue({
				name: 'complex-tool',
				version: '2.1.0',
				description: 'Complex tool',
				handler: vi.fn().mockResolvedValue({
					result: 'complex result',
					metadata: { processingTime: 150 },
				}),
				inputSchema: { type: 'object' },
				metadata: {
					author: 'Test Author',
					tags: ['test', 'complex'],
				},
			}),
			isConstraintSatisfiable: vi.fn().mockReturnValue(true),
		};

		const handler = createVersionedToolCallHandler(server, mockRegistry, true);

		const params: ToolCallParams = {
			name: 'complex-tool',
			arguments: {
				input: 'test data',
				options: { verbose: true },
			},
			tool_requirements: {
				'complex-tool': '^2.0.0',
			},
			_meta: {
				correlationId: 'integration-test-123',
				requester: 'integration-test-client',
				preferredVersions: {
					'complex-tool': '~2.1.0', // Should be ignored due to tool_requirements
				},
			},
		};

		const result = await handler.handleToolCall(params);

		expect(mockRegistry.resolveTool).toHaveBeenCalledWith('complex-tool', '^2.0.0');
		expect(mockRegistry.isConstraintSatisfiable).toHaveBeenCalledWith('complex-tool', '^2.0.0');
		expect(result._toolVersion).toBe('2.1.0');
		expect(result._correlationId).toBe('integration-test-123');
		expect(result.content).toBeDefined();
	});
});
