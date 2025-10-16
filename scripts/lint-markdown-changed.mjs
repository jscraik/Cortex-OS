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
  const tracked = await listFiles('git', ['--no-pager', 'diff', '--name-only']);
  const untracked = await listFiles('git', ['ls-files', '--others', '--exclude-standard']);
  const unique = new Set([...tracked, ...untracked].filter(isMarkdown));
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
    console.log('No changed markdown files.');
    return;
  }

  console.log('Linting markdown files:', files.join(', '));
  await runMarkdownlint(files);
}

main().catch((error) => {
  console.error(`markdownlint failed: ${error.message}`);
  process.exitCode = 1;
});
