import { spawn, spawnSync, type SpawnOptions } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

type SetupState = {
	connectorsPid: number;
	asbrPid: number;
	asbrToken: string;
};

async function waitForHttp(url: string, timeoutMs: number): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const response = await fetch(url, { cache: 'no-store' });
			if (response.ok) {
				return;
			}
		} catch {
			// retry
		}
		await delay(250);
	}
	throw new Error(`Timed out waiting for ${url}`);
}

function runOrThrow(command: string, args: string[], options: SpawnOptions = {}) {
	const result = spawnSync(command, args, {
		cwd: repoRoot,
		stdio: 'inherit',
		env: process.env,
		...options,
	});
	if (result.status !== 0) {
		throw new Error(`Command failed: ${command} ${args.join(' ')}`);
	}
}

export default async function globalSetup(): Promise<SetupState> {
	// Ensure the dashboard bundle exists before starting services.
	runOrThrow('pnpm', ['--filter', '@cortex-os/chatgpt-dashboard', 'build']);

	const connectors = spawn(
		'bash',
		['scripts/connectors/run-connectors-server.sh'],
		{
			cwd: repoRoot,
			detached: true,
			stdio: ['ignore', 'pipe', 'pipe'],
			env: {
				...process.env,
				NO_AUTH: 'true',
				CONNECTORS_SIGNATURE_KEY: process.env.CONNECTORS_SIGNATURE_KEY ?? 'integration-test-secret',
				CONNECTORS_API_KEY: process.env.CONNECTORS_API_KEY ?? '',
			},
		},
	);
	connectors.stdout?.setEncoding('utf8');
	connectors.stdout?.on('data', (chunk) => {
		process.stdout.write(`[connectors] ${chunk}`);
	});
	connectors.stderr?.setEncoding('utf8');
	connectors.stderr?.on('data', (chunk) => {
		process.stderr.write(`[connectors:err] ${chunk}`);
	});

	let connectorsExited = false;
	connectors.once('exit', (code, signal) => {
		connectorsExited = true;
		process.stderr.write(
			`[connectors] exited prematurely (code=${code ?? 'null'} signal=${signal ?? 'null'})\n`,
		);
	});

	await waitForHttp('http://127.0.0.1:3026/health', 20_000);
	if (connectorsExited) {
		throw new Error('Connectors server terminated during startup');
	}

	let tokenResolve: (token: string) => void;
	let tokenReject: (error: Error) => void;
	const tokenPromise = new Promise<string>((resolve, reject) => {
		tokenResolve = resolve;
		tokenReject = reject;
	});

	const asbr = spawn('node', ['packages/asbr/bin/cortex-asbr.js'], {
		cwd: repoRoot,
		detached: true,
		stdio: ['ignore', 'pipe', 'pipe'],
		env: {
			...process.env,
			ASBR_HOST: '127.0.0.1',
			ASBR_PORT: process.env.ASBR_PORT ?? '7439',
		},
	});
	asbr.stdout?.setEncoding('utf8');
	asbr.stdout?.on('data', (chunk) => {
		process.stdout.write(`[asbr] ${chunk}`);
		const match = /asbr token (\S+)/.exec(chunk);
		if (match) {
			tokenResolve(match[1]);
		}
	});
	asbr.stderr?.setEncoding('utf8');
	asbr.stderr?.on('data', (chunk) => {
		process.stderr.write(`[asbr:err] ${chunk}`);
	});

	asbr.once('exit', (code, signal) => {
		tokenReject(new Error(`ASBR exited during setup (code=${code ?? 'null'} signal=${signal ?? 'null'})`));
	});

	const asbrToken = await tokenPromise;
	await waitForHttp('http://127.0.0.1:7439/health', 20_000);

	process.env.E2E_CONNECTORS_BASE_URL = 'http://127.0.0.1:3026';
	process.env.E2E_DASHBOARD_BASE_URL = 'http://127.0.0.1:3026/apps/chatgpt-dashboard';
	process.env.E2E_ASBR_BASE_URL = 'http://127.0.0.1:7439';
	process.env.E2E_ASBR_TOKEN = asbrToken;

	return {
		connectorsPid: connectors.pid ?? 0,
		asbrPid: asbr.pid ?? 0,
		asbrToken,
	};
}
