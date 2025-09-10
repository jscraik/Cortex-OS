import { spawn } from 'node:child_process';

export interface RunProcessOptions {
	timeoutMs?: number;
	input?: string;
	parseJson?: boolean;
	env?: NodeJS.ProcessEnv;
}

export async function runProcess<T = unknown>(
	command: string,
	args: string[] = [],
	{ timeoutMs = 30_000, input, parseJson = true, env }: RunProcessOptions = {},
): Promise<T> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: ['pipe', 'pipe', 'pipe'],
			env,
		});
		let stdout = '';
		let stderr = '';

		child.stdout?.on('data', (d) => {
			stdout += d.toString();
		});
		child.stderr?.on('data', (d) => {
			stderr += d.toString();
		});

		if (input) {
			child.stdin?.write(input);
			child.stdin?.end();
		}

		const timer = setTimeout(() => {
			child.kill();
			reject(new Error(`Process timed out after ${timeoutMs}ms`));
		}, timeoutMs);

		child.on('error', (err) => {
			clearTimeout(timer);
			reject(err);
		});

		child.on('close', (code) => {
			clearTimeout(timer);
			if (code !== 0) {
				reject(new Error(stderr || `Process exited with code ${code}`));
				return;
			}
			try {
				const result = parseJson ? JSON.parse(stdout) : (stdout as unknown);
				resolve(result as T);
			} catch (err) {
				reject(new Error(`Failed to parse output: ${err}`));
			}
		});
	});
}
