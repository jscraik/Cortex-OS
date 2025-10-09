import { expect, it } from 'vitest';

// Dynamically import the validator module so Vitest can run it in the repo context.
it('validate tsconfig files (sanity)', async () => {
	// Run validator as a child Node process to avoid cross-project type checks.
	const { spawnSync } = await import('node:child_process');
	const scriptPath = `${process.cwd()}/scripts/ci/validate-tsconfig.mjs`;
	const res = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' });
	// Expect zero exit code and a brAInwav-branded success message when clean.
	expect(res.status).toBe(0);
	expect(res.stdout + res.stderr).toContain('brAInwav: tsconfig validator passed');
}, 30000);

it('validator fix mode updates simple tsconfig (local)', async () => {
	const os = await import('node:os');
	const fs = await import('node:fs');
	const path = await import('node:path');
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tscfg-'));
	const sample = path.join(tmp, 'tsconfig.sample.json');
	const bad = `{
	"compilerOptions": {
		"moduleResolution": "NodeNext",
		"module": "ESNext"
	}
}`;
	fs.writeFileSync(sample, bad, 'utf8');
	// Run the CLI validator in fix mode against the temp directory
	const { spawnSync } = await import('node:child_process');
	const scriptPath = `${process.cwd()}/scripts/ci/validate-tsconfig.mjs`;
	const run = spawnSync(process.execPath, [scriptPath, '--fix'], {
		cwd: tmp,
		encoding: 'utf8',
	});
	expect(run.status).toBe(0);
	const updated = fs.readFileSync(sample, 'utf8');
	expect(/"module"\s*:\s*"NodeNext"/.test(updated)).toBeTruthy();
	// cleanup
	try {
		fs.unlinkSync(`${sample}.bak`);
	} catch {
		/* ignore */
	}
});
