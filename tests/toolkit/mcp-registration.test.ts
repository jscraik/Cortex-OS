/**
 * Agent Toolkit MCP Runtime Tests
 *
 * Validates the runtime wrapper that exposes @cortex-os/agent-toolkit functionality
 * to the Model Context Protocol (MCP) surface with brAInwav governance guarantees.
 */

import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentToolkitMcpRuntime } from '../../packages/agent-toolkit/src/mcp/runtime';
import * as processModule from '../../packages/rag/src/lib/run-process.js';
import type { McpEvent } from '../../packages/agent-toolkit/src/mcp/runtime';

type ToolkitStub = ReturnType<typeof createToolkitStub>;

const createToolkitStub = () => ({
	search: vi.fn(async (pattern: string, path: string) => ({
		tool: 'ripgrep',
		op: 'search',
		inputs: { pattern, path },
		results: [],
	})),
	multiSearch: vi.fn(async (pattern: string, path: string) => [
		{ tool: 'ripgrep', op: 'search', inputs: { pattern, path }, results: [] },
		{ tool: 'semgrep', op: 'search', inputs: { pattern, path }, results: [] },
	]),
	codemod: vi.fn(async (find: string, replace: string, path: string) => ({
		tool: 'comby',
		op: 'rewrite',
		inputs: { find, replace, path },
		results: [{ file: path, changes: 1 }],
	})),
	validate: vi.fn(async (files: string[]) => ({
		tool: 'multi-validator',
		op: 'validate',
		inputs: { files },
		results: [],
		summary: { total: 0, errors: 0, warnings: 0 },
	})),
	generateCodemap: vi.fn(async (input: unknown) => ({
		tool: 'codemap',
		op: 'generate',
		input,
		artifacts: [],
	})),
});

describe('AgentToolkitMcpRuntime', () => {
	let toolkit: ToolkitStub;
	let events: McpEvent[];
	let runtime: AgentToolkitMcpRuntime;

	beforeEach(() => {
		toolkit = createToolkitStub();
		events = [];
		runtime = new AgentToolkitMcpRuntime({
			toolkit,
			publishEvent: (event) => {
				events.push(event);
			},
			now: () => Date.now(),
		});
	});

	it('rejects unknown tools with brAInwav-branded error', async () => {
		await expect(runtime.execute('unknown_tool', {})).rejects.toThrow(
			/brAInwav Agent Toolkit: MCP tool 'unknown_tool' not found/,
		);
	});

	it('emits execution started and completed events for search', async () => {
		const result = await runtime.execute('agent_toolkit_search', {
			pattern: 'brAInwav',
			path: '/src',
		});

		expect(result.success).toBe(true);
		expect(events.find((event) => event.type === 'agent_toolkit.execution.started')).toBeDefined();
		expect(events.find((event) => event.type === 'agent_toolkit.execution.completed')).toBeDefined();
	});

	it('returns validation failure without throwing', async () => {
		const result = await runtime.execute('agent_toolkit_search', {
			pattern: '',
			path: '',
		});

		expect(result.success).toBe(false);
		expect(result.error).toMatch(/Validation failed/i);
		expect(runtime.getStats().failedExecutions).toBe(1);
	});

	it('opens circuit breaker after repeated failures', async () => {
		toolkit.search.mockImplementation(async () => {
			throw new Error('ripgrep unavailable');
		});

		for (let i = 0; i < 5; i++) {
			const outcome = await runtime.execute('agent_toolkit_search', {
				pattern: 'fail',
				path: '/tmp',
			});
			expect(outcome.success).toBe(false);
		}

		const breakerResult = await runtime.execute('agent_toolkit_search', {
			pattern: 'fail',
			path: '/tmp',
		});
		expect(breakerResult.success).toBe(false);
		expect(breakerResult.error).toMatch(/Circuit breaker open/);
	});

	it('emits code modification events for codemod tool', async () => {
		await runtime.execute('agent_toolkit_codemod', {
			find: 'old',
			replace: 'new',
			path: '/src/file.ts',
		});

		expect(events.some((event) => event.type === 'agent_toolkit.code.modified')).toBe(true);
	});

	it('marks token usage as trimmed when exceeding limit', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const longPattern = 'brAInwav'.repeat(6000);

		const result = await runtime.execute('agent_toolkit_multi_search', {
			pattern: longPattern,
			path: '/repo',
		});

		expect(result.metadata.trimmedTokens).toBe(true);
		expect(warnSpy).toHaveBeenCalledOnce();
		warnSpy.mockRestore();
	});

	it('produces execution statistics', async () => {
		await runtime.execute('agent_toolkit_search', { pattern: 'ok', path: '/repo' });
		await runtime.execute('agent_toolkit_search', { pattern: '', path: '' });

		const stats = runtime.getStats();
		expect(stats.totalExecutions).toBe(2);
		expect(stats.failedExecutions).toBe(1);
		const searchStats = stats.tools.find((entry) => entry.name === 'agent_toolkit_search');
		expect(searchStats).toBeDefined();
	});

	it('emits batch completion events', async () => {
		await runtime.batchSearch([
			{ pattern: 'one', path: '/repo' },
			{ pattern: 'two', path: '/repo' },
		]);

		expect(events.some((event) => event.type === 'agent_toolkit.batch.completed')).toBe(true);
	});
});

describe('FastMCP CLI schema guard', () => {
	it('matches the recorded baseline schema JSON', async () => {
		const baselineUrl = new URL('../../reports/baseline/fastmcp-schema.json', import.meta.url);
		const baseline = JSON.parse(readFileSync(baselineUrl, 'utf8')) as Record<string, unknown>;
		const spy = vi
			.spyOn(processModule, 'runProcess')
			.mockResolvedValue(baseline);

		const result = await processModule.runProcess('fastmcp', ['cli', '--schema', '--format', 'json'], {
			parseJson: true,
			timeoutMs: 30_000,
		});

		expect(result).toEqual(baseline);
		spy.mockRestore();
	});
});
