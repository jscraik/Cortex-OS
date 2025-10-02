import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
	collectPendingMigrations,
	prepareMigrationArtifacts,
} from '../../src/auth/schema-guard.js';

describe('auth schema guard', () => {
	it('parses pending migrations from prisma status output', async () => {
		const exec = vi.fn().mockResolvedValue({
			stdout: JSON.stringify({ unappliedMigrationNames: ['20240101010101_add_users'] }),
		});

		const pending = await collectPendingMigrations({
			prismaBinary: 'prisma',
			workspaceRoot: '/tmp',
			env: {} as NodeJS.ProcessEnv,
			exec,
		});

		expect(pending).toEqual(['20240101010101_add_users']);
		expect(exec).toHaveBeenCalledWith(
			'prisma',
			expect.arrayContaining(['status', '--json']),
			expect.objectContaining({ cwd: '/tmp' }),
		);
	});

	it('generates rollback artifacts when migrations are pending', async () => {
		const tempDir = await mkdtemp(join(tmpdir(), 'schema-guard-'));
		const exec = vi
			.fn()
			.mockResolvedValueOnce({
				stdout: JSON.stringify({ unappliedMigrationNames: ['20240202020202_new_field'] }),
			})
			.mockResolvedValueOnce({ stdout: '-- forward script \nSELECT 1;' })
			.mockResolvedValueOnce({ stdout: '-- rollback script \nSELECT 1;' });

		try {
			const result = await prepareMigrationArtifacts({
				prismaBinary: 'prisma',
				workspaceRoot: tempDir,
				connectionString: 'postgres://example',
				env: {} as NodeJS.ProcessEnv,
				exec,
				now: () => 1_700_000_000_000,
			});

			expect(result.pendingMigrations).toEqual(['20240202020202_new_field']);
			expect(result.forwardScriptPath).toBeDefined();
			expect(result.rollbackScriptPath).toBeDefined();
			const forward = await readFile(result.forwardScriptPath as string, 'utf8');
			const rollback = await readFile(result.rollbackScriptPath as string, 'utf8');
			expect(forward).toContain('-- forward script');
			expect(rollback).toContain('-- rollback script');
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	});
});
