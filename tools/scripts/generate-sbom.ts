import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

async function main() {
  console.log('Generating SBOM(s)...');
  // Node via cyclonedx bom (installed as @cyclonedx/bom exposes CLI 'cyclonedx-bom' if needed).
  // Here we call library through npx to keep script simple.
  try {
    execSync('npx --yes @cyclonedx/cyclonedx-npm --output-file sbom-node.json', { stdio: 'inherit' });
  } catch { console.warn('Node SBOM generation failed; ensure cyclonedx npm cli is available'); }

  // Python via uv list
  execSync('uv pip list --format json > pip-list.json');
  const deps = JSON.parse(readFileSync('pip-list.json', 'utf8'));
  const components = deps.map((d: any) => ({ type: 'library', name: d.name, version: d.version, purl: `pkg:pypi/${d.name}@${d.version}` }));
  const pythonBom = { bomFormat: 'CycloneDX', specVersion: '1.5', version: 1, components };
  writeFileSync('sbom-python.json', JSON.stringify(pythonBom, null, 2));

  // Unified
  let nodeComponents: any[] = [];
  try {
    const nodeBom = JSON.parse(readFileSync('sbom-node.json', 'utf8'));
    nodeComponents = nodeBom.components || [];
  } catch {}
  const unified = { bomFormat: 'CycloneDX', specVersion: '1.5', version: 1, components: [...nodeComponents, ...components] };
  writeFileSync('sbom-unified.json', JSON.stringify(unified, null, 2));
  console.log('SBOM complete');
}
main().catch(e => { console.error(e); process.exit(1); });
