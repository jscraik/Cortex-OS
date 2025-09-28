/**
 * @file tool-binding.test.ts
 * @description TDD coverage for bindKernelTools policy guards and metadata
 * @author brAInwav
 */

import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	KernelBashInput,
	KernelBashResult,
	KernelFetchInput,
	KernelFetchResult,
	KernelReadFileInput,
	KernelReadFileResult,
	KernelTool,
} from '../src/tools/bind-kernel-tools.js';
import { bindKernelTools } from '../src/tools/bind-kernel-tools.js';

async function createTempDir(): Promise<string> {
	return await fs.mkdtemp(path.join(tmpdir(), 'bind-kernel-tools-'));
}

function getTool<TInput, TResult>(
	tools: KernelTool<unknown, unknown>[],
	name: string,
): KernelTool<TInput, TResult> {
	const tool = tools.find((candidate) => candidate.name === name);
	if (!tool) {
		throw new Error(`Expected tool ${name} to exist in binding result`);
	}
	return tool as KernelTool<TInput, TResult>;
}

describe('bindKernelTools', () => {
	let tempDir: string;
	let originalFetch: typeof globalThis.fetch;

	beforeEach(async () => {
		tempDir = await createTempDir();
		originalFetch = globalThis.fetch;
	});

	afterEach(async () => {
		globalThis.fetch = originalFetch;
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	it('exposes kernel tools with metadata and enforces allow lists', async () => {
		const fetchMock = vi.fn(async () =>
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			}),
		);
		globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

		const binding = bindKernelTools({
			cwd: tempDir,
			bashAllow: ['echo *'],
			fsAllow: ['**/*.txt'],
			netAllow: ['https://example.com/**'],
			defaultModel: 'brAInwav-sonnet',
			timeoutMs: 200,
			maxReadBytes: 1024,
			securityTools: [
				{
					name: 'run_semgrep_scan',
					description: 'Run Semgrep static analysis security scan',
					allow: ['apps/**', 'packages/**'],
				},
			],
		});

		expect(binding.metadata.brand).toContain('brAInwav');
		expect(binding.metadata.defaultModel).toBe('brAInwav-sonnet');
		expect(binding.metadata.allowLists.bash).toEqual(['echo *']);
		const toolNames = binding.tools.map(
			(tool: KernelTool<unknown, unknown>) => tool.name,
		);
		expect(toolNames).toEqual(
			expect.arrayContaining(['kernel.bash', 'kernel.readFile', 'kernel.fetchJson']),
		);

		const bashTool = getTool<KernelBashInput, KernelBashResult>(binding.tools, 'kernel.bash');
		const bashResult = await bashTool.invoke({ command: 'echo brAInwav-shell' });
		expect(bashResult.stdout.trim()).toBe('brAInwav-shell');

		const textPath = path.join(tempDir, 'notes.txt');
		await fs.writeFile(textPath, 'Hello brAInwav kernel');

		const readTool = getTool<KernelReadFileInput, KernelReadFileResult>(
			binding.tools,
			'kernel.readFile',
		);
		const readResult = await readTool.invoke({ path: 'notes.txt' });
		expect(readResult.content).toContain('brAInwav kernel');
		expect(readResult.truncated).toBe(false);

		const fetchTool = getTool<KernelFetchInput, KernelFetchResult>(binding.tools, 'kernel.fetchJson');
		const fetchResult = await fetchTool.invoke({ url: 'https://example.com/status' });
		expect(fetchResult.status).toBe(200);
		expect(fetchResult.body).toContain('"ok":true');
		expect(fetchResult.headers['content-type']).toBe('application/json');
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(binding.metadata.security?.brand).toBe('brAInwav cortex-sec');
		expect(binding.metadata.security?.tools).toEqual([
			{
				name: 'run_semgrep_scan',
				description: 'Run Semgrep static analysis security scan',
				allowList: ['apps/**', 'packages/**'],
			},
		]);
	});

	it('rejects commands outside the bash allowlist with brAInwav branded errors', async () => {
		const binding = bindKernelTools({
			cwd: tempDir,
			bashAllow: ['echo safe*'],
			fsAllow: ['**/*.txt'],
		});
		const bashTool = getTool<KernelBashInput, KernelBashResult>(binding.tools, 'kernel.bash');

		await expect(bashTool.invoke({ command: 'rm -rf /' })).rejects.toThrow(
			/brAInwav kernel policy violation/i,
		);
	});

	it('prevents filesystem access outside configured allowlist', async () => {
		const binding = bindKernelTools({
			cwd: tempDir,
			bashAllow: ['echo *'],
			fsAllow: ['secure/**'],
		});
		const readTool = getTool<KernelReadFileInput, KernelReadFileResult>(
			binding.tools,
			'kernel.readFile',
		);

		await expect(readTool.invoke({ path: '../secrets.txt' })).rejects.toThrow(
			/brAInwav kernel policy violation/i,
		);
	});

	it('blocks network requests that violate the net allowlist', async () => {
		const binding = bindKernelTools({
			cwd: tempDir,
			bashAllow: ['echo *'],
			fsAllow: ['**/*.txt'],
			netAllow: ['https://trusted.brainwav.dev/**'],
		});
		const fetchTool = getTool<KernelFetchInput, KernelFetchResult>(binding.tools, 'kernel.fetchJson');

		await expect(
			fetchTool.invoke({ url: 'https://untrusted.example.com/data', method: 'GET' }),
		).rejects.toThrow(/brAInwav kernel policy violation/i);
	});
});
