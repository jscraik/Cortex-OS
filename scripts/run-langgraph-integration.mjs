#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const require = createRequire(import.meta.url);
const vitestPkg = require.resolve('vitest/package.json');
const vitestCli = path.resolve(path.dirname(vitestPkg), 'dist/cli.js');

const args = [
        vitestCli,
        'run',
        '--config',
        'tests/vitest.config.ts',
        '--run',
        'tests/integration',
        ...process.argv.slice(2),
];

const result = spawnSync(process.execPath, args, {
        stdio: 'inherit',
        env: process.env,
});

if (result.error) {
        console.error('brAInwav integration runner failed to spawn vitest:', result.error.message);
        process.exit(1);
}

if (result.status !== 0) {
        process.exit(result.status ?? 1);
}
