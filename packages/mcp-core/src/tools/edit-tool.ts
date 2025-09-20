import { readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { McpTool, ToolExecutionContext } from '../tools.js';
import { ToolExecutionError } from '../tools.js';

const EditInputSchema = z.object({
    path: z.string().min(1, 'path is required'),
    edits: z
        .array(
            z.object({
                oldText: z.string().optional(),
                newText: z.string(),
                startLine: z.number().int().min(1).optional(),
                endLine: z.number().int().min(1).optional(),
            }),
        )
        .min(1, 'at least one edit is required'),
    createBackup: z.boolean().optional(),
    dryRun: z.boolean().optional(),
});

export type EditInput = z.infer<typeof EditInputSchema>;

export interface EditResultItem {
    applied: boolean;
    reason?: string;
    lineNumber?: number;
    oldText?: string;
    newText: string;
}

export interface EditToolResult {
    path: string;
    success: boolean;
    totalEdits: number;
    appliedEdits: number;
    failedEdits: number;
    originalSize: number;
    newSize: number;
    backupPath?: string;
    editResults: EditResultItem[];
    timestamp: string;
}

export class EditTool implements McpTool<EditInput, EditToolResult> {
    readonly name = 'edit';
    readonly description = 'Applies one or more edits to a file with validation and optional backup.';
    readonly inputSchema = EditInputSchema;

    async execute(input: EditInput, context?: ToolExecutionContext): Promise<EditToolResult> {
        if (context?.signal?.aborted) {
            throw new ToolExecutionError('Edit tool execution aborted.', { code: 'E_TOOL_ABORTED' });
        }

        try {
            const filePath = this.assertAndResolvePath(input.path);
            await this.assertIsFile(filePath, input.path);

            const originalContent = await readFile(filePath, 'utf8');
            const { currentContent, editResults, appliedCount } = this.applyEdits(originalContent, input);

            const { backupPath } = await this.maybeBackup(
                input.createBackup,
                input.dryRun,
                appliedCount,
                filePath,
                originalContent,
            );

            await this.maybeWrite(input.dryRun, appliedCount, filePath, currentContent);

            return this.buildResult(
                input,
                originalContent.length,
                currentContent.length,
                backupPath,
                editResults,
                appliedCount,
            );
        } catch (error) {
            if (error instanceof ToolExecutionError) throw error;
            const message = error instanceof Error ? error.message : String(error);
            const code = message.includes('EACCES') ? 'E_PERMISSION_DENIED' : 'E_EDIT_FAILED';
            throw new ToolExecutionError(`Failed to edit file: ${message}`, { code, cause: error });
        }
    }

    private assertAndResolvePath(displayPath: string): string {
        const filePath = resolve(displayPath);
        const cwd = process.cwd();
        if (!filePath.startsWith(cwd)) {
            throw new ToolExecutionError(`Access denied: ${displayPath} is outside workspace`, {
                code: 'E_ACCESS_DENIED',
            });
        }
        return filePath;
    }

    private async assertIsFile(filePath: string, displayPath: string): Promise<void> {
        const s = await stat(filePath);
        if (!s.isFile()) {
            throw new ToolExecutionError(`Path is not a file: ${displayPath}`, { code: 'E_NOT_A_FILE' });
        }
    }

    private applyEdits(originalContent: string, input: EditInput) {
        let currentContent = originalContent;
        const editResults: EditResultItem[] = [];
        let appliedCount = 0;

        for (const edit of input.edits) {
            if (typeof edit.oldText === 'string') {
                const idx = currentContent.indexOf(edit.oldText);
                if (idx === -1) {
                    editResults.push({ applied: false, reason: 'Old text not found', oldText: edit.oldText, newText: edit.newText });
                    continue;
                }
                const lastIdx = currentContent.lastIndexOf(edit.oldText);
                if (lastIdx !== idx) {
                    const lineNumber = currentContent.substring(0, idx).split('\n').length;
                    editResults.push({
                        applied: false,
                        reason: 'Multiple occurrences found - be more specific',
                        lineNumber,
                        oldText: edit.oldText,
                        newText: edit.newText,
                    });
                    continue;
                }
                currentContent = currentContent.replace(edit.oldText, edit.newText);
                appliedCount++;
                editResults.push({ applied: true, lineNumber: currentContent.substring(0, idx).split('\n').length, oldText: edit.oldText, newText: edit.newText });
            } else if (edit.startLine && edit.endLine && edit.endLine >= edit.startLine) {
                const lines = currentContent.split('\n');
                if (edit.startLine > lines.length) {
                    editResults.push({ applied: false, reason: 'startLine beyond file length', newText: edit.newText });
                    continue;
                }
                const from = edit.startLine - 1;
                const to = Math.min(edit.endLine - 1, lines.length - 1);
                lines.splice(from, to - from + 1, edit.newText);
                currentContent = lines.join('\n');
                appliedCount++;
                editResults.push({ applied: true, lineNumber: edit.startLine, newText: edit.newText });
            } else {
                editResults.push({ applied: false, reason: 'Invalid edit: provide oldText or startLine/endLine', newText: edit.newText });
            }
        }

        return { currentContent, editResults, appliedCount };
    }

    private async maybeBackup(
        createBackup: boolean | undefined,
        dryRun: boolean | undefined,
        appliedCount: number,
        filePath: string,
        originalContent: string,
    ): Promise<{ backupPath?: string }> {
        let backupPath: string | undefined;
        if (createBackup && !dryRun && appliedCount > 0) {
            backupPath = `${filePath}.backup.${Date.now()}`;
            await writeFile(backupPath, originalContent, 'utf8');
        }
        return { backupPath };
    }

    private async maybeWrite(
        dryRun: boolean | undefined,
        appliedCount: number,
        filePath: string,
        content: string,
    ): Promise<void> {
        if (!dryRun && appliedCount > 0) {
            await writeFile(filePath, content, 'utf8');
        }
    }

    private buildResult(
        input: EditInput,
        originalSize: number,
        newSize: number,
        backupPath: string | undefined,
        editResults: EditResultItem[],
        appliedCount: number,
    ): EditToolResult {
        return {
            path: input.path,
            success: appliedCount === input.edits.length,
            totalEdits: input.edits.length,
            appliedEdits: appliedCount,
            failedEdits: input.edits.length - appliedCount,
            originalSize,
            newSize,
            backupPath,
            editResults,
            timestamp: new Date().toISOString(),
        };
    }
}

export const editTool = new EditTool();
