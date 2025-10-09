import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import type { PromptCapture } from '@cortex-os/prompts';

export interface RunBundlePaths {
	root: string; // directory for this run
}

export interface RunBundleInit {
	id: string;
	rootDir: string; // base dir for bundles, e.g., ~/.Cortex-OS/runs
}

export class RunBundleWriter {
	private readonly paths: RunBundlePaths;

	constructor(readonly init: RunBundleInit) {
		this.paths = { root: join(init.rootDir, init.id) };
	}

	async ensure(): Promise<void> {
		await fs.mkdir(this.paths.root, { recursive: true });
	}

	async writeJSON(rel: string, data: unknown): Promise<void> {
		const file = join(this.paths.root, rel);
		await fs.mkdir(dirname(file), { recursive: true });
		await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
	}

	async writeJSONLines(rel: string, records: unknown[]): Promise<void> {
		const file = join(this.paths.root, rel);
		await fs.mkdir(dirname(file), { recursive: true });
		if (records.length === 0) {
			await fs.writeFile(file, '', 'utf8');
			return;
		}
		const serialized = `${records.map((record) => JSON.stringify(record)).join('\n')}\n`;
		await fs.writeFile(file, serialized, 'utf8');
	}

	async appendJSONL(rel: string, record: unknown): Promise<void> {
		const file = join(this.paths.root, rel);
		await fs.mkdir(dirname(file), { recursive: true });
		await fs.appendFile(file, `${JSON.stringify(record)}\n`, 'utf8');
	}

	async writeText(rel: string, contents: string): Promise<void> {
		const file = join(this.paths.root, rel);
		await fs.mkdir(dirname(file), { recursive: true });
		await fs.writeFile(file, contents, 'utf8');
	}

	async writePrompts(captures: PromptCapture[]): Promise<void> {
		await this.writeJSON('prompts.json', captures);
	}

	get root(): string {
		return this.paths.root;
	}
}

export async function initRunBundle(init: RunBundleInit): Promise<RunBundleWriter> {
	const writer = new RunBundleWriter(init);
	await writer.ensure();
	return writer;
}
