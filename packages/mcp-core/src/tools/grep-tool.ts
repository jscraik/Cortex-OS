import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { z } from 'zod';
import type { McpTool, ToolExecutionContext } from '../tools.js';
import { ToolExecutionError } from '../tools.js';

const GrepToolInputSchema = z.object({
	pattern: z.string().min(1, 'pattern is required'),
	path: z.string().min(1, 'path is required'),
	recursive: z.boolean().optional(),
	ignoreCase: z.boolean().optional(),
	matchWholeWord: z.boolean().optional(),
	lineNumbers: z.boolean().optional(),
	contextLines: z.number().int().min(0).max(10).optional(),
	maxResults: z.number().int().min(1).max(1000).optional(),
	filePattern: z.string().optional(), // filter files by pattern
	excludePattern: z.string().optional(), // exclude files by pattern
});

export type GrepToolInput = z.infer<typeof GrepToolInputSchema>;

export interface GrepMatch {
	file: string;
	line: number;
	column: number;
	text: string;
	beforeContext?: string[];
	afterContext?: string[];
}

export interface GrepFileResult {
	file: string;
	matches: GrepMatch[];
	matchCount: number;
}

export interface GrepToolResult {
	pattern: string;
	searchPath: string;
	files: GrepFileResult[];
	totalFiles: number;
	totalMatches: number;
	truncated: boolean;
	recursive: boolean;
	timestamp: string;
}

export class GrepTool implements McpTool<GrepToolInput, GrepToolResult> {
	readonly name = 'grep';
	readonly description =
		'Searches for patterns in file contents with support for regex and context options.';
	readonly inputSchema = GrepToolInputSchema;

	async execute(input: GrepToolInput, context?: ToolExecutionContext): Promise<GrepToolResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('Grep tool execution aborted.', {
				code: 'E_TOOL_ABORTED',
			});
		}

		try {
			const searchPath = resolve(input.path);

			// Security check - prevent searching outside workspace
			const workspace = process.cwd();
			if (!searchPath.startsWith(workspace)) {
				throw new ToolExecutionError(`Access denied: ${input.path} is outside workspace`, {
					code: 'E_ACCESS_DENIED',
				});
			}

			// Check if path exists
			const pathStats = await stat(searchPath);
			const isDirectory = pathStats.isDirectory();
			const isFile = pathStats.isFile();

			if (!isDirectory && !isFile) {
				throw new ToolExecutionError(`Path is not a file or directory: ${input.path}`, {
					code: 'E_INVALID_PATH',
				});
			}

			// Prepare search options
			const options = {
				pattern: input.pattern,
				ignoreCase: input.ignoreCase || false,
				matchWholeWord: input.matchWholeWord || false,
				lineNumbers: input.lineNumbers !== false, // default true
				contextLines: input.contextLines || 0,
				maxResults: input.maxResults || 100,
				filePattern: input.filePattern,
				excludePattern: input.excludePattern,
				recursive: input.recursive || false,
			};

			// Get files to search
			const filesToSearch = isFile
				? [searchPath]
				: await this.getFilesToSearch(searchPath, options);

			// Search files
			const results: GrepFileResult[] = [];
			let totalMatches = 0;
			let truncated = false;

			for (const filePath of filesToSearch) {
				if (context?.signal?.aborted) {
					throw new ToolExecutionError('Grep tool execution aborted.', {
						code: 'E_TOOL_ABORTED',
					});
				}

				if (totalMatches >= options.maxResults) {
					truncated = true;
					break;
				}

				const fileResult = await this.searchFile(
					filePath,
					options,
					options.maxResults - totalMatches,
				);
				if (fileResult.matchCount > 0) {
					results.push(fileResult);
					totalMatches += fileResult.matchCount;
				}
			}

			return {
				pattern: input.pattern,
				searchPath: input.path,
				files: results,
				totalFiles: results.length,
				totalMatches,
				truncated,
				recursive: options.recursive,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			if (error instanceof ToolExecutionError) {
				throw error;
			}

			const errorMessage = error instanceof Error ? error.message : String(error);

			if (errorMessage.includes('ENOENT')) {
				throw new ToolExecutionError(`Path not found: ${input.path}`, {
					code: 'E_PATH_NOT_FOUND',
					cause: error,
				});
			}

			if (errorMessage.includes('EACCES')) {
				throw new ToolExecutionError(`Permission denied: ${input.path}`, {
					code: 'E_PERMISSION_DENIED',
					cause: error,
				});
			}

			throw new ToolExecutionError(`Grep search failed: ${errorMessage}`, {
				code: 'E_GREP_FAILED',
				cause: error,
			});
		}
	}

	private async getFilesToSearch(
		dirPath: string,
		options: {
			recursive: boolean;
			filePattern?: string;
			excludePattern?: string;
		},
	): Promise<string[]> {
		const files: string[] = [];

		const searchDirectory = async (currentDir: string): Promise<void> => {
			try {
				const entries = await readdir(currentDir, { withFileTypes: true });

				for (const entry of entries) {
					const fullPath = join(currentDir, entry.name);

					// Skip hidden files and common ignore patterns
					if (
						entry.name.startsWith('.') ||
						entry.name === 'node_modules' ||
						entry.name === '__pycache__'
					) {
						continue;
					}

					if (entry.isDirectory()) {
						if (options.recursive) {
							await searchDirectory(fullPath);
						}
					} else if (entry.isFile()) {
						// Apply file pattern filters
						if (options.filePattern && !this.matchesPattern(entry.name, options.filePattern)) {
							continue;
						}
						if (options.excludePattern && this.matchesPattern(entry.name, options.excludePattern)) {
							continue;
						}

						// Only include text-like files
						if (this.isTextFile(entry.name)) {
							files.push(fullPath);
						}
					}
				}
			} catch {
				// Skip directories we can't read
			}
		};

		await searchDirectory(dirPath);
		return files;
	}

	private async searchFile(
		filePath: string,
		options: {
			pattern: string;
			ignoreCase: boolean;
			matchWholeWord: boolean;
			contextLines: number;
		},
		maxMatches: number,
	): Promise<GrepFileResult> {
		try {
			const content = await readFile(filePath, 'utf8');
			const lines = content.split('\n');
			const matches: GrepMatch[] = [];

			// Create regex pattern
			let regexPattern = options.pattern;
			if (options.matchWholeWord) {
				regexPattern = `\\b${regexPattern}\\b`;
			}
			const flags = options.ignoreCase ? 'gi' : 'g';
			const regex = new RegExp(regexPattern, flags);

			// Search each line
			for (let i = 0; i < lines.length && matches.length < maxMatches; i++) {
				const line = lines[i];
				let match;

				while ((match = regex.exec(line)) !== null && matches.length < maxMatches) {
					const beforeContext =
						options.contextLines > 0
							? lines.slice(Math.max(0, i - options.contextLines), i)
							: undefined;

					const afterContext =
						options.contextLines > 0
							? lines.slice(i + 1, Math.min(lines.length, i + 1 + options.contextLines))
							: undefined;

					matches.push({
						file: relative(process.cwd(), filePath),
						line: i + 1,
						column: match.index + 1,
						text: line,
						beforeContext,
						afterContext,
					});

					// Prevent infinite loop on zero-width matches
					if (match[0].length === 0) {
						regex.lastIndex++;
					}
				}

				// Reset regex for next line
				regex.lastIndex = 0;
			}

			return {
				file: relative(process.cwd(), filePath),
				matches,
				matchCount: matches.length,
			};
		} catch {
			// Skip files we can't read or parse
			return {
				file: relative(process.cwd(), filePath),
				matches: [],
				matchCount: 0,
			};
		}
	}

	private matchesPattern(filename: string, pattern: string): boolean {
		const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'), 'i');
		return regex.test(filename);
	}

	private isTextFile(filename: string): boolean {
		const textExtensions = [
			'.txt',
			'.md',
			'.js',
			'.ts',
			'.jsx',
			'.tsx',
			'.json',
			'.html',
			'.css',
			'.scss',
			'.py',
			'.java',
			'.cpp',
			'.c',
			'.h',
			'.hpp',
			'.rs',
			'.go',
			'.php',
			'.rb',
			'.yml',
			'.yaml',
			'.toml',
			'.xml',
			'.csv',
			'.log',
			'.conf',
			'.config',
			'.sh',
			'.bash',
			'.zsh',
			'.fish',
			'.ps1',
			'.bat',
			'.cmd',
		];

		const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
		return textExtensions.includes(ext) || !filename.includes('.');
	}
}

export const grepTool = new GrepTool();
