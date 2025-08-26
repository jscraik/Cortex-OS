import fs from 'fs';
import path from 'path';

type Policy = {
  allowedPaths: Record<string, string[]>;
  protectedFiles: string[];
  maxFilesPerChange: number;
};

function loadPolicy(): Policy {
  const p = JSON.parse(fs.readFileSync(path.join(__dirname, 'policy.json'), 'utf8'));
  return p;
}

function listChangedFiles(): string[] {
  const fromCli = process.argv.includes('--files');
  if (fromCli) {
    const idx = process.argv.indexOf('--files');
    return process.argv.slice(idx + 1);
  }
  const res = require('child_process').execSync('git diff --cached --name-only', { encoding: 'utf8' });
  return res.split('\n').filter(Boolean);
}

function validatePaths(files: string[], policy: Policy): string[] {
  const errors: string[] = [];
  const allowedRoots = Object.entries(policy.allowedPaths).flatMap(([root, kids]) =>
    kids.length ? kids.map(k => path.join(root, k)) : [root]
  );
  for (const f of files) {
    const ok = allowedRoots.some(r => f === r || f.startsWith(r + '/'));
    if (!ok) errors.push(`Path not allowed by policy: ${f}`);
  }
  return errors;
}

function checkProtected(files: string[], policy: Policy): string[] {
  const errs: string[] = [];
  for (const p of policy.protectedFiles) {
    for (const f of files) {
      const match = p.endsWith('**/*') ? f.startsWith(p.replace('**/*','')) : f === p;
      if (match) errs.push(`Protected file modified without approval: ${f}`);
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
