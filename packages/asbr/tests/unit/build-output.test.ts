import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

describe('build output', () => {
	const workspaceRoot = resolve(__dirname, '../../../..');
	const pkg = join(workspaceRoot, 'packages/asbr');
	const dist = join(pkg, 'dist');

	it('emits compiled artifacts', () => {
		if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });

		execSync('pnpm --filter @cortex-os/asbr build', {
			cwd: workspaceRoot,
			stdio: 'inherit',
		});
		const primary = join(dist, 'index.js');
		const alt = join(dist, 'src', 'index.js');
		expect(existsSync(primary) || existsSync(alt)).toBe(true);
	});
});
