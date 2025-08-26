import fs from 'fs';
import path from 'path';
import micromatch from 'micromatch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type Policy = {
  allowedPaths: Record<string, string[]>;
  protectedFiles: string[];
  maxFilesPerChange: number;
};

// Normalize to forward slashes for consistent globbing
function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

function loadPolicy(): Policy {
  const p = JSON.parse(fs.readFileSync(path.join(__dirname, 'policy.json'), 'utf8'));
  return p;
}

function listChangedFiles(): string[] {
  const fromCli = process.argv.includes('--files');
  if (fromCli) {
    const idx = process.argv.indexOf('--files');
    return process.argv.slice(idx + 1).map(toPosix);
  }
  const res = spawnSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf8' });
  return res.stdout.split('\n').filter(Boolean).map(toPosix);
}

function validatePaths(files: string[], policy: Policy): string[] {
  const errors: string[] = [];
  const allowedRoots = Object.entries(policy.allowedPaths).flatMap(([root, kids]) =>
    kids.length ? kids.map(k => toPosix(path.join(root, k))) : [toPosix(root)]
  );
  for (const f of files) {
    // Allow exact prefixes and glob patterns in allowedRoots
    const ok = allowedRoots.some(r =>
      f === r ||
      f.startsWith(r.endsWith('/') ? r : r + '/') ||
      micromatch.isMatch(f, r)
    );
    if (!ok) errors.push(`Path not allowed by policy: ${f}`);
  }
  return errors;
}

function checkProtected(files: string[], policy: Policy): string[] {
  const errs: string[] = [];
  const patterns = policy.protectedFiles.map(toPosix);
  for (const f of files) {
    if (micromatch.isMatch(f, patterns, { dot: true })) {
      errs.push(`Protected file modified without approval: ${f}`);
    }
  }
  return errs;
}

function main() {
  const policy = loadPolicy();
  const files = listChangedFiles();
  if (files.length > policy.maxFilesPerChange && !process.argv.includes('--override')) {
    console.error(`${files.length} files exceed limit of ${policy.maxFilesPerChange}`);
    process.exit(1);
  }
  const errs = [...validatePaths(files, policy), ...checkProtected(files, policy)];
  if (errs.length) { errs.forEach(e => console.error(e)); process.exit(1); }
  if (process.argv.includes('--validate')) { console.log('OK'); }
}
main();