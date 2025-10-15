/**
 * Workspace File System Tools for Cortex-OS MCP Integration
 * Delegates workspace management to WorkspaceManager for isolation and security controls
 */

import { z } from 'zod';
import {
	type WorkspaceFile,
	type WorkspaceIsolationLevel,
	WorkspaceManager,
	WorkspaceManagerError,
	type WorkspaceMetadata,
	type WorkspacePermissions,
	type WorkspaceSummary,
} from '../lib/workspace-manager.js';
import type { McpTool, ToolExecutionContext } from '../tools.js';
import { ToolExecutionError } from '../tools.js';

const workspaceManager = new WorkspaceManager();

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

	constructor(private readonly manager: WorkspaceManager = workspaceManager) {}

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
                        const permissions: WorkspacePermissions | undefined = input.permissions
                                ? { ...input.permissions }
                                : undefined;

                        const { metadata, path } = await this.manager.createWorkspace({
                                name: input.name,
                                description: input.description,
                                agentId: input.agentId,
                                sessionId: input.sessionId,
                                isolationLevel: input.isolationLevel,
                                permissions,
                        });

			console.log(`brAInwav Workspace: Created nO workspace ${metadata.id} at ${path}`);

			return {
				workspace: metadata,
				path,
				timestamp: new Date().toISOString(),
				brainwavMetadata: {
					createdBy: 'brAInwav',
					nOArchitecture: true,
				},
			};
		} catch (error) {
			mapWorkspaceManagerError(
				error,
				'brAInwav Workspace Create failed',
				'E_WORKSPACE_CREATE_FAILED',
			);
		}
	}
}

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

export class WorkspaceListTool implements McpTool<WorkspaceListInput, WorkspaceListResult> {
	readonly name = 'workspace-list';
	readonly description = 'Lists available workspaces for the current agent session';
	readonly inputSchema = WorkspaceListInputSchema;

	constructor(private readonly manager: WorkspaceManager = workspaceManager) {}

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
			const includeMetadata = input.includeMetadata ?? false;
			const workspaces = await this.manager.listWorkspaces({
				agentId: input.agentId,
				sessionId: input.sessionId,
				includeMetadata,
				maxResults: input.maxResults,
			});

			const formatted = workspaces.map((workspace) => ({
				id: workspace.id,
				name: workspace.name,
				path: workspace.path,
				lastAccessed: workspace.lastAccessed,
				metadata: includeMetadata ? workspace.metadata : undefined,
			}));

			console.log(`brAInwav Workspace: Listed ${formatted.length} nO workspaces`);

			return {
				workspaces: formatted,
				totalCount: formatted.length,
				timestamp: new Date().toISOString(),
				brainwavMetadata: {
					queriedBy: 'brAInwav',
					nOArchitecture: true,
				},
			};
		} catch (error) {
			mapWorkspaceManagerError(error, 'brAInwav Workspace List failed', 'E_WORKSPACE_LIST_FAILED');
		}
	}
}

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

	constructor(private readonly manager: WorkspaceManager = workspaceManager) {}

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
			const maxSize = input.maxSize ?? 1024 * 1024;

			const { metadata, content, file } = await this.manager.readFile(
				input.workspaceId,
				input.filePath,
				{
					encoding,
					maxSize,
				},
			);

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
			mapWorkspaceManagerError(error, 'brAInwav Workspace Read failed', 'E_WORKSPACE_READ_FAILED');
		}
	}
}

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

	constructor(private readonly manager: WorkspaceManager = workspaceManager) {}

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
			const createDirectories = input.createDirs ?? true;
			const overwrite = input.overwrite ?? true;

			const { metadata, file, created } = await this.manager.writeFile(
				input.workspaceId,
				input.filePath,
				input.content,
				{
					encoding,
					createDirectories,
					overwrite,
				},
			);

			console.log(
				`brAInwav Workspace: Wrote file ${input.filePath} to nO workspace ${input.workspaceId}`,
			);

			return {
				file,
				workspace: {
					id: metadata.id,
					name: metadata.name,
				},
				created,
				timestamp: new Date().toISOString(),
				brainwavMetadata: {
					writtenBy: 'brAInwav',
					nOArchitecture: true,
				},
			};
		} catch (error) {
			mapWorkspaceManagerError(
				error,
				'brAInwav Workspace Write failed',
				'E_WORKSPACE_WRITE_FAILED',
			);
		}
	}
}

function mapWorkspaceManagerError(
	error: unknown,
	fallbackMessage: string,
	fallbackCode: string,
): never {
	if (error instanceof WorkspaceManagerError) {
		throw new ToolExecutionError(error.message, { code: error.code, cause: error.cause });
	}

	const message = error instanceof Error ? error.message : String(error);
	throw new ToolExecutionError(`${fallbackMessage}: ${message}`, {
		code: fallbackCode,
		cause: error,
	});
}

export const workspaceCreateTool = new WorkspaceCreateTool();
export const workspaceListTool = new WorkspaceListTool();
export const workspaceReadTool = new WorkspaceReadTool();
export const workspaceWriteTool = new WorkspaceWriteTool();

export const workspaceTools = [
	workspaceCreateTool,
	workspaceListTool,
	workspaceReadTool,
	workspaceWriteTool,
] as const;

export {
	WorkspaceManager,
	WorkspaceManagerError,
	type WorkspaceFile,
	type WorkspaceIsolationLevel,
	type WorkspaceMetadata,
	type WorkspacePermissions,
	type WorkspaceSummary,
};
