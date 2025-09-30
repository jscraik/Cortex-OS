import { type ChildProcess, spawn } from 'node:child_process';
import { afterAll, beforeAll } from 'vitest';
import { sleep } from '../test-setup';

let _qdrantProcess: ChildProcess;
let mcpServerProcess: ChildProcess;
let restApiProcess: ChildProcess;

beforeAll(async () => {
	// Start Qdrant if not already running
	_qdrantProcess = spawn(
		'docker',
		[
			'run',
			'-d',
			'--name',
			'cortex-test-qdrant',
			'-p',
			'6333:6333',
			'-p',
			'6334:6334',
			'qdrant/qdrant:v1.8.3',
		],
		{
			stdio: 'pipe',
		},
	);

	// Wait for Qdrant to be ready
	await sleep(5000);

	// Start MCP server in HTTP mode
	mcpServerProcess = spawn(
		'node',
		['../mcp-server/dist/index.js', '--transport', 'http', '--port', '9600', '--host', '0.0.0.0'],
		{
			stdio: 'pipe',
			cwd: process.cwd(),
			env: {
				...process.env,
				NODE_ENV: 'test',
				QDRANT_URL: 'http://localhost:6333',
				QDRANT_COLLECTION: 'test-integration',
			},
		},
	);

	// Start REST API
	restApiProcess = spawn(
		'node',
		['../memory-rest-api/dist/index.js', '--port', '9700', '--host', '0.0.0.0'],
		{
			stdio: 'pipe',
			cwd: process.cwd(),
			env: {
				...process.env,
				NODE_ENV: 'test',
				QDRANT_URL: 'http://localhost:6333',
				QDRANT_COLLECTION: 'test-integration',
			},
		},
	);

	// Wait for services to start
	await sleep(3000);
}, 60000);

afterAll(async () => {
	// Clean up test processes
	if (mcpServerProcess) {
		mcpServerProcess.kill('SIGTERM');
		await sleep(1000);
		mcpServerProcess.kill('SIGKILL');
	}

	if (restApiProcess) {
		restApiProcess.kill('SIGTERM');
		await sleep(1000);
		restApiProcess.kill('SIGKILL');
	}

	// Clean up test Qdrant container
	spawn('docker', ['rm', '-f', 'cortex-test-qdrant'], {
		stdio: 'pipe',
	});

	// Clean up test collection
	spawn('curl', ['-X', 'DELETE', 'http://localhost:6333/collections/test-integration'], {
		stdio: 'pipe',
	});
});
