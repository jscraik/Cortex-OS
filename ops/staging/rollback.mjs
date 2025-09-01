#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function main() {
  const deployment = process.argv[2];
  const revision = process.env.PREVIOUS_REVISION;
  if (!deployment || !revision) {
    console.error('[rollback] usage: PREVIOUS_REVISION=<rev> rollback.mjs <deployment>');
    process.exit(1);
  }
  try {
    await execFileAsync('kubectl', ['rollout', 'undo', `deployment/${deployment}`, `--to-revision=${revision}`], {
      stdio: 'inherit',
    });
    console.log('[rollback] rollback completed');
  } catch (err) {
    console.error('[rollback] rollback failed', err);
    process.exit(1);
  }
}

main();
