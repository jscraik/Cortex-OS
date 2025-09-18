import { promises as fs } from 'node:fs';
import { parse as parseToml } from '@iarna/toml';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

const argsSchema = z.object({
	check: z.boolean().optional(),
});

export function findMismatches(npmMap, pyMap) {
	const mismatches = [];
	for (const [name, npmVersion] of npmMap) {
		const pyVersion = pyMap.get(name);
		if (pyVersion && npmVersion !== pyVersion) {
			mismatches.push({ name, npm: npmVersion, python: pyVersion });
		}
	}
	return mismatches;
}

export async function syncLockfiles(checkOnly = false) {
	try {
		await fs.access('uv.lock');
	} catch {
		console.error('uv.lock not found. Run `uv pip compile` to generate.');
		if (checkOnly) process.exit(1);
		return;
	}

	let pnpmLock;
	try {
		const pnpmContent = await fs.readFile('pnpm-lock.yaml', 'utf8');
		const pnpmSchema = z.object({
			importers: z.object({
				'.': z.object({
					dependencies: z.record(z.object({ version: z.string() })).default({}),
				}),
			}),
		});
		pnpmLock = pnpmSchema.parse(parseYaml(pnpmContent));
	} catch {
		console.error('Failed to read or parse pnpm-lock.yaml');
		if (checkOnly) process.exit(1);
		return;
	}

	let uvLock;
	try {
		const uvContent = await fs.readFile('uv.lock', 'utf8');
		const uvSchema = z.object({
			package: z
				.array(z.object({ name: z.string(), version: z.string() }))
				.default([]),
		});
		uvLock = uvSchema.parse(parseToml(uvContent));
	} catch {
		console.error('Failed to read or parse uv.lock');
		if (checkOnly) process.exit(1);
		return;
	}

	const npmMap = new Map(
		Object.entries(pnpmLock.importers['.'].dependencies).map(([name, info]) => [
			name,
			info.version,
		]),
	);
	const pyMap = new Map(
		uvLock.package.map((pkg) => [
			pkg.name.toLowerCase().replace(/_/g, '-'),
			pkg.version,
		]),
	);

	const mismatches = findMismatches(npmMap, pyMap);
	if (mismatches.length) {
		console.error('Dependency version mismatches found');
		for (const m of mismatches) {
			console.error(` - ${m.name}: npm ${m.npm} vs python ${m.python}`);
		}
		if (checkOnly) process.exit(1);
	} else {
		console.log('✅ Lockfiles synchronized successfully');
	}
}

const parsed = argsSchema.parse({ check: process.argv.includes('--check') });
if (import.meta.url === `file://${process.argv[1]}`) {
	syncLockfiles(parsed.check ?? false);
}
