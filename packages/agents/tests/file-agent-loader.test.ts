import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SubagentManager } from '../src/subagents/SubagentManager.js';

async function writeAgentFile(dir: string, filename: string, frontMatter: string, body: string) {
        await mkdir(dir, { recursive: true });
        const content = `---\n${frontMatter}\n---\n${body}`;
        await writeFile(path.join(dir, filename), content, 'utf8');
}

describe('SubagentManager file loading', () => {
        let projectDir: string;
        let userDir: string;
        let manager: SubagentManager;

        beforeEach(async () => {
                projectDir = await mkdtemp(path.join(os.tmpdir(), 'agents-project-'));
                userDir = await mkdtemp(path.join(os.tmpdir(), 'agents-user-'));
                manager = new SubagentManager();
        });

        afterEach(async () => {
                await manager.shutdown().catch(() => {});
                await rm(projectDir, { recursive: true, force: true });
                await rm(userDir, { recursive: true, force: true });
        });

        it('loads project agents with precedence over user definitions', async () => {
                const projectAgents = path.join(projectDir, '.cortex', 'agents');
                await writeAgentFile(
                        path.join(userDir),
                        'docs.md',
                        'name: docs\ndescription: user docs\nallowed_tools:\n  - fs.read',
                        'User body',
                );
                await writeAgentFile(
                        projectAgents,
                        'docs.md',
                        'name: docs\ndescription: project docs\nallowed_tools:\n  - fs.read',
                        'Project body',
                );
                await writeAgentFile(
                        path.join(userDir),
                        'researcher.md',
                        'name: researcher\ndescription: user researcher\nallowed_tools:\n  - web.get',
                        'Research body',
                );

                await manager.initialize({ projectDir, userDir });

                const projectAgent = manager.getSubagentConfig('docs');
                expect(projectAgent?.scope).toBe('project');
                expect(projectAgent?.description).toBe('project docs');
                expect(projectAgent?.systemPrompt).toContain('Project body');

                const userAgent = manager.getSubagentConfig('researcher');
                expect(userAgent?.scope).toBe('user');
                expect(userAgent?.systemPrompt).toContain('Research body');
        });

        it('hot reloads markdown updates when watching is enabled', async () => {
                const projectAgents = path.join(projectDir, '.cortex', 'agents');
                const projectFile = path.join(projectAgents, 'docs.md');
                await writeAgentFile(projectAgents, 'docs.md', 'name: docs\ndescription: initial', 'First prompt');

                await manager.initialize({ projectDir, userDir, watch: true, reloadOnChange: true });

                let config = manager.getSubagentConfig('docs');
                expect(config?.description).toBe('initial');
                expect(config?.systemPrompt).toContain('First prompt');

                await new Promise((resolve) => setTimeout(resolve, 200));
                const reloadPromise = new Promise<void>((resolve, reject) => {
                        const timer = setTimeout(() => reject(new Error('Timed out waiting for reload')), 2_000);
                        manager.once('subagentManagerSubagentReloaded', () => {
                                clearTimeout(timer);
                                resolve();
                        });
                });
                await writeAgentFile(projectAgents, 'docs.md', 'name: docs\ndescription: updated', 'Updated prompt');
                await reloadPromise;

                config = manager.getSubagentConfig('docs');
                expect(config?.description).toBe('updated');
                expect(config?.systemPrompt).toContain('Updated prompt');

                await rm(projectFile, { force: true });
        });
});
