import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadAgentTemplates } from '../../src/file-agent-loader.js';

type LoaderContext = {
	projectRoot: string;
	userHome: string;
	cleanup: string[];
};

const TMP_PREFIX = 'agent-loader-phase-10-';

describe('file-based agent template loader', () => {
	const ctx: LoaderContext = {
		projectRoot: '',
		userHome: '',
		cleanup: [],
	};

	beforeAll(async () => {
		ctx.projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), `${TMP_PREFIX}project-`));
		ctx.userHome = await fs.mkdtemp(path.join(os.tmpdir(), `${TMP_PREFIX}user-`));
		ctx.cleanup = [ctx.projectRoot, ctx.userHome];
		await seedAgentTemplates(ctx.projectRoot, ctx.userHome);
	});

	afterAll(async () => {
		await Promise.all(ctx.cleanup.map(async (dir) => fs.rm(dir, { recursive: true, force: true })));
	});

	it('merges user and project templates with project precedence', async () => {
		const templates = await loadAgentTemplates({
			projectDir: ctx.projectRoot,
			userDir: path.join(ctx.userHome, '.cortex/agents'),
		});

		const names = Array.from(templates.keys());
		expect(names).toContain('debugger');
		expect(names).toContain('story-writer');

		const debuggerTemplate = templates.get('debugger');
		expect(debuggerTemplate?.scope).toBe('project');
		expect(debuggerTemplate?.config.description).toBe('Project scoped debugger.');
		expect(debuggerTemplate?.config.tools).toEqual(['git.diff']);
		expect(debuggerTemplate?.config.systemPromptId).toBe('sys.agents.project.debugger');
		expect(debuggerTemplate?.prompt).toBe('Investigate regression traces.');

		const storyTemplate = templates.get('story-writer');
		expect(storyTemplate?.scope).toBe('user');
		expect(storyTemplate?.config.model).toBe('mlx-community/brainwav-creative');
		expect(storyTemplate?.config.systemPromptId).toBe('sys.agents.user.story-writer');
		expect(storyTemplate?.filePath).toMatch(/story-writer\.yaml$/);
	});

	it('supports markdown front matter and trims prompts', async () => {
		const templates = await loadAgentTemplates({
			projectDir: ctx.projectRoot,
			userDir: path.join(ctx.userHome, '.cortex/agents'),
		});

		const analystTemplate = templates.get('analyst');
		expect(analystTemplate?.config.description).toBe('Project analyst with markdown source.');
		expect(analystTemplate?.config.systemPromptId).toBe('sys.agents.project.analyst');
		expect(analystTemplate?.prompt).toBe('Summarise incident response findings.');
	});

	it('raises branded errors when validation fails', async () => {
		const invalidFile = path.join(ctx.projectRoot, '.cortex/agents/invalid.yaml');
		await fs.writeFile(
			invalidFile,
			['name: invalid-agent', 'description: ""', 'systemPrompt: ""'].join('\n'),
			'utf8',
		);

		await expect(
			loadAgentTemplates({
				projectDir: ctx.projectRoot,
				userDir: path.join(ctx.userHome, '.cortex/agents'),
			}),
		).rejects.toThrow(/brAInwav agent template validation failed/i);

		await fs.rm(invalidFile);
	});
});

async function seedAgentTemplates(projectDir: string, userHome: string): Promise<void> {
	const projectAgentsDir = path.join(projectDir, '.cortex/agents');
	const userAgentsDir = path.join(userHome, '.cortex/agents');
	await fs.mkdir(projectAgentsDir, { recursive: true });
	await fs.mkdir(userAgentsDir, { recursive: true });

	await fs.writeFile(
		path.join(userAgentsDir, 'debugger.yaml'),
		[
			'name: debugger',
			'description: User scoped debugger.',
			'tools:',
			'  - fs.read',
			'systemPrompt: Analyse issues quickly.',
		].join('\n'),
		'utf8',
	);

	await fs.writeFile(
		path.join(userAgentsDir, 'story-writer.yaml'),
		[
			'name: story-writer',
			'description: Compose bedtime stories.',
			'tools:',
			'  - fs.read',
			'  - shell.run',
			'model: mlx-community/brainwav-creative',
			'systemPrompt: Write imaginative narratives for families.',
		].join('\n'),
		'utf8',
	);

	await fs.writeFile(
		path.join(projectAgentsDir, 'debugger.yaml'),
		[
			'name: debugger',
			'description: Project scoped debugger.',
			'tools:',
			'  - git.diff',
			'systemPrompt: Investigate regression traces.',
		].join('\n'),
		'utf8',
	);

	await fs.writeFile(
		path.join(projectAgentsDir, 'analyst.md'),
		[
			'---',
			'name: analyst',
			'description: Project analyst with markdown source.',
			'---',
			'',
			'Summarise incident response findings.',
		].join('\n'),
		'utf8',
	);
}
