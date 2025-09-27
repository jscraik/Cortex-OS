import type { AgentToolkitInput, AgentToolkitResult } from '@cortex-os/contracts';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CodeQualityUseCase, CodeSearchUseCase } from '../app/UseCases.js';
import type { ToolExecutor } from '../domain/ToolExecutor.js';

const createStubExecutor = (matches: Array<{ file: string }>): ToolExecutor => ({
	async execute(toolName: string, inputs: AgentToolkitInput): Promise<AgentToolkitResult> {
		if (toolName === 'ripgrep' || toolName === 'semgrep' || toolName === 'ast-grep') {
			return { tool: toolName, op: 'search', inputs, results: matches } as AgentToolkitResult;
		}
		if (toolName === 'eslint') {
			return {
				tool: 'eslint',
				op: 'validate',
				inputs,
				results: [],
				summary: { total: 0, errors: 0, warnings: 0 },
			} as AgentToolkitResult;
		}
		if (toolName === 'ruff') {
			return {
				tool: 'ruff',
				op: 'validate',
				inputs,
				results: [],
				summary: { total: 0, errors: 0, warnings: 0 },
			} as AgentToolkitResult;
		}
		if (toolName === 'cargo') {
			return {
				tool: 'cargo',
				op: 'validate',
				inputs,
				results: [],
				summary: { total: 0, errors: 0, warnings: 0 },
			} as AgentToolkitResult;
		}
		throw new Error(`unknown tool ${toolName}`);
	},
	async isAvailable() {
		return true;
	},
	async getAvailableTools() {
		return [];
	},
});

describe('UseCases context integration', () => {
	it('multiSearchWithContext builds context when files exist', async () => {
		const dir = await mkdtemp(join(tmpdir(), 'atk-'));
		const fileA = join(dir, 'a.ts');
		const fileB = join(dir, 'b.py');
		await writeFile(fileA, 'export function one() { return 1 }');
		await writeFile(fileB, 'def two():\n    return 2\n');
		const matches = [{ file: fileA }, { file: fileB }];
		const exec = createStubExecutor(matches);
		const cs = new CodeSearchUseCase(exec);
		const out = await cs.multiSearchWithContext('x', dir, { tokenBudget: { maxTokens: 200 } });
		expect(out.context).toBeTruthy();
		expect(out.context?.chunks.length).toBeGreaterThan(0);
		await rm(dir, { recursive: true, force: true });
	});

	it('validateProjectSmart returns report and optional context', async () => {
		const dir = await mkdtemp(join(tmpdir(), 'atk-'));
		const f1 = join(dir, 'x.ts');
		const f2 = join(dir, 'y.py');
		await writeFile(f1, 'export const x = 1');
		await writeFile(f2, 'def y():\n    return 3\n');
		const exec = createStubExecutor([]);
		const q = new CodeQualityUseCase(exec);
		const out = await q.validateProjectSmart([f1, f2], { tokenBudget: { maxTokens: 100 } });
		expect(out.report.summary.totalFiles).toBe(2);
		expect(out.context?.length ?? 0).toBeGreaterThan(0);
		await rm(dir, { recursive: true, force: true });
	});
});
