import type { FilePatch, PatchPlan, PatchResult } from '@cortex-os/patchkit';
import type { BudgetMeterKind } from '@cortex-os/protocol';

export interface WriteFileOptions {
	mode?: number;
}

export interface ReplaceOptions {
	match: string | RegExp;
	replacement: string;
	all?: boolean;
	required?: boolean;
}

export interface PatchOptions {
	diff: string;
	ignoreConflicts?: boolean;
}

export type SpoolValidator = (patches: FilePatch[], context: SpoolValidationContext) => Promise<void> | void;

export interface SpoolValidationContext {
	sessionId?: string;
	budgetMeters?: BudgetMeterKind[];
}

export type SpoolCommitGate = (patches: FilePatch[], context: SpoolValidationContext) => Promise<void> | void;

export interface SpoolFilesystemOptions {
	root?: string;
	sessionId?: string;
	validators?: SpoolValidator[];
	commitGate?: SpoolCommitGate;
}

export interface SpoolFs {
	write(path: string, content: string, options?: WriteFileOptions): Promise<FilePatch>;
	replace(path: string, options: ReplaceOptions): Promise<FilePatch>;
	patch(path: string, options: PatchOptions): Promise<FilePatch>;
	delete(path: string): Promise<FilePatch>;
	batch(plan: PatchPlan): Promise<PatchResult[]>;
	read(path: string): Promise<string | null>;
	diff(): Promise<FilePatch[]>;
	validate(): Promise<void>;
	commit(): Promise<void>;
	reset(): Promise<void>;
	touchedFiles(): string[];
	registerValidator(validator: SpoolValidator): void;
}

export interface ShellRunOptions {
	cwd?: string;
	timeoutMs?: number;
}

export interface ShellUsage {
	userCpuMs: number;
	systemCpuMs: number;
	maxRssMb: number;
}

export interface ShellResult {
	stdout: string;
	stderr: string;
	exitCode: number;
	durationMs: number;
	usage: ShellUsage;
}

export interface PersistentShellOptions {
	sessionId: string;
	root?: string;
	allowedCommands?: string[];
	env?: NodeJS.ProcessEnv;
	timeoutMs?: number;
	maxBufferBytes?: number;
}

export interface PersistentShell {
	run(command: string | string[], options?: ShellRunOptions): Promise<ShellResult>;
	dispose(): Promise<void>;
	isAlive(): boolean;
}

export interface RestrictedFetchPolicy {
	allowedHosts: string[];
	allowedProtocols?: Array<'https:' | 'http:'>;
	allowedContentTypes?: string[];
	maxContentLength?: number;
	requestsPerMinute?: number;
	burst?: number;
}

export interface RestrictedFetchOptions {
	method?: string;
	headers?: Record<string, string>;
	body?: string | Uint8Array | null;
	signal?: AbortSignal;
}

export interface FetchResult {
	url: string;
	status: number;
	headers: Record<string, string>;
	body: string | Uint8Array;
	contentType?: string;
	fetchedAt: string;
	durationMs: number;
	bytes: number;
}
