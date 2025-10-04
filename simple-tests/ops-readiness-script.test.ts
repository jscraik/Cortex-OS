import { execFile } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const scriptPath = resolve(repoRoot, 'scripts/ci/ops-readiness.sh');
const resultsPath = resolve(repoRoot, 'ops-readiness-results.json');
const assessmentPath = resolve(repoRoot, 'out/ops-readiness-assessment.json');
const reportDir = resolve(repoRoot, 'ops-reports');

const cleanup = (): void => {
	if (existsSync(resultsPath)) {
		rmSync(resultsPath, { force: true });
	}
	if (existsSync(assessmentPath)) {
		rmSync(assessmentPath, { force: true });
	}
	if (existsSync(reportDir)) {
		rmSync(reportDir, { force: true, recursive: true });
	}
};

describe('ops-readiness.sh', () => {
	afterEach(() => {
		cleanup();
	});

	it('completes in test mode without recursive loop', async () => {
		const { stdout } = await execFileAsync(scriptPath, {
			cwd: repoRoot,
			env: { ...process.env, READINESS_TEST_MODE: '1' },
			encoding: 'utf-8',
		});

		expect(stdout).toContain('Operational Readiness Summary');
		expect(existsSync(resultsPath)).toBe(true);

		const contents = JSON.parse(readFileSync(resultsPath, 'utf-8'));
		expect(contents.production_ready).toBe(true);
		expect(contents.test_mode).toBe(true);
	}, 15000);
});
