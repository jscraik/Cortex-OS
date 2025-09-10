import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('graphiti requirements', () => {
	it('are installable', () => {
		const dir = mkdtempSync(join(tmpdir(), 'graphiti-'));
		const venv = spawnSync('python', ['-m', 'venv', dir]);
		expect(venv.status).toBe(0);

		const pip = join(dir, 'bin', 'pip');
		const reqFile = join(
			process.cwd(),
			'config',
			'requirements',
			'requirements-graphiti.txt',
		);
		const res = spawnSync(pip, [
			'install',
			'--quiet',
			'--dry-run',
			'-r',
			reqFile,
		]);
		rmSync(dir, { recursive: true, force: true });
		expect(res.status).toBe(0);
	});
});
