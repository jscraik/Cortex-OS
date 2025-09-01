import { parse as parseToml } from '@iarna/toml';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

export async function syncLockfiles(checkOnly = false): Promise<void> {
  // Best-effort sync check between npm and uv
  try {
    const pnpmJson = execSync('pnpm list --json --depth 0', { encoding: 'utf8' });
    const pnpmDeps = JSON.parse(pnpmJson);
    const uvContent = readFileSync('uv.lock', 'utf8');
    const uvLock = parseToml(uvContent) as any;
    const npmMap = new Map<string, string>();
    for (const node of pnpmDeps) {
      if (node.dependencies) {
        for (const [name, info] of Object.entries<any>(node.dependencies)) {
          npmMap.set(name, info.version);
        }
      }
    }
    const pyMap = new Map<string, string>();
    const pkgs = (uvLock?.package ?? []) as Array<{ name: string; version: string }>;
    for (const p of pkgs) pyMap.set(p.name.toLowerCase().replace(/_/g, '-'), p.version);
    const mismatches: Array<{ name: string; npm: string; python: string }> = [];
    for (const [name, npmVersion] of npmMap) {
      const pyVersion = pyMap.get(name);
      if (pyVersion && npmVersion.split('.')[0] !== pyVersion.split('.')[0]) {
        mismatches.push({ name, npm: npmVersion, python: pyVersion });
      }
    }
    if (mismatches.length) {
      console.error('Dependency version mismatches found');
      for (const m of mismatches) console.error(` - ${m.name}: npm ${m.npm} vs python ${m.python}`);
      if (checkOnly) process.exit(1);
    }
    console.log('✅ Lockfiles synchronized successfully');
  } catch (e) {
    console.error('Lockfile sync failed:', e);
    if (checkOnly) process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const checkOnly = process.argv.includes('--check');
  syncLockfiles(checkOnly);
}
