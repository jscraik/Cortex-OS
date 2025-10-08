import { constants } from 'node:fs';
import { access, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Writable } from 'node:stream';
import archiver from 'archiver';
import { z } from 'zod';
import type { RunRecordPayload } from './recorder.js';

const REQUIRED_BUNDLE_FILES = [
	'run.json',
	'messages.jsonl',
	'citations.json',
	'policy_decisions.json',
	'energy.jsonl',
	'prompts.json',
] as const;

type RequiredBundleFile = (typeof REQUIRED_BUNDLE_FILES)[number];

const RunRecordSchema = z
	.object({
		id: z.string(),
		status: z.enum(['running', 'completed', 'failed']),
		startedAt: z.string().optional(),
		finishedAt: z.string().optional(),
		durationMs: z.number().optional(),
		bundleRoot: z.string().optional(),
		promptCount: z.number().optional(),
		messageCount: z.number().optional(),
		energySampleCount: z.number().optional(),
		error: z
			.object({
				name: z.string(),
				message: z.string(),
				stack: z.string().optional(),
			})
			.optional(),
	})
	.passthrough();

export class RunBundleNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'RunBundleNotFoundError';
	}
}

export class RunBundleValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'RunBundleValidationError';
	}
}

export interface RunBundleSummary extends RunRecordPayload {}

export async function loadRunRecord(runDir: string): Promise<RunBundleSummary> {
	const runJsonPath = join(runDir, 'run.json');
	try {
		await access(runJsonPath, constants.F_OK);
	} catch {
		throw new RunBundleNotFoundError('run.json missing for requested run');
	}
	let parsed: unknown;
	try {
		const raw = await readFile(runJsonPath, 'utf8');
		parsed = JSON.parse(raw) as unknown;
	} catch (error) {
		throw new RunBundleValidationError(`Failed to read run.json: ${(error as Error).message}`);
	}
	const validated = RunRecordSchema.safeParse(parsed);
	if (!validated.success) {
		throw new RunBundleValidationError('run.json failed schema validation');
	}
	return validated.data as RunBundleSummary;
}

export async function ensureBundleFiles(runDir: string, files: RequiredBundleFile[] = [...REQUIRED_BUNDLE_FILES]): Promise<void> {
	for (const file of files) {
		const path = join(runDir, file);
		try {
			await access(path, constants.F_OK);
		} catch {
			throw new RunBundleNotFoundError(`Missing bundle artifact '${file}' for run`);
		}
	}
}

interface StreamRunBundleOptions {
	runDir: string;
	files?: RequiredBundleFile[];
	output: Writable;
}

export async function streamRunBundleArchive({ runDir, files = [...REQUIRED_BUNDLE_FILES], output }: StreamRunBundleOptions): Promise<{ bytes: number }> {
	await ensureDirectoryExists(runDir);
	await ensureBundleFiles(runDir, files);

	return new Promise((resolve, reject) => {
		const archive = archiver('zip', { zlib: { level: 9 } });
		let settled = false;

		const finalize = (result: { bytes: number } | Error, isError = false) => {
			if (settled) return;
			settled = true;
			if (isError) {
				reject(result);
			} else {
				resolve(result as { bytes: number });
			}
		};

		archive.on('warning', (warning) => {
			if ((warning as { code?: string }).code === 'ENOENT') {
				console.warn('run bundle archive warning', warning);
			} else {
				finalize(warning, true);
			}
		});

		archive.on('error', (error) => finalize(error, true));
		output.on('error', (error) => finalize(error, true));
		output.on('finish', () => finalize({ bytes: archive.pointer() }));
		output.on('close', () => finalize({ bytes: archive.pointer() }));

		archive.pipe(output);
		for (const file of files) {
			archive.file(join(runDir, file), { name: file });
		}

		void archive.finalize().catch((error) => finalize(error as Error, true));
	});
}

async function ensureDirectoryExists(runDir: string): Promise<void> {
	try {
		const stats = await stat(runDir);
		if (!stats.isDirectory()) {
			throw new RunBundleNotFoundError('Requested run directory is not a folder');
		}
	} catch (error) {
		if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
			throw new RunBundleNotFoundError('Run directory not found');
		}
		throw error;
	}
}

export const REQUIRED_FILES: readonly RequiredBundleFile[] = REQUIRED_BUNDLE_FILES;
