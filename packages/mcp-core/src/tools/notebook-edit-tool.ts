import { readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { McpTool, ToolExecutionContext } from '../tools.js';
import { ToolExecutionError } from '../tools.js';

const NotebookEditInputSchema = z.object({
	path: z.string().min(1, 'path is required'),
	operations: z
		.array(
			z.discriminatedUnion('type', [
				z.object({
					type: z.literal('add_cell'),
					cellType: z.enum(['code', 'markdown', 'raw']),
					source: z.array(z.string()),
					index: z.number().int().min(0).optional(), // append if not specified
				}),
				z.object({
					type: z.literal('edit_cell'),
					index: z.number().int().min(0),
					source: z.array(z.string()),
				}),
				z.object({
					type: z.literal('delete_cell'),
					index: z.number().int().min(0),
				}),
				z.object({
					type: z.literal('move_cell'),
					fromIndex: z.number().int().min(0),
					toIndex: z.number().int().min(0),
				}),
				z.object({
					type: z.literal('clear_outputs'),
					index: z.number().int().min(0).optional(), // all cells if not specified
				}),
				z.object({
					type: z.literal('set_metadata'),
					index: z.number().int().min(0).optional(), // notebook metadata if not specified
					metadata: z.record(z.unknown()),
				}),
			]),
		)
		.min(1, 'at least one operation is required'),
	createBackup: z.boolean().optional(),
	dryRun: z.boolean().optional(),
});

export type NotebookEditInput = z.infer<typeof NotebookEditInputSchema>;

export interface NotebookEditOperation {
	type: string;
	index?: number;
	success: boolean;
	message?: string;
}

export interface NotebookEditResult {
	path: string;
	operations: NotebookEditOperation[];
	totalOperations: number;
	successful: number;
	failed: number;
	originalCells: number;
	newCells: number;
	backupPath?: string;
	dryRun: boolean;
	timestamp: string;
}

export class NotebookEditTool implements McpTool<NotebookEditInput, NotebookEditResult> {
	readonly name = 'notebook-edit';
	readonly description =
		'Modifies Jupyter notebook cells with support for add, edit, delete, and move operations.';
	readonly inputSchema = NotebookEditInputSchema;

	async execute(
		input: NotebookEditInput,
		context?: ToolExecutionContext,
	): Promise<NotebookEditResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('NotebookEdit tool execution aborted.', {
				code: 'E_TOOL_ABORTED',
			});
		}

		try {
			const filePath = resolve(input.path);
			const createBackup = input.createBackup || false;
			const dryRun = input.dryRun || false;

			// Security check - prevent editing outside workspace
			const cwd = process.cwd();
			if (!filePath.startsWith(cwd)) {
				throw new ToolExecutionError(`Access denied: ${input.path} is outside workspace`, {
					code: 'E_ACCESS_DENIED',
				});
			}

			// Check if file exists and is a file
			const stats = await stat(filePath);
			if (!stats.isFile()) {
				throw new ToolExecutionError(`Path is not a file: ${input.path}`, {
					code: 'E_NOT_A_FILE',
				});
			}

			// Check if it's a notebook file
			if (!filePath.toLowerCase().endsWith('.ipynb')) {
				throw new ToolExecutionError(`File is not a Jupyter notebook: ${input.path}`, {
					code: 'E_NOT_NOTEBOOK',
				});
			}

			// Read and parse notebook
			const content = await readFile(filePath, 'utf8');
			let notebook: any;

			try {
				notebook = JSON.parse(content);
			} catch (parseError) {
				throw new ToolExecutionError(
					`Invalid JSON in notebook: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
					{
						code: 'E_INVALID_JSON',
						cause: parseError,
					},
				);
			}

			// Validate basic notebook structure
			if (!notebook.cells || !Array.isArray(notebook.cells)) {
				throw new ToolExecutionError('Invalid notebook structure: missing or invalid cells array', {
					code: 'E_INVALID_NOTEBOOK',
				});
			}

			const originalCellCount = notebook.cells.length;
			const operations: NotebookEditOperation[] = [];

			// Apply operations
			for (const operation of input.operations) {
				if (context?.signal?.aborted) {
					throw new ToolExecutionError('NotebookEdit tool execution aborted.', {
						code: 'E_TOOL_ABORTED',
					});
				}

				const result = this.applyOperation(notebook, operation);
				operations.push(result);
			}

			const newCellCount = notebook.cells.length;
			const successful = operations.filter((op) => op.success).length;

			// Create backup if requested and not dry run
			let backupPath: string | undefined;
			if (createBackup && !dryRun && successful > 0) {
				backupPath = `${filePath}.backup.${Date.now()}`;
				await writeFile(backupPath, content, 'utf8');
			}

			// Write modified notebook if not dry run and changes were made
			if (!dryRun && successful > 0) {
				const modifiedContent = JSON.stringify(notebook, null, 2);
				await writeFile(filePath, modifiedContent, 'utf8');
			}

			return {
				path: input.path,
				operations,
				totalOperations: input.operations.length,
				successful,
				failed: input.operations.length - successful,
				originalCells: originalCellCount,
				newCells: newCellCount,
				backupPath,
				dryRun,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			if (error instanceof ToolExecutionError) {
				throw error;
			}

			const errorMessage = error instanceof Error ? error.message : String(error);

			if (errorMessage.includes('ENOENT')) {
				throw new ToolExecutionError(`Notebook not found: ${input.path}`, {
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

			throw new ToolExecutionError(`Failed to edit notebook: ${errorMessage}`, {
				code: 'E_EDIT_FAILED',
				cause: error,
			});
		}
	}

	private applyOperation(notebook: any, operation: any): NotebookEditOperation {
		try {
			switch (operation.type) {
				case 'add_cell':
					return this.addCell(notebook, operation);
				case 'edit_cell':
					return this.editCell(notebook, operation);
				case 'delete_cell':
					return this.deleteCell(notebook, operation);
				case 'move_cell':
					return this.moveCell(notebook, operation);
				case 'clear_outputs':
					return this.clearOutputs(notebook, operation);
				case 'set_metadata':
					return this.setMetadata(notebook, operation);
				default:
					return {
						type: operation.type,
						success: false,
						message: `Unknown operation type: ${operation.type}`,
					};
			}
		} catch (error) {
			return {
				type: operation.type,
				index: operation.index,
				success: false,
				message: error instanceof Error ? error.message : String(error),
			};
		}
	}

	private addCell(notebook: any, operation: any): NotebookEditOperation {
		const newCell: any = {
			cell_type: operation.cellType,
			source: operation.source,
			metadata: {},
		};

		// Add execution_count for code cells
		if (operation.cellType === 'code') {
			newCell.execution_count = null;
			newCell.outputs = [];
		}

		if (operation.index !== undefined) {
			if (operation.index < 0 || operation.index > notebook.cells.length) {
				return {
					type: 'add_cell',
					index: operation.index,
					success: false,
					message: `Index ${operation.index} is out of range (0-${notebook.cells.length})`,
				};
			}
			notebook.cells.splice(operation.index, 0, newCell);
		} else {
			notebook.cells.push(newCell);
		}

		return {
			type: 'add_cell',
			index: operation.index,
			success: true,
			message: `Added ${operation.cellType} cell`,
		};
	}

	private editCell(notebook: any, operation: any): NotebookEditOperation {
		if (operation.index < 0 || operation.index >= notebook.cells.length) {
			return {
				type: 'edit_cell',
				index: operation.index,
				success: false,
				message: `Index ${operation.index} is out of range (0-${notebook.cells.length - 1})`,
			};
		}

		notebook.cells[operation.index].source = operation.source;

		// Clear outputs for code cells when source changes
		if ((notebook.cells as any)[operation.index].cell_type === 'code') {
			(notebook.cells as any)[operation.index].outputs = [] as any[];
			(notebook.cells as any)[operation.index].execution_count = null;
		}

		return {
			type: 'edit_cell',
			index: operation.index,
			success: true,
			message: 'Cell edited successfully',
		};
	}

	private deleteCell(notebook: any, operation: any): NotebookEditOperation {
		if (operation.index < 0 || operation.index >= notebook.cells.length) {
			return {
				type: 'delete_cell',
				index: operation.index,
				success: false,
				message: `Index ${operation.index} is out of range (0-${notebook.cells.length - 1})`,
			};
		}

		if (notebook.cells.length === 1) {
			return {
				type: 'delete_cell',
				index: operation.index,
				success: false,
				message: 'Cannot delete the last remaining cell',
			};
		}

		notebook.cells.splice(operation.index, 1);

		return {
			type: 'delete_cell',
			index: operation.index,
			success: true,
			message: 'Cell deleted successfully',
		};
	}

	private moveCell(notebook: any, operation: any): NotebookEditOperation {
		const { fromIndex, toIndex } = operation;

		if (fromIndex < 0 || fromIndex >= notebook.cells.length) {
			return {
				type: 'move_cell',
				success: false,
				message: `From index ${fromIndex} is out of range (0-${notebook.cells.length - 1})`,
			};
		}

		if (toIndex < 0 || toIndex >= notebook.cells.length) {
			return {
				type: 'move_cell',
				success: false,
				message: `To index ${toIndex} is out of range (0-${notebook.cells.length - 1})`,
			};
		}

		if (fromIndex === toIndex) {
			return {
				type: 'move_cell',
				success: true,
				message: 'Cell is already at target position',
			};
		}

		const cell = notebook.cells.splice(fromIndex, 1)[0];
		notebook.cells.splice(toIndex, 0, cell);

		return {
			type: 'move_cell',
			success: true,
			message: `Cell moved from ${fromIndex} to ${toIndex}`,
		};
	}

	private clearOutputs(notebook: any, operation: any): NotebookEditOperation {
		if (operation.index !== undefined) {
			// Clear outputs for specific cell
			if (operation.index < 0 || operation.index >= notebook.cells.length) {
				return {
					type: 'clear_outputs',
					index: operation.index,
					success: false,
					message: `Index ${operation.index} is out of range (0-${notebook.cells.length - 1})`,
				};
			}

			const cell = notebook.cells[operation.index];
			if ((cell as any).cell_type === 'code') {
				(cell as any).outputs = [] as any[];
				(cell as any).execution_count = null;
			}

			return {
				type: 'clear_outputs',
				index: operation.index,
				success: true,
				message: 'Cell outputs cleared',
			};
		} else {
			// Clear outputs for all code cells
			let clearedCount = 0;
			for (const cell of notebook.cells) {
				if (cell.cell_type === 'code') {
					cell.outputs = [];
					cell.execution_count = null;
					clearedCount++;
				}
			}

			return {
				type: 'clear_outputs',
				success: true,
				message: `Cleared outputs for ${clearedCount} code cells`,
			};
		}
	}

	private setMetadata(notebook: any, operation: any): NotebookEditOperation {
		if (operation.index !== undefined) {
			// Set cell metadata
			if (operation.index < 0 || operation.index >= notebook.cells.length) {
				return {
					type: 'set_metadata',
					index: operation.index,
					success: false,
					message: `Index ${operation.index} is out of range (0-${notebook.cells.length - 1})`,
				};
			}

			notebook.cells[operation.index].metadata = {
				...notebook.cells[operation.index].metadata,
				...operation.metadata,
			};

			return {
				type: 'set_metadata',
				index: operation.index,
				success: true,
				message: 'Cell metadata updated',
			};
		} else {
			// Set notebook metadata
			notebook.metadata = {
				...notebook.metadata,
				...operation.metadata,
			};

			return {
				type: 'set_metadata',
				success: true,
				message: 'Notebook metadata updated',
			};
		}
	}
}

export const notebookEditTool = new NotebookEditTool();
