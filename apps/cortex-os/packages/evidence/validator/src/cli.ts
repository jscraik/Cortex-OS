/**
 * @file_path packages/evidence-validator/src/cli.ts
 * @description CLI implementation matching the specification
 */

import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Finding, FindingSchema } from './types';
import { EvidenceValidator } from './validator';

/**
 * Validate findings from JSON file as per specification
 */

export async function validateFindings(repositoryRoot: string, inputFile: string): Promise<void> {
	try {
		// Load findings from JSON file
		const findingsData = await readFile(inputFile, 'utf-8');
		const findings: unknown = JSON.parse(findingsData);

		// Validate JSON structure
		if (!Array.isArray(findings)) {
			throw new Error('Findings file must contain an array of findings');
		}

		// Parse and validate each finding
		const validatedFindings: Finding[] = [];
		for (const finding of findings) {
			try {
				const validatedFinding = FindingSchema.parse(finding);
				validatedFindings.push(validatedFinding);
			} catch (error) {
				console.error(`Invalid finding schema: ${JSON.stringify(finding)}`);
				throw error;
			}
		}

		// Initialize validator
		const validator = new EvidenceValidator({
			repositoryRoot,
			allowMissingFiles: false,
			allowRangeExceeding: false,
			requireHashValidation: true,
			ignorePatterns: [],
		});

		// Validate all findings
		const results = await validator.validateFindings(validatedFindings);

		// Check for validation errors
		const errors: string[] = [];
		for (const result of results) {
			if (!result.isValid) {
				errors.push(
					`Finding validation failed for ${result.finding.path}: ${result.errors.join(', ')}`,
				);
			}

			// Additional checks as per specification
			const fileExists = result.metadata.fileExists;

			if (!fileExists) {
				errors.push(`Missing file ${result.finding.path}`);
			}

			if (!result.metadata.rangeValid) {
				errors.push(
					`Bad range ${JSON.stringify({
						path: result.finding.path,
						start: result.finding.start,
						end: result.finding.end,
					})}`,
				);
			}
		}

		// Report results
		if (errors.length > 0) {
			console.error('Validation failed:');
			for (const err of errors) console.error(`  ${err}`);
			process.exit(1);
		} else {
			console.log(`Successfully validated ${validatedFindings.length} findings`);

			// Generate collection summary
			const collection = await validator.validateCollection(validatedFindings);
			console.log(`Collection summary:`);
			console.log(`  Total findings: ${collection.metadata.totalFindings}`);
			console.log(`  Valid findings: ${collection.metadata.validFindings}`);
			console.log(`  Invalid findings: ${collection.metadata.invalidFindings}`);
		}
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		console.error(`Error validating findings: ${msg}`);
		process.exit(1);
	}
}

/**
 * Main CLI entry point matching specification signature
 */
export async function main(): Promise<void> {
	const args = process.argv.slice(2);

	if (args.length !== 2) {
		console.error('Usage: validate-evidence <repository-root> <findings-file>');
		process.exit(1);
	}

	const [repositoryRoot, findingsFile] = args;

	await validateFindings(repositoryRoot, findingsFile);
}

// Run CLI if this file is executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
