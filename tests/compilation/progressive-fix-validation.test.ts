import { execaCommand } from 'execa';
import { describe, expect, it } from 'vitest';

async function typecheckAt(path: string) {
	try {
		const { stdout, stderr, exitCode } = await execaCommand('pnpm -s typecheck', {
			shell: true,
			cwd: path,
			stdout: 'pipe',
			stderr: 'pipe',
		});
		return { stdout, stderr, exitCode };
	} catch (err) {
		const e = err as { stdout?: string; stderr?: string; exitCode?: number };
		return { stdout: e.stdout ?? '', stderr: e.stderr ?? String(err), exitCode: e.exitCode ?? 1 };
	}
}

describe('Progressive Compilation Fix Validation', () => {
	const packages = [
		'packages/a2a/a2a-core',
		'packages/a2a/a2a-events',
		'packages/a2a/a2a-contracts',
		'apps/cortex-os',
	];

	for (const pkg of packages) {
		it(`should compile ${pkg} without errors`, async () => {
			const result = await typecheckAt(pkg);
			if (result.exitCode !== 0) {
				// Print snippets to aid debugging in CI logs
				console.error(`\n--- Typecheck stderr for ${pkg} ---\n${result.stderr}`);
			}
			expect(result.exitCode).toBe(0);
		});
	}
});
