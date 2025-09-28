import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bindKernelTools } from '../src/tool-binding.js';

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

        it('provides shell, filesystem, and http tools', () => {
                const tools = bindKernelTools({
                        cwd: tmpDir,
                        shell: { allow: ['echo'] },
                        filesystem: { allow: [tmpDir] },
                        http: { allow: ['https://example.com/'] },
                });
                const names = tools.map((t) => t.name);
                expect(names).toEqual(['shell.exec', 'fs.read', 'http.fetch']);
        });

        it('executes allowed shell commands and blocks disallowed ones', async () => {
                const tools = bindKernelTools({
                        cwd: tmpDir,
                        shell: { allow: ['echo'] },
                        filesystem: { allow: [tmpDir] },
                        http: { allow: [] },
                });
                const shellTool = tools.find((t) => t.name === 'shell.exec');
                if (!shellTool) throw new Error('shell tool missing');
                const result = await shellTool.execute({ command: 'echo hello' });
                expect(result).toMatchObject({ stdout: 'hello', exitCode: 0 });
                await expect(shellTool.execute({ command: 'ls' })).rejects.toThrow(/brAInwav shell deny/);
        });

        it('reads files only from the allowlist', async () => {
                const filePath = path.join(tmpDir, 'note.txt');
                await writeFile(filePath, 'secure content');
                const tools = bindKernelTools({
                        cwd: tmpDir,
                        shell: { allow: [] },
                        filesystem: { allow: [tmpDir] },
                        http: { allow: [] },
                });
                const fsTool = tools.find((t) => t.name === 'fs.read');
                if (!fsTool) throw new Error('fs tool missing');
                const read = await fsTool.execute({ path: 'note.txt' });
                expect(read).toMatchObject({ content: 'secure content' });
                await expect(fsTool.execute({ path: '../etc/passwd' })).rejects.toThrow(/brAInwav filesystem deny/);
        });

        it('enforces http allowlist and timeout', async () => {
                const fetchMock = vi.fn().mockResolvedValue({
                        status: 200,
                        ok: true,
                        text: async () => 'payload',
                });
                globalThis.fetch = fetchMock as unknown as typeof fetch;

                const tools = bindKernelTools({
                        cwd: tmpDir,
                        shell: { allow: [] },
                        filesystem: { allow: [tmpDir] },
                        http: { allow: ['https://example.com/api'], timeoutMs: 5000, maxBytes: 1024 },
                });
                const httpTool = tools.find((t) => t.name === 'http.fetch');
                if (!httpTool) throw new Error('http tool missing');

                const success = await httpTool.execute({ url: 'https://example.com/api/status' });
                expect(success).toMatchObject({ status: 200, ok: true, body: 'payload' });
                expect(fetchMock).toHaveBeenCalledTimes(1);

                await expect(httpTool.execute({ url: 'https://evil.example.com' })).rejects.toThrow(/brAInwav http deny/);
        });
});
