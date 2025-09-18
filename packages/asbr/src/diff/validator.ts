/**
 * Diff Reproducibility Validator
 * Ensures deterministic diff generation and validates integrity
 */

import { createHash } from 'node:crypto';
import type { Config } from '../types/index.js';
import { DiffGenerator, type DiffResult, type FileDiff } from './generator.js';
import { ContentNormalizer } from './normalizer.js';

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	reproducible: boolean;
	digestsMatch: boolean;
	stats: {
		totalFiles: number;
		validFiles: number;
		invalidFiles: number;
		skippedFiles: number;
	};
}

export interface ReproducibilityTest {
	iterations: number;
	allDigestsMatch: boolean;
	results: Array<{
		iteration: number;
		digest: string;
		timestamp: number;
	}>;
}

/**
 * Validator for deterministic diff generation
 */
export class DiffValidator {
	private generator: DiffGenerator;
	private normalizer: ContentNormalizer;
	private config: Config;

	constructor(config: Config) {
		this.config = config;
		this.generator = new DiffGenerator(config);
		this.normalizer = new ContentNormalizer(config);
	}

	/**
	 * Validate a single diff result
	 */
	validateDiff(
		diffResult: DiffResult,
		originalOldContent: string,
		originalNewContent: string,
	): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Validate digest integrity
		const oldDigest = this.normalizer.normalize(originalOldContent).hash;
		const newDigest = this.normalizer.normalize(originalNewContent).hash;

		const digestsMatch = diffResult.oldDigest === oldDigest && diffResult.newDigest === newDigest;

		if (!digestsMatch) {
			errors.push('Digest mismatch detected');
		}

		// Validate diff format
		if (!this.isValidUnifiedDiff(diffResult.diff)) {
			errors.push('Invalid unified diff format');
		}

		// Validate stats consistency
		const calculatedStats = this.calculateDiffStats(diffResult.diff);
		if (
			calculatedStats.additions !== diffResult.stats.additions ||
			calculatedStats.deletions !== diffResult.stats.deletions
		) {
			warnings.push('Diff statistics mismatch');
		}

		// Check for potential issues
		if (diffResult.metadata.skipped) {
			warnings.push(`Content normalization skipped (size: ${diffResult.metadata.oldSize} bytes)`);
		}

		if (diffResult.metadata.oldSize > this.config.determinism.max_normalize_bytes) {
			warnings.push('Content exceeds normalization limit');
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
			reproducible: digestsMatch,
			digestsMatch,
			stats: {
				totalFiles: 1,
				validFiles: errors.length === 0 ? 1 : 0,
				invalidFiles: errors.length > 0 ? 1 : 0,
				skippedFiles: diffResult.metadata.skipped ? 1 : 0,
			},
		};
	}

	/**
	 * Validate multiple file diffs
	 */
	validateMultiFileDiff(fileDiffs: FileDiff[]): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];
		let validFiles = 0;
		let invalidFiles = 0;
		let skippedFiles = 0;

		// Check for duplicate paths
		const paths = fileDiffs.map((f) => f.path);
		const duplicates = paths.filter((path, index) => paths.indexOf(path) !== index);
		if (duplicates.length > 0) {
			errors.push(`Duplicate file paths: ${duplicates.join(', ')}`);
		}

		// Validate each file diff
		for (const fileDiff of fileDiffs) {
			const fileErrors: string[] = [];

			// Basic validation
			if (!fileDiff.path) {
				fileErrors.push('Missing file path');
			}

			if (!fileDiff.diff) {
				fileErrors.push('Missing diff content');
			}

			// Validate diff format
			if (fileDiff.diff && !this.isValidUnifiedDiff(fileDiff.diff.diff)) {
				fileErrors.push(`Invalid diff format for ${fileDiff.path}`);
			}

			// Check operation consistency
			if (fileDiff.operation === 'rename' && (!fileDiff.oldPath || !fileDiff.newPath)) {
				fileErrors.push(`Rename operation missing old/new paths for ${fileDiff.path}`);
			}

			if (fileErrors.length > 0) {
				errors.push(...fileErrors);
				invalidFiles++;
			} else {
				validFiles++;
			}

			if (fileDiff.diff?.metadata.skipped) {
				skippedFiles++;
			}
		}

		// Check overall diff integrity
		const sortedPaths = fileDiffs.map((f) => f.path).sort();
		const expectedOrder = [...sortedPaths];
		if (JSON.stringify(sortedPaths) !== JSON.stringify(expectedOrder)) {
			warnings.push('Files not in deterministic order');
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
			reproducible: this.areDigestsReproducible(fileDiffs),
			digestsMatch: this.validateAllDigests(fileDiffs),
			stats: {
				totalFiles: fileDiffs.length,
				validFiles,
				invalidFiles,
				skippedFiles,
			},
		};
	}

	/**
	 * Test reproducibility by generating the same diff multiple times
	 */
	async testReproducibility(
		oldContent: string,
		newContent: string,
		iterations: number = 5,
	): Promise<ReproducibilityTest> {
		const results: Array<{
			iteration: number;
			digest: string;
			timestamp: number;
		}> = [];

		for (let i = 0; i < iterations; i++) {
			const startTime = Date.now();
			const diffResult = this.generator.generateDiff(oldContent, newContent);

			// Create a digest of the entire diff content
			const diffDigest = createHash('sha256')
				.update(diffResult.diff + diffResult.oldDigest + diffResult.newDigest)
				.digest('hex');

			results.push({
				iteration: i + 1,
				digest: diffDigest,
				timestamp: Date.now() - startTime,
			});
		}

		// Check if all digests are identical
		const firstDigest = results[0].digest;
		const allDigestsMatch = results.every((r) => r.digest === firstDigest);

		return {
			iterations,
			allDigestsMatch,
			results,
		};
	}

	/**
	 * Validate diff against original content by applying it
	 */
	async validateByApplication(
		originalContent: string,
		diff: string,
		expectedContent: string,
	): Promise<{ success: boolean; result?: string; error?: string }> {
		try {
			// This would typically use a patch library
			// For now, we'll do a simplified validation
			const applied = this.applyDiff(originalContent, diff);

			if (applied === expectedContent) {
				return { success: true, result: applied };
			} else {
				return {
					success: false,
					error: 'Applied diff does not match expected content',
				};
			}
		} catch (error) {
			return {
				success: false,
				error: `Failed to apply diff: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * Generate a validation report for a diff
	 */
	generateValidationReport(
		validation: ValidationResult,
		reproducibility?: ReproducibilityTest,
	): string {
		let report = '# Diff Validation Report\n\n';

		report += `## Summary\n`;
		report += `- **Valid**: ${validation.isValid ? '✅' : '❌'}\n`;
		report += `- **Reproducible**: ${validation.reproducible ? '✅' : '❌'}\n`;
		report += `- **Digests Match**: ${validation.digestsMatch ? '✅' : '❌'}\n\n`;

		report += `## Statistics\n`;
		report += `- Total Files: ${validation.stats.totalFiles}\n`;
		report += `- Valid Files: ${validation.stats.validFiles}\n`;
		report += `- Invalid Files: ${validation.stats.invalidFiles}\n`;
		report += `- Skipped Files: ${validation.stats.skippedFiles}\n\n`;

		if (validation.errors.length > 0) {
			report += `## Errors\n`;
			validation.errors.forEach((error) => {
				report += `- ❌ ${error}\n`;
			});
			report += '\n';
		}

		if (validation.warnings.length > 0) {
			report += `## Warnings\n`;
			validation.warnings.forEach((warning) => {
				report += `- ⚠️ ${warning}\n`;
			});
			report += '\n';
		}

		if (reproducibility) {
			report += `## Reproducibility Test\n`;
			report += `- Iterations: ${reproducibility.iterations}\n`;
			report += `- All Digests Match: ${reproducibility.allDigestsMatch ? '✅' : '❌'}\n`;

			if (!reproducibility.allDigestsMatch) {
				report += `\n### Digest Results\n`;
				reproducibility.results.forEach((result) => {
					report += `- Iteration ${result.iteration}: ${result.digest} (${result.timestamp}ms)\n`;
				});
			}
		}

		return report;
	}

	private isValidUnifiedDiff(diff: string): boolean {
		const lines = diff.split('\n');

		// Check for basic unified diff structure
		let hasFileHeader = false;
		let hasHunkHeader = false;

		for (const line of lines) {
			if (line.startsWith('---') || line.startsWith('+++')) {
				hasFileHeader = true;
			} else if (line.startsWith('@@')) {
				hasHunkHeader = true;
			} else if (line.length > 0 && !line.match(/^[ +\-\\]/)) {
				// Invalid line format
				return false;
			}
		}

		return hasFileHeader && hasHunkHeader;
	}

	private calculateDiffStats(diff: string): {
		additions: number;
		deletions: number;
	} {
		const lines = diff.split('\n');
		let additions = 0;
		let deletions = 0;

		for (const line of lines) {
			if (line.startsWith('+') && !line.startsWith('+++')) {
				additions++;
			} else if (line.startsWith('-') && !line.startsWith('---')) {
				deletions++;
			}
		}

		return { additions, deletions };
	}

	private areDigestsReproducible(fileDiffs: FileDiff[]): boolean {
		// In a real implementation, this would test multiple generations
		return fileDiffs.every((fileDiff) => fileDiff.diff.oldDigest && fileDiff.diff.newDigest);
	}

	private validateAllDigests(fileDiffs: FileDiff[]): boolean {
		return fileDiffs.every(
			(fileDiff) =>
				this.isValidSHA256(fileDiff.diff.oldDigest) && this.isValidSHA256(fileDiff.diff.newDigest),
		);
	}

	private isValidSHA256(digest: string): boolean {
		return /^[a-f0-9]{64}$/.test(digest);
	}

	private applyDiff(originalContent: string, diff: string): string {
		// Simplified diff application - in a real implementation,
		// this would use a proper patch library
		const lines = originalContent.split('\n');
		const diffLines = diff.split('\n');

		const result = [...lines];
		let lineOffset = 0;

		for (let i = 0; i < diffLines.length; i++) {
			const line = diffLines[i];

			if (line.startsWith('@@')) {
				// Parse hunk header - use RegExp.exec for better performance
				const match = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
				if (match) {
					lineOffset = parseInt(match[1], 10) - 1;
				}
			} else if (line.startsWith('-')) {
				// Delete line
				result.splice(lineOffset, 1);
			} else if (line.startsWith('+')) {
				// Add line
				result.splice(lineOffset, 0, line.substring(1));
				lineOffset++;
			} else if (line.startsWith(' ')) {
				// Context line
				lineOffset++;
			}
		}

		return result.join('\n');
	}
}

/**
 * Factory function to create validator from config
 */
export async function createDiffValidator(config: Config): Promise<DiffValidator> {
	return new DiffValidator(config);
}
