/**
 * Deterministic Diff Generator
 * Generates unified diffs with SHA-256 digests as per blueprint specification
 */

import { createHash } from "crypto";
import { createTwoFilesPatch } from "diff";
import type { Config } from "../types/index.js";
import { ContentNormalizer } from "./normalizer.js";

export interface DiffOptions {
	context?: number;
	includeFileHeaders?: boolean;
	includeDigests?: boolean;
	timestamp?: boolean;
}

export interface DiffResult {
	diff: string;
	oldDigest: string;
	newDigest: string;
	stats: {
		additions: number;
		deletions: number;
		changes: number;
	};
	metadata: {
		oldSize: number;
		newSize: number;
		normalized: boolean;
		skipped: boolean;
	};
}

export interface FileDiff {
	path: string;
	oldPath?: string;
	newPath?: string;
	operation: "add" | "delete" | "modify" | "rename";
	diff: DiffResult;
}

/**
 * Deterministic diff generator with SHA-256 digests
 */
export class DiffGenerator {
	private normalizer: ContentNormalizer;

	constructor(config: Config) {
		this.normalizer = new ContentNormalizer(config);
	}

	/**
	 * Generate a deterministic unified diff between two contents
	 */
	generateDiff(
		oldContent: string,
		newContent: string,
		filename?: string,
		options: DiffOptions = {},
	): DiffResult {
		const { oldNormalized, newNormalized } = this.normalizer.normalizeForDiff(
			oldContent,
			newContent,
		);

		// Use normalized content for diff generation if available
		const oldForDiff = oldNormalized.skipped
			? oldContent
			: oldNormalized.content;
		const newForDiff = newNormalized.skipped
			? newContent
			: newNormalized.content;

		const diff = this.createUnifiedDiff(
			oldForDiff,
			newForDiff,
			filename || "file",
			options,
		);

		const stats = this.calculateStats(diff);

		return {
			diff,
			oldDigest: oldNormalized.hash,
			newDigest: newNormalized.hash,
			stats,
			metadata: {
				oldSize: oldNormalized.size,
				newSize: newNormalized.size,
				normalized: !oldNormalized.skipped && !newNormalized.skipped,
				skipped: oldNormalized.skipped || newNormalized.skipped,
			},
		};
	}

	/**
	 * Generate diffs for multiple files
	 */
	generateMultiFileDiff(
		files: Array<{
			path: string;
			oldContent?: string;
			newContent?: string;
			operation?: "add" | "delete" | "modify" | "rename";
			oldPath?: string;
			newPath?: string;
		}>,
		options: DiffOptions = {},
	): FileDiff[] {
		return files.map((file) => {
			const operation = file.operation || this.detectOperation(file);

			let diff: DiffResult;

			switch (operation) {
				case "add":
					diff = this.generateDiff(
						"",
						file.newContent || "",
						file.path,
						options,
					);
					break;
				case "delete":
					diff = this.generateDiff(
						file.oldContent || "",
						"",
						file.path,
						options,
					);
					break;
				case "modify":
				case "rename":
					diff = this.generateDiff(
						file.oldContent || "",
						file.newContent || "",
						file.path,
						options,
					);
					break;
			}

			return {
				path: file.path,
				oldPath: file.oldPath,
				newPath: file.newPath,
				operation,
				diff,
			};
		});
	}

	/**
	 * Create a deterministic digest for the entire diff
	 */
	createDiffDigest(diffs: FileDiff[]): string {
		// Sort files for deterministic ordering
		const sortedDiffs = [...diffs].sort((a, b) => a.path.localeCompare(b.path));

		const diffContent = sortedDiffs
			.map((fileDiff) => `${fileDiff.path}:${fileDiff.diff.diff}`)
			.join("\n");

		return createHash("sha256").update(diffContent, "utf8").digest("hex");
	}

	/**
	 * Format diff with digest footers as specified in blueprint
	 */
	formatDiffWithDigests(fileDiff: FileDiff): string {
		let formatted = fileDiff.diff.diff;

		// Add digest footers
		formatted += `\n# Digest-SHA256-Old: ${fileDiff.diff.oldDigest}`;
		formatted += `\n# Digest-SHA256-New: ${fileDiff.diff.newDigest}`;

		if (fileDiff.diff.metadata.normalized) {
			formatted += `\n# Content-Normalized: true`;
		}

		if (fileDiff.diff.metadata.skipped) {
			formatted += `\n# Normalization-Skipped: true (size exceeded limit)`;
		}

		return formatted;
	}

	private createUnifiedDiff(
		oldContent: string,
		newContent: string,
		filename: string,
		options: DiffOptions,
	): string {
		const timestamp = options.timestamp ? new Date().toISOString() : "";

		const diff = createTwoFilesPatch(
			filename,
			filename,
			oldContent,
			newContent,
			timestamp,
			timestamp,
			{ context: options.context },
		);

		if (options.includeFileHeaders === false) {
			return diff.split("\n").slice(2).join("\n").trim();
		}

		return diff.trim();
	}

	private calculateStats(diff: string): {
		additions: number;
		deletions: number;
		changes: number;
	} {
		const lines = diff.split("\n");
		let additions = 0;
		let deletions = 0;

		for (const line of lines) {
			if (line.startsWith("+") && !line.startsWith("+++")) {
				additions++;
			} else if (line.startsWith("-") && !line.startsWith("---")) {
				deletions++;
			}
		}

		return {
			additions,
			deletions,
			changes: additions + deletions,
		};
	}

	private detectOperation(file: {
		oldContent?: string;
		newContent?: string;
		oldPath?: string;
		newPath?: string;
	}): "add" | "delete" | "modify" | "rename" {
		if (!file.oldContent && file.newContent) {
			return "add";
		} else if (file.oldContent && !file.newContent) {
			return "delete";
		} else if (file.oldPath && file.newPath && file.oldPath !== file.newPath) {
			return "rename";
		} else {
			return "modify";
		}
	}
}

/**
 * Factory function to create diff generator from config
 */
export async function createDiffGenerator(
	config: Config,
): Promise<DiffGenerator> {
	return new DiffGenerator(config);
}
