import { createHash } from 'node:crypto';
import type { StreamPatchSummary } from '@cortex-os/protocol';
import { applyPatch as applyUnifiedPatch, createTwoFilesPatch, structuredPatch } from 'diff';
import type { DiffHunk, FilePatch, PatchFormattingOptions } from './types.js';

const NEWLINE = '\n';

const defaultFormatting: Required<PatchFormattingOptions> = {
	contextLines: 3,
	maxPreviewLength: 180,
};

const sha = (value: string | null): string | null => {
	if (value === null) {
		return null;
	}
	return createHash('sha256').update(value).digest('hex');
};

const summarise = (lines: string[]): { additions: number; deletions: number } => {
	let additions = 0;
	let deletions = 0;
	for (const line of lines) {
		if (line.startsWith('+') && !line.startsWith('+++')) {
			additions += 1;
			continue;
		}
		if (line.startsWith('-') && !line.startsWith('---')) {
			deletions += 1;
		}
	}
	return { additions, deletions };
};

const buildPreview = (lines: string[], limit: number): string | undefined => {
	const interesting = lines.filter((line) => line.startsWith('+') || line.startsWith('-'));
	if (interesting.length === 0) {
		return undefined;
	}
	const preview = interesting.join(NEWLINE);
	if (preview.length <= limit) {
		return preview;
	}
	return `${preview.slice(0, limit)}…`;
};

const determineChangeType = (
	baseline: string | null,
	proposed: string | null,
): FilePatch['changeType'] => {
	const beforeLen = (baseline ?? '').length;
	const afterLen = (proposed ?? '').length;
	if (beforeLen === 0 && afterLen > 0) {
		return 'created';
	}
	if (beforeLen > 0 && afterLen === 0) {
		return 'deleted';
	}
	return 'modified';
};

const toDiffHunks = (
	hunks: Array<{
		newLines: number;
		newStart: number;
		oldLines: number;
		oldStart: number;
		lines: string[];
	}>,
): DiffHunk[] =>
	hunks.map((hunk) => ({
		oldStart: hunk.oldStart,
		oldLines: hunk.oldLines,
		newStart: hunk.newStart,
		newLines: hunk.newLines,
		lines: [...hunk.lines],
	}));

const buildSummary = (
	path: string,
	changeType: FilePatch['changeType'],
	hunks: DiffHunk[],
	previewLimit: number,
): StreamPatchSummary => {
	const flattened = hunks.flatMap((hunk) => hunk.lines);
	const counts = summarise(flattened);
	return {
		path,
		changeType,
		additions: counts.additions,
		deletions: counts.deletions,
		preview: buildPreview(flattened, previewLimit),
	};
};

export const createDiff = (
	path: string,
	baseline: string | null,
	proposed: string | null,
	options?: PatchFormattingOptions,
): FilePatch => {
	const formatting = { ...defaultFormatting, ...options };
	const patch = structuredPatch(path, path, baseline ?? '', proposed ?? '', '', '', {
		context: formatting.contextLines,
	});
	const diffText = createTwoFilesPatch(path, path, baseline ?? '', proposed ?? '', '', '', {
		context: formatting.contextLines,
	});
	const changeType = determineChangeType(baseline, proposed);
	const hunks = toDiffHunks(patch.hunks);
	return {
		path,
		changeType,
		hunks,
		diff: diffText,
		summary: buildSummary(path, changeType, hunks, formatting.maxPreviewLength),
		shaBefore: sha(baseline),
		shaAfter: sha(proposed),
	};
};

export const applyPatch = (baseline: string | null, patch: FilePatch): string => {
	const result = applyUnifiedPatch(baseline ?? '', patch.diff);
	if (result === false) {
		throw new Error(`Failed to apply patch for ${patch.path}`);
	}
	return result;
};

export const hasConflicts = (baseline: string | null, patch: FilePatch): boolean => {
	try {
		applyPatch(baseline, patch);
		return false;
	} catch {
		return true;
	}
};

export const formatUnifiedDiff = (patch: FilePatch): string => patch.diff;

export const formatJsonSideBySide = (
	baseline: unknown,
	proposed: unknown,
): { left: string; right: string } => {
	const stringify = (value: unknown): string => {
		if (value === undefined) {
			return 'undefined';
		}
		if (typeof value === 'string') {
			return value;
		}
		const json = JSON.stringify(value, null, 2);
		return json ?? 'null';
	};
	return { left: stringify(baseline), right: stringify(proposed) };
};
