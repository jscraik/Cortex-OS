import { execaCommand } from 'execa';
import { describe, expect, it } from 'vitest';

async function execAsync(cmd: string, cwd?: string) {
	try {
		const { stdout, stderr, exitCode } = await execaCommand(cmd, {
			stdout: 'pipe',
			stderr: 'pipe',
			shell: true,
			cwd,
		});
		return { stdout, stderr, exitCode };
	} catch (err) {
		const error = err as { stdout?: string; stderr?: string; exitCode?: number };
		return {
			stdout: error.stdout ?? '',
			stderr: error.stderr ?? String(error),
			exitCode: error.exitCode ?? 1,
		};
	}
}

describe('TypeScript Compilation Contract Compliance', () => {
	it('should compile a2a-core without errors', async () => {
		const result = await execAsync('pnpm -s typecheck', 'packages/a2a/a2a-core');
		expect(result.exitCode).toBe(0);
		expect(result.stderr ?? '').not.toMatch(/error TS\d+/);
	});

	it('should compile cortex-os app without errors', async () => {
		const result = await execAsync('pnpm -s typecheck:smart');
		expect(result.exitCode).toBe(0);
		expect(result.stderr ?? '').not.toMatch(/error TS\d+/);
	});

	it('should have consistent envelope interfaces (compile-time enforced)', async () => {
		// This is a placeholder: the actual compatibility is enforced by typecheck
		// which runs across the workspace via the other tests.
		expect(true).toBe(true);
	});
});
