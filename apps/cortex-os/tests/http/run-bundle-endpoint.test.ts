import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import yauzl from 'yauzl';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RuntimeHandle } from '../../src/runtime.js';
import { REQUIRED_FILES } from '../../src/run-bundle/exporter.js';
import { prepareLoopbackAuth } from '../setup.global.js';

async function listZipEntries(buffer: Buffer): Promise<string[]> {
	return new Promise<string[]>((resolve, reject) => {
		yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
			if (err || !zipfile) {
				reject(err);
				return;
			}
			const names: string[] = [];
			zipfile.on('entry', (entry) => {
				names.push(entry.fileName);
				zipfile.readEntry();
			});
			zipfile.on('end', () => {
				zipfile.close();
				resolve(names);
			});
			zipfile.on('error', reject);
			zipfile.readEntry();
		});
	});
}

describe('GET /v1/runs/:id/bundle', () => {
	let runsRoot: string;
	let runtime: RuntimeHandle | undefined;
	let authHeader: string;

	beforeAll(async () => {
		const { header } = await prepareLoopbackAuth();
		authHeader = header;
	});

	beforeEach(async () => {
		runsRoot = await mkdtemp(join(tmpdir(), 'cortex-run-endpoint-'));
		process.env.CORTEX_RUNS_DIR = runsRoot;
		process.env.CORTEX_HTTP_PORT = '0';
		process.env.CORTEX_MCP_MANAGER_PORT = '0';
		vi.resetModules();
	});

	afterEach(async () => {
		if (runtime) {
			await runtime.stop();
			runtime = undefined;
		}
		delete process.env.CORTEX_RUNS_DIR;
		delete process.env.CORTEX_HTTP_PORT;
		delete process.env.CORTEX_MCP_MANAGER_PORT;
		await rm(runsRoot, { recursive: true, force: true });
		vi.resetModules();
	});

	it('returns a .pbrun zip containing run artifacts', async () => {
		const { provideOrchestration } = await import('../../src/services.js');
		const orchestration = provideOrchestration();

		const task = {
			id: 'bundle-endpoint-success',
			title: 'Bundle endpoint test',
			description: 'Create run bundle for endpoint test',
		} as Record<string, unknown>;

		await orchestration.run(task, [], { metadata: { testCase: 'success' } }, []);
		await orchestration.shutdown?.();

		const { startRuntime } = await import('../../src/runtime.js');
		runtime = await startRuntime();

		const response = await fetch(
			`${runtime.httpUrl}/v1/runs/${task.id as string}/bundle`,
			{
				headers: {
					Authorization: authHeader,
				},
			},
		);

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('application/zip');
		expect(response.headers.get('x-run-status')).toBe('completed');

		const arrayBuffer = await response.arrayBuffer();
		const entries = await listZipEntries(Buffer.from(arrayBuffer));
		expect(entries.sort()).toEqual([...REQUIRED_FILES].sort());

		const promptsEntry = entries.includes('prompts.json');
		expect(promptsEntry).toBe(true);
	});

	it('rejects bundle download when run is not finalized', async () => {
		const pendingRunId = 'bundle-endpoint-pending';
		const runDir = join(runsRoot, pendingRunId);
		await mkdir(runDir, { recursive: true });
		const runRecord = {
			id: pendingRunId,
			status: 'running',
			startedAt: new Date().toISOString(),
			bundleRoot: runDir,
		};
		await writeFile(join(runDir, 'run.json'), `${JSON.stringify(runRecord, null, 2)}\n`, 'utf8');
		for (const file of REQUIRED_FILES) {
			if (file === 'run.json') continue;
			await writeFile(join(runDir, file), '', 'utf8');
		}

		const { startRuntime } = await import('../../src/runtime.js');
		runtime = await startRuntime();

		const response = await fetch(`${runtime.httpUrl}/v1/runs/${pendingRunId}/bundle`, {
			headers: {
				Authorization: authHeader,
			},
		});

		expect(response.status).toBe(409);
		const body = await response.json();
		expect(body).toMatchObject({ code: 'RUN_NOT_FINALIZED' });
	});
});
