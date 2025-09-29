import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
        AgentTemplateError,
        loadAgentTemplates,
        type AgentTemplate,
} from '../src/file-agent-loader.js';

async function writeAgentFile(dir: string, filename: string, frontMatter: string, body = '') {
        await mkdir(dir, { recursive: true });
        const content = body ? `---\n${frontMatter}\n---\n${body}` : frontMatter;
        await writeFile(path.join(dir, filename), content, 'utf8');
}

describe('file agent loader', () => {
        let projectDir: string;
        let userDir: string;

        beforeEach(async () => {
                projectDir = await mkdtemp(path.join(os.tmpdir(), 'agents-project-'));
                userDir = await mkdtemp(path.join(os.tmpdir(), 'agents-user-'));
        });

        afterEach(async () => {
                await rm(projectDir, { recursive: true, force: true });
                await rm(userDir, { recursive: true, force: true });
        });

        it('prefers project templates over user definitions', async () => {
                const userAgents = path.join(userDir, '.cortex', 'agents');
                const projectAgents = path.join(projectDir, '.cortex', 'agents');

                await writeAgentFile(
                        userAgents,
                        'docs.md',
                        'name: docs\ndescription: user docs\ntools:\n  - kernel.readFile\ncapabilities:\n  - summarize',
                        'User docs body',
                );
                await writeAgentFile(
                        projectAgents,
                        'docs.md',
                        'name: docs\ndescription: project docs\nmodel: cortex-writer\ntools:\n  - kernel.bash',
                        'Project docs body',
                );
                await writeAgentFile(
                        userAgents,
                        'researcher.md',
                        'name: researcher\ndescription: research agent\nmodel: cortex-research',
                        'Research prompt',
                );

                const templates = await loadAgentTemplates({ projectDir, userDir });
                const projectTemplate = templates.get('docs');
                const userTemplate = templates.get('researcher');

                expect(projectTemplate?.scope).toBe('project');
                expect(projectTemplate?.config.model).toBe('cortex-writer');
                expect(projectTemplate?.prompt).toContain('Project docs body');
                expect(userTemplate?.scope).toBe('user');
                expect(userTemplate?.prompt).toContain('Research prompt');
        });

        it('validates schema and surfaces branded errors', async () => {
                const projectAgents = path.join(projectDir, '.cortex', 'agents');
                await writeAgentFile(projectAgents, 'broken.yaml', 'name: broken');

                await expect(loadAgentTemplates({ projectDir, userDir })).rejects.toMatchObject({
                        name: 'AgentTemplateError',
                        message: expect.stringContaining('brAInwav agent template validation failed'),
                } satisfies Partial<AgentTemplateError>);
        });

        it('loads JSON templates and normalises metadata', async () => {
                const projectAgents = path.join(projectDir, '.cortex', 'agents');
                await writeAgentFile(
                        projectAgents,
                        'planner.json',
                        JSON.stringify({
                                name: 'planner',
                                description: 'Planning specialist',
                                systemPrompt: 'Plan carefully',
                                tools: ['kernel.readFile'],
                                capabilities: ['planning'],
                                model: 'cortex-plan',
                                timeout: 120000,
                        }),
                );

                const templates = await loadAgentTemplates({ projectDir, userDir });
                const planner = templates.get('planner') as AgentTemplate;
                expect(planner.scope).toBe('project');
                expect(planner.config.timeout).toBe(120000);
                expect(planner.metadata.format).toBe('json');
        });
});
