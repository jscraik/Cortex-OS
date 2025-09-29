import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseSlash } from '../src/parseSlash.js';
import { runSlash } from '../src/runSlash.js';
import type { BuiltinsApi } from '../src/types.js';

async function createProject(): Promise<{ projectDir: string; cleanup: () => Promise<void> }> {
        const projectDir = await mkdtemp(path.join(os.tmpdir(), 'commands-project-'));
        await mkdir(path.join(projectDir, '.cortex', 'commands'), { recursive: true });
        return {
                projectDir,
                cleanup: async () => {
                        await rm(projectDir, { recursive: true, force: true });
                },
        };
}

describe('slash command integration', () => {
        let projectDir: string;
        let cleanup: () => Promise<void>;

        beforeEach(async () => {
                const tmp = await createProject();
                projectDir = tmp.projectDir;
                cleanup = tmp.cleanup;
        });

        afterEach(async () => {
                await cleanup();
        });

        it('executes builtin commands with deterministic adapters', async () => {
                const modelState = { current: 'cortex-pro' };
                const agents: Array<{ id: string; name: string; description?: string }> = [
                        { id: 'agent-1', name: 'analyst', description: 'Investigates traces' },
                ];

                const builtinsApi: BuiltinsApi = {
                        async createAgent({ name }) {
                                const created = { id: `agent-${agents.length + 1}`, name };
                                agents.push(created);
                                return created;
                        },
                        async listAgents() {
                                return agents;
                        },
                        getModel() {
                                return modelState.current;
                        },
                        async setModel(next) {
                                modelState.current = next;
                        },
                        async compact({ focus }) {
                                return `Compacted with focus: ${focus ?? 'none'}`;
                        },
                } satisfies BuiltinsApi;

                const run = async (input: string) => {
                        const parsed = parseSlash(input);
                        if (!parsed) throw new Error('failed to parse slash command');
                        return runSlash(parsed, {
                                session: { cwd: projectDir, projectDir },
                                builtinsApi,
                        });
                };

                const help = await run('/help');
                expect(help.text).toContain('Usage: /help');
                expect(help.metadata?.command).toMatchObject({ name: 'help', scope: 'builtin' });

                const created = await run('/agents create explorer');
                expect(created.text).toContain('Created agent explorer');
                expect(created.metadata?.command).toMatchObject({ name: 'agents', scope: 'builtin' });
                expect(agents).toHaveLength(2);

                const listed = await run('/agents');
                expect(listed.text).toContain('analyst');
                expect(listed.text).toContain('explorer');

                const switched = await run('/model cortex-ultra');
                expect(switched.text).toContain('Model set to: cortex-ultra');
                expect(modelState.current).toBe('cortex-ultra');

                const compacted = await run('/compact focus:tests');
                expect(compacted.text).toBe('Compacted with focus: focus:tests');
        });

        it('preserves metadata from project command templates', async () => {
                const commandsDir = path.join(projectDir, '.cortex', 'commands');
                await mkdir(commandsDir, { recursive: true });

                await writeFile(
                        path.join(commandsDir, 'deploy.md'),
                        `---\nname: deploy\ndescription: Ship build\nmodel: cortex-deploy\nallowed-tools:\n  - kernel.bash\n  - kernel.readFile\nargument-hint: "<target>"\n---\nDeploying $ARGUMENTS`,
                        'utf8',
                );

                const parsed = parseSlash('/deploy staging');
                if (!parsed) throw new Error('expected deploy command to parse');

                const result = await runSlash(parsed, {
                        session: { cwd: projectDir, projectDir },
                        renderContext: { cwd: projectDir },
                });

                expect(result.text).toContain('Deploying staging');
                expect(result.metadata?.command).toMatchObject({
                        name: 'deploy',
                        scope: 'project',
                        model: 'cortex-deploy',
                        allowedTools: ['kernel.bash', 'kernel.readFile'],
                        argumentHint: '<target>',
                });
        });
});
