// Type declarations for diff package
declare module 'diff' {
	export interface Hunk {
		oldStart: number;
		oldLines: number;
		newStart: number;
		newLines: number;
		lines: string[];
	}

	export interface ParsedDiff {
		oldFileName: string;
		newFileName: string;
		oldHeader?: string;
		newHeader?: string;
		hunks: Hunk[];
	}

	export interface Change {
		count?: number;
		value: string;
		added?: boolean;
		removed?: boolean;
	}

	export function createTwoFilesPatch(
		oldFileName: string,
		newFileName: string,
		oldStr: string,
		newStr: string,
		oldHeader?: string,
		newHeader?: string,
		options?: {
			context?: number;
			ignoreWhitespace?: boolean;
		},
	): string;

	export function structuredPatch(
		oldFileName: string,
		newFileName: string,
		oldStr: string,
		newStr: string,
		oldHeader?: string,
		newHeader?: string,
		options?: {
			context?: number;
			ignoreWhitespace?: boolean;
		},
	): ParsedDiff;

	export function applyPatch(source: string, patch: string | ParsedDiff): string | false;

	export function diffLines(oldStr: string, newStr: string, options?: object): Change[];
	export function diffWords(oldStr: string, newStr: string, options?: object): Change[];
	export function diffChars(oldStr: string, newStr: string, options?: object): Change[];
}
