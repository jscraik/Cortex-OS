import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockRandomUUID = vi.fn(() => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
vi.mock('node:crypto', () => ({
        randomUUID: mockRandomUUID,
}));

import { renderTemplate, runCommand } from '../src/runner.js';

const cwd = process.cwd();

describe('renderTemplate', () => {
        beforeEach(() => {
                mockRandomUUID.mockClear();
        });

        it('substitutes positional and aggregate arguments', async () => {
                const tpl = 'Args: $ARGUMENTS | $1 | $2';
                const out = await renderTemplate(tpl, ['One', 'Two'], { cwd });
                expect(out).toBe('Args: One Two | One | Two');
        });

        it('expands bash snippets when allowed', async () => {
                const tpl = 'Status: !`git status`';
                const runBashSafe = vi.fn(async (cmd: string) => ({ stdout: `OK:${cmd}`, stderr: '', code: 0 }));
                const out = await renderTemplate(
                        tpl,
                        [],
                        {
                                cwd,
                                runBashSafe,
                        },
                        ['Bash(git status:*)'],
                );
                expect(runBashSafe).toHaveBeenCalledTimes(1);
                expect(out).toContain('OK:git status');
        });

        it('denies bash when command is not on allowlist', async () => {
                const tpl = 'Status: !`git status`';
                const runBashSafe = vi.fn(async () => ({ stdout: 'blocked', stderr: '', code: 0 }));
                const out = await renderTemplate(
                        tpl,
                        [],
                        {
                                cwd,
                                runBashSafe,
                        },
                        ['Bash(ls:*)'],
                );
                expect(runBashSafe).not.toHaveBeenCalled();
                expect(out).toContain('<bash-denied:git status>');
        });

        it('denies bash when not allowed at all', async () => {
                const tpl = 'Status: !`git status`';
                const out = await renderTemplate(tpl, [], { cwd }, []);
                expect(out).toContain('<bash-denied:git status>');
        });

        it('includes files when allowed', async () => {
                const tpl = 'File: @README.md';
                const out = await renderTemplate(tpl, [], {
                        cwd,
                        readFileCapped: async () => 'CONTENT',
                        fileAllowlist: ['**/README.md'],
                });
                expect(out).toContain('CONTENT');
        });

        it('denies file includes outside of allowlist', async () => {
                const tpl = 'File: @secret.env';
                const readFileCapped = vi.fn(async () => 'should-not-read');
                const out = await renderTemplate(tpl, [], {
                        cwd,
                        readFileCapped,
                        fileAllowlist: ['docs/**'],
                });
                expect(readFileCapped).not.toHaveBeenCalled();
                expect(out).toContain('<file-denied:secret.env>');
        });
});

describe('runCommand', () => {
        beforeEach(() => {
                vi.useFakeTimers();
                vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
                mockRandomUUID.mockClear();
                mockRandomUUID.mockReturnValue('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
        });

        afterEach(() => {
                vi.useRealTimers();
        });

        it('emits run IDs via crypto.randomUUID and merges command metadata', async () => {
                const expectedRunId = `run-${Date.now().toString(36)}-aaaaaaaa`;
                const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
                const command = {
                        name: 'diagnostics',
                        scope: 'builtin' as const,
                        model: 'gpt-4o-mini',
                        allowedTools: ['Bash(git status:*)'],
                        execute: vi.fn().mockResolvedValue({
                                text: 'ok',
                                metadata: { custom: true },
                        }),
                };
                const result = await runCommand(command, [], { cwd });

                expect(mockRandomUUID).toHaveBeenCalledTimes(1);
                expect(result.text).toBe('ok');
                expect(result.metadata?.custom).toBe(true);
                expect(result.metadata?.command).toEqual(
                        expect.objectContaining({
                                name: 'diagnostics',
                                model: 'gpt-4o-mini',
                                allowedTools: ['Bash(git status:*)'],
                                scope: 'builtin',
                        }),
                );
                expect(logSpy).toHaveBeenCalledWith(
                        '[commands][info]',
                        'command.start',
                        expect.objectContaining({
                                runId: expectedRunId,
                                command: 'diagnostics',
                                scope: 'builtin',
                                args: [],
                        }),
                );
                logSpy.mockRestore();
        });

        it('does not depend on Math.random for run ids', async () => {
                const originalRandom = Math.random;
                Math.random = () => {
                        throw new Error('brAInwav prohibits Math.random in production paths');
                };
                try {
                        const res = await runCommand(
                                {
                                        name: 'test-cmd',
                                        scope: 'builtin' as const,
                                        execute: async () => ({ text: 'ok' }),
                                },
                                [],
                                { cwd },
                        );
                        expect(res.text).toBe('ok');
                } finally {
                        Math.random = originalRandom;
                }
        });
});
