import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadDotenv as loadDotenvTs } from '@cortex-os/utils';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const loaderSpecifier = new URL('../../scripts/utils/dotenv-loader.mjs', import.meta.url);
type LoaderModule = typeof import('../../scripts/utils/dotenv-loader.mjs');

const CREATION_PREFIX = path.join(os.tmpdir(), 'brainwav-dotenv-');

const writeFile = (filePath: string, contents: string) => {
	fs.writeFileSync(filePath, contents, { encoding: 'utf8' });
};

const mkfifoSync = typeof fs.mkfifoSync === 'function' ? fs.mkfifoSync.bind(fs) : undefined;

const removeIfExists = (target: string) => {
	if (fs.existsSync(target)) {
		fs.rmSync(target, { recursive: true, force: true });
	}
};

describe('loadDotenv integration', () => {
	let tmpDir: string;
	let loader: LoaderModule;
	const originalCwd = process.cwd();
	const originalEnv = { ...process.env };

	beforeEach(async () => {
		tmpDir = fs.mkdtempSync(CREATION_PREFIX);
		process.chdir(tmpDir);
		process.env = { ...originalEnv };
		loader = (await import(loaderSpecifier.href)) as LoaderModule;
	});

	afterEach(() => {
		removeIfExists(tmpDir);
		process.chdir(originalCwd);
		process.env = { ...originalEnv };
		vi.restoreAllMocks();
	});

	test('prefers BRAINWAV_ENV_FILE and populates env vars', async () => {
		const customFile = path.join(tmpDir, 'custom.env');
		writeFile(customFile, 'BRAINWAV_TOKEN=12345');
		process.env.BRAINWAV_ENV_FILE = customFile;

		const result = await loader.loadDotenv();

		expect(result.path).toBe(customFile);
		expect(result.skipped).toBe(false);
		expect(process.env.BRAINWAV_TOKEN).toBe('12345');
	});

	const fifoTest = mkfifoSync ? test : test.skip;

	fifoTest('skips FIFO files to avoid 1Password streams', async () => {
		const fifoPath = path.join(tmpDir, 'secrets.fifo');
		mkfifoSync?.(fifoPath);

		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const result = await loader.loadDotenv({ cwd: tmpDir, debug: true });

		expect(result.skipped).toBe(true);
		expect(result.reason).toBe('fifo');
		expect(warnSpy).toHaveBeenCalledWith(
			'[brAInwav][dotenv-loader] detected FIFO at '.concat(
				fifoPath,
				". Use 'op run' to stream secrets instead of direct dotenv access.",
			),
		);
	});

	test('TypeScript wrapper delegates to shared loader', async () => {
		const envFile = path.join(tmpDir, '.env');
		writeFile(envFile, 'BRAINWAV_APP=utils');

		const result = await loadDotenvTs({ cwd: tmpDir });

		expect(result.path).toBe(envFile);
		expect(process.env.BRAINWAV_APP).toBe('utils');
	});
});
