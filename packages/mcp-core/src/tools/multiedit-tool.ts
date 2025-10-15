import { readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { McpTool, ToolExecutionContext } from '../tools.js';
import { ToolExecutionError } from '../tools.js';

const MultiEditInputSchema = z.object({
	files: z
		.array(
			z.object({
				path: z.string().min(1),
				edits: z
					.array(
						z.object({
							oldText: z.string(),
							newText: z.string(),
							startLine: z.number().int().min(1).optional(),
							endLine: z.number().int().min(1).optional(),
						}),
					)
					.min(1),
			}),
		)
		.min(1, 'at least one file is required'),
	atomic: z.boolean().optional(), // if true, all edits must succeed or none are applied
	createBackups: z.boolean().optional(),
	dryRun: z.boolean().optional(),
});

export type MultiEditInput = z.infer<typeof MultiEditInputSchema>;

export type FileEditOperation = MultiEditInput['files'][number];

export interface FileEditResult {
	path: string;
	success: boolean;
	totalEdits: number;
	appliedEdits: number;
	failedEdits: number;
	originalSize: number;
	newSize: number;
	backupPath?: string;
	error?: string;
	editResults: Array<{
		oldText: string;
		newText: string;
		applied: boolean;
		lineNumber?: number;
		reason?: string;
	}>;
}

export interface MultiEditToolResult {
	totalFiles: number;
	successfulFiles: number;
	failedFiles: number;
	totalEdits: number;
	appliedEdits: number;
	atomic: boolean;
	dryRun: boolean;
	allSucceeded: boolean;
	results: FileEditResult[];
	rollbackPerformed?: boolean;
	timestamp: string;
}

export class MultiEditTool implements McpTool<MultiEditInput, MultiEditToolResult> {
	readonly name = 'multiedit';
	readonly description =
		'Performs multiple edits on a single file atomically with rollback support.';
	readonly inputSchema = MultiEditInputSchema;

	async execute(
		input: MultiEditInput,
		context?: ToolExecutionContext,
	): Promise<MultiEditToolResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('MultiEdit tool execution aborted.', {
				code: 'E_TOOL_ABORTED',
			});
		}

		const atomic = input.atomic !== false; // default true
		const createBackups = input.createBackups || false;
		const dryRun = input.dryRun || false;

		const results: FileEditResult[] = [];
		const backupPaths: string[] = [];
		const originalContents = new Map<string, string>();

		let totalEdits = 0;
		let appliedEdits = 0;
		let successfulFiles = 0;
		let rollbackPerformed = false;

		try {
			// First, validate all files and prepare edits
			for (const fileOp of input.files) {
				totalEdits += fileOp.edits.length;

				const result = await this.processFile(
					fileOp,
					createBackups,
					dryRun,
					originalContents,
					backupPaths,
				);

				results.push(result);
				appliedEdits += result.appliedEdits;

				if (result.success) {
					successfulFiles++;
				} else if (atomic && !dryRun) {
					// In atomic mode, if any file fails, we need to rollback
					rollbackPerformed = await this.rollbackChanges(originalContents);
					break;
				}
			}

			const allSucceeded = successfulFiles === input.files.length;

			// If atomic mode and not all succeeded, rollback
			if (atomic && !allSucceeded && !dryRun && !rollbackPerformed) {
				rollbackPerformed = await this.rollbackChanges(originalContents);
			}

			return {
				totalFiles: input.files.length,
				successfulFiles,
				failedFiles: input.files.length - successfulFiles,
				totalEdits,
				appliedEdits: atomic && !allSucceeded ? 0 : appliedEdits,
				atomic,
				dryRun,
				allSucceeded,
				results,
				rollbackPerformed,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			// Ensure rollback on unexpected errors
			if (atomic && !dryRun) {
				await this.rollbackChanges(originalContents);
				rollbackPerformed = true;
			}

			if (error instanceof ToolExecutionError) {
				throw error;
			}

			throw new ToolExecutionError(
				`MultiEdit failed: ${error instanceof Error ? error.message : String(error)}`,
				{
					code: 'E_MULTIEDIT_FAILED',
					cause: error,
				},
			);
		}
	}

	private async processFile(
		fileOp: FileEditOperation,
		createBackups: boolean,
		dryRun: boolean,
		originalContents: Map<string, string>,
		backupPaths: string[],
	): Promise<FileEditResult> {
		try {
			const filePath = resolve(fileOp.path);

			// Security check
			const cwd = process.cwd();
			if (!filePath.startsWith(cwd)) {
				return {
					path: fileOp.path,
					success: false,
					totalEdits: fileOp.edits.length,
					appliedEdits: 0,
					failedEdits: fileOp.edits.length,
					originalSize: 0,
					newSize: 0,
					error: `Access denied: ${fileOp.path} is outside workspace`,
					editResults: [],
				};
			}

			// Check file exists
			const stats = await stat(filePath);
			if (!stats.isFile()) {
				return {
					path: fileOp.path,
					success: false,
					totalEdits: fileOp.edits.length,
					appliedEdits: 0,
					failedEdits: fileOp.edits.length,
					originalSize: 0,
					newSize: 0,
					error: `Path is not a file: ${fileOp.path}`,
					editResults: [],
				};
			}

			// Read original content
			const originalContent = await readFile(filePath, 'utf8');
			const originalSize = originalContent.length;
			originalContents.set(filePath, originalContent);

			// Apply edits
			let currentContent = originalContent;
			const editResults: FileEditResult['editResults'] = [];
			let appliedCount = 0;

			for (const edit of fileOp.edits) {
				const editResult = this.applyEdit(currentContent, edit);
				editResults.push(editResult);

				if (editResult.applied) {
					currentContent = currentContent.replace(edit.oldText, edit.newText);
					appliedCount++;
				}
			}

			const newSize = currentContent.length;
			let backupPath: string | undefined;

			// Create backup if requested
			if (createBackups && !dryRun && appliedCount > 0) {
				backupPath = `${filePath}.backup.${Date.now()}`;
				await writeFile(backupPath, originalContent, 'utf8');
				backupPaths.push(backupPath);
			}

			// Write file if not dry run and changes made
			if (!dryRun && appliedCount > 0) {
				await writeFile(filePath, currentContent, 'utf8');
			}

			return {
				path: fileOp.path,
				success: appliedCount === fileOp.edits.length,
				totalEdits: fileOp.edits.length,
				appliedEdits: appliedCount,
				failedEdits: fileOp.edits.length - appliedCount,
				originalSize,
				newSize,
				backupPath,
				editResults,
			};
		} catch (error) {
			return {
				path: fileOp.path,
				success: false,
				totalEdits: fileOp.edits.length,
				appliedEdits: 0,
				failedEdits: fileOp.edits.length,
				originalSize: 0,
				newSize: 0,
				error: error instanceof Error ? error.message : String(error),
				editResults: [],
			};
		}
	}

	private applyEdit(
		content: string,
		edit: FileEditOperation['edits'][0],
	): FileEditResult['editResults'][0] {
		const oldTextIndex = content.indexOf(edit.oldText);
		if (oldTextIndex === -1) {
			return {
				oldText: edit.oldText,
				newText: edit.newText,
				applied: false,
				reason: 'Old text not found in file',
			};
		}

		// Check for multiple occurrences
		const lastIndex = content.lastIndexOf(edit.oldText);
		if (lastIndex !== oldTextIndex) {
			const lineNumber = this.getLineNumber(content, oldTextIndex);
			return {
				oldText: edit.oldText,
				newText: edit.newText,
				applied: false,
				lineNumber,
				reason: 'Multiple occurrences of old text found - be more specific',
			};
		}

		const lineNumber = this.getLineNumber(content, oldTextIndex);
		return {
			oldText: edit.oldText,
			newText: edit.newText,
			applied: true,
			lineNumber,
		};
	}

	private getLineNumber(content: string, charIndex: number): number {
		return content.substring(0, charIndex).split('\n').length;
	}

	private async rollbackChanges(originalContents: Map<string, string>): Promise<boolean> {
		try {
			for (const [filePath, originalContent] of originalContents) {
				await writeFile(filePath, originalContent, 'utf8');
			}
			return true;
		} catch (error) {
			// Rollback failure is serious but shouldn't crash the tool
			console.error('Rollback failed:', error);
			return false;
		}
	}
}

export const multiEditTool = new MultiEditTool();
