import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';
import { CodeModeRuntime as TypescriptRuntime } from '../../packages/mcp-core/src/index.js';
import {
	type CodeModeAction,
	CodeModeDispatcher,
	CodeModeThermalError,
	type CodeModeRuntime as OrchestrationRuntime,
	recordCodeModeBenchmark,
} from '../../packages/orchestration/src/index.js';
import type { CodeModeResult } from '../../packages/orchestration/src/langgraph/code-mode-node.js';
import { createInitialN0State } from '../../packages/orchestration/src/langgraph/n0-state.js';

describe('multi-language code mode orchestration', () => {
	it('routes actions across runtimes and records performance metrics', async () => {
		const tracer = vi.fn();
		const dispatcher = new CodeModeDispatcher();
		const results: CodeModeResult[] = [];

		const session = {
			id: 'session-code-mode',
			model: 'brainwav-n0',
			user: 'integration-test',
			cwd: '/tmp',
		};

		const workspaceRoot = mkdtempSync(path.join(tmpdir(), 'code-mode-workspace-'));
		const relativeReport = path.join('reports', 'status.txt');
		const typescriptRuntime = new TypescriptRuntime({
			sessionId: session.id,
			language: 'typescript',
			tracer,
			invoke: async (tool, payload) => {
				if (tool === 'filesystem.write') {
					const { path: relativePath, content } = payload as { path: string; content: string };
					const absoluteTarget = path.join(workspaceRoot, relativePath);
					mkdirSync(path.dirname(absoluteTarget), { recursive: true });
					writeFileSync(absoluteTarget, content, 'utf8');
					return { status: 'written', path: absoluteTarget };
				}
				if (tool === 'filesystem.read') {
					const { path: relativePath } = payload as { path: string };
					const absoluteTarget = path.join(workspaceRoot, relativePath);
					return { content: readFileSync(absoluteTarget, 'utf8') };
				}
				return { tool, payload };
			},
		});

		dispatcher.registerRuntime(
			createWrapperRuntime('typescript', async (action) => ({
				language: 'typescript',
				tool: action.tool,
				durationMs: 3,
				output: await typescriptRuntime.dispatch(action.tool, action.payload),
			})),
		);

		let pythonHot = true;
		dispatcher.registerRuntime(
			createWrapperRuntime('python', async (action) => {
				if (pythonHot) {
					pythonHot = false;
					throw new CodeModeThermalError('python runtime overheated');
				}
				const { path: relativePath } = action.payload as { path: string };
				const absoluteTarget = path.join(workspaceRoot, relativePath);
				return {
					language: 'python',
					tool: action.tool,
					durationMs: 5,
					thermal: 68,
					output: { content: readFileSync(absoluteTarget, 'utf8') },
				};
			}),
		);

		dispatcher.registerRuntime(
			createWrapperRuntime('rust', async (action) => {
				const { path: relativePath } = action.payload as { path: string };
				const absoluteTarget = path.join(workspaceRoot, relativePath);
				return {
					language: 'rust',
					tool: action.tool,
					durationMs: 7,
					output: { ok: true, content: readFileSync(absoluteTarget, 'utf8') },
				};
			}),
		);

		const state = createInitialN0State('code-mode', session);

		const actions: CodeModeAction[] = [
			{
				id: 'ts-write',
				language: 'typescript',
				tool: 'filesystem.write',
				payload: { path: relativeReport, content: 'brAInwav runtime ready' },
			},
			{
				id: 'py-read',
				language: 'python',
				tool: 'filesystem.read',
				payload: { path: relativeReport },
				fallbacks: ['rust', 'typescript'],
			},
		];

		const next = await dispatcher.dispatch(state, actions, {
			sessionId: session.id,
			tracer,
			recordBenchmark: (result) => results.push(result),
		});

		const completed = (next.ctx?.codeMode as { completed: CodeModeResult[] }).completed;
		expect(completed).toHaveLength(2);
		expect(completed[0].language).toBe('typescript');
		expect(completed[1].language).toBe('rust');

		const absoluteReport = path.join(workspaceRoot, relativeReport);
		expect(readFileSync(absoluteReport, 'utf8')).toBe('brAInwav runtime ready');

		const tmpDir = mkdtempSync(path.join(tmpdir(), 'code-mode-benchmark-'));
		const target = path.join(tmpDir, 'performance.log');
		const lines: string[] = [];
		await Promise.all(
			results.map((result) =>
				recordCodeModeBenchmark(
					{
						write: async (content) => {
							lines.push(content.trim());
						},
					},
					result,
				),
			),
		);

		writeFileSync(target, lines.join('\n'), 'utf8');
		const fileContents = lines.join('\n');
		expect(fileContents).toContain('"brand":"brAInwav"');
		expect(fileContents).toContain('"language":"typescript"');
		expect(fileContents).toContain('"language":"rust"');

		rmSync(tmpDir, { recursive: true, force: true });
		rmSync(workspaceRoot, { recursive: true, force: true });
		expect(existsSync(workspaceRoot)).toBe(false);
	});
});

function createWrapperRuntime(
	language: OrchestrationRuntime['language'],
	handler: (action: CodeModeAction) => Promise<CodeModeResult>,
): OrchestrationRuntime {
	return {
		language,
		execute: handler,
	};
}
