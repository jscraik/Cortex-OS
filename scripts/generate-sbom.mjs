#!/usr/bin/env node
// Generate a CycloneDX SBOM for Node workspace using Syft if present; fallback to minimal manifest export.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import execa from 'execa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'sbom');
const outFile = path.join(outDir, 'sbom.cdx.json');

async function hasBinary(cmd) {
  try {
    await execa('bash', ['-lc', `command -v ${cmd}`]);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function generateWithSyft() {
  await ensureDir(outDir);
  // Syft supports dir: and cyclonedx-json
  await execa('syft', ['dir:.', '--output', `cyclonedx-json=${outFile}`], { cwd: repoRoot, stdio: 'inherit' });
  return outFile;
}

async function fallbackManifest() {
  await ensureDir(outDir);
  // Very simple manifest of package.json dependencies at root; not a real SBOM
  const pkgPath = path.join(repoRoot, 'package.json');
  const raw = await fs.readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(raw);
  const payload = {
    metadata: { tool: 'fallback-manifest', timestamp: new Date().toISOString() },
    name: pkg.name,
    version: pkg.version,
    dependencies: pkg.dependencies || {},
    devDependencies: pkg.devDependencies || {},
  };
  await fs.writeFile(outFile, JSON.stringify(payload, null, 2));
  return outFile;
}

async function main() {
  const syftOk = await hasBinary('syft');
  const file = syftOk ? await generateWithSyft() : await fallbackManifest();
  console.log(`SBOM written: ${path.relative(repoRoot, file)}`);
}

main().catch((e) => {
  console.error('[generate-sbom] Failed:', e?.message || e);
  process.exit(1);
});
