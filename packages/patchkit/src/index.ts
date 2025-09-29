export type {
	DiffHunk,
	FilePatch,
	PatchPlan,
	PatchOperation,
	PatchResult,
	PatchFormattingOptions,
} from './types.js';

export {
	createDiff,
	applyPatch,
	hasConflicts,
	formatUnifiedDiff,
	formatJsonSideBySide,
} from './diff.js';
