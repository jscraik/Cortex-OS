import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

describe('build output', () => {
	const root = resolve(__dirname, '../../../..');
	const pkg = join(root, 'packages/asbr');
	const dist = join(pkg, 'dist');

	it('emits compiled artifacts', () => {
		if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });

		execSync('pnpm build', {
			cwd: root,
			stdio: 'inherit',
		});
		expect(existsSync(join(dist, 'index.js'))).toBe(true);
	});
});
