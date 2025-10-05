import { spawn } from 'node:child_process';

export interface RunCommandOptions {
	timeoutMs?: number;
}

export async function runCommand(
	command: string,
	args: string[] = [],
	{ timeoutMs = 30_000 }: RunCommandOptions = {},
): Promise<{ stdout: string; stderr: string; code: number }> {
	const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });

	let completed = false;

	const execPromise = new Promise<{
		stdout: string;
		stderr: string;
		code: number;
	}>((resolve, reject) => {
		let stdout = '';
		let stderr = '';

		child.stdout?.on('data', (d) => {
			stdout += d.toString();
		});
		child.stderr?.on('data', (d) => {
			stderr += d.toString();
		});

		child.on('error', (err) => {
			completed = true;
			reject(err);
		});

		child.on('close', (code) => {
			completed = true;
			resolve({ stdout, stderr, code: code ?? 0 });
		});
	});

	const timeoutPromise = new Promise<never>((_, reject) => {
		const timer = setTimeout(() => {
			if (completed) {
				return;
			}

			const timeoutError = new Error(`Process timed out after ${timeoutMs}ms and was terminated`);

			const GRACE_PERIOD_MS = 5000;
			let killTimer: NodeJS.Timeout | undefined;

			if (child.exitCode === null && child.signalCode === null) {
				child.kill('SIGTERM');
				killTimer = setTimeout(() => {
					if (!child.killed) {
						child.kill('SIGKILL');
					}
				}, GRACE_PERIOD_MS);
				child.once('exit', () => {
					if (killTimer) {
						clearTimeout(killTimer);
					}
				});
			}

			completed = true;
			reject(timeoutError);
		}, timeoutMs);

		execPromise.finally(() => clearTimeout(timer));
	});

	return Promise.race([execPromise, timeoutPromise]);
}
