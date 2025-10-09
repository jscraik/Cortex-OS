/**
 * Versioned Tool Registry Tests
 * Tests for SemVer constraint resolution and tool management
 */

import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MCPToolVersionException } from '../errors.js';
import {
	createVersionedToolRegistry,
	type ToolDescriptor,
	type VersionConstraint,
	VersionedToolRegistry,
} from '../registry/toolRegistry.js';
import { Server } from '../server.js';

describe('VersionedToolRegistry', () => {
	let server: Server;
	let registry: VersionedToolRegistry;
	let tempDir: string;

	beforeEach(async () => {
		server = new Server();
		registry = createVersionedToolRegistry(server);
		tempDir = join(tmpdir(), `mcp-registry-test-${randomUUID()}`);
		await fs.mkdir(tempDir, { recursive: true });
		vi.clearAllMocks();
	});

	afterEach(async () => {
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	describe('Tool Registration', () => {
		it('should register tools without versions', () => {
			const tool: ToolDescriptor = {
				name: 'test-tool',
				description: 'Test tool',
				inputSchema: { type: 'object' },
			};

			registry.registerTool(tool);
			const stats = registry.getStats();

			expect(stats.totalTools).toBe(1);
			expect(stats.unversionedTools).toBe(1);
			expect(stats.toolsWithVersions).toBe(0);
		});

		it('should register tools with semantic versions', () => {
			const tool: ToolDescriptor = {
				name: 'test-tool',
				version: '1.0.0',
				description: 'Test tool',
				inputSchema: { type: 'object' },
			};

			registry.registerTool(tool);
			const stats = registry.getStats();

			expect(stats.totalTools).toBe(1);
			expect(stats.unversionedTools).toBe(0);
			expect(stats.toolsWithVersions).toBe(1);
		});

		it('should reject invalid semantic versions', () => {
			const tool: ToolDescriptor = {
				name: 'test-tool',
				version: 'invalid-version',
				description: 'Test tool',
				inputSchema: { type: 'object' },
			};

			expect(() => registry.registerTool(tool)).toThrow(MCPToolVersionException);
		});

		it('should register multiple versions of the same tool', () => {
			const tool1: ToolDescriptor = {
				name: 'test-tool',
				version: '1.0.0',
				description: 'Test tool v1',
				inputSchema: { type: 'object' },
			};

			const tool2: ToolDescriptor = {
				name: 'test-tool',
				version: '1.1.0',
				description: 'Test tool v1.1',
				inputSchema: { type: 'object' },
			};

			registry.registerTool(tool1);
			registry.registerTool(tool2);

			const stats = registry.getStats();
			expect(stats.totalTools).toBe(1);
			expect(stats.totalVersions).toBe(2);
			expect(stats.toolsWithVersions).toBe(1);
		});

		it('should reject tools without names', () => {
			const tool: ToolDescriptor = {
				name: '',
				version: '1.0.0',
				description: 'Test tool',
				inputSchema: { type: 'object' },
			};

			expect(() => registry.registerTool(tool)).toThrow(MCPToolVersionException);
		});
	});

	describe('Tool Resolution', () => {
		beforeEach(() => {
			// Register test tools
			registry.registerTool({
				name: 'echo',
				version: '1.0.0',
				description: 'Echo v1',
				inputSchema: { type: 'object' },
			});

			registry.registerTool({
				name: 'echo',
				version: '1.1.0',
				description: 'Echo v1.1',
				inputSchema: { type: 'object' },
			});

			registry.registerTool({
				name: 'echo',
				version: '2.0.0',
				description: 'Echo v2',
				inputSchema: { type: 'object' },
			});

			registry.registerTool({
				name: 'calculator',
				description: 'Calculator (unversioned)',
				inputSchema: { type: 'object' },
			});
		});

		it('should resolve latest version when no constraint specified', () => {
			const tool = registry.resolveTool('echo');
			expect(tool).toBeDefined();
			expect(tool?.version).toBe('2.0.0');
		});

		it('should resolve exact version matches', () => {
			const tool = registry.resolveTool('echo', '1.1.0');
			expect(tool).toBeDefined();
			expect(tool?.version).toBe('1.1.0');
		});

		it('should resolve caret (^) constraints', () => {
			const tool = registry.resolveTool('echo', '^1.0.0');
			expect(tool).toBeDefined();
			expect(tool?.version).toBe('1.1.0'); // Latest 1.x version
		});

		it('should resolve tilde (~) constraints', () => {
			const tool = registry.resolveTool('echo', '~1.1.0');
			expect(tool).toBeDefined();
			expect(tool?.version).toBe('1.1.0');
		});

		it('should resolve greater-than (>) constraints', () => {
			const tool = registry.resolveTool('echo', '>1.0.0');
			expect(tool).toBeDefined();
			expect(tool?.version).toBe('2.0.0');
		});

		it('should resolve less-than (<) constraints', () => {
			const tool = registry.resolveTool('echo', '<2.0.0');
			expect(tool).toBeDefined();
			expect(tool?.version).toBe('1.1.0');
		});

		it('should return null for non-existent tools', () => {
			const tool = registry.resolveTool('non-existent');
			expect(tool).toBeNull();
		});

		it('should return null for unsatisfiable constraints', () => {
			const tool = registry.resolveTool('echo', '3.0.0');
			expect(tool).toBeNull();
		});

		it('should return null for invalid constraints', () => {
			const tool = registry.resolveTool('echo', 'invalid.constraint');
			expect(tool).toBeNull();
		});

		it('should resolve unversioned tools', () => {
			const tool = registry.resolveTool('calculator');
			expect(tool).toBeDefined();
			expect(tool?.version).toBeUndefined();
		});

		it('should fallback to unversioned when no versioned tool satisfies constraint', () => {
			// Add a tool that only has unversioned version
			registry.registerTool({
				name: 'simple',
				description: 'Simple tool',
				inputSchema: { type: 'object' },
			});

			const tool = registry.resolveTool('simple', '1.0.0');
			expect(tool).toBeDefined();
			expect(tool?.version).toBeUndefined();
		});
	});

	describe('Constraint Satisfaction', () => {
		beforeEach(() => {
			registry.registerTool({
				name: 'test',
				version: '1.0.0',
				description: 'Test v1',
				inputSchema: { type: 'object' },
			});

			registry.registerTool({
				name: 'test',
				version: '1.2.0',
				description: 'Test v1.2',
				inputSchema: { type: 'object' },
			});

			registry.registerTool({
				name: 'test',
				version: '2.0.0',
				description: 'Test v2',
				inputSchema: { type: 'object' },
			});
		});

		it('should correctly identify satisfiable constraints', () => {
			expect(registry.isConstraintSatisfiable('test', '^1.0.0')).toBe(true);
			expect(registry.isConstraintSatisfiable('test', '~1.2.0')).toBe(true);
			expect(registry.isConstraintSatisfiable('test', '2.0.0')).toBe(true);
		});

		it('should correctly identify unsatisfiable constraints', () => {
			expect(registry.isConstraintSatisfiable('test', '3.0.0')).toBe(false);
			expect(registry.isConstraintSatisfiable('test', '^3.0.0')).toBe(false);
		});

		it('should handle non-existent tools', () => {
			expect(registry.isConstraintSatisfiable('non-existent', '1.0.0')).toBe(false);
		});
	});

	describe('Tool Version Management', () => {
		beforeEach(() => {
			registry.registerTool({
				name: 'test',
				version: '1.0.0',
				description: 'Test v1',
				inputSchema: { type: 'object' },
			});

			registry.registerTool({
				name: 'test',
				version: '1.1.0',
				description: 'Test v1.1',
				inputSchema: { type: 'object' },
			});

			registry.registerTool({
				name: 'test',
				version: '2.0.0',
				description: 'Test v2',
				inputSchema: { type: 'object' },
			});
		});

		it('should list all tool versions in descending order', () => {
			const versions = registry.getToolVersions('test');
			expect(versions).toEqual(['2.0.0', '1.1.0', '1.0.0']);
		});

		it('should return empty array for tools with no versions', () => {
			registry.registerTool({
				name: 'unversioned',
				description: 'No version',
				inputSchema: { type: 'object' },
			});

			const versions = registry.getToolVersions('unversioned');
			expect(versions).toEqual([]);
		});

		it('should return empty array for non-existent tools', () => {
			const versions = registry.getToolVersions('non-existent');
			expect(versions).toEqual([]);
		});

		it('should remove specific tool versions', () => {
			const removed = registry.removeTool('test', '1.1.0');
			expect(removed).toBe(true);

			const versions = registry.getToolVersions('test');
			expect(versions).toEqual(['2.0.0', '1.0.0']);

			const stats = registry.getStats();
			expect(stats.totalVersions).toBe(2);
		});

		it('should remove all versions when version not specified', () => {
			const removed = registry.removeTool('test');
			expect(removed).toBe(true);

			const versions = registry.getToolVersions('test');
			expect(versions).toEqual([]);

			const stats = registry.getStats();
			expect(stats.totalTools).toBe(0);
		});

		it('should return false when removing non-existent tool', () => {
			const removed = registry.removeTool('non-existent');
			expect(removed).toBe(false);
		});

		it('should return false when removing non-existent version', () => {
			const removed = registry.removeTool('test', '3.0.0');
			expect(removed).toBe(false);
		});
	});

	describe('File Loading', () => {
		it('should load tools from directory', async () => {
			const tool1Path = join(tempDir, 'tool1.tool.json');
			const tool2Path = join(tempDir, 'tool2.tool.json');

			await fs.writeFile(
				tool1Path,
				JSON.stringify({
					name: 'file-tool-1',
					version: '1.0.0',
					description: 'File tool 1',
					inputSchema: { type: 'object' },
				}),
			);

			await fs.writeFile(
				tool2Path,
				JSON.stringify({
					name: 'file-tool-2',
					version: '1.0.0',
					description: 'File tool 2',
					inputSchema: { type: 'object' },
				}),
			);

			await registry.loadFromDirectory(tempDir);

			const stats = registry.getStats();
			expect(stats.totalTools).toBe(2);
			expect(stats.totalVersions).toBe(2);
		});

		it('should handle invalid JSON files gracefully', async () => {
			const invalidPath = join(tempDir, 'invalid.tool.json');
			await fs.writeFile(invalidPath, '{ invalid json }');

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			await registry.loadFromDirectory(tempDir);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"failed_to_load_tool_file"'),
			);

			consoleSpy.mockRestore();
		});

		it('should validate tool contracts', async () => {
			const invalidPath = join(tempDir, 'invalid.tool.json');
			await fs.writeFile(
				invalidPath,
				JSON.stringify({
					// Missing required fields
					description: 'Invalid tool',
				}),
			);

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			await registry.loadFromDirectory(tempDir);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"failed_to_load_tool_file"'),
			);

			consoleSpy.mockRestore();
		});

		it('should handle non-existent directory gracefully', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			await registry.loadFromDirectory(join(tempDir, 'non-existent'));

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"failed_to_load_tools_directory"'),
			);

			consoleSpy.mockRestore();
		});
	});

	describe('Statistics and Monitoring', () => {
		it('should provide accurate statistics for mixed tools', () => {
			// Add versioned tools
			registry.registerTool({
				name: 'versioned1',
				version: '1.0.0',
				description: 'Versioned 1',
				inputSchema: { type: 'object' },
			});

			registry.registerTool({
				name: 'versioned1',
				version: '1.1.0',
				description: 'Versioned 1.1',
				inputSchema: { type: 'object' },
			});

			// Add unversioned tool
			registry.registerTool({
				name: 'unversioned1',
				description: 'Unversioned 1',
				inputSchema: { type: 'object' },
			});

			const stats = registry.getStats();
			expect(stats.totalTools).toBe(2);
			expect(stats.totalVersions).toBe(2);
			expect(stats.toolsWithVersions).toBe(1);
			expect(stats.unversionedTools).toBe(1);
		});

		it('should handle empty registry', () => {
			const stats = registry.getStats();
			expect(stats.totalTools).toBe(0);
			expect(stats.totalVersions).toBe(0);
			expect(stats.toolsWithVersions).toBe(0);
			expect(stats.unversionedTools).toBe(0);
		});
	});

	describe('Tool Listing', () => {
		it('should list all registered tools', () => {
			registry.registerTool({
				name: 'tool1',
				version: '1.0.0',
				description: 'Tool 1',
				inputSchema: { type: 'object' },
			});

			registry.registerTool({
				name: 'tool2',
				version: '1.0.0',
				description: 'Tool 2',
				inputSchema: { type: 'object' },
			});

			registry.registerTool({
				name: 'tool3',
				description: 'Tool 3 (unversioned)',
				inputSchema: { type: 'object' },
			});

			const tools = registry.listTools();
			expect(tools).toHaveLength(3);

			const toolNames = tools.map((t) => t.name);
			expect(toolNames).toContain('tool1');
			expect(toolNames).toContain('tool2');
			expect(toolNames).toContain('tool3');
		});

		it('should return empty array when no tools registered', () => {
			const tools = registry.listTools();
			expect(tools).toEqual([]);
		});
	});

	describe('Error Handling and Edge Cases', () => {
		it('should handle malformed semantic versions', () => {
			const malformedVersions = ['1.0', 'v1.0.0', '1.0.0.0', '1.0.0-beta', '', 'not.a.version'];

			malformedVersions.forEach((version) => {
				const tool: ToolDescriptor = {
					name: 'test-tool',
					version,
					description: 'Test tool',
					inputSchema: { type: 'object' },
				};

				expect(() => registry.registerTool(tool)).toThrow(MCPToolVersionException);
			});
		});

		it('should handle pre-release versions correctly', () => {
			const tool: ToolDescriptor = {
				name: 'test-tool',
				version: '1.0.0-beta.1',
				description: 'Beta tool',
				inputSchema: { type: 'object' },
			};

			expect(() => registry.registerTool(tool)).not.toThrow();

			const resolved = registry.resolveTool('test-tool', '1.0.0-beta.1');
			expect(resolved?.version).toBe('1.0.0-beta.1');
		});

		it('should handle build metadata correctly', () => {
			const tool: ToolDescriptor = {
				name: 'test-tool',
				version: '1.0.0+build.1',
				description: 'Build tool',
				inputSchema: { type: 'object' },
			};

			expect(() => registry.registerTool(tool)).not.toThrow();

			const resolved = registry.resolveTool('test-tool', '1.0.0+build.1');
			expect(resolved?.version).toBe('1.0.0+build.1');
		});
	});

	describe('Factory Functions', () => {
		it('should create registry with server', () => {
			const customServer = new Server();
			const customRegistry = createVersionedToolRegistry(customServer);

			expect(customRegistry).toBeInstanceOf(VersionedToolRegistry);
		});
	});

	describe('Complex Constraint Scenarios', () => {
		beforeEach(() => {
			// Register a comprehensive set of versions
			const versions = ['1.0.0', '1.0.1', '1.1.0', '1.2.0', '2.0.0', '2.1.0', '3.0.0-beta.1'];

			versions.forEach((version) => {
				registry.registerTool({
					name: 'complex-tool',
					version,
					description: `Complex tool ${version}`,
					inputSchema: { type: 'object' },
				});
			});
		});

		it('should handle complex caret constraints', () => {
			const testCases: [VersionConstraint, string][] = [
				['^1.0.0', '1.2.0'], // Latest 1.x
				['^2.0.0', '2.1.0'], // Latest 2.x
				['^1.1.0', '1.2.0'], // Latest 1.1.x
				['^3.0.0-beta.1', '3.0.0-beta.1'], // Exact match for pre-release
			];

			testCases.forEach(([constraint, expectedVersion]) => {
				const tool = registry.resolveTool('complex-tool', constraint);
				expect(tool?.version).toBe(expectedVersion);
			});
		});

		it('should handle complex tilde constraints', () => {
			const testCases: [VersionConstraint, string][] = [
				['~1.0.0', '1.0.1'], // Latest 1.0.x
				['~1.1.0', '1.1.0'], // Exact match (no 1.1.x)
				['~2.1.0', '2.1.0'], // Exact match (no 2.1.x)
				['~1.2.0', '1.2.0'], // Exact match (no 1.2.x)
			];

			testCases.forEach(([constraint, expectedVersion]) => {
				const tool = registry.resolveTool('complex-tool', constraint);
				expect(tool?.version).toBe(expectedVersion);
			});
		});

		it('should handle range constraints', () => {
			const testCases: [VersionConstraint, string][] = [
				['>=1.0.0 <2.0.0', '1.2.0'], // Latest in range
				['>=2.0.0 <=2.1.0', '2.1.0'], // Latest in range
				['>1.0.0 <2.0.0', '1.2.0'], // Latest in exclusive range
				['1.0.0 - 2.0.0', '2.0.0'], // Inclusive range
			];

			testCases.forEach(([constraint, expectedVersion]) => {
				const tool = registry.resolveTool('complex-tool', constraint);
				expect(tool?.version).toBe(expectedVersion);
			});
		});
	});
});
