import { execSync, spawn } from 'node:child_process';

export interface MemoryRunOptions {
	maxMemory: number; // bytes
	timeout?: number; // ms
	bail?: boolean;
	patterns?: string[]; // test patterns to pass to vitest
}

export interface MemoryRunResult {
	success: boolean;
	maxMemoryUsed: number; // bytes
}

export async function runTestsWithMemoryLimit(options: MemoryRunOptions): Promise<MemoryRunResult> {
	const { maxMemory, timeout = 30_000, bail = true, patterns = [] } = options;

	// Spawn vitest via the existing memory-safe wrapper with enforced limits
	const args = ['../../scripts/vitest-safe.mjs', 'run', ...patterns];
	const child = spawn('node', args, {
		cwd: process.cwd(),
		env: {
			...process.env,
			// Respect an upper bound; vitest-safe also constrains memory
			NODE_OPTIONS: `--max-old-space-size=${Math.floor(maxMemory / (1024 * 1024))} --expose-gc`,
			VITEST_BAIL: bail ? '1' : '0',
		},
		stdio: 'inherit',
	});

	let killed = false;
	let peak = 0;

	const monitor = setInterval(() => {
		try {
			const rssStr = execSync(`ps -o rss= -p ${child.pid}`).toString().trim();
			const rssMB = parseInt(rssStr || '0', 10) / 1024;
			peak = Math.max(peak, Math.floor(rssMB * 1024 * 1024));
			if (peak > maxMemory && !killed) {
				child.kill('SIGTERM');
				killed = true;
			}
		} catch {
			clearInterval(monitor);
		}
	}, 2000);

	const timer = setTimeout(() => {
		if (!killed) child.kill('SIGTERM');
	}, timeout);

	const code: number = await new Promise((resolve) => {
		child.on('close', (c) => resolve(typeof c === 'number' ? c : 1));
	});

	clearInterval(monitor);
	clearTimeout(timer);

	return {
		success: code === 0 && !killed,
		maxMemoryUsed: peak || 0,
	};
}

export interface MemoryWatcherOptions {
	maxMemory: number; // bytes
	restartOnHighMemory?: boolean;
}

export interface MemoryWatcher {
	isRunning(): boolean;
	canRunTests(): boolean;
	shutdown(): Promise<void>;
}

export function createMemorySafeWatcher(options: MemoryWatcherOptions): MemoryWatcher {
	const { maxMemory, restartOnHighMemory = true } = options;
	let running = true;
	let canRun = true;

	const interval = setInterval(() => {
		try {
			const rssStr = execSync(`ps -o rss= -p ${process.pid}`).toString().trim();
			const rssMB = parseInt(rssStr || '0', 10) / 1024;
			const rss = Math.floor(rssMB * 1024 * 1024);
			if (rss > maxMemory) {
				canRun = false;
				if (restartOnHighMemory) {
					// Simulate a restart by toggling flags; caller can recreate the watcher
					running = false;
				}
			} else {
				canRun = true;
			}
		} catch {
			// On failure, assume conservative state
			canRun = true;
		}
	}, 3000);

	return {
		isRunning: () => running,
		canRunTests: () => canRun,
		shutdown: async () => {
			running = false;
			clearInterval(interval);
		},
	};
}
