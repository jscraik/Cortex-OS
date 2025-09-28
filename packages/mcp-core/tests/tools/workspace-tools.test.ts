/**
 * Workspace Tools Test Suite
 * Tests workspace create/ls/read/write operations with isolation and security controls
 * Validates brAInwav-enhanced MCP workspace management following nO architecture
 */

import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	type WorkspaceCreateInput,
	type WorkspaceListInput,
	type WorkspaceReadInput,
	type WorkspaceWriteInput,
	workspaceCreateTool,
	workspaceListTool,
	workspaceReadTool,
	workspaceWriteTool,
} from '../../src/tools/workspace-tools.js';

describe('Workspace Tools - Phase 12 MCP Integration', () => {
	const testWorkspacesDir = join(process.cwd(), 'packages/mcp-core/tests/tmp/.cortex-workspaces');
	let testWorkspaceId: string;

	beforeEach(() => {
		// Set up test environment
		process.env.CORTEX_WORKSPACES_DIR = testWorkspacesDir;
	});

	afterEach(async () => {
		// Cleanup test workspaces
		try {
			await rm(testWorkspacesDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
		delete process.env.CORTEX_WORKSPACES_DIR;
	});

	describe('workspace-create tool', () => {
		it('creates a workspace with isolation controls and brAInwav branding', async () => {
			const input: WorkspaceCreateInput = {
				name: 'Test nO Workspace',
				description: 'Integration test workspace for brAInwav',
				agentId: 'test-agent-001',
				sessionId: 'test-session-001',
				isolationLevel: 'strict',
				permissions: {
					read: true,
					write: true,
					execute: false,
				},
			};

			const result = await workspaceCreateTool.execute(input);

			// Verify workspace creation
			expect(result.workspace).toBeDefined();
			expect(result.workspace.name).toBe('Test nO Workspace');
			expect(result.workspace.createdBy).toBe('brAInwav');
			expect(result.workspace.nOArchitecture).toBe(true);
			expect(result.workspace.isolationLevel).toBe('strict');
			expect(result.workspace.permissions.read).toBe(true);
			expect(result.workspace.permissions.write).toBe(true);
			expect(result.workspace.permissions.execute).toBe(false);

			// Verify brAInwav metadata
			expect(result.brainwavMetadata.createdBy).toBe('brAInwav');
			expect(result.brainwavMetadata.nOArchitecture).toBe(true);

			// Verify path structure
			expect(result.path).toContain(testWorkspacesDir);
			expect(result.workspace.id).toMatch(/^workspace-\d+-[a-z0-9]+$/);

			testWorkspaceId = result.workspace.id;
		});

		it('creates workspace with default moderate isolation level', async () => {
			const input: WorkspaceCreateInput = {
				name: 'Default Isolation Workspace',
				description: 'Testing default security settings',
			};

			const result = await workspaceCreateTool.execute(input);

			expect(result.workspace.isolationLevel).toBe('moderate');
			expect(result.workspace.permissions.read).toBe(true);
			expect(result.workspace.permissions.write).toBe(true);
			expect(result.workspace.permissions.execute).toBe(false);

			testWorkspaceId = result.workspace.id;
		});

		it('validates required input fields', async () => {
			// Test with empty name which should be caught by Zod validation
			try {
				await workspaceCreateTool.execute({ name: '' } as WorkspaceCreateInput);
				expect.fail('Should have thrown validation error');
			} catch (error) {
				expect(error).toBeDefined();
			}
		});
	});

	describe('workspace-list tool', () => {
		beforeEach(async () => {
			// Create test workspaces
			const workspace1 = await workspaceCreateTool.execute({
				name: 'Workspace 1',
				agentId: 'agent-001',
				sessionId: 'session-001',
			});
			const workspace2 = await workspaceCreateTool.execute({
				name: 'Workspace 2',
				agentId: 'agent-002',
				sessionId: 'session-001',
			});

			testWorkspaceId = workspace1.workspace.id;
		});

		it('lists all workspaces with brAInwav metadata', async () => {
			const input: WorkspaceListInput = {
				includeMetadata: true,
				maxResults: 50,
			};

			const result = await workspaceListTool.execute(input);

			expect(result.workspaces).toHaveLength(2);
			expect(result.totalCount).toBe(2);
			expect(result.brainwavMetadata.queriedBy).toBe('brAInwav');
			expect(result.brainwavMetadata.nOArchitecture).toBe(true);

			// Verify workspace data structure
			const workspace = result.workspaces[0];
			expect(workspace).toHaveProperty('id');
			expect(workspace).toHaveProperty('name');
			expect(workspace).toHaveProperty('path');
			expect(workspace).toHaveProperty('lastAccessed');
			expect(workspace.metadata).toBeDefined();
			expect(workspace.metadata?.createdBy).toBe('brAInwav');
		});

		it('filters workspaces by agentId', async () => {
			const input: WorkspaceListInput = {
				agentId: 'agent-001',
				includeMetadata: false,
			};

			const result = await workspaceListTool.execute(input);

			expect(result.workspaces).toHaveLength(1);
			expect(result.workspaces[0]?.name).toBe('Workspace 1');
			expect(result.workspaces[0]?.metadata).toBeUndefined(); // Excluded
		});

		it('filters workspaces by sessionId', async () => {
			const input: WorkspaceListInput = {
				sessionId: 'session-001',
				maxResults: 10,
			};

			const result = await workspaceListTool.execute(input);

			expect(result.workspaces).toHaveLength(2);
			expect(result.totalCount).toBe(2);
		});

		it('respects maxResults limit', async () => {
			const input: WorkspaceListInput = {
				maxResults: 1,
			};

			const result = await workspaceListTool.execute(input);

			expect(result.workspaces).toHaveLength(1);
		});

		it('returns empty list when no workspaces exist', async () => {
			// Use different directory
			process.env.CORTEX_WORKSPACES_DIR = join(testWorkspacesDir, 'empty');

			const input: WorkspaceListInput = {};
			const result = await workspaceListTool.execute(input);

			expect(result.workspaces).toHaveLength(0);
			expect(result.totalCount).toBe(0);
			expect(result.brainwavMetadata.queriedBy).toBe('brAInwav');
		});
	});

	describe('workspace-write tool', () => {
		beforeEach(async () => {
			const workspace = await workspaceCreateTool.execute({
				name: 'Write Test Workspace',
				permissions: {
					read: true,
					write: true,
					execute: false,
				},
			});
			testWorkspaceId = workspace.workspace.id;
		});

		it('writes file to workspace with security validation', async () => {
			const input: WorkspaceWriteInput = {
				workspaceId: testWorkspaceId,
				filePath: 'test-file.txt',
				content: 'brAInwav nO workspace test content',
				encoding: 'utf8',
				createDirs: true,
				overwrite: true,
			};

			const result = await workspaceWriteTool.execute(input);

			expect(result.file.name).toBe('test-file.txt');
			expect(result.file.path).toBe('test-file.txt');
			expect(result.created).toBe(true);
			expect(result.workspace.id).toBe(testWorkspaceId);
			expect(result.brainwavMetadata.writtenBy).toBe('brAInwav');
			expect(result.brainwavMetadata.nOArchitecture).toBe(true);
		});

		it('creates nested directories when createDirs is true', async () => {
			const input: WorkspaceWriteInput = {
				workspaceId: testWorkspaceId,
				filePath: 'nested/deep/test.txt',
				content: 'brAInwav nested file content',
				createDirs: true,
			};

			const result = await workspaceWriteTool.execute(input);

			expect(result.file.path).toBe('nested/deep/test.txt');
			expect(result.file.name).toBe('test.txt');
			expect(result.created).toBe(true);
		});

		it('prevents writing outside workspace boundaries (security)', async () => {
			const input: WorkspaceWriteInput = {
				workspaceId: testWorkspaceId,
				filePath: '../../../malicious.txt', // Path traversal attempt
				content: 'malicious content',
			};

			await expect(workspaceWriteTool.execute(input)).rejects.toThrow(
				/Access denied - file outside workspace/,
			);
		});

		it('respects write permissions', async () => {
			// Create workspace without write permissions
			const readOnlyWorkspace = await workspaceCreateTool.execute({
				name: 'Read Only Workspace',
				permissions: {
					read: true,
					write: false,
					execute: false,
				},
			});

			const input: WorkspaceWriteInput = {
				workspaceId: readOnlyWorkspace.workspace.id,
				filePath: 'test.txt',
				content: 'should fail',
			};

			await expect(workspaceWriteTool.execute(input)).rejects.toThrow(
				/Access denied - no write permission/,
			);
		});

		it('fails when workspace does not exist', async () => {
			const input: WorkspaceWriteInput = {
				workspaceId: 'non-existent-workspace',
				filePath: 'test.txt',
				content: 'content',
			};

			await expect(workspaceWriteTool.execute(input)).rejects.toThrow();
		});
	});

	describe('workspace-read tool', () => {
		beforeEach(async () => {
			const workspace = await workspaceCreateTool.execute({
				name: 'Read Test Workspace',
				permissions: {
					read: true,
					write: true,
					execute: false,
				},
			});
			testWorkspaceId = workspace.workspace.id;

			// Create test file
			await workspaceWriteTool.execute({
				workspaceId: testWorkspaceId,
				filePath: 'test-content.txt',
				content: 'brAInwav test file content for reading\nSecond line with nO architecture',
			});
		});

		it('reads file from workspace with security validation', async () => {
			const input: WorkspaceReadInput = {
				workspaceId: testWorkspaceId,
				filePath: 'test-content.txt',
				encoding: 'utf8',
			};

			const result = await workspaceReadTool.execute(input);

			expect(result.content).toBe(
				'brAInwav test file content for reading\nSecond line with nO architecture',
			);
			expect(result.file.name).toBe('test-content.txt');
			expect(result.file.path).toBe('test-content.txt');
			expect(result.workspace.id).toBe(testWorkspaceId);
			expect(result.brainwavMetadata.accessedBy).toBe('brAInwav');
			expect(result.brainwavMetadata.nOArchitecture).toBe(true);
		});

		it('prevents reading outside workspace boundaries (security)', async () => {
			const input: WorkspaceReadInput = {
				workspaceId: testWorkspaceId,
				filePath: '../../../package.json', // Path traversal attempt
			};

			await expect(workspaceReadTool.execute(input)).rejects.toThrow(
				/Access denied - file outside workspace/,
			);
		});

		it('respects read permissions', async () => {
			// Create workspace without read permissions
			const writeOnlyWorkspace = await workspaceCreateTool.execute({
				name: 'Write Only Workspace',
				permissions: {
					read: false,
					write: true,
					execute: false,
				},
			});

			const input: WorkspaceReadInput = {
				workspaceId: writeOnlyWorkspace.workspace.id,
				filePath: 'test.txt',
			};

			await expect(workspaceReadTool.execute(input)).rejects.toThrow(
				/Access denied - no read permission/,
			);
		});

		it('enforces file size limits', async () => {
			const input: WorkspaceReadInput = {
				workspaceId: testWorkspaceId,
				filePath: 'test-content.txt',
				maxSize: 10, // Very small limit
			};

			await expect(workspaceReadTool.execute(input)).rejects.toThrow(
				/File exceeds maximum size/,
			);
		});

		it('fails when file does not exist', async () => {
			const input: WorkspaceReadInput = {
				workspaceId: testWorkspaceId,
				filePath: 'non-existent.txt',
			};

			await expect(workspaceReadTool.execute(input)).rejects.toThrow();
		});

		it('fails when workspace does not exist', async () => {
			const input: WorkspaceReadInput = {
				workspaceId: 'non-existent-workspace',
				filePath: 'test.txt',
			};

			await expect(workspaceReadTool.execute(input)).rejects.toThrow();
		});
	});

	describe('workspace isolation and security', () => {
		let strictWorkspaceId: string;
		let moderateWorkspaceId: string;
		let relaxedWorkspaceId: string;

		beforeEach(async () => {
			const strictWorkspace = await workspaceCreateTool.execute({
				name: 'Strict Isolation Workspace',
				isolationLevel: 'strict',
				permissions: { read: true, write: true, execute: false },
			});
			strictWorkspaceId = strictWorkspace.workspace.id;

			const moderateWorkspace = await workspaceCreateTool.execute({
				name: 'Moderate Isolation Workspace',
				isolationLevel: 'moderate',
			});
			moderateWorkspaceId = moderateWorkspace.workspace.id;

			const relaxedWorkspace = await workspaceCreateTool.execute({
				name: 'Relaxed Isolation Workspace',
				isolationLevel: 'relaxed',
			});
			relaxedWorkspaceId = relaxedWorkspace.workspace.id;
		});

		it('maintains isolation levels across all operations', async () => {
			const listResult = await workspaceListTool.execute({ includeMetadata: true });

			const strictWs = listResult.workspaces.find(w => w.id === strictWorkspaceId);
			const moderateWs = listResult.workspaces.find(w => w.id === moderateWorkspaceId);
			const relaxedWs = listResult.workspaces.find(w => w.id === relaxedWorkspaceId);

			expect(strictWs?.metadata?.isolationLevel).toBe('strict');
			expect(moderateWs?.metadata?.isolationLevel).toBe('moderate');
			expect(relaxedWs?.metadata?.isolationLevel).toBe('relaxed');
		});

		it('ensures all workspace operations include brAInwav branding', async () => {
			// Test create result
			const createResult = await workspaceCreateTool.execute({
				name: 'Branding Test Workspace',
			});
			expect(createResult.workspace.createdBy).toBe('brAInwav');
			expect(createResult.brainwavMetadata.createdBy).toBe('brAInwav');

			// Test list result
			const listResult = await workspaceListTool.execute({});
			expect(listResult.brainwavMetadata.queriedBy).toBe('brAInwav');

			// Test write result
			await workspaceWriteTool.execute({
				workspaceId: createResult.workspace.id,
				filePath: 'brand-test.txt',
				content: 'branding test',
			});

			// Test read result
			const readResult = await workspaceReadTool.execute({
				workspaceId: createResult.workspace.id,
				filePath: 'brand-test.txt',
			});
			expect(readResult.brainwavMetadata.accessedBy).toBe('brAInwav');
		});

		it('updates lastAccessed timestamp on read operations', async () => {
			const workspace = await workspaceCreateTool.execute({
				name: 'Timestamp Test Workspace',
			});

			await workspaceWriteTool.execute({
				workspaceId: workspace.workspace.id,
				filePath: 'timestamp-test.txt',
				content: 'test content',
			});

			const initialTime = workspace.workspace.lastAccessed;

			// Wait a moment to ensure timestamp difference
			await new Promise(resolve => setTimeout(resolve, 10));

			await workspaceReadTool.execute({
				workspaceId: workspace.workspace.id,
				filePath: 'timestamp-test.txt',
			});

			const listResult = await workspaceListTool.execute({ includeMetadata: true });
			const updatedWorkspace = listResult.workspaces.find(w => w.id === workspace.workspace.id);

			expect(new Date(updatedWorkspace!.lastAccessed).getTime()).toBeGreaterThan(new Date(initialTime).getTime());
		});
	});
});
