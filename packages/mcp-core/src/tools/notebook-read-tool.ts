import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { McpTool, ToolExecutionContext } from '../tools.js';
import { ToolExecutionError } from '../tools.js';

const NotebookReadInputSchema = z.object({
	path: z.string().min(1, 'path is required'),
	maxCells: z.number().int().min(1).max(500).optional(),
});

export type NotebookReadInput = z.infer<typeof NotebookReadInputSchema>;

const NbCellSchema = z.object({
	cell_type: z.enum(['markdown', 'code']),
	source: z.array(z.string()).or(z.string()),
	metadata: z.record(z.unknown()).optional(),
	execution_count: z.number().int().nullable().optional(),
	outputs: z.array(z.unknown()).optional(),
});

const NbSchema = z.object({
	nbformat: z.number().int(),
	nbformat_minor: z.number().int(),
	metadata: z.record(z.unknown()).optional(),
	cells: z.array(NbCellSchema),
});

export interface NotebookCell {
	type: 'markdown' | 'code';
	source: string;
	executionCount?: number | null;
}

export interface NotebookReadResult {
	path: string;
	nbformat: string;
	totalCells: number;
	cells: NotebookCell[];
	timestamp: string;
}

export class NotebookReadTool implements McpTool<NotebookReadInput, NotebookReadResult> {
	readonly name = 'notebook-read';
	readonly description = 'Reads a Jupyter notebook (.ipynb) and returns structured cells.';
	readonly inputSchema = NotebookReadInputSchema;

	async execute(
		input: NotebookReadInput,
		context?: ToolExecutionContext,
	): Promise<NotebookReadResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('Notebook read aborted.', { code: 'E_TOOL_ABORTED' });
		}

		try {
			const filePath = resolve(input.path);
			const cwd = process.cwd();
			if (!filePath.startsWith(cwd)) {
				throw new ToolExecutionError(`Access denied: ${input.path} is outside workspace`, {
					code: 'E_ACCESS_DENIED',
				});
			}

			const s = await stat(filePath);
			if (!s.isFile()) {
				throw new ToolExecutionError(`Path is not a file: ${input.path}`, { code: 'E_NOT_A_FILE' });
			}

			const raw = await readFile(filePath, 'utf8');
			let parsed: unknown;
			try {
				parsed = JSON.parse(raw);
			} catch (e) {
				throw new ToolExecutionError(`Invalid JSON in notebook: ${input.path}`, {
					code: 'E_INVALID_JSON',
					cause: e,
				});
			}

			const nb = NbSchema.parse(parsed);
			const max = input.maxCells ?? 200;
			const cells: NotebookCell[] = nb.cells.slice(0, max).map((c) => ({
				type: c.cell_type,
				source: Array.isArray(c.source) ? c.source.join('') : c.source,
				executionCount: c.execution_count ?? undefined,
			}));

			return {
				path: input.path,
				nbformat: `${nb.nbformat}.${nb.nbformat_minor}`,
				totalCells: nb.cells.length,
				cells,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			if (error instanceof ToolExecutionError) throw error;
			const message = error instanceof Error ? error.message : String(error);
			const code = message.includes('ENOENT') ? 'E_FILE_NOT_FOUND' : 'E_NOTEBOOK_READ_FAILED';
			throw new ToolExecutionError(`Failed to read notebook: ${message}`, { code, cause: error });
		}
	}
}

export const notebookReadTool = new NotebookReadTool();
