import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { McpTool, ToolExecutionContext } from '../tools.js';
import { ToolExecutionError } from '../tools.js';

const ReadToolInputSchema = z.object({
	path: z.string().min(1, 'path is required'),
	encoding: z.enum(['utf8', 'ascii', 'base64', 'hex', 'binary']).optional(),
	maxSize: z
		.number()
		.int()
		.positive()
		.max(100 * 1024 * 1024)
		.optional(), // max 100MB
});

export type ReadToolInput = z.infer<typeof ReadToolInputSchema>;

export interface ReadToolResult {
	content: string;
	path: string;
	size: number;
	encoding: string;
	mimeType?: string;
	lastModified: string;
	timestamp: string;
}

export class ReadTool implements McpTool<ReadToolInput, ReadToolResult> {
	readonly name = 'read';
	readonly description =
		'Reads the contents of files with support for different encodings and file types.';
	readonly inputSchema = ReadToolInputSchema;

	async execute(input: ReadToolInput, context?: ToolExecutionContext): Promise<ReadToolResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('Read tool execution aborted.', {
				code: 'E_TOOL_ABORTED',
			});
		}

		try {
			const filePath = resolve(input.path);

			// Security check - prevent reading outside workspace
			const cwd = process.cwd();
			if (!filePath.startsWith(cwd)) {
				throw new ToolExecutionError(`Access denied: ${input.path} is outside workspace`, {
					code: 'E_ACCESS_DENIED',
				});
			}

			// Check file stats first
			const stats = await stat(filePath);

			if (!stats.isFile()) {
				throw new ToolExecutionError(`Path is not a file: ${input.path}`, {
					code: 'E_NOT_A_FILE',
				});
			}

			const limit = input.maxSize ?? 10 * 1024 * 1024; // default 10MB
			if (stats.size > limit) {
				throw new ToolExecutionError(
					`File too large: ${stats.size} bytes exceeds limit of ${limit} bytes`,
					{
						code: 'E_FILE_TOO_LARGE',
					},
				);
			}

			// Read file content
			const encoding: BufferEncoding = (input.encoding as BufferEncoding) ?? 'utf8';
			const content = await readFile(filePath, { encoding });

			// Determine MIME type based on extension
			const mimeType = this.getMimeType(filePath);

			return {
				content: content.toString(),
				path: input.path,
				size: stats.size,
				encoding,
				mimeType,
				lastModified: stats.mtime.toISOString(),
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			if (error instanceof ToolExecutionError) {
				throw error;
			}

			const errorMessage = error instanceof Error ? error.message : String(error);

			if (errorMessage.includes('ENOENT')) {
				throw new ToolExecutionError(`File not found: ${input.path}`, {
					code: 'E_FILE_NOT_FOUND',
					cause: error,
				});
			}

			if (errorMessage.includes('EACCES')) {
				throw new ToolExecutionError(`Permission denied: ${input.path}`, {
					code: 'E_PERMISSION_DENIED',
					cause: error,
				});
			}

			throw new ToolExecutionError(`Failed to read file: ${errorMessage}`, {
				code: 'E_READ_FAILED',
				cause: error,
			});
		}
	}

	private getMimeType(filePath: string): string | undefined {
		const ext = filePath.toLowerCase().split('.').pop();
		const mimeTypes: Record<string, string> = {
			txt: 'text/plain',
			md: 'text/markdown',
			js: 'application/javascript',
			ts: 'application/typescript',
			json: 'application/json',
			html: 'text/html',
			css: 'text/css',
			xml: 'application/xml',
			py: 'text/x-python',
			java: 'text/x-java-source',
			cpp: 'text/x-c++src',
			c: 'text/x-csrc',
			rs: 'text/x-rust',
			go: 'text/x-go',
			yml: 'application/x-yaml',
			yaml: 'application/x-yaml',
			toml: 'application/toml',
			csv: 'text/csv',
			log: 'text/plain',
		};

		return ext ? mimeTypes[ext] : undefined;
	}
}

export const readTool = new ReadTool();
