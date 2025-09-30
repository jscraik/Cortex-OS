export {
	applyPatch,
	createDiff,
	formatJsonSideBySide,
	formatUnifiedDiff,
	hasConflicts,
} from './diff.js';
export type {
	DiffHunk,
	FilePatch,
	PatchFormattingOptions,
	PatchOperation,
	PatchPlan,
	PatchResult,
} from './types.js';
