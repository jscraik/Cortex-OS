import { promises as fs } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadCommands } from '../src/loader.js';
import { parseSlash } from '../src/parseSlash.js';
import { runSlash } from '../src/runSlash.js';
import type { RenderContext } from '../src/types.js';

async function createTempProject(): Promise<{ projectDir: string; cleanup: () => Promise<void> }> {
        const root = await mkdtemp(path.join(os.tmpdir(), 'commands-project-'));
        await fs.mkdir(path.join(root, '.cortex', 'commands'), { recursive: true });
        await writeFile(path.join(root, '.cortex', 'commands', 'README.md'), '# commands\n', { flag: 'w' });
        return {
                projectDir: root,
                cleanup: async () => {
                        await rm(root, { recursive: true, force: true });
                },
        };
}

describe('runSlash integration', () => {
        let projectDir: string;
        let cleanup: () => Promise<void>;

        beforeEach(async () => {
                const tmp = await createTempProject();
                projectDir = tmp.projectDir;
                cleanup = tmp.cleanup;
        });

        afterEach(async () => {
                await cleanup();
        });

        it('short-circuits built-in commands before LangGraph execution', async () => {
                await fs.mkdir(path.join(projectDir, '.cortex', 'commands'), { recursive: true });
                const parsed = parseSlash('/help');
                if (!parsed) throw new Error('expected parsed command');
                const result = await runSlash(parsed, {
                        session: { cwd: projectDir, projectDir },
                });
                expect(result.text).toContain('Usage: /help');
                expect(result.metadata?.command).toMatchObject({
                        name: 'help',
                        scope: 'builtin',
                });
        });

        it('loads project-defined command templates with precedence over user commands', async () => {
                const commandsDir = path.join(projectDir, '.cortex', 'commands');
                await fs.mkdir(commandsDir, { recursive: true });
                const projectCommandPath = path.join(commandsDir, 'deploy.md');
                await writeFile(
                        projectCommandPath,
                        `---\nname: deploy\ndescription: Project deploy\nallowed-tools:\n  - "Bash(pnpm run deploy)"\n---\nDeploying $ARGUMENTS`,
                );

                const userDir = await mkdtemp(path.join(os.tmpdir(), 'commands-user-'));
                const userCommandsDir = path.join(userDir, 'commands');
                await fs.mkdir(userCommandsDir, { recursive: true });
                await writeFile(
                        path.join(userCommandsDir, 'deploy.md'),
                        `---\nname: deploy\ndescription: User override\n---\nUser $ARGUMENTS`,
                );

                const parsed = parseSlash('/deploy main');
                if (!parsed) throw new Error('expected parsed command');
                const ctx: RenderContext = { cwd: projectDir };
                const result = await runSlash(parsed, {
                        session: { cwd: projectDir, projectDir, userDir: userCommandsDir },
                        renderContext: ctx,
                });

                expect(result.text).toContain('Deploying main');
                expect(result.metadata?.command).toMatchObject({
                        name: 'deploy',
                        scope: 'project',
                        description: 'Project deploy',
                        allowedTools: ['Bash(pnpm run deploy)'],
                        model: 'inherit',
                });
                const loaded = await loadCommands({ projectDir, userDir: userCommandsDir });
                expect(loaded.get('deploy')?.scope).toBe('project');

                await rm(userDir, { recursive: true, force: true });
        });
});
