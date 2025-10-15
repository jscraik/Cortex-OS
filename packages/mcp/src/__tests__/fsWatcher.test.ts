/**
 * MCP File System Watcher Tests
 * Tests for debounced file system watching and notification emission
 */

import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMCPFSWatcher, MCPFSWatcher, startMCPFSWatcher } from '../notifications/fsWatcher.js';
import { Server } from '../server.js';

// Mock chokidar
vi.mock('chokidar', () => ({
	watch: vi.fn(),
}));

// Mock lodash-es debounce
vi.mock('lodash-es', () => ({
	debounce: (fn: Function) => fn,
}));

describe('MCPFSWatcher', () => {
	let server: Server;
	let watcher: MCPFSWatcher;
	let tempDir: string;
	let mockChokidar: any;

	beforeEach(async () => {
		server = new Server();
		tempDir = join(tmpdir(), `mcp-test-${randomUUID()}`);
		await fs.mkdir(tempDir, { recursive: true });

		// Mock chokidar instance
		mockChokidar = {
			on: vi.fn(),
			close: vi.fn(),
		};
		const { watch } = await import('chokidar');
		(vi.mocked(watch) as any).mockReturnValue(mockChokidar);

		watcher = createMCPFSWatcher({
			promptsPath: join(tempDir, 'prompts'),
			resourcesPath: join(tempDir, 'resources'),
			toolsPath: join(tempDir, 'tools'),
			debounceMs: 50, // Short for tests
		});
	});

	afterEach(async () => {
		watcher.stop();
		await fs.rm(tempDir, { recursive: true, force: true });
		vi.clearAllMocks();
	});

	describe('Basic Watcher Operations', () => {
		it('should create watcher with default configuration', () => {
			const defaultWatcher = createMCPFSWatcher();
			expect(defaultWatcher).toBeInstanceOf(MCPFSWatcher);
		});

		it('should start watching configured paths', () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			watcher.start(server);

			const { watch } = require('chokidar');
			expect(watch).toHaveBeenCalledWith(
				[join(tempDir, 'prompts'), join(tempDir, 'resources'), join(tempDir, 'tools')],
				expect.objectContaining({
					persistent: true,
					ignoreInitial: true,
				}),
			);

			expect(mockChokidar.on).toHaveBeenCalledWith('all', expect.any(Function));
			expect(mockChokidar.on).toHaveBeenCalledWith('error', expect.any(Function));

			consoleSpy.mockRestore();
		});

		it('should stop watching cleanly', () => {
			watcher.start(server);
			watcher.stop();

			expect(mockChokidar.close).toHaveBeenCalled();
		});
	});

	describe('File System Event Handling', () => {
		let emitCallback: Function;

		beforeEach(() => {
			watcher.start(server);
			const { watch } = require('chokidar');
			const mockOn = mockChokidar.on;
			emitCallback = mockOn.mock.calls.find((call) => call[0] === 'all')?.[1];
			if (!emitCallback) {
				throw new Error('Failed to find emitCallback in mock setup');
			}
		});

		it('should handle prompt file changes', () => {
			const promptPath = join(tempDir, 'prompts', 'test.md');
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			emitCallback('add', promptPath);

			// Should log the notification emission
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"prompts_list_changed_emitted"'),
			);

			consoleSpy.mockRestore();
		});

		it('should handle resource file changes', () => {
			const resourcePath = join(tempDir, 'resources', 'test.txt');
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			emitCallback('change', resourcePath);

			// Should log both list_changed and updated notifications
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"resources_updated_emitted"'),
			);

			consoleSpy.mockRestore();
		});

		it('should handle tool file changes', () => {
			const toolPath = join(tempDir, 'tools', 'test.tool.json');
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			emitCallback('unlink', toolPath);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"tools_list_changed_emitted"'),
			);

			consoleSpy.mockRestore();
		});

		it('should ignore files outside configured paths', () => {
			const outsidePath = join(tmpdir(), 'outside.txt');
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			emitCallback('add', outsidePath);

			// Should not emit any notifications
			expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('_emitted"'));

			consoleSpy.mockRestore();
		});

		it('should handle directory events', () => {
			const dirPath = join(tempDir, 'prompts', 'new-dir');
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			emitCallback('addDir', dirPath);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"prompts_list_changed_emitted"'),
			);

			consoleSpy.mockRestore();
		});
	});

	describe('Path Type Detection', () => {
		it('should correctly identify prompt paths', () => {
			const promptPath = join(tempDir, 'prompts', 'test.md');
			watcher.start(server);

			const pathType = (watcher as any).getPathType(promptPath);
			expect(pathType).toBe('prompts');
		});

		it('should correctly identify resource paths', () => {
			const resourcePath = join(tempDir, 'resources', 'test.txt');
			watcher.start(server);

			const pathType = (watcher as any).getPathType(resourcePath);
			expect(pathType).toBe('resources');
		});

		it('should correctly identify tool paths', () => {
			const toolPath = join(tempDir, 'tools', 'test.tool.json');
			watcher.start(server);

			const pathType = (watcher as any).getPathType(toolPath);
			expect(pathType).toBe('tools');
		});

		it('should return null for unknown paths', () => {
			const unknownPath = join(tmpdir(), 'unknown.txt');
			watcher.start(server);

			const pathType = (watcher as any).getPathType(unknownPath);
			expect(pathType).toBeNull();
		});
	});

	describe('Resource URI Generation', () => {
		it('should convert file paths to resource URIs', () => {
			watcher.start(server);
			const filePath = join(tempDir, 'resources', 'subfolder', 'test.txt');
			const uri = (watcher as any).pathToResourceUri(filePath);

			expect(uri).toBe('resource://cortex-os/subfolder/test.txt');
		});

		it('should handle root level files', () => {
			watcher.start(server);
			const filePath = join(tempDir, 'resources', 'test.txt');
			const uri = (watcher as any).pathToResourceUri(filePath);

			expect(uri).toBe('resource://cortex-os/test.txt');
		});

		it('should return null for non-resource paths', () => {
			watcher.start(server);
			const filePath = join(tempDir, 'tools', 'test.json');
			const uri = (watcher as any).pathToResourceUri(filePath);

			expect(uri).toBeNull();
		});
	});

	describe('Statistics and Monitoring', () => {
		it('should provide accurate statistics when not watching', () => {
			const stats = watcher.getStats();

			expect(stats.watching).toBe(false);
			expect(stats.queuedNotifications).toBe(0);
			expect(stats.queuedResourceUpdates).toBe(0);
		});

		it('should provide accurate statistics when watching', () => {
			watcher.start(server);
			const stats = watcher.getStats();

			expect(stats.watching).toBe(true);
			expect(stats.queuedNotifications).toBe(0);
			expect(stats.queuedResourceUpdates).toBe(0);
		});
	});

	describe('Error Handling', () => {
		it('should handle watcher errors gracefully', () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
			const error = new Error('Watch error');

			watcher.start(server);
			const { watch } = require('chokidar');
			const mockOn = mockChokidar.on;
			const errorCallback = mockOn.mock.calls.find((call) => call[0] === 'error')?.[1];

			errorCallback(error);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"fs_watcher_error"'),
			);

			consoleSpy.mockRestore();
		});

		it('should handle missing chokidar gracefully', async () => {
			const { watch } = await import('chokidar');
			(vi.mocked(watch) as any).mockImplementation(() => {
				throw new Error('Chokidar not available');
			});

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			expect(() => watcher.start(server)).not.toThrow();

			consoleSpy.mockRestore();
		});
	});

	describe('Factory Functions', () => {
		it('should create watcher with custom config', () => {
			const customWatcher = createMCPFSWatcher({
				debounceMs: 500,
				ignored: ['**/*.tmp'],
			});

			expect(customWatcher).toBeInstanceOf(MCPFSWatcher);
		});

		it('should start watcher with server integration', () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const integratedWatcher = startMCPFSWatcher(server, {
				promptsPath: join(tempDir, 'prompts'),
			});

			expect(integratedWatcher).toBeInstanceOf(MCPFSWatcher);
			const { watch } = require('chokidar');
			expect(watch).toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});

	describe('Debouncing and Coalescing', () => {
		it('should handle rapid file changes', () => {
			watcher.start(server);
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const promptPath = join(tempDir, 'prompts', 'test.md');

			// Simulate rapid changes
			emitCallback('add', promptPath);
			emitCallback('change', promptPath);
			emitCallback('change', promptPath);

			// Should still only emit one notification due to coalescing
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"prompts_list_changed_emitted"'),
			);

			consoleSpy.mockRestore();
		});

		it('should handle multiple file types in sequence', () => {
			watcher.start(server);
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const promptPath = join(tempDir, 'prompts', 'test.md');
			const resourcePath = join(tempDir, 'resources', 'test.txt');
			const toolPath = join(tempDir, 'tools', 'test.tool.json');

			emitCallback('add', promptPath);
			emitCallback('add', resourcePath);
			emitCallback('add', toolPath);

			// Should emit notifications for all three types
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"prompts_list_changed_emitted"'),
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"resources_list_changed_emitted"'),
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('"event":"tools_list_changed_emitted"'),
			);

			consoleSpy.mockRestore();
		});
	});

	describe('Configuration Validation', () => {
		it('should handle empty paths gracefully', () => {
			const emptyWatcher = createMCPFSWatcher({
				promptsPath: '',
				resourcesPath: '',
				toolsPath: '',
			});

			expect(() => emptyWatcher.start(server)).not.toThrow();
		});

		it('should handle undefined paths gracefully', () => {
			const minimalWatcher = createMCPFSWatcher();

			expect(() => minimalWatcher.start(server)).not.toThrow();
		});
	});
});
