import type { StreamPatchSummary } from '@cortex-os/protocol';

export interface DiffHunk {
	oldStart: number;
	oldLines: number;
	newStart: number;
	newLines: number;
	lines: string[];
}

export interface FilePatch {
	path: string;
	changeType: 'created' | 'modified' | 'deleted';
	hunks: DiffHunk[];
	diff: string;
	summary: StreamPatchSummary;
	shaBefore?: string | null;
	shaAfter?: string | null;
}

export type PatchOperation =
	| {
			kind: 'write';
			path: string;
			content: string;
			mode?: number;
	  }
	| {
			kind: 'delete';
			path: string;
	  }
	| {
			kind: 'replace';
			path: string;
			match: string | RegExp;
			replacement: string;
			all?: boolean;
	  }
	| {
			kind: 'patch';
			path: string;
			diff: string;
	  };

export interface PatchPlan {
	description?: string;
	operations: PatchOperation[];
	metadata?: Record<string, unknown>;
}

export interface PatchResult {
	patch: FilePatch;
	applied: boolean;
	conflicted?: boolean;
}

export interface PatchFormattingOptions {
	contextLines?: number;
	maxPreviewLength?: number;
}
