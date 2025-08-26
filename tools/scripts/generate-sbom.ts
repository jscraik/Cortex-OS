import { createBom } from '@cyclonedx/bom';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { randomUUID } from 'crypto';

export async function generateSBOM(): Promise<void> {
  console.log('Generating Software Bill of Materials...');

  const nodeBom = await createBom({
    packageManager: 'pnpm',
    path: process.cwd(),
    spec: 'cyclonedx',
    specVersion: '1.5',
  });
  writeFileSync('sbom-node.json', JSON.stringify(nodeBom, null, 2));

  try {
    execSync('uv pip list --format json > pip-list.json');
  } catch {}
  const pythonDeps = JSON.parse(readFileSync('pip-list.json', 'utf8')) as Array<{ name: string; version: string }>;
  const pythonBom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ name: 'uv', version: '0.3.0' }],
      component: { type: 'application', name: '@cortex-os/services', version: process.env.npm_package_version || '1.0.0' },
    },
    components: pythonDeps.map((d) => ({ type: 'library', name: d.name, version: d.version, purl: `pkg:pypi/${d.name}@${d.version}` })),
  } as any;
  writeFileSync('sbom-python.json', JSON.stringify(pythonBom, null, 2));

  const unified = { ...nodeBom, components: [...(nodeBom as any).components, ...pythonBom.components] };
  writeFileSync('sbom-unified.json', JSON.stringify(unified, null, 2));

  try {
    execSync('npx ajv-cli@5 validate -s tools/schemas/cyclonedx-1.5.schema.json -d sbom-unified.json', { stdio: 'inherit' });
    console.log('✅ SBOM validation passed');
  } catch (e) {
    console.error('❌ SBOM validation failed');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateSBOM();
}

