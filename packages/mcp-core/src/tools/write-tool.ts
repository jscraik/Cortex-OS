import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import type { McpTool, ToolExecutionContext } from '../tools.js';
import { ToolExecutionError } from '../tools.js';

const WriteToolInputSchema = z.object({
    path: z.string().min(1, 'path is required'),
    content: z.union([z.string(), z.instanceof(Uint8Array)]),
    encoding: z.enum(['utf8', 'ascii', 'base64', 'hex', 'binary']).optional(),
    createDirs: z.boolean().optional(),
    ifExists: z.enum(['overwrite', 'append', 'error', 'skip']).optional(),
    mode: z.number().int().optional(),
});

export type WriteToolInput = z.infer<typeof WriteToolInputSchema>;

export interface WriteToolResult {
    path: string;
    bytesWritten: number;
    operation: 'created' | 'overwritten' | 'appended' | 'skipped';
    encoding?: string;
    timestamp: string;
}

export class WriteTool implements McpTool<WriteToolInput, WriteToolResult> {
    readonly name = 'write';
    readonly description = 'Writes content to a file with safe defaults and directory creation.';
    readonly inputSchema = WriteToolInputSchema;

    async execute(input: WriteToolInput, context?: ToolExecutionContext): Promise<WriteToolResult> {
        if (context?.signal?.aborted) {
            throw new ToolExecutionError('Write tool execution aborted.', { code: 'E_TOOL_ABORTED' });
        }

        try {
            return await this.performWrite(input);
        } catch (error) {
            if (error instanceof ToolExecutionError) throw error;
            const message = error instanceof Error ? error.message : String(error);
            const code = message.includes('EACCES') ? 'E_PERMISSION_DENIED' : 'E_WRITE_FAILED';
            throw new ToolExecutionError(`Failed to write file: ${message}`, { code, cause: error });
        }
    }

    private async performWrite(input: WriteToolInput): Promise<WriteToolResult> {
        const filePath = resolve(input.path);
        this.assertWithinWorkspace(filePath, input.path);

        const dir = dirname(filePath);
        if (input.createDirs ?? true) {
            await mkdir(dir, { recursive: true });
        }

        const { exists, isFile } = await this.getFileStatus(filePath);
        if (exists && !isFile) {
            throw new ToolExecutionError(`Path exists and is not a file: ${input.path}`, { code: 'E_NOT_A_FILE' });
        }

        const encoding: BufferEncoding | undefined =
            typeof input.content === 'string' ? ((input.encoding as BufferEncoding) ?? 'utf8') : undefined;

        const onExistBehavior = input.ifExists ?? 'overwrite';
        if (exists && onExistBehavior !== 'overwrite') {
            if (onExistBehavior === 'error') {
                throw new ToolExecutionError(`File already exists: ${input.path}`, { code: 'E_FILE_EXISTS' });
            }
            if (onExistBehavior === 'skip') {
                return { path: input.path, bytesWritten: 0, operation: 'skipped', encoding, timestamp: new Date().toISOString() };
            }
            // append
            const bytesWritten = await this.appendData(filePath, input.content, encoding, input.mode);
            return { path: input.path, bytesWritten, operation: 'appended', encoding, timestamp: new Date().toISOString() };
        }

        const bytesWritten = await this.writeData(filePath, input.content, encoding, input.mode);
        return {
            path: input.path,
            bytesWritten,
            operation: exists ? 'overwritten' : 'created',
            encoding,
            timestamp: new Date().toISOString(),
        };
    }

    private assertWithinWorkspace(resolvedPath: string, displayPath: string): void {
        const cwd = process.cwd();
        if (!resolvedPath.startsWith(cwd)) {
            throw new ToolExecutionError(`Access denied: ${displayPath} is outside workspace`, { code: 'E_ACCESS_DENIED' });
        }
    }

    private async getFileStatus(filePath: string): Promise<{ exists: boolean; isFile: boolean }> {
        try {
            const s = await stat(filePath);
            return { exists: true, isFile: s.isFile() };
        } catch {
            return { exists: false, isFile: false };
        }
    }

    private async writeData(
        filePath: string,
        content: string | Uint8Array,
        encoding?: BufferEncoding,
        mode?: number,
    ): Promise<number> {
        const data = typeof content === 'string' ? content : Buffer.from(content);
        await writeFile(filePath, data, { encoding, mode });
        return typeof data === 'string' ? Buffer.byteLength(data, encoding ?? 'utf8') : data.byteLength;
    }

    private async appendData(
        filePath: string,
        content: string | Uint8Array,
        encoding?: BufferEncoding,
        mode?: number,
    ): Promise<number> {
        const data = typeof content === 'string' ? content : Buffer.from(content);
        await writeFile(filePath, data, { encoding, mode, flag: 'a' });
        return typeof data === 'string' ? Buffer.byteLength(data, encoding ?? 'utf8') : data.byteLength;
    }
}

export const writeTool = new WriteTool();
