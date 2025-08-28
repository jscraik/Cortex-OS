#!/usr/bin/env node
// License scanner with dev-only exceptions and JSON/Markdown reports.
import { execa } from 'execa';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import parseSpdx from 'spdx-expression-parse';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const reportsDir = path.join(repoRoot, 'reports', 'compliance');

const ALLOWED = new Set([
  'Apache-2.0',
  'MIT',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'CC0-1.0',
  'CC-BY-4.0',
  'MPL-2.0',
  'Unlicense',
  'Zlib',
]);

function normalizeLicenseField(license) {
  if (!license) return null;
  if (typeof license === 'string') return license.trim();
  if (Array.isArray(license)) {
    const parts = license.map((l) => (typeof l === 'string' ? l : l?.type)).filter(Boolean);
    return parts.length ? parts.join(' OR ') : null;
  }
  if (typeof license === 'object' && license.type) return String(license.type).trim();
  return null;
}

function isLicenseAllowed(expression) {
  if (!expression) return false;
  const normalized = String(expression)
    .replace(/Apache\s*2(\.0)?/gi, 'Apache-2.0')
    .replace(/Apache2(\.0)?/gi, 'Apache-2.0');
  try {
    const ast = parseSpdx(normalized);
    const evalNode = (node) => {
      if (!node) return false;
      if (node.license) {
        const id = node.license;
        const base = id.replace(/-(only|or-later)$/i, '');
        return ALLOWED.has(id) || ALLOWED.has(base);
      }
      if (node.left && node.right && node.conjunction) {
        if (node.conjunction === 'or') return evalNode(node.left) || evalNode(node.right);
        if (node.conjunction === 'and') return evalNode(node.left) && evalNode(node.right);
      }
      return false;
    };
    return evalNode(ast);
  } catch {
    const base = normalized.replace(/-(only|or-later)$/i, '');
    return ALLOWED.has(normalized) || ALLOWED.has(base);
  }
}

async function readJsonSafe(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function addPkg(results, pkgPath, pkg) {
  if (!pkg || !pkg.name || !pkg.version) return;
  const lic = normalizeLicenseField(pkg.license || pkg.licenses);
  const key = `${pkg.name}@${pkg.version}`;
  if (!results.has(key))
    results.set(key, { name: pkg.name, version: pkg.version, license: lic, path: pkgPath });
}

async function scanPnpmModules(rootDir, results) {
  const pnpmDir = path.join(rootDir, 'node_modules', '.pnpm');
  let entries = [];
  try {
    entries = await fs.readdir(pnpmDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const pkgRoot = path.join(pnpmDir, ent.name, 'node_modules');
    let inner;
    try {
      inner = await fs.readdir(pkgRoot, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const sub of inner) {
      if (!sub.isDirectory()) continue;
      const pkgPath = path.join(pkgRoot, sub.name, 'package.json');
      const pkg = await readJsonSafe(pkgPath);
      addPkg(results, pkgPath, pkg);
    }
  }
}

async function scanTopLevelModules(rootDir, results) {
  const nm = path.join(rootDir, 'node_modules');
  let top;
  try {
    top = await fs.readdir(nm, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of top) {
    if (!ent.isDirectory()) continue;
    const name = ent.name;
    if (name.startsWith('.')) continue;
    if (name.startsWith('@')) {
      let scoped;
      try {
        scoped = await fs.readdir(path.join(nm, name), { withFileTypes: true });
      } catch {
        continue;
      }
      for (const sub of scoped) {
        if (!sub.isDirectory()) continue;
        const pkgPath = path.join(nm, name, sub.name, 'package.json');
        const pkg = await readJsonSafe(pkgPath);
        addPkg(results, pkgPath, pkg);
      }
      continue;
    }
    const pkgPath = path.join(nm, name, 'package.json');
    const pkg = await readJsonSafe(pkgPath);
    addPkg(results, pkgPath, pkg);
  }
}

async function collectNodePackages(rootDir) {
  const results = new Map();
  await scanPnpmModules(rootDir, results);
  await scanTopLevelModules(rootDir, results);
  return Array.from(results.values());
}

function summarize(packages) {
  const total = packages.length;
  const unknown = packages.filter((p) => !p.license);
  const disallowed = packages.filter((p) => p.license && !isLicenseAllowed(p.license));
  const allowed = total - unknown.length - disallowed.length;
  return { total, allowed, unknown, disallowed };
}

function printSummary(title, summary) {
  const { total, allowed, unknown, disallowed } = summary;
  console.log(`\n== ${title} ==`);
  console.log(
    `Total: ${total}  Allowed: ${allowed}  Unknown: ${unknown.length}  Disallowed: ${disallowed.length}`,
  );
  if (unknown.length) {
    console.log('Unknown (first 10):');
    for (const p of unknown.slice(0, 10)) {
      const rel = p.path ? path.relative(repoRoot, p.path) : '';
      console.log(` - ${p.name}@${p.version} license: <missing> ${rel ? `(${rel})` : ''}`);
    }
  }
  if (disallowed.length) {
    console.log('Disallowed (first 10):');
    for (const p of disallowed.slice(0, 10)) {
      const rel = p.path ? path.relative(repoRoot, p.path) : '';
      console.log(` - ${p.name}@${p.version} license: ${p.license} ${rel ? `(${rel})` : ''}`);
    }
  }
}

async function listNames(args) {
  try {
    const { stdout } = await execa('pnpm', ['ls', '--json', ...args], { cwd: repoRoot });
    const data = JSON.parse(stdout);
    const set = new Set();
    const walk = (node) => {
      if (!node) return;
      if (node.name) set.add(node.name);
      if (Array.isArray(node.dependencies)) for (const d of node.dependencies) walk(d);
    };
    if (Array.isArray(data)) data.forEach(walk);
    else walk(data);
    return set;
  } catch {
    return new Set();
  }
}

async function main() {
  // Load policy (dev-only exceptions)
  let policy = { exceptions: { devOnly: [] } };
  try {
    const txt = await fs.readFile(path.join(repoRoot, 'config', 'compliance.policy.json'), 'utf8');
    policy = JSON.parse(txt);
  } catch {}

  const prodSet = await listNames(['--prod']);
  const devSet = await listNames(['--dev']);
  const devOnlySet = new Set([...devSet].filter((n) => !prodSet.has(n)));

  // Node scan
  const nodePkgs = await collectNodePackages(repoRoot);
  const raw = summarize(nodePkgs);
  // Apply exceptions
  const devExceptions = new Set(policy?.exceptions?.devOnly || []);
  const filteredDisallowed = raw.disallowed.filter(
    (p) => !(devOnlySet.has(p.name) && devExceptions.has(p.name)),
  );
  const nodeSummary = {
    total: raw.total,
    unknown: raw.unknown,
    disallowed: filteredDisallowed,
    allowed: raw.total - raw.unknown.length - filteredDisallowed.length,
  };
  printSummary('Node (pnpm) license scan', nodeSummary);

  // Reports
  await fs.mkdir(reportsDir, { recursive: true });
  const jsonPath = path.join(reportsDir, 'license-scan.json');
  const mdPath = path.join(reportsDir, 'license-scan.md');
  const toRel = (p) => (p && p.path ? path.relative(repoRoot, p.path) : '');
  const report = {
    generatedAt: new Date().toISOString(),
    policy: { allowed: Array.from(ALLOWED).sort(), exceptions: policy.exceptions },
    node: {
      total: nodeSummary.total,
      allowed: nodeSummary.allowed,
      unknownCount: nodeSummary.unknown.length,
      disallowedCount: nodeSummary.disallowed.length,
      unknown: nodeSummary.unknown.map((p) => ({
        name: p.name,
        version: p.version,
        license: p.license || null,
        path: toRel(p),
      })),
      disallowed: nodeSummary.disallowed.map((p) => ({
        name: p.name,
        version: p.version,
        license: p.license,
        path: toRel(p),
      })),
    },
  };
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
  const lines = [];
  lines.push(
    '# License Scan Report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Policy',
    'Allowed SPDX IDs:',
  );
  for (const id of report.policy.allowed) lines.push(`- ${id}`);
  if (report.policy.exceptions?.devOnly?.length) {
    lines.push('', 'Dev-only exceptions:');
    for (const id of report.policy.exceptions.devOnly) lines.push(`- ${id}`);
  }
  lines.push('', '## Node (pnpm) summary');
  lines.push(`- Total: ${report.node.total}`);
  lines.push(`- Allowed: ${report.node.allowed}`);
  lines.push(`- Unknown: ${report.node.unknownCount}`);
  lines.push(`- Disallowed: ${report.node.disallowedCount}`, '');
  if (report.node.unknownCount) {
    lines.push('### Unknown');
    for (const p of report.node.unknown)
      lines.push(`- ${p.name}@${p.version} license: <missing>${p.path ? ` (${p.path})` : ''}`);
    lines.push('');
  }
  if (report.node.disallowedCount) {
    lines.push('### Disallowed');
    for (const p of report.node.disallowed)
      lines.push(`- ${p.name}@${p.version} license: ${p.license}${p.path ? ` (${p.path})` : ''}`);
    lines.push('');
  }
  await fs.writeFile(mdPath, lines.join('\n'));
  console.log(
    `\nReports written:\n - ${path.relative(repoRoot, jsonPath)}\n - ${path.relative(repoRoot, mdPath)}`,
  );

  const failed = nodeSummary.disallowed.length > 0;
  if (failed) {
    console.error('\nLicense policy violation detected. See details above.');
    process.exit(1);
  }
  console.log('\nLicense scan passed.');
}

main().catch((e) => {
  console.error('[license-scanner] Unexpected error:', e?.message || e);
  process.exit(2);
});
