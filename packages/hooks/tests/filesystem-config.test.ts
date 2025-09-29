import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadHookConfigs } from '../src/loaders.js';
import { CortexHooks } from '../src/manager.js';

async function writeHookFile(dir: string, filename: string, content: string) {
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, filename), content, 'utf8');
}

describe('hook filesystem loading', () => {
        let projectDir: string;
        let userDir: string;

        beforeEach(async () => {
                projectDir = await mkdtemp(path.join(os.tmpdir(), 'hooks-project-'));
                userDir = await mkdtemp(path.join(os.tmpdir(), 'hooks-user-'));
        });

        afterEach(async () => {
                await rm(projectDir, { recursive: true, force: true });
                await rm(userDir, { recursive: true, force: true });
        });

        it('merges user hooks before project overrides', async () => {
                await writeHookFile(
                        path.join(userDir, 'hooks'),
                        'pretool.yaml',
                        `settings:\n  command:\n    allowlist:\n      - echo\nPreToolUse:\n  - matcher: "*"\n    hooks:\n      - type: command\n        command: "echo user"\n`,
                );
                await writeHookFile(
                        path.join(projectDir, '.cortex', 'hooks'),
                        'pretool.yaml',
                        `PreToolUse:\n  - matcher: "*"\n    hooks:\n      - type: command\n        command: "echo project"\n`,
                );

                const cfg = await loadHookConfigs({ projectDir, userDir });
                expect(cfg.settings?.command?.allowlist).toContain('echo');
                expect(cfg.PreToolUse?.length).toBe(2);
                expect(cfg.PreToolUse?.[0].hooks[0].command).toBe('echo user');
                expect(cfg.PreToolUse?.[1].hooks[0].command).toBe('echo project');
        });

        it('applies project command allowlist overrides', async () => {
                await writeHookFile(
                        path.join(userDir, 'hooks'),
                        'settings.yaml',
                        `settings:\n  command:\n    allowlist:\n      - npm run test\n`,
                );
                await writeHookFile(
                        path.join(projectDir, '.cortex', 'hooks'),
                        'settings.yaml',
                        `settings:\n  command:\n    allowlist:\n      - pnpm run lint\n`,
                );

                const cfg = await loadHookConfigs({ projectDir, userDir });
                expect(cfg.settings?.command?.allowlist).toEqual(['pnpm run lint']);
        });

        it('hot reloads hook configuration changes', async () => {
                const projectHooksDir = path.join(projectDir, '.cortex', 'hooks');
                await writeHookFile(
                        projectHooksDir,
                        'pretool.yaml',
                        `PreToolUse:\n  - matcher: "*"\n    hooks:\n      - type: command\n        command: "echo initial"\n`,
                );

                const hooks = new CortexHooks();
                await hooks.init({ projectDir, userDir });
                const watcher = hooks.watch({ projectDir, userDir });

                const ctx = {
                        event: 'PreToolUse' as const,
                        cwd: projectDir,
                        user: 'tester',
                        tool: { name: 'fs.read', input: {} },
                };

                const initial = await hooks.run('PreToolUse', ctx);
                expect(initial[0]).toMatchObject({ action: 'exec', output: 'initial' });

                await writeHookFile(
                        projectHooksDir,
                        'pretool.yaml',
                        `PreToolUse:\n  - matcher: "*"\n    hooks:\n      - type: command\n        command: "echo updated"\n`,
                );
                await new Promise((resolve) => setTimeout(resolve, 300));

                const updated = await hooks.run('PreToolUse', ctx);
                expect(updated[0]).toMatchObject({ action: 'exec', output: 'updated' });

                await watcher.close();
        });
});
