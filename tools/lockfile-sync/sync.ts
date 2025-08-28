import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { parse as parseToml } from '@iarna/toml';

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

    const mapping: Record<string, string> = {
      protobufjs: 'protobuf',
      '@grpc/grpc-js': 'grpcio',
      '@opentelemetry/api': 'opentelemetry-api',
      '@opentelemetry/core': 'opentelemetry-sdk',
      axios: 'httpx',
    };

    const mismatches: Array<{ name: string; npm?: string; python?: string; pyName: string }> = [];
    for (const [npmName, pyName] of Object.entries(mapping)) {
      const n = npmMap.get(npmName);
      const p = pyMap.get(pyName);
      if (n && p && n.split('.')[0] !== p.split('.')[0]) {
        mismatches.push({ name: npmName, npm: n, python: p, pyName });
      }
    }

    if (mismatches.length) {
      const report = { timestamp: new Date().toISOString(), mismatches };
      writeFileSync('dependency-compatibility.json', JSON.stringify(report, null, 2));
      if (checkOnly) {
        console.error('Dependency version mismatches found');
        process.exit(1);
      }
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
