/**
 * Workspace File System Tools for Cortex-OS MCP Integration
 * Implements persistent workspace capabilities following nO Master Agent Loop architecture
 * Maintains brAInwav branding and security controls
 */

import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import type { McpTool, ToolExecutionContext } from '../tools.js';
import { ToolExecutionError } from '../tools.js';

// ================================
// Workspace Management Types
// ================================

export interface WorkspaceMetadata {
	id: string;
	name: string;
	description: string;
	createdBy: 'brAInwav';
	createdAt: Date;
	lastAccessed: Date;
	agentId?: string;
	sessionId?: string;
	nOArchitecture: boolean;
	permissions: {
		read: boolean;
		write: boolean;
		execute: boolean;
	};
	isolationLevel: 'strict' | 'moderate' | 'relaxed';
}

export interface WorkspaceFile {
	path: string;
	name: string;
	size: number;
	mimeType?: string;
	lastModified: Date;
	permissions: string;
	content?: string;
}

// ================================
// Workspace Create Tool
// ================================

// brAInwav Schema: Simplified without unnecessary type gymnastics
const WorkspacePermissionsSchema = z.object({
	read: z.boolean(),
	write: z.boolean(),
	execute: z.boolean(),
});

const WorkspaceIsolationLevelSchema = z.enum(['strict', 'moderate', 'relaxed']);

const WorkspaceCreateInputSchema = z.object({
	name: z.string().min(1, 'workspace name is required'),
	description: z.string().optional(),
	agentId: z.string().optional(),
	sessionId: z.string().optional(),
	isolationLevel: WorkspaceIsolationLevelSchema.optional(),
	permissions: WorkspacePermissionsSchema.optional(),
});

export type WorkspaceCreateInput = z.infer<typeof WorkspaceCreateInputSchema>;

export interface WorkspaceCreateResult {
	workspace: WorkspaceMetadata;
	path: string;
	timestamp: string;
	brainwavMetadata: {
		createdBy: 'brAInwav';
		nOArchitecture: boolean;
	};
}

export class WorkspaceCreateTool implements McpTool<WorkspaceCreateInput, WorkspaceCreateResult> {
	readonly name = 'workspace-create';
	readonly description =
		'Creates a new isolated workspace for agent operations following nO architecture patterns';
	readonly inputSchema = WorkspaceCreateInputSchema;

	async execute(
		input: WorkspaceCreateInput,
		context?: ToolExecutionContext,
	): Promise<WorkspaceCreateResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('brAInwav Workspace Create: Tool execution aborted', {
				code: 'E_TOOL_ABORTED',
			});
		}

		try {
			// Generate workspace ID and path
			const workspaceId = `workspace-${Date.now()}-${randomUUID().slice(0, 8)}`;
			const workspacePath = this.getWorkspacePath(workspaceId);

			// Create workspace directory
			await mkdir(workspacePath, { recursive: true });

			const permissions = input.permissions ?? {
				read: true,
				write: true,
				execute: false,
			};

			const isolationLevel = input.isolationLevel ?? 'moderate';

			// Create workspace metadata
			const metadata: WorkspaceMetadata = {
				id: workspaceId,
				name: input.name,
				description: input.description || `brAInwav nO Workspace: ${input.name}`,
				createdBy: 'brAInwav',
				createdAt: new Date(),
				lastAccessed: new Date(),
				agentId: input.agentId,
				sessionId: input.sessionId,
				nOArchitecture: true,
				permissions,
				isolationLevel,
			};

			// Save metadata file
			const metadataPath = join(workspacePath, '.workspace-metadata.json');
			await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

			console.log(`brAInwav Workspace: Created nO workspace ${workspaceId} at ${workspacePath}`);

			return {
				workspace: metadata,
				path: workspacePath,
				timestamp: new Date().toISOString(),
				brainwavMetadata: {
					createdBy: 'brAInwav',
					nOArchitecture: true,
				},
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new ToolExecutionError(`brAInwav Workspace Create failed: ${message}`, {
				code: 'E_WORKSPACE_CREATE_FAILED',
				cause: error,
			});
		}
	}

	private getWorkspacePath(workspaceId: string): string {
		const baseDir = process.env.CORTEX_WORKSPACES_DIR || join(process.cwd(), '.cortex-workspaces');
		return join(baseDir, workspaceId);
	}
}

// ================================
// Workspace List Tool
// ================================

const WorkspaceListInputSchema = z.object({
	agentId: z.string().optional(),
	sessionId: z.string().optional(),
	includeMetadata: z.boolean().optional(),
	maxResults: z.number().int().positive().max(100).optional(),
});

export type WorkspaceListInput = z.infer<typeof WorkspaceListInputSchema>;

export interface WorkspaceListResult {
	workspaces: Array<{
		id: string;
		name: string;
		path: string;
		lastAccessed: Date;
		metadata?: WorkspaceMetadata;
	}>;
	totalCount: number;
	timestamp: string;
	brainwavMetadata: {
		queriedBy: 'brAInwav';
		nOArchitecture: boolean;
	};
}

// brAInwav Utility: Extract workspace loading logic
const loadWorkspaceDirectories = async (baseDir: string, maxResults: number) => {
	try {
		await stat(baseDir);
	} catch {
		return [];
	}

	const entries = await readdir(baseDir, { withFileTypes: true });
	return entries.filter((entry) => entry.isDirectory()).slice(0, maxResults);
};

// brAInwav Utility: Extract metadata parsing logic
const parseWorkspaceMetadata = async (workspacePath: string): Promise<WorkspaceMetadata | null> => {
	try {
		const metadataPath = join(workspacePath, '.workspace-metadata.json');
		const metadataContent = await readFile(metadataPath, 'utf8');
		const metadata = JSON.parse(metadataContent);

		// Convert string dates back to Date objects
		metadata.createdAt = new Date(metadata.createdAt);
		metadata.lastAccessed = new Date(metadata.lastAccessed);

		return metadata;
	} catch {
		return null;
	}
};

export class WorkspaceListTool implements McpTool<WorkspaceListInput, WorkspaceListResult> {
	readonly name = 'workspace-list';
	readonly description = 'Lists available workspaces for the current agent session';
	readonly inputSchema = WorkspaceListInputSchema;

	async execute(
		input: WorkspaceListInput,
		context?: ToolExecutionContext,
	): Promise<WorkspaceListResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('brAInwav Workspace List: Tool execution aborted', {
				code: 'E_TOOL_ABORTED',
			});
		}

		try {
			const baseDir =
				process.env.CORTEX_WORKSPACES_DIR || join(process.cwd(), '.cortex-workspaces');
			const maxResults = input.maxResults ?? 50;
			const includeMetadata = input.includeMetadata ?? false;

			const workspaceDirs = await loadWorkspaceDirectories(baseDir, maxResults);
			const workspaces = await this.processWorkspaceDirectories(
				workspaceDirs,
				baseDir,
				input,
				includeMetadata,
			);

			console.log(`brAInwav Workspace: Listed ${workspaces.length} nO workspaces`);

			const sortedWorkspaces = [...workspaces].sort(
				(a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime(),
			);

			return {
				workspaces: sortedWorkspaces,
				totalCount: workspaces.length,
				timestamp: new Date().toISOString(),
				brainwavMetadata: {
					queriedBy: 'brAInwav',
					nOArchitecture: true,
				},
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new ToolExecutionError(`brAInwav Workspace List failed: ${message}`, {
				code: 'E_WORKSPACE_LIST_FAILED',
				cause: error,
			});
		}
	}

	private async processWorkspaceDirectories(
		workspaceDirs: any[],
		baseDir: string,
		input: WorkspaceListInput,
		includeMetadata: boolean,
	) {
		const workspaces: Array<{
			id: string;
			name: string;
			path: string;
			lastAccessed: Date;
			metadata?: WorkspaceMetadata;
		}> = [];

		for (const dir of workspaceDirs) {
			const workspacePath = join(baseDir, dir.name);
			const metadata = await parseWorkspaceMetadata(workspacePath);

			if (!metadata) continue;

			// Filter by agent/session if specified
			if (input.agentId && metadata.agentId !== input.agentId) continue;
			if (input.sessionId && metadata.sessionId !== input.sessionId) continue;

			workspaces.push({
				id: metadata.id,
				name: metadata.name,
				path: workspacePath,
				lastAccessed: metadata.lastAccessed,
				metadata: includeMetadata ? metadata : undefined,
			});
		}

		return workspaces;
	}
}

// ================================
// Workspace Read Tool
// ================================

const WorkspaceReadInputSchema = z.object({
	workspaceId: z.string().min(1, 'workspace ID is required'),
	filePath: z.string().min(1, 'file path is required'),
	encoding: z.enum(['utf8', 'ascii', 'base64', 'hex']).optional(),
	maxSize: z
		.number()
		.int()
		.positive()
		.max(10 * 1024 * 1024)
		.optional(),
});

export type WorkspaceReadInput = z.infer<typeof WorkspaceReadInputSchema>;

export interface WorkspaceReadResult {
	content: string;
	file: WorkspaceFile;
	workspace: {
		id: string;
		name: string;
	};
	timestamp: string;
	brainwavMetadata: {
		accessedBy: 'brAInwav';
		nOArchitecture: boolean;
	};
}

export class WorkspaceReadTool implements McpTool<WorkspaceReadInput, WorkspaceReadResult> {
	readonly name = 'workspace-read';
	readonly description = 'Reads a file from a workspace with security controls';
	readonly inputSchema = WorkspaceReadInputSchema;

	async execute(
		input: WorkspaceReadInput,
		context?: ToolExecutionContext,
	): Promise<WorkspaceReadResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('brAInwav Workspace Read: Tool execution aborted', {
				code: 'E_TOOL_ABORTED',
			});
		}

		try {
			const encoding = input.encoding ?? 'utf8';
			const maxSize = input.maxSize ?? 1024 * 1024; // 1MB default

			const workspacePath = this.getWorkspacePath(input.workspaceId);
			const filePath = resolve(workspacePath, input.filePath);

			// Security check - ensure file is within workspace
			if (!filePath.startsWith(workspacePath)) {
				throw new ToolExecutionError(
					'brAInwav Workspace Read: Access denied - file outside workspace',
					{
						code: 'E_ACCESS_DENIED',
					},
				);
			}

			// Load and validate workspace metadata
			const metadata = await this.loadWorkspaceMetadata(workspacePath);
			if (!metadata.permissions.read) {
				throw new ToolExecutionError(
					'brAInwav Workspace Read: Access denied - no read permission',
					{
						code: 'E_ACCESS_DENIED',
					},
				);
			}

			// Read file stats
			const fileStats = await stat(filePath);
			if (!fileStats.isFile()) {
				throw new ToolExecutionError('brAInwav Workspace Read: Path is not a file', {
					code: 'E_NOT_A_FILE',
				});
			}

			if (fileStats.size > maxSize) {
				throw new ToolExecutionError('brAInwav Workspace Read: File exceeds maximum size', {
					code: 'E_FILE_TOO_LARGE',
				});
			}

			// Read file content
			const content = await readFile(filePath, encoding);

			// Update last accessed time
			metadata.lastAccessed = new Date();
			await this.saveWorkspaceMetadata(workspacePath, metadata);

			const file: WorkspaceFile = {
				path: input.filePath,
				name: input.filePath.split('/').pop() || input.filePath,
				size: fileStats.size,
				lastModified: fileStats.mtime,
				permissions: fileStats.mode.toString(8),
			};

			console.log(
				`brAInwav Workspace: Read file ${input.filePath} from nO workspace ${input.workspaceId}`,
			);

			return {
				content,
				file,
				workspace: {
					id: metadata.id,
					name: metadata.name,
				},
				timestamp: new Date().toISOString(),
				brainwavMetadata: {
					accessedBy: 'brAInwav',
					nOArchitecture: true,
				},
			};
		} catch (error) {
			if (error instanceof ToolExecutionError) throw error;
			const message = error instanceof Error ? error.message : String(error);
			throw new ToolExecutionError(`brAInwav Workspace Read failed: ${message}`, {
				code: 'E_WORKSPACE_READ_FAILED',
				cause: error,
			});
		}
	}

	private getWorkspacePath(workspaceId: string): string {
		const baseDir = process.env.CORTEX_WORKSPACES_DIR || join(process.cwd(), '.cortex-workspaces');
		return join(baseDir, workspaceId);
	}

	private loadWorkspaceMetadata = async (workspacePath: string): Promise<WorkspaceMetadata> => {
		const metadataPath = join(workspacePath, '.workspace-metadata.json');
		const metadataContent = await readFile(metadataPath, 'utf8');
		const metadata = JSON.parse(metadataContent);

		// Convert string dates back to Date objects
		metadata.createdAt = new Date(metadata.createdAt);
		metadata.lastAccessed = new Date(metadata.lastAccessed);

		return metadata;
	};

	private saveWorkspaceMetadata = async (
		workspacePath: string,
		metadata: WorkspaceMetadata,
	): Promise<void> => {
		const metadataPath = join(workspacePath, '.workspace-metadata.json');
		await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
	};
}

// ================================
// Workspace Write Tool
// ================================

const WorkspaceWriteInputSchema = z.object({
	workspaceId: z.string().min(1, 'workspace ID is required'),
	filePath: z.string().min(1, 'file path is required'),
	content: z.string(),
	encoding: z.enum(['utf8', 'ascii', 'base64', 'hex']).optional(),
	createDirs: z.boolean().optional(),
	overwrite: z.boolean().optional(),
});

export type WorkspaceWriteInput = z.infer<typeof WorkspaceWriteInputSchema>;

export interface WorkspaceWriteResult {
	file: WorkspaceFile;
	workspace: {
		id: string;
		name: string;
	};
	created: boolean;
	timestamp: string;
	brainwavMetadata: {
		writtenBy: 'brAInwav';
		nOArchitecture: boolean;
	};
}

export class WorkspaceWriteTool implements McpTool<WorkspaceWriteInput, WorkspaceWriteResult> {
	readonly name = 'workspace-write';
	readonly description = 'Writes a file to a workspace with security controls';
	readonly inputSchema = WorkspaceWriteInputSchema;

	async execute(
		input: WorkspaceWriteInput,
		context?: ToolExecutionContext,
	): Promise<WorkspaceWriteResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('brAInwav Workspace Write: Tool execution aborted', {
				code: 'E_TOOL_ABORTED',
			});
		}

		try {
			const encoding = input.encoding ?? 'utf8';
			const createDirs = input.createDirs ?? true;
			const overwrite = input.overwrite ?? true;

			const workspacePath = this.getWorkspacePath(input.workspaceId);
			const filePath = resolve(workspacePath, input.filePath);

			// Security check - ensure file is within workspace
			if (!filePath.startsWith(workspacePath)) {
				throw new ToolExecutionError(
					'brAInwav Workspace Write: Access denied - file outside workspace',
					{
						code: 'E_ACCESS_DENIED',
					},
				);
			}

			// Load and validate workspace metadata
			const metadata = await this.loadWorkspaceMetadata(workspacePath);
			if (!metadata.permissions.write) {
				throw new ToolExecutionError(
					'brAInwav Workspace Write: Access denied - no write permission',
					{
						code: 'E_ACCESS_DENIED',
					},
				);
			}

			// Check if file exists
			let fileExists = false;
			try {
				await stat(filePath);
				fileExists = true;
			} catch {
				// File doesn't exist
			}

			if (fileExists && !overwrite) {
				throw new ToolExecutionError(
					'brAInwav Workspace Write: File exists and overwrite is disabled',
					{
						code: 'E_FILE_EXISTS',
					},
				);
			}

			// Create directories if needed
			if (createDirs) {
				const dir = dirname(filePath);
				await mkdir(dir, { recursive: true });
			}

			// Write file
			await writeFile(filePath, input.content, encoding);

			// Get file stats
			const fileStats = await stat(filePath);

			// Update last accessed time
			metadata.lastAccessed = new Date();
			await this.saveWorkspaceMetadata(workspacePath, metadata);

			const file: WorkspaceFile = {
				path: input.filePath,
				name: input.filePath.split('/').pop() || input.filePath,
				size: fileStats.size,
				lastModified: fileStats.mtime,
				permissions: fileStats.mode.toString(8),
			};

			console.log(
				`brAInwav Workspace: Wrote file ${input.filePath} to nO workspace ${input.workspaceId}`,
			);

			return {
				file,
				workspace: {
					id: metadata.id,
					name: metadata.name,
				},
				created: !fileExists,
				timestamp: new Date().toISOString(),
				brainwavMetadata: {
					writtenBy: 'brAInwav',
					nOArchitecture: true,
				},
			};
		} catch (error) {
			if (error instanceof ToolExecutionError) throw error;
			const message = error instanceof Error ? error.message : String(error);
			throw new ToolExecutionError(`brAInwav Workspace Write failed: ${message}`, {
				code: 'E_WORKSPACE_WRITE_FAILED',
				cause: error,
			});
		}
	}

	private getWorkspacePath(workspaceId: string): string {
		const baseDir = process.env.CORTEX_WORKSPACES_DIR || join(process.cwd(), '.cortex-workspaces');
		return join(baseDir, workspaceId);
	}

	private loadWorkspaceMetadata = async (workspacePath: string): Promise<WorkspaceMetadata> => {
		const metadataPath = join(workspacePath, '.workspace-metadata.json');
		const metadataContent = await readFile(metadataPath, 'utf8');
		const metadata = JSON.parse(metadataContent);

		// Convert string dates back to Date objects
		metadata.createdAt = new Date(metadata.createdAt);
		metadata.lastAccessed = new Date(metadata.lastAccessed);

		return metadata;
	};

	private saveWorkspaceMetadata = async (
		workspacePath: string,
		metadata: WorkspaceMetadata,
	): Promise<void> => {
		const metadataPath = join(workspacePath, '.workspace-metadata.json');
		await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
	};
}

// ================================
// Tool Instances
// ================================

export const workspaceCreateTool = new WorkspaceCreateTool();
export const workspaceListTool = new WorkspaceListTool();
export const workspaceReadTool = new WorkspaceReadTool();
export const workspaceWriteTool = new WorkspaceWriteTool();

// Export all workspace tools
export const workspaceTools = [
	workspaceCreateTool,
	workspaceListTool,
	workspaceReadTool,
	workspaceWriteTool,
] as const;
