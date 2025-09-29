import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bindKernelTools } from '../src/tools/bind-kernel-tools.js';

describe('bindKernelTools', () => {
        let tmpDir: string;
        let originalFetch: typeof fetch;

        beforeEach(async () => {
                tmpDir = await mkdtemp(path.join(os.tmpdir(), 'kernel-tools-'));
                originalFetch = globalThis.fetch;
        });

        afterEach(async () => {
                globalThis.fetch = originalFetch;
                await rm(tmpDir, { recursive: true, force: true });
        });

        it('returns kernel tools with metadata and allow-lists', () => {
                const binding = bindKernelTools({
                        cwd: tmpDir,
                        bashAllow: ['echo*'],
                        fsAllow: ['**/*.txt'],
                        netAllow: ['https://example.com/api/**'],
                        timeoutMs: 5000,
                        defaultModel: 'cortex-kernel',
                });

                const toolNames = binding.tools.map((tool) => tool.name);
                expect(toolNames).toEqual(['kernel.bash', 'kernel.readFile', 'kernel.fetchJson']);
                expect(binding.metadata.allowLists).toMatchObject({
                        bash: ['echo*'],
                        filesystem: ['**/*.txt'],
                        network: ['https://example.com/api/**'],
                });
                expect(binding.metadata.timeoutMs).toBe(5000);
                expect(binding.metadata.defaultModel).toBe('cortex-kernel');
        });

        it('executes allowed bash commands and rejects disallowed ones', async () => {
                const binding = bindKernelTools({
                        cwd: tmpDir,
                        bashAllow: ['echo*'],
                        fsAllow: ['**/*.txt'],
                        netAllow: ['https://example.com/api/**'],
                });

                const bashTool = binding.tools.find((tool) => tool.name === 'kernel.bash');
                if (!bashTool) throw new Error('bash tool missing');

                const ok = await bashTool.invoke({ command: 'echo hello' });
                expect(ok).toMatchObject({ stdout: expect.stringContaining('hello'), exitCode: 0 });

                await expect(bashTool.invoke({ command: 'ls' })).rejects.toThrow(/bash request/);
        });

        it('reads files within the allow list and blocks escaped paths', async () => {
                const filePath = path.join(tmpDir, 'notes.txt');
                await writeFile(filePath, 'secure content');

                const binding = bindKernelTools({
                        cwd: tmpDir,
                        bashAllow: ['echo*'],
                        fsAllow: ['**/*.txt'],
                        netAllow: ['https://example.com/api/**'],
                        maxReadBytes: 32,
                });

                const fsTool = binding.tools.find((tool) => tool.name === 'kernel.readFile');
                if (!fsTool) throw new Error('filesystem tool missing');

                const read = await fsTool.invoke({ path: 'notes.txt' });
                expect(read).toMatchObject({ content: 'secure content', truncated: false });

                await expect(fsTool.invoke({ path: '../etc/passwd' })).rejects.toThrow(/filesystem request/);
        });

        it('enforces network allow list and timeout rules', async () => {
                const fetchMock = vi.fn().mockResolvedValue({
                        status: 200,
                        ok: true,
                        text: async () => 'payload',
                        headers: { entries: () => [['content-type', 'text/plain']] },
                        statusText: 'OK',
                });
                globalThis.fetch = fetchMock as unknown as typeof fetch;

                const binding = bindKernelTools({
                        cwd: tmpDir,
                        bashAllow: ['echo*'],
                        fsAllow: ['**/*.txt'],
                        netAllow: ['https://example.com/api/**'],
                        timeoutMs: 5000,
                });

                const httpTool = binding.tools.find((tool) => tool.name === 'kernel.fetchJson');
                if (!httpTool) throw new Error('http tool missing');

                const result = await httpTool.invoke({ url: 'https://example.com/api/status' });
                expect(result).toMatchObject({ status: 200, ok: true, body: 'payload' });
                expect(fetchMock).toHaveBeenCalledTimes(1);

                await expect(httpTool.invoke({ url: 'https://evil.example.com/' })).rejects.toThrow(
                        /network request/,
                );
        });
});
