import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import type { HookContext, HookResult } from '../types.js';

export async function runCommand(
	cmd: string,
	ctx: HookContext,
	timeoutMs: number,
	allowlist?: string[],
): Promise<HookResult> {
	if (!cmd) return { action: 'emit', note: 'empty command' };
	const [bin, ...args] = splitCmd(cmd);
	const defaultList = ['node', 'pnpm', 'npm', 'bash', 'sh', 'osascript', 'jq', 'echo', 'prettier'];
	const allowedBins = new Set(allowlist?.length ? allowlist : defaultList);
	if (!allowedBins.has(bin)) return { action: 'deny', reason: `binary not allowed: ${bin}` };

	return new Promise<HookResult>((resolve) => {
		const child = spawn(bin, args, {
			cwd: ctx.cwd,
			env: minimalEnv(),
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let out = '';
		let err = '';
		child.stdout.on('data', (d) => {
			out += String(d);
			if (out.length > 1024 * 1024) child.kill('SIGKILL');
		});
		child.stderr.on('data', (d) => {
			err += String(d);
		});

		(async () => {
			await delay(timeoutMs);
			try {
				child.kill('SIGKILL');
			} catch {
				/* ignore */
			}
		})();

		child.on('close', (code) => {
			resolve(
				code === 0
					? { action: 'exec', output: out.trim() }
					: { action: 'deny', reason: err.trim() || `exit ${code}` },
			);
		});
	});
}

function splitCmd(cmd: string): [string, ...string[]] {
	const parts = cmd.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
	const cleaned = parts.map((p) => p.replace(/^["']/, '').replace(/["']$/, ''));
	return [cleaned[0] ?? '', ...cleaned.slice(1)];
}

function minimalEnv() {
	return {
		PATH:
			process.env.PATH?.split(':')
				.filter((p) => /\/bin|\/usr\//.test(p))
				.join(':') ?? '/usr/bin:/bin',
		HOME: process.env.HOME ?? '',
		LANG: 'C',
	};
}
