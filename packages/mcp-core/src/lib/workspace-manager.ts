import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

export type WorkspaceIsolationLevel = 'strict' | 'moderate' | 'relaxed';

export interface WorkspacePermissions {
	readonly read: boolean;
	readonly write: boolean;
	readonly execute: boolean;
}

export interface WorkspaceMetadata {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly createdBy: 'brAInwav';
	readonly createdAt: Date;
	readonly lastAccessed: Date;
	readonly agentId?: string;
	readonly sessionId?: string;
	readonly nOArchitecture: boolean;
	readonly permissions: WorkspacePermissions;
	readonly isolationLevel: WorkspaceIsolationLevel;
}

export interface WorkspaceFile {
	readonly path: string;
	readonly name: string;
	readonly size: number;
	readonly mimeType?: string;
	readonly lastModified: Date;
	readonly permissions: string;
	readonly content?: string;
}

export interface WorkspaceSummary {
	readonly id: string;
	readonly name: string;
	readonly path: string;
	readonly lastAccessed: Date;
	readonly metadata?: WorkspaceMetadata;
}

export interface CreateWorkspaceOptions {
	readonly name: string;
	readonly description?: string;
	readonly agentId?: string;
	readonly sessionId?: string;
	readonly isolationLevel?: WorkspaceIsolationLevel;
	readonly permissions?: WorkspacePermissions;
}

export interface ListWorkspaceOptions {
	readonly agentId?: string;
	readonly sessionId?: string;
	readonly includeMetadata?: boolean;
	readonly maxResults?: number;
}

export interface ReadWorkspaceFileOptions {
	readonly encoding?: BufferEncoding;
	readonly maxSize?: number;
}

export interface WriteWorkspaceFileOptions {
	readonly encoding?: BufferEncoding;
	readonly overwrite?: boolean;
	readonly createDirectories?: boolean;
}

export interface WorkspaceManagerOptions {
	readonly baseDirectory?: string;
	readonly defaultPermissions?: WorkspacePermissions;
	readonly defaultIsolationLevel?: WorkspaceIsolationLevel;
}

export interface WorkspaceCreationResult {
	readonly metadata: WorkspaceMetadata;
	readonly path: string;
}

export interface WorkspaceReadResult {
	readonly metadata: WorkspaceMetadata;
	readonly file: WorkspaceFile;
	readonly content: string;
}

export interface WorkspaceWriteResult {
	readonly metadata: WorkspaceMetadata;
	readonly file: WorkspaceFile;
	readonly created: boolean;
}

export class WorkspaceManagerError extends Error {
	readonly code: string;
	declare readonly cause?: unknown;

	constructor(message: string, code: string, cause?: unknown) {
		super(message);
		this.name = 'WorkspaceManagerError';
		this.code = code;
		if (cause !== undefined) {
			(this as { cause?: unknown }).cause = cause;
		}
	}
}

export class WorkspaceManager {
	private readonly configuredBaseDir?: string;
	private readonly defaultPermissions: WorkspacePermissions;
	private readonly defaultIsolationLevel: WorkspaceIsolationLevel;

	constructor(options: WorkspaceManagerOptions = {}) {
		this.configuredBaseDir = options.baseDirectory;
		this.defaultPermissions =
			options.defaultPermissions ?? ({ read: true, write: true, execute: false } as const);
		this.defaultIsolationLevel = options.defaultIsolationLevel ?? 'moderate';
	}

	async createWorkspace(options: CreateWorkspaceOptions): Promise<WorkspaceCreationResult> {
		const baseDir = await this.ensureBaseDirectory();
		const workspaceId = `workspace-${Date.now()}-${randomUUID().slice(0, 8)}`;
		const workspacePath = join(baseDir, workspaceId);

		await mkdir(workspacePath, { recursive: true });

		const metadata: WorkspaceMetadata = {
			id: workspaceId,
			name: options.name,
			description: options.description ?? `brAInwav nO Workspace: ${options.name}`,
			createdBy: 'brAInwav',
			createdAt: new Date(),
			lastAccessed: new Date(),
			agentId: options.agentId,
			sessionId: options.sessionId,
			nOArchitecture: true,
			permissions: options.permissions ?? this.defaultPermissions,
			isolationLevel: options.isolationLevel ?? this.defaultIsolationLevel,
		};

		await this.saveWorkspaceMetadata(workspacePath, metadata);

		return {
			metadata,
			path: workspacePath,
		};
	}

	async listWorkspaces(options: ListWorkspaceOptions = {}): Promise<WorkspaceSummary[]> {
		const baseDir = this.resolveBaseDirectory();

		try {
			await stat(baseDir);
		} catch {
			return [];
		}

		const maxResults = options.maxResults ?? 50;
		const entries = await readdir(baseDir, { withFileTypes: true });
		const summaries: WorkspaceSummary[] = [];

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;

			const workspacePath = join(baseDir, entry.name);
			const metadata = await this.loadWorkspaceMetadata(workspacePath);
			if (!metadata) continue;

			if (options.agentId && metadata.agentId !== options.agentId) continue;
			if (options.sessionId && metadata.sessionId !== options.sessionId) continue;

			summaries.push({
				id: metadata.id,
				name: metadata.name,
				path: workspacePath,
				lastAccessed: metadata.lastAccessed,
				metadata: options.includeMetadata ? metadata : undefined,
			});
		}

		const limitedSummaries = summaries
			.sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
			.slice(0, maxResults);

		return limitedSummaries;
	}

	async readFile(
		workspaceId: string,
		relativePath: string,
		options: ReadWorkspaceFileOptions = {},
	): Promise<WorkspaceReadResult> {
		const workspacePath = this.getWorkspacePath(workspaceId);
		const filePath = this.resolveWorkspaceFilePath(workspacePath, relativePath);
		const metadata = await this.requireWorkspaceMetadata(workspacePath);

		if (!metadata.permissions.read) {
			throw new WorkspaceManagerError(
				'brAInwav Workspace Manager: Read access denied for workspace',
				'E_ACCESS_DENIED',
			);
		}

		const fileStats = await stat(filePath);
		if (!fileStats.isFile()) {
			throw new WorkspaceManagerError(
				'brAInwav Workspace Manager: Target path is not a file',
				'E_NOT_A_FILE',
			);
		}

		const maxSize = options.maxSize ?? 1024 * 1024;
		if (fileStats.size > maxSize) {
			throw new WorkspaceManagerError(
				'brAInwav Workspace Manager: File exceeds maximum allowed size',
				'E_FILE_TOO_LARGE',
			);
		}

		const encoding = options.encoding ?? 'utf8';
		const content = await readFile(filePath, encoding);

		const updatedMetadata: WorkspaceMetadata = {
			...metadata,
			lastAccessed: new Date(),
		};
		await this.saveWorkspaceMetadata(workspacePath, updatedMetadata);

		return {
			metadata: updatedMetadata,
			content,
			file: {
				path: relativePath,
				name: relativePath.split('/').pop() || relativePath,
				size: fileStats.size,
				lastModified: fileStats.mtime,
				permissions: fileStats.mode.toString(8),
			},
		};
	}

	async writeFile(
		workspaceId: string,
		relativePath: string,
		content: string,
		options: WriteWorkspaceFileOptions = {},
	): Promise<WorkspaceWriteResult> {
		const workspacePath = this.getWorkspacePath(workspaceId);
		const filePath = this.resolveWorkspaceFilePath(workspacePath, relativePath);
		const metadata = await this.requireWorkspaceMetadata(workspacePath);

		if (!metadata.permissions.write) {
			throw new WorkspaceManagerError(
				'brAInwav Workspace Manager: Write access denied for workspace',
				'E_ACCESS_DENIED',
			);
		}

		const overwrite = options.overwrite ?? true;
		let fileExists = false;
		try {
			await stat(filePath);
			fileExists = true;
		} catch {
			fileExists = false;
		}

		if (fileExists && !overwrite) {
			throw new WorkspaceManagerError(
				'brAInwav Workspace Manager: File already exists and overwrite disabled',
				'E_FILE_EXISTS',
			);
		}

		if (options.createDirectories) {
			await mkdir(dirname(filePath), { recursive: true });
		}

		const encoding = options.encoding ?? 'utf8';
		await writeFile(filePath, content, encoding);

		const fileStats = await stat(filePath);
		const updatedMetadata: WorkspaceMetadata = {
			...metadata,
			lastAccessed: new Date(),
		};
		await this.saveWorkspaceMetadata(workspacePath, updatedMetadata);

		return {
			metadata: updatedMetadata,
			created: !fileExists,
			file: {
				path: relativePath,
				name: relativePath.split('/').pop() || relativePath,
				size: fileStats.size,
				lastModified: fileStats.mtime,
				permissions: fileStats.mode.toString(8),
			},
		};
	}

	private async ensureBaseDirectory(): Promise<string> {
		const baseDir = this.resolveBaseDirectory();
		await mkdir(baseDir, { recursive: true });
		return baseDir;
	}

	private resolveBaseDirectory(): string {
		const baseDir =
			this.configuredBaseDir ??
			process.env.CORTEX_WORKSPACES_DIR ??
			join(process.cwd(), '.cortex-workspaces');
		return resolve(baseDir);
	}

	private getWorkspacePath(workspaceId: string): string {
		return join(this.resolveBaseDirectory(), workspaceId);
	}

	private async loadWorkspaceMetadata(workspacePath: string): Promise<WorkspaceMetadata | null> {
		try {
			const metadataPath = join(workspacePath, '.workspace-metadata.json');
			const metadataContent = await readFile(metadataPath, 'utf8');
			const rawMetadata = JSON.parse(metadataContent) as Omit<
				WorkspaceMetadata,
				'createdAt' | 'lastAccessed'
			> & {
				readonly createdAt: string;
				readonly lastAccessed: string;
			};

			return {
				...rawMetadata,
				createdAt: new Date(rawMetadata.createdAt),
				lastAccessed: new Date(rawMetadata.lastAccessed),
			};
		} catch (error) {
			if (
				error instanceof Error &&
				'code' in error &&
				(error as { code?: string }).code === 'ENOENT'
			) {
				return null;
			}
			throw new WorkspaceManagerError(
				'brAInwav Workspace Manager: Failed to load workspace metadata',
				'E_METADATA_LOAD_FAILED',
				error,
			);
		}
	}

	private async requireWorkspaceMetadata(workspacePath: string): Promise<WorkspaceMetadata> {
		const metadata = await this.loadWorkspaceMetadata(workspacePath);
		if (!metadata) {
			throw new WorkspaceManagerError(
				'brAInwav Workspace Manager: Workspace metadata missing',
				'E_WORKSPACE_NOT_FOUND',
			);
		}
		return metadata;
	}

	private async saveWorkspaceMetadata(
		workspacePath: string,
		metadata: WorkspaceMetadata,
	): Promise<void> {
		const metadataPath = join(workspacePath, '.workspace-metadata.json');
		const payload = {
			...metadata,
			createdAt: metadata.createdAt.toISOString(),
			lastAccessed: metadata.lastAccessed.toISOString(),
		};
		await writeFile(metadataPath, JSON.stringify(payload, null, 2));
	}

	private resolveWorkspaceFilePath(workspacePath: string, relativePath: string): string {
		const sanitizedPath = relativePath.replace(/^\/+/, '');
		const absolutePath = resolve(workspacePath, sanitizedPath);
		const relativePosition = relative(workspacePath, absolutePath);

		if (relativePosition.startsWith('..') || relativePosition === '') {
			throw new WorkspaceManagerError(
				'brAInwav Workspace Manager: Access outside workspace is prohibited',
				'E_ACCESS_DENIED',
			);
		}

		return absolutePath;
	}
}
