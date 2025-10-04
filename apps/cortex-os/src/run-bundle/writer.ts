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
	private paths: RunBundlePaths;
	constructor(private init: RunBundleInit) {
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

	async appendJSONL(rel: string, record: unknown): Promise<void> {
		const file = join(this.paths.root, rel);
		await fs.mkdir(dirname(file), { recursive: true });
		await fs.appendFile(file, JSON.stringify(record) + '\n', 'utf8');
	}

	// New: capture prompts.json
	async writePrompts(captures: PromptCapture[]): Promise<void> {
		await this.writeJSON('prompts.json', captures);
	}
}

export async function initRunBundle(init: RunBundleInit): Promise<RunBundleWriter> {
	const w = new RunBundleWriter(init);
	await w.ensure();
	return w;
}
