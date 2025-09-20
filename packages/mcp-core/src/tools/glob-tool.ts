import fg from 'fast-glob';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { McpTool, ToolExecutionContext } from '../tools.js';
import { ToolExecutionError } from '../tools.js';

const GlobToolInputSchema = z.object({
	pattern: z.string().min(1, 'pattern is required'),
	cwd: z.string().optional(),
	ignore: z.array(z.string()).optional(),
	followSymlinks: z.boolean().optional(),
	includeDirectories: z.boolean().optional(),
	maxDepth: z.number().int().min(1).max(20).optional(),
	caseSensitive: z.boolean().optional(),
});

export type GlobToolInput = z.infer<typeof GlobToolInputSchema>;

export interface GlobMatch {
	path: string;
	relativePath: string;
	isDirectory: boolean;
	isFile: boolean;
	size?: number;
	lastModified?: string;
}

export interface GlobToolResult {
	pattern: string;
	matches: GlobMatch[];
	totalMatches: number;
	directories: number;
	files: number;
	cwd: string;
	timestamp: string;
}

export class GlobTool implements McpTool<GlobToolInput, GlobToolResult> {
	readonly name = 'glob';
	readonly description =
		'Finds files based on pattern matching with support for advanced filtering options.';
	readonly inputSchema = GlobToolInputSchema;

	async execute(input: GlobToolInput, context?: ToolExecutionContext): Promise<GlobToolResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('Glob tool execution aborted.', {
				code: 'E_TOOL_ABORTED',
			});
		}

		try {
			const cwd = input.cwd ? resolve(input.cwd) : process.cwd();

			// Security check - prevent accessing outside workspace
			const workspace = process.cwd();
			if (!cwd.startsWith(workspace)) {
				throw new ToolExecutionError(`Access denied: ${input.cwd} is outside workspace`, {
					code: 'E_ACCESS_DENIED',
				});
			}

			// Configure glob options
			const globOptions: fg.Options = {
				cwd,
				ignore: input.ignore || ['node_modules/**', '.git/**', '.DS_Store'],
				followSymbolicLinks: input.followSymlinks || false,
				deep: input.maxDepth,
				caseSensitiveMatch: !!input.caseSensitive,
				dot: true,
				onlyFiles: false,
				stats: false,
				absolute: true,
			};

			// Execute glob search
			const results = await fg(input.pattern, globOptions);

			// Process results to get detailed information
			const matches: GlobMatch[] = [];
			let directoryCount = 0;
			let fileCount = 0;

			for (const result of results) {
				if (context?.signal?.aborted) {
					throw new ToolExecutionError('Glob tool execution aborted.', {
						code: 'E_TOOL_ABORTED',
					});
				}

				// fast-glob returns string paths when absolute:true
				const fullPath = typeof result === 'string' ? result : String(result);
				const relativePath = fullPath.startsWith(cwd) ? fullPath.slice(cwd.length + 1) : fullPath;
				let isDirectory = false;
				let isFile = false;
				try {
					const s = await stat(fullPath);
					isDirectory = s.isDirectory();
					isFile = s.isFile();
				} catch {
					// broken link or permission issue; skip
					continue;
				}

				// Skip directories if not requested
				if (isDirectory && !input.includeDirectories) {
					continue;
				}

				let size: number | undefined;
				let lastModified: string | undefined;

				// Get additional file info for files
				if (isFile) {
					try {
						const stats = await stat(fullPath);
						size = stats.size;
						lastModified = stats.mtime.toISOString();
					} catch (_error) {
						// Skip files we can't stat (might be broken symlinks, etc.)
						continue;
					}
				}

				matches.push({
					path: fullPath,
					relativePath,
					isDirectory,
					isFile,
					size,
					lastModified,
				});

				if (isDirectory) directoryCount++;
				if (isFile) fileCount++;
			}

			// Sort matches for consistent output
			matches.sort((a, b) => {
				// Directories first, then files
				if (a.isDirectory && !b.isDirectory) return -1;
				if (!a.isDirectory && b.isDirectory) return 1;
				// Then alphabetically
				return a.relativePath.localeCompare(b.relativePath);
			});

			return {
				pattern: input.pattern,
				matches,
				totalMatches: matches.length,
				directories: directoryCount,
				files: fileCount,
				cwd,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			if (error instanceof ToolExecutionError) {
				throw error;
			}

			const errorMessage = error instanceof Error ? error.message : String(error);

			if (errorMessage.includes('ENOENT')) {
				throw new ToolExecutionError(`Directory not found: ${input.cwd || 'current directory'}`, {
					code: 'E_DIRECTORY_NOT_FOUND',
					cause: error,
				});
			}

			if (errorMessage.includes('EACCES')) {
				throw new ToolExecutionError(`Permission denied: ${input.cwd || 'current directory'}`, {
					code: 'E_PERMISSION_DENIED',
					cause: error,
				});
			}

			throw new ToolExecutionError(`Glob search failed: ${errorMessage}`, {
				code: 'E_GLOB_FAILED',
				cause: error,
			});
		}
	}
}

export const globTool = new GlobTool();
