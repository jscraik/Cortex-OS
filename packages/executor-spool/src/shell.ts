import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import type {
	PersistentShell,
	PersistentShellOptions,
	ShellResult,
	ShellRunOptions,
	ShellUsage,
} from './types.js';

const DEFAULT_ALLOWED = new Set([
	'bash',
	'pnpm',
	'node',
	'npm',
	'python',
	'pytest',
	'git',
	'ls',
	'cat',
	'sed',
	'rg',
	'grep',
	'find',
	'just',
	'make',
	'uv',
	'go',
	'cargo',
	'vitest',
	'cd',
	'pwd',
	'echo',
]);

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_BUFFER_BYTES = 2_000_000;

interface RunState {
	sentinel: string;
	stdout: string[];
	stderr: string[];
	bufferBytes: number;
	beforeUsage: NodeJS.ResourceUsage;
	start: number;
	timeout: number;
}

interface ListenerContext {
	finished: boolean;
	timer?: NodeJS.Timeout;
	stdoutHandler?: (chunk: Buffer) => void;
	stderrHandler?: (chunk: Buffer) => void;
}

const quote = (value: string): string => `'${value.replaceAll("'", `'"'"'`)}'`;

const stringifyCommand = (command: string | string[]): string => {
	if (Array.isArray(command)) {
		return command.map((part) => (part.includes(' ') ? quote(part) : part)).join(' ');
	}
	return command.trim();
};

const extractPrimaries = (command: string): string[] => {
	const segments = command.split(/&&|\|\||;|\n/g);
	return segments
		.map((segment) => segment.trim().split(/\s+/)[0])
		.filter((token): token is string => Boolean(token));
};

const diffUsage = (before: NodeJS.ResourceUsage, after: NodeJS.ResourceUsage): ShellUsage => ({
	userCpuMs: (after.userCPUTime - before.userCPUTime) / 1_000,
	systemCpuMs: (after.systemCPUTime - before.systemCPUTime) / 1_000,
	maxRssMb: after.maxRSS / 1_048_576,
});

const enforceAllowlist = (command: string, allowed: Set<string>): void => {
	for (const primary of extractPrimaries(command)) {
		if (!allowed.has(primary)) {
			throw new Error(`Command ${primary} not allowed in persistent shell`);
		}
	}
};

const extractExit = (
	buffer: string,
	sentinel: string,
): { exitCode: number; output: string } | null => {
	const marker = `${sentinel} `;
	const index = buffer.lastIndexOf(marker);
	if (index === -1) {
		return null;
	}
	const after = buffer.slice(index + marker.length);
	const newline = after.indexOf('\n');
	if (newline === -1) {
		return null;
	}
	const exitValue = after.slice(0, newline).trim();
	const parsed = Number.parseInt(exitValue, 10);
	const output = buffer.slice(0, index);
	const exitCode = Number.isNaN(parsed) ? -1 : parsed;
	return { exitCode, output };
};

class PersistentShellImpl implements PersistentShell {
	private readonly proc: ChildProcessWithoutNullStreams;
	private readonly root: string;
	private readonly allowed: Set<string>;
	private readonly timeoutMs: number;
	private readonly maxBufferBytes: number;
	private queue: Promise<void> = Promise.resolve();
	private disposed = false;

	public constructor(options: PersistentShellOptions) {
		this.root = resolve(options.root ?? process.cwd());
		this.allowed = new Set(options.allowedCommands ?? DEFAULT_ALLOWED);
		this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
		this.maxBufferBytes = options.maxBufferBytes ?? DEFAULT_BUFFER_BYTES;
		this.proc = spawn('bash', ['--noprofile', '--norc'], {
			cwd: this.root,
			env: { ...process.env, ...options.env },
			stdio: 'pipe',
		});
		this.proc.stdin.write('set -eo pipefail\n');
		this.proc.on('exit', () => {
			this.disposed = true;
		});
	}

	public isAlive(): boolean {
		return !this.disposed && !this.proc.killed;
	}

	public async dispose(): Promise<void> {
		if (!this.isAlive()) {
			return;
		}
		this.proc.stdin.end('exit\n');
		await new Promise<void>((resolveDispose) => {
			this.proc.once('exit', () => resolveDispose());
			setTimeout(() => {
				if (!this.proc.killed) {
					this.proc.kill('SIGKILL');
				}
			}, 1_000).unref();
		});
	}

	public run(command: string | string[], options?: ShellRunOptions): Promise<ShellResult> {
		const job = this.queue.then(
			() => this.execute(command, options),
			() => this.execute(command, options),
		);
		this.queue = job.then(
			() => undefined,
			() => undefined,
		);
		return job;
	}

	private ensureAlive(): void {
		if (!this.isAlive()) {
			throw new Error('Persistent shell is not available');
		}
	}

	private buildScript(
		command: string,
		options?: ShellRunOptions,
	): { script: string; sentinel: string; timeout: number } {
		const sentinel = `__CORTEX_EXIT_${randomUUID()}__`;
		const timeout = options?.timeoutMs ?? this.timeoutMs;
		const prefix = options?.cwd ? `cd ${quote(resolve(this.root, options.cwd))}\n` : '';
		const script = `${prefix}${command}\nprintf '${sentinel} %s\\n' $?\n`;
		return { script, sentinel, timeout };
	}

	private createState(sentinel: string, timeout: number): RunState {
		return {
			sentinel,
			stdout: [],
			stderr: [],
			bufferBytes: 0,
			beforeUsage: this.proc.resourceUsage(),
			start: performance.now(),
			timeout,
		};
	}

	private cleanupListeners(context: ListenerContext): void {
		context.finished = true;
		if (context.stdoutHandler) {
			this.proc.stdout.off('data', context.stdoutHandler);
		}
		if (context.stderrHandler) {
			this.proc.stderr.off('data', context.stderrHandler);
		}
		if (context.timer) {
			clearTimeout(context.timer);
		}
	}

	private startTimer(
		state: RunState,
		_context: ListenerContext,
		fail: (error: Error) => void,
	): NodeJS.Timeout {
		return setTimeout(() => {
			fail(new Error(`Persistent shell timed out after ${state.timeout}ms`));
			this.proc.kill('SIGKILL');
		}, state.timeout);
	}

	private buildComplete(
		state: RunState,
		context: ListenerContext,
		resolveResult: (result: ShellResult) => void,
	): (exitCode: number) => void {
		return (exitCode: number) => {
			this.cleanupListeners(context);
			const stdout = state.stdout.join('');
			const stderr = state.stderr.join('');
			const usage = diffUsage(state.beforeUsage, this.proc.resourceUsage());
			resolveResult({
				stdout,
				stderr,
				exitCode,
				durationMs: performance.now() - state.start,
				usage,
			});
		};
	}

	private buildFail(
		context: ListenerContext,
		rejectResult: (error: Error) => void,
	): (error: Error) => void {
		return (error: Error) => {
			this.cleanupListeners(context);
			rejectResult(error);
		};
	}

	private buildStdoutHandler(
		state: RunState,
		context: ListenerContext,
		complete: (exitCode: number) => void,
		fail: (error: Error) => void,
	): (chunk: Buffer) => void {
		return (chunk: Buffer) => {
			if (context.finished) {
				return;
			}
			state.bufferBytes += chunk.length;
			if (state.bufferBytes > this.maxBufferBytes) {
				fail(new Error('Persistent shell output exceeded buffer limit'));
				return;
			}
			state.stdout.push(chunk.toString());
			const exit = extractExit(state.stdout.join(''), state.sentinel);
			if (!exit) {
				return;
			}
			state.stdout = [exit.output];
			complete(exit.exitCode);
		};
	}

	private buildStderrHandler(state: RunState, context: ListenerContext): (chunk: Buffer) => void {
		return (chunk: Buffer) => {
			if (!context.finished) {
				state.stderr.push(chunk.toString());
			}
		};
	}

	private attachHandlers(
		state: RunState,
		resolveResult: (result: ShellResult) => void,
		rejectResult: (error: Error) => void,
	): void {
		const context: ListenerContext = { finished: false };
		const complete = this.buildComplete(state, context, resolveResult);
		const fail = this.buildFail(context, rejectResult);
		context.stdoutHandler = this.buildStdoutHandler(state, context, complete, fail);
		context.stderrHandler = this.buildStderrHandler(state, context);
		context.timer = this.startTimer(state, context, fail);
		this.proc.stdout.on('data', context.stdoutHandler);
		this.proc.stderr.on('data', context.stderrHandler);
	}

	private async execute(
		command: string | string[],
		options?: ShellRunOptions,
	): Promise<ShellResult> {
		this.ensureAlive();
		const formatted = stringifyCommand(command);
		enforceAllowlist(formatted, this.allowed);
		const { script, sentinel, timeout } = this.buildScript(formatted, options);
		const state = this.createState(sentinel, timeout);
		return new Promise<ShellResult>((resolveResult, rejectResult) => {
			this.attachHandlers(state, resolveResult, rejectResult);
			this.proc.stdin.write(script);
		});
	}
}

export const persistentShell = (options: PersistentShellOptions): PersistentShell =>
	new PersistentShellImpl(options);
