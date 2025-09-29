export { spoolFs, FilesystemSpool } from './spool.js';
export { persistentShell } from './shell.js';
export { restrictedFetch } from './fetch.js';
export type {
	SpoolFs,
	SpoolFilesystemOptions,
	SpoolValidator,
	SpoolCommitGate,
	WriteFileOptions,
	ReplaceOptions,
	PatchOptions,
	ShellRunOptions,
	ShellResult,
	ShellUsage,
	PersistentShell,
	PersistentShellOptions,
	RestrictedFetchPolicy,
	RestrictedFetchOptions,
	FetchResult,
} from './types.js';
export type { FilePatch, PatchPlan, PatchResult } from '@cortex-os/patchkit';
