import { spawnSync } from 'node:child_process';

const [, , ...args] = process.argv;

function run(command, commandArgs) {
    const result = spawnSync(command, commandArgs, {
        stdio: 'inherit',
        env: process.env,
        shell: process.platform === 'win32',
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

const [mode, ...rest] = args;

if (mode === 'placeholders') {
    run('pnpm', ['vitest', 'run', '-c', 'tests/regression/vitest.config.ts', ...rest]);
} else {
    if (!process.env.CI) {
        console.warn('[deprecated] use "pnpm test:smart" directly for full-suite testing.');
    }
    run('pnpm', ['test:smart', ...args]);
}
