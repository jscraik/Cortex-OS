#!/usr/bin/env tsx
/**
 * Nx project.json guard
 * - Rewrites legacy token `${workspaceRoot}` -> `{workspaceRoot}`
 * - Removes `${args}` from command strings and ensures options.forwardAllArgs=true
 * - Optionally fixes `cwd` to `{workspaceRoot}` if it uses `${workspaceRoot}`
 *
 * Usage:
 *  tsx tools/validators/nx-project-guard.ts            # check only
 *  tsx tools/validators/nx-project-guard.ts --fix      # apply fixes
 */
import fs from 'node:fs';
import path from 'node:path';

type JsonObject = Record<string, any>;

const ROOT = process.cwd();
const FIX = process.argv.includes('--fix');

const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
};

const PROJECT_GLOBS = [
  path.join(ROOT, 'apps'),
  path.join(ROOT, 'packages'),
  path.join(ROOT, 'libs'),
].filter((p) => fs.existsSync(p));

function collectProjectJsonFiles(): string[] {
  const results: string[] = [];
  const visit = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        visit(full);
      } else if (e.isFile() && e.name === 'project.json') {
        results.push(full);
      }
    }
  };
  for (const base of PROJECT_GLOBS) {
    visit(base);
  }
  return Array.from(new Set(results));
}

type FixResult = {
  file: string;
  changed: boolean;
  issues: string[];
};

function normalizeCwd(value: unknown, issues: string[]): unknown {
  if (typeof value === 'string' && value.includes('${workspaceRoot}')) {
    issues.push('cwd uses ${workspaceRoot} -> replace with {workspaceRoot}');
    return value.replace('${workspaceRoot}', '{workspaceRoot}');
  }
  return value;
}

function normalizeCommand(cmd: string, options: JsonObject, issues: string[]): string {
  let next = cmd;
  if (next.includes('${workspaceRoot}')) {
    issues.push('command contains ${workspaceRoot} -> replace with {workspaceRoot}');
    next = next.replaceAll('${workspaceRoot}', '{workspaceRoot}');
  }
  if (next.includes('${args}')) {
    issues.push('command contains ${args} -> remove and set forwardAllArgs');
    next = next.replaceAll(' ${args}', '').replaceAll('${args}', '');
    if (!options) options = {};
    if (options.forwardAllArgs !== true) {
      options.forwardAllArgs = true;
    }
  }
  return next;
}

function processProjectJson(file: string): FixResult {
  const src = fs.readFileSync(file, 'utf8');
  let json: JsonObject;
  try {
    json = JSON.parse(src);
  } catch (err) {
    return { file, changed: false, issues: [`invalid JSON: ${(err as Error).message}`] };
  }
  const before = JSON.stringify(json);
  const issues: string[] = [];

  // Iterate all targets
  const targets = (json.targets ?? {}) as JsonObject;
  for (const targetName of Object.keys(targets)) {
    const target = targets[targetName] as JsonObject;
    const options = (target.options ?? {}) as JsonObject;
    let mutated = false;

    // Normalize cwd
    if (typeof options.cwd === 'string') {
      const newCwd = normalizeCwd(options.cwd, issues);
      if (newCwd !== options.cwd) {
        options.cwd = newCwd;
        mutated = true;
      }
    }

    // Normalize command(s)
    if (typeof options.command === 'string') {
      const newCmd = normalizeCommand(options.command, options, issues);
      if (newCmd !== options.command) {
        options.command = newCmd;
        mutated = true;
      }
    }
    if (Array.isArray(options.commands)) {
      const updated = options.commands.map((c: string) => normalizeCommand(String(c), options, issues));
      if (JSON.stringify(updated) !== JSON.stringify(options.commands)) {
        options.commands = updated;
        mutated = true;
      }
    }

    if (mutated) {
      target.options = options;
      targets[targetName] = target;
    }
  }
  json.targets = targets;

  // Replace top-level strings as a safety (rare)
  const stringify = JSON.stringify(json, null, 4);
  let normalized = stringify.replaceAll('${workspaceRoot}', '{workspaceRoot}');
  // Preserve any intentional ${...} that are not workspaceRoot? We only target workspaceRoot token.

  const changed = normalized !== src;
  if (changed && FIX) {
    fs.writeFileSync(file, normalized);
  }
  return { file, changed, issues };
}

function main() {
  const files = collectProjectJsonFiles();
  if (files.length === 0) {
    console.log(colors.yellow('No project.json files found.'));
    process.exit(0);
  }
  let changedCount = 0;
  let issueCount = 0;
  const rows: string[] = [];
  for (const f of files) {
    const res = processProjectJson(f);
    if (res.issues.length > 0) {
      issueCount += res.issues.length;
      rows.push(`${res.changed ? 'fix' : 'chk'} ${f}\n - ${res.issues.join('\n - ')}`);
    }
    if (res.changed) changedCount++;
  }
  if (rows.length > 0) {
    console.log(colors.cyan(rows.join('\n')));
  }
  if (FIX) {
    console.log(colors.green(`nx-project-guard: fixed ${changedCount} files; ${issueCount} issues addressed`));
    process.exit(0);
  } else {
    if (issueCount > 0) {
      console.error(colors.red(`nx-project-guard: ${issueCount} issues found across ${files.length} files. Run with --fix to apply.`));
      process.exit(1);
    } else {
      console.log(colors.green('nx-project-guard: no issues found.'));
      process.exit(0);
    }
  }
}

main();
