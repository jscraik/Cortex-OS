#!/usr/bin/env node
/**
 * Nx project.json guard (ESM)
 * - Rewrites legacy token '${workspaceRoot}' -> '{workspaceRoot}'
 * - Removes '${args}' from command strings and sets options.forwardAllArgs=true
 * - Normalizes options.cwd similarly
 *
 * Usage:
 *  node tools/validators/nx-project-guard.mjs       # check only (non-zero exit on issues)
 *  node tools/validators/nx-project-guard.mjs --fix # apply fixes
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FIX = process.argv.includes('--fix');

const COLOR = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

const SEARCH_DIRS = ['apps', 'packages', 'libs']
  .map((p) => path.join(ROOT, p))
  .filter((p) => fs.existsSync(p));

// Avoid no-template-curly-in-string lint rule by constructing tokens dynamically
const LEGACY_WORKSPACE = '$' + '{workspaceRoot}';
const LEGACY_ARGS = '$' + '{args}';
const MODERN_WORKSPACE = '{workspaceRoot}';

function listProjectJsonFiles() {
  const out = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && entry.name === 'project.json') out.push(full);
    }
  };
  for (const base of SEARCH_DIRS) visit(base);
  return Array.from(new Set(out));
}

function normalizeCwd(val, issues) {
  if (typeof val === 'string' && val.includes(LEGACY_WORKSPACE)) {
    issues.push(`cwd uses ${LEGACY_WORKSPACE} -> replace with ${MODERN_WORKSPACE}`);
    return val.replaceAll(LEGACY_WORKSPACE, MODERN_WORKSPACE);
  }
  return val;
}

function normalizeCommand(cmd, options, issues) {
  let s = String(cmd);
  if (s.includes(LEGACY_WORKSPACE)) {
    issues.push(`command contains ${LEGACY_WORKSPACE} -> replace with ${MODERN_WORKSPACE}`);
    s = s.replaceAll(LEGACY_WORKSPACE, MODERN_WORKSPACE);
  }
  if (s.includes(LEGACY_ARGS)) {
    issues.push(`command contains ${LEGACY_ARGS} -> remove and set forwardAllArgs`);
    s = s.replaceAll(' ' + LEGACY_ARGS, '').replaceAll(LEGACY_ARGS, '');
    if (!options || typeof options !== 'object') options = {};
    if (options.forwardAllArgs !== true) options.forwardAllArgs = true;
  }
  return { cmd: s, options };
}

function normalizeOptions(options, issues) {
  const opts = options && typeof options === 'object' ? options : {};
  let mutated = false;
  if (typeof opts.cwd === 'string') {
    const next = normalizeCwd(opts.cwd, issues);
    if (next !== opts.cwd) { opts.cwd = next; mutated = true; }
  }
  if (typeof opts.command === 'string') {
    const res = normalizeCommand(opts.command, opts, issues);
    if (res.cmd !== opts.command) { opts.command = res.cmd; mutated = true; }
    if (res.options !== opts) { Object.assign(opts, res.options); mutated = true; }
  }
  if (Array.isArray(opts.commands)) {
    const updated = opts.commands.map((c) => normalizeCommand(String(c), opts, issues).cmd);
    if (JSON.stringify(updated) !== JSON.stringify(opts.commands)) { opts.commands = updated; mutated = true; }
  }
  return { opts, mutated };
}

function normalizeTargets(targets, issues) {
  const out = targets && typeof targets === 'object' ? targets : {};
  let anyMutated = false;
  for (const name of Object.keys(out)) {
    const t = out[name] && typeof out[name] === 'object' ? out[name] : {};
    const options = t.options;
    const res = normalizeOptions(options, issues);
    if (res.mutated) {
      t.options = res.opts;
      out[name] = t;
      anyMutated = true;
    }
  }
  return { targets: out, mutated: anyMutated };
}

function processProjectJson(file) {
  const raw = fs.readFileSync(file, 'utf8');
  let json;
  try { json = JSON.parse(raw); } catch (e) { return { file, changed: false, issues: [`invalid JSON: ${e.message}`] }; }
  const issues = [];
  const res = normalizeTargets(json.targets, issues);
  json.targets = res.targets;
  // Safety replace in full text for any remaining occurrences
  const after = JSON.stringify(json, null, 4).replaceAll(LEGACY_WORKSPACE, MODERN_WORKSPACE);
  const changed = after !== raw;
  if (changed && FIX) fs.writeFileSync(file, after);
  return { file, changed, issues };
}

function main() {
  const files = listProjectJsonFiles();
  if (files.length === 0) { console.log(COLOR.yellow('No project.json files found.')); process.exit(0); }
  let changedCount = 0; let issueCount = 0; const lines = [];
  for (const f of files) {
    const r = processProjectJson(f);
    if (r.issues.length) { issueCount += r.issues.length; lines.push(`${r.changed ? 'fix' : 'chk'} ${f}\n - ${r.issues.join('\n - ')}`); }
    if (r.changed) changedCount++;
  }
  if (lines.length) console.log(COLOR.cyan(lines.join('\n')));
  if (FIX) {
    console.log(COLOR.green(`nx-project-guard: fixed ${changedCount} files; ${issueCount} issues addressed`));
    process.exit(0);
  }
  if (issueCount > 0) {
    console.error(COLOR.red(`nx-project-guard: ${issueCount} issues found across ${files.length} files. Run with --fix to apply.`));
    process.exit(1);
  }
  console.log(COLOR.green('nx-project-guard: no issues found.'));
}

main();
