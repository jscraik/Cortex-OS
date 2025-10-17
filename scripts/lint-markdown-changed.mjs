#!/usr/bin/env node
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const execFileAsync = promisify(execFile);

async function listFiles(command, args) {
  try {
    const { stdout } = await execFileAsync(command, args, { cwd: process.cwd() });
    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    if (error.code === 1 && error.stdout) {
      return error.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    }
    throw error;
  }
}

function isMarkdown(file) {
  return file.toLowerCase().endsWith('.md');
}

async function gatherMarkdownFiles() {
  // Detect if running in CI
  const isCI = !!process.env.CI || !!process.env.GITHUB_ACTIONS;
  let changed = [];

  if (isCI) {
    // In CI, diff against the merge-base (e.g., origin/main or GITHUB_BASE_REF)
    let baseRef = process.env.GITHUB_BASE_REF || 'origin/main';
    // Find the merge-base commit
    let mergeBase = '';
    try {
      const { stdout } = await execFileAsync('git', ['merge-base', 'HEAD', baseRef], { cwd: process.cwd() });
      mergeBase = stdout.trim();
    } catch (e) {
      // fallback: just use baseRef directly
      mergeBase = baseRef;
    }
    changed = await listFiles('git', ['--no-pager', 'diff', '--name-only', `${mergeBase}...HEAD`]);
  } else {
    // Locally, include unstaged and staged changes
    const unstaged = await listFiles('git', ['--no-pager', 'diff', '--name-only']);
    const staged = await listFiles('git', ['--no-pager', 'diff', '--name-only', '--cached']);
    changed = [...unstaged, ...staged];
  }
  // Always include untracked files
  const untracked = await listFiles('git', ['ls-files', '--others', '--exclude-standard']);
  const unique = new Set([...changed, ...untracked].filter(isMarkdown));
  return Array.from(unique);
}

async function runMarkdownlint(files) {
  const repoRoot = process.cwd();
  const binName = process.platform === 'win32' ? 'markdownlint-cli2.cmd' : 'markdownlint-cli2';
  const binPath = path.join(repoRoot, 'node_modules', '.bin', binName);
  const args = [...files, '--config', path.join(repoRoot, '.markdownlint-cli2.yaml')];

  await new Promise((resolve, reject) => {
    const child = spawn(binPath, args, { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`markdownlint exited with status ${code}`));
      }
    });
    child.on('error', (error) => reject(error));
  });
}

async function main() {
  const files = await gatherMarkdownFiles();
  if (files.length === 0) {
    console.log('brAInwav markdownlint: No changed markdown files.');
    return;
  }

  console.log('brAInwav markdownlint: Linting markdown files:', files.join(', '));
  await runMarkdownlint(files);
}

main().catch((error) => {
  console.error(`markdownlint failed: ${error.message}`);
  process.exitCode = 1;
});
