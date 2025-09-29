import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { createDiff, type FilePatch, type PatchPlan, type PatchResult } from '@cortex-os/patchkit';
import { applyPatch as applyUnifiedDiff } from 'diff';
import type {
	PatchOptions,
	ReplaceOptions,
	SpoolCommitGate,
	SpoolFilesystemOptions,
	SpoolFs,
	SpoolValidator,
	WriteFileOptions,
} from './types.js';

interface EntrySnapshot {
	before: string | null;
	after: string | null;
}

const toPosix = (value: string): string => value.split(sep).join('/');

const ensureRooted = (root: string, candidate: string): { absolute: string; relative: string } => {
	const absolute = resolve(root, candidate);
	if (!absolute.startsWith(root)) {
		throw new Error(`Path ${candidate} escapes spool root ${root}`);
	}
	const relativePath = relative(root, absolute);
	return { absolute, relative: toPosix(relativePath) };
};

const readIfExists = async (absolute: string): Promise<string | null> => {
	try {
		return await readFile(absolute, 'utf8');
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return null;
		}
		throw error;
	}
};

const writeDeterministic = async (
	absolute: string,
	content: string,
	mode?: number,
): Promise<void> => {
	await mkdir(dirname(absolute), { recursive: true });
	await writeFile(absolute, content, { mode, encoding: 'utf8' });
};

const deleteIfExists = async (absolute: string): Promise<void> => {
	try {
		await rm(absolute);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
			throw error;
		}
	}
};

const touched = (entry: EntrySnapshot): boolean => entry.before !== entry.after;

const makeResult = (patch: FilePatch, applied: boolean, conflicted?: boolean): PatchResult => ({
	patch,
	applied,
	conflicted,
});

export class FilesystemSpool implements SpoolFs {
	private readonly root: string;
	private readonly entries = new Map<string, EntrySnapshot>();
	private readonly validators = new Set<SpoolValidator>();
	private readonly context: SpoolFilesystemOptions;
	private commitGate?: SpoolCommitGate;

	public constructor(options: SpoolFilesystemOptions = {}) {
		this.root = resolve(options.root ?? process.cwd());
		this.context = options;
		this.commitGate = options.commitGate;
		for (const validator of options.validators ?? []) {
			this.validators.add(validator);
		}
	}

	public registerValidator(validator: SpoolValidator): void {
		this.validators.add(validator);
	}

	public touchedFiles(): string[] {
		return [...this.entries.keys()].filter((path) => touched(this.entries.get(path)!)).sort();
	}

	public async write(
		path: string,
		content: string,
		options?: WriteFileOptions,
	): Promise<FilePatch> {
		const location = ensureRooted(this.root, path);
		const entry = await this.loadEntry(location.relative, location.absolute);
		await writeDeterministic(location.absolute, content, options?.mode);
		entry.after = content;
		return createDiff(location.relative, entry.before, entry.after);
	}

	public async replace(path: string, options: ReplaceOptions): Promise<FilePatch> {
		const location = ensureRooted(this.root, path);
		const entry = await this.loadEntry(location.relative, location.absolute);
		const baseline = entry.after ?? entry.before ?? '';
		const matcher =
			typeof options.match === 'string'
				? new RegExp(options.match, options.all ? 'g' : '')
				: options.match;
		const result = baseline.replace(matcher, options.replacement);
		if (result === baseline) {
			if (options.required === true) {
				throw new Error(`No match found for ${String(options.match)} in ${path}`);
			}
			return createDiff(location.relative, entry.before, entry.after);
		}
		await writeDeterministic(location.absolute, result);
		entry.after = result;
		return createDiff(location.relative, entry.before, entry.after);
	}

	public async patch(path: string, options: PatchOptions): Promise<FilePatch> {
		const location = ensureRooted(this.root, path);
		const entry = await this.loadEntry(location.relative, location.absolute);
		const baseline = entry.after ?? entry.before ?? '';
		const applied = applyUnifiedDiff(baseline, options.diff);
		if (applied === false) {
			if (options.ignoreConflicts === true) {
				return createDiff(location.relative, entry.before, entry.after);
			}
			throw new Error(`Conflicting patch for ${path}`);
		}
		await writeDeterministic(location.absolute, applied);
		entry.after = applied;
		return createDiff(location.relative, entry.before, entry.after);
	}

	public async delete(path: string): Promise<FilePatch> {
		const location = ensureRooted(this.root, path);
		const entry = await this.loadEntry(location.relative, location.absolute);
		await deleteIfExists(location.absolute);
		entry.after = null;
		return createDiff(location.relative, entry.before, entry.after);
	}

	public async batch(plan: PatchPlan): Promise<PatchResult[]> {
		const results: PatchResult[] = [];
		for (const operation of plan.operations) {
			if (operation.kind === 'write') {
				const patch = await this.write(operation.path, operation.content, { mode: operation.mode });
				results.push(makeResult(patch, true));
				continue;
			}
			if (operation.kind === 'delete') {
				const patch = await this.delete(operation.path);
				results.push(makeResult(patch, true));
				continue;
			}
			if (operation.kind === 'replace') {
				const patch = await this.replace(operation.path, {
					match: operation.match,
					replacement: operation.replacement,
					all: operation.all,
				});
				results.push(makeResult(patch, true));
				continue;
			}
			const patch = await this.patch(operation.path, { diff: operation.diff });
			results.push(makeResult(patch, true));
		}
		return results;
	}

	public async read(path: string): Promise<string | null> {
		const location = ensureRooted(this.root, path);
		const entry = this.entries.get(location.relative);
		if (entry) {
			return entry.after ?? entry.before;
		}
		return readIfExists(location.absolute);
	}

	public async diff(): Promise<FilePatch[]> {
		const patches: FilePatch[] = [];
		for (const [path, entry] of this.entries) {
			if (!touched(entry)) {
				continue;
			}
			patches.push(createDiff(path, entry.before, entry.after));
		}
		return patches.sort((a, b) => a.path.localeCompare(b.path));
	}

	public async validate(): Promise<void> {
		const patches = await this.diff();
		for (const validator of this.validators) {
			await validator(patches, { sessionId: this.context.sessionId });
		}
	}

	public async commit(): Promise<void> {
		const patches = await this.diff();
		if (patches.length === 0) {
			return;
		}
		await this.validate();
		if (this.commitGate) {
			await this.commitGate(patches, { sessionId: this.context.sessionId });
		}
		for (const entry of this.entries.values()) {
			entry.before = entry.after;
		}
	}

	public async reset(): Promise<void> {
		for (const [path, entry] of this.entries) {
			const absolute = resolve(this.root, path);
			if (entry.before === null) {
				await deleteIfExists(absolute);
				entry.after = null;
				continue;
			}
			await writeDeterministic(absolute, entry.before);
			entry.after = entry.before;
		}
	}

	private async loadEntry(relativePath: string, absolute: string): Promise<EntrySnapshot> {
		const existing = this.entries.get(relativePath);
		if (existing) {
			return existing;
		}
		const before = await readIfExists(absolute);
		const snapshot: EntrySnapshot = { before, after: before };
		this.entries.set(relativePath, snapshot);
		return snapshot;
	}
}

export const spoolFs = (options: SpoolFilesystemOptions = {}): SpoolFs =>
	new FilesystemSpool(options);
