#!/usr/bin/env node
// Simple wrapper to run the eval gate from CI or local scripts
import { spawn } from 'node:child_process';

const child = spawn(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['eval:gate'], {
	stdio: 'inherit',
	env: process.env,
});

child.on('exit', (code) => {
	process.exit(code ?? 1);
});
