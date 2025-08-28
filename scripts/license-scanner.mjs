#!/usr/bin/env node
// Lightweight license scanner for Node (pnpm) and best-effort Python (uv) without new deps.
// Policy: allow permissive licenses only. Fails with non-zero exit if any disallowed detected.

import { execa } from 'execa';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import parseSpdx from 'spdx-expression-parse';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// Configure allowed SPDX license IDs (expand as needed)
const ALLOWED = new Set([
  'Apache-2.0',
  'MIT',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'CC0-1.0',
  'Unlicense',
  'Zlib',
]);

/** Normalize license field from package.json to an SPDX expression string when possible */
function normalizeLicenseField(license) {
  if (!license) return null;
  if (typeof license === 'string') return license.trim();
  if (Array.isArray(license)) {
    // e.g., [{ type: 'MIT' }, { type: 'BSD-3-Clause' }]
    const parts = license.map((l) => (typeof l === 'string' ? l : l?.type)).filter(Boolean);
    return parts.length ? parts.join(' OR ') : null;
  }
  if (typeof license === 'object' && license.type) return String(license.type).trim();
  return null;
}

function isLicenseAllowed(expression) {
  if (!expression) return false;
  try {
    const ast = parseSpdx(expression);
    const evalNode = (node) => {
      if (!node) return false;
      if (node.license) {
        // Simple license identifier or with suffixes like -only / -or-later
        const id = node.license;
        // Strip common suffixes for pragmatic matching
        const base = id.replace(/-(only|or-later)$/i, '');
        return ALLOWED.has(id) || ALLOWED.has(base);
      }
      if (node.left && node.right && node.conjunction) {
        if (node.conjunction === 'or') {
          // OR is allowed if any branch is allowed
          return evalNode(node.left) || evalNode(node.right);
        }
        if (node.conjunction === 'and') {
          // AND requires both to be allowed
          return evalNode(node.left) && evalNode(node.right);
        }
      }
      return false;
    };
    return evalNode(ast);
  } catch {
    // If not a valid SPDX expression, fall back to simple check
    const base = expression.replace(/-(only|or-later)$/i, '');
    return ALLOWED.has(expression) || ALLOWED.has(base);
  }
}

async function readJsonSafe(file) {
  try {
    const txt = await fs.readFile(file, 'utf8');
    return JSON.parse(txt);
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
  const entries = await fs.readdir(pnpmDir, { withFileTypes: true });
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

async function scanScoped(scopeDir, results) {
  let scoped;
  try {
    scoped = await fs.readdir(scopeDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const sub of scoped) {
    if (!sub.isDirectory()) continue;
    const pkgPath = path.join(scopeDir, sub.name, 'package.json');
    const pkg = await readJsonSafe(pkgPath);
    addPkg(results, pkgPath, pkg);
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
      await scanScoped(path.join(nm, name), results);
      continue;
    }
    const pkgPath = path.join(nm, name, 'package.json');
    const pkg = await readJsonSafe(pkgPath);
    addPkg(results, pkgPath, pkg);
  }
}

async function collectNodePackages(rootDir) {
  const results = new Map(); // key: name@version -> {name, version, license, path}
  try {
    await scanPnpmModules(rootDir, results);
  } catch {
    // Ignore and fall back to top-level scan below
  }
  await scanTopLevelModules(rootDir, results);
  return Array.from(results.values());
}

async function collectPythonPackagesViaUv() {
  const script = `import json, sys\n\ntry:\n    from importlib.metadata import distributions\nexcept Exception:\n    from importlib_metadata import distributions  # type: ignore\n\nout = []\nfor d in distributions():\n    meta = getattr(d, 'metadata', None)\n    if not meta:\n        try:\n            meta = d.read_text('METADATA')\n        except Exception:\n            meta = None\n    name = None\n    version = None\n    lic = None\n    try:\n        name = d.metadata['Name']\n    except Exception:\n        pass\n    try:\n        version = getattr(d, 'version', None) or d.metadata['Version']\n    except Exception:\n        pass\n    try:\n        lic = d.metadata.get('License') or d.metadata.get('License-Expression')\n    except Exception:\n        lic = None\n    out.append({'name': name or 'unknown', 'version': version or 'unknown', 'license': lic})\nprint(json.dumps(out))`;
  try {
    const { stdout } = await execa('uv', ['run', 'python', '-c', script], { timeout: 60_000 });
    const arr = JSON.parse(stdout);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function summarizeFindings(kind, packages) {
  const total = packages.length;
  const unknown = packages.filter((p) => !p.license);
  const disallowed = packages.filter((p) => p.license && !isLicenseAllowed(p.license));
  const allowed = total - unknown.length - disallowed.length;
  return { kind, total, allowed, unknown, disallowed };
}

function printSummary(title, summary) {
  const { total, allowed, unknown, disallowed } = summary;
  console.log(`\n== ${title} ==`);
  console.log(
    `Total: ${total}  Allowed: ${allowed}  Unknown: ${unknown.length}  Disallowed: ${disallowed.length}`,
  );
  if (unknown.length) {
    console.log(`Unknown (first 10):`);
    for (const p of unknown.slice(0, 10)) {
      console.log(
        ` - ${p.name}@${p.version} license: <missing> (${p.path ? path.relative(repoRoot, p.path) : ''})`,
      );
    }
  }
  if (disallowed.length) {
    console.log(`Disallowed (first 10):`);
    for (const p of disallowed.slice(0, 10)) {
      console.log(
        ` - ${p.name}@${p.version} license: ${p.license} (${p.path ? path.relative(repoRoot, p.path) : ''})`,
      );
    }
  }
}

async function main() {
  // Node (pnpm)
  const nodePkgs = await collectNodePackages(repoRoot);
  const nodeSummary = summarizeFindings('Node (pnpm)', nodePkgs);
  printSummary('Node (pnpm) license scan', nodeSummary);

  // Python (uv) best-effort
  let pyPkgs = [];
  try {
    pyPkgs = await collectPythonPackagesViaUv();
  } catch {}
  if (pyPkgs.length) {
    // Attach minimal fields for uniformity
    pyPkgs = pyPkgs.map((p) => ({ ...p, path: undefined }));
    const pySummary = summarizeFindings('Python (uv)', pyPkgs);
    printSummary('Python (uv) license scan (best-effort)', pySummary);
    if (pySummary.unknown.length) {
      console.log(
        '\nNote: Python license detection uses PEP 621 metadata and may be missing for some wheels.',
      );
    }
  } else {
    console.log(
      '\nPython (uv) not available or no packages detected; skipping Python license scan.',
    );
  }

  const failed =
    nodeSummary.disallowed.length > 0 ||
    (pyPkgs.length && pyPkgs.filter((p) => p.license && !isLicenseAllowed(p.license)).length > 0);
  if (failed) {
    console.error('\nLicense policy violation detected. See details above.');
    process.exit(1);
  }
  console.log('\nLicense scan passed.');
}

main().catch(async (err) => {
  console.error('[license-scanner] Unexpected error:', err?.message || err);
  // Small backoff to flush logs in CI
  await delay(50);
  process.exit(2);
});
