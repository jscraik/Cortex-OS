import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

test('kernel package exposes a configured Nx build target', () => {
	const projectPath = join(process.cwd(), 'packages', 'kernel', 'project.json');
	const project = JSON.parse(readFileSync(projectPath, 'utf-8'));

	expect(project.targets?.build).toBeDefined();
	expect(project.targets.build.executor).toBe('@nx/rollup:rollup');
	expect(project.targets.build.options).toMatchObject({
		outputPath: expect.stringContaining('dist/packages/kernel'),
		configFile: expect.stringContaining('rollup.config.ts'),
	});
});
