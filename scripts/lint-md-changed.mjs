#!/usr/bin/env node
import { execSync, spawnSync } from 'node:child_process';

function getChangedMarkdownFiles() {
  try {
    const diffOutput = execSync('git --no-pager diff --name-only HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return diffOutput
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.toLowerCase().endsWith('.md'));
  } catch (error) {
    console.error('Failed to determine changed files:', error.message);
    process.exitCode = 1;
    return [];
  }
}

function runMarkdownlint(files) {
  const args = ['--config', '.markdownlint-cli2.yaml', ...files];
  const { status } = spawnSync('markdownlint-cli2', args, {
    stdio: 'inherit',
  });

  if (typeof status === 'number') {
    process.exit(status);
  } else {
    console.error('markdownlint-cli2 did not return a status code.');
    process.exit(1);
  }
}

const changedMarkdownFiles = getChangedMarkdownFiles();

if (changedMarkdownFiles.length === 0) {
  console.log('No changed markdown files.');
  process.exit(0);
}

console.log('Linting changed markdown files...');
runMarkdownlint(changedMarkdownFiles);
