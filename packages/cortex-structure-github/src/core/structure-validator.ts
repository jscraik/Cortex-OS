/**
 * Repository Structure Rules for Cortex-OS
 * Defines the organizational standards and validation rules
 */

import { minimatch } from 'minimatch';

export interface StructureRule {
	name: string;
	description: string;
	pattern: string;
	allowedPaths: string[];
	disallowedPaths?: string[];
	maxFilesInDirectory?: number;
	namingConvention?: RegExp;
	requiredFiles?: string[];
	autoFix?: boolean;
}

export interface StructureViolation {
	type:
		| 'misplaced_file'
		| 'naming_violation'
		| 'directory_clutter'
		| 'missing_file'
		| 'architecture_violation';
	severity: 'error' | 'warning' | 'info';
	file: string;
	message: string;
	suggestedPath?: string;
	autoFixable: boolean;
	rule: string;
}

export interface StructureAnalysisResult {
	violations: StructureViolation[];
	score: number; // 0-100, higher is better
	summary: {
		totalFiles: number;
		violationsCount: number;
		autoFixableCount: number;
	};
}

// Cortex-OS specific structure rules
export const CORTEX_STRUCTURE_RULES: StructureRule[] = [
	// Applications should be in apps/
	{
		name: 'applications-placement',
		description: 'Applications should be placed in apps/ directory',
		pattern: '**/*{app,application,cli,tui,webui,api}*',
		allowedPaths: ['apps/**/*'],
		disallowedPaths: ['packages/**/*', 'libs/**/*'],
		autoFix: true,
	},

	// Packages should be in packages/
	{
		name: 'packages-placement',
		description: 'Feature packages should be in packages/ directory',
		pattern: '**/*{package,feature,module}*',
		allowedPaths: ['packages/**/*'],
		disallowedPaths: ['apps/**/*', 'libs/**/*'],
		autoFix: true,
	},

	// Shared libraries in libs/
	{
		name: 'libraries-placement',
		description: 'Shared libraries should be in libs/ directory',
		pattern: '**/*{lib,shared,common,util,helper}*',
		allowedPaths: ['libs/**/*'],
		disallowedPaths: ['apps/**/*', 'packages/**/*'],
		autoFix: true,
	},

	// TypeScript files organization
	{
		name: 'typescript-organization',
		description: 'TypeScript files should follow project structure',
		pattern: '**/*.ts',
		allowedPaths: [
			'apps/**/*.ts',
			'packages/**/*.ts',
			'libs/**/*.ts',
			'scripts/**/*.ts',
			'tests/**/*.ts',
		],
		disallowedPaths: ['*.ts'], // No TS files in root
		namingConvention: /^[a-z0-9-.]+\.ts$/,
		autoFix: true,
	},

	// Configuration files organization
	{
		name: 'config-files-placement',
		description: 'Configuration files should be in appropriate locations',
		pattern: '**/{*.config.*,*.json,*.yaml,*.yml}',
		allowedPaths: [
			'*.{json,yaml,yml}', // Root configs allowed
			'config/**/*',
			'**/config/**/*',
			'**/*.config.*',
		],
		maxFilesInDirectory: 20, // Prevent config clutter
		autoFix: false,
	},

	// Documentation organization
	{
		name: 'documentation-organization',
		description: 'Documentation should be organized properly',
		pattern: '**/*.md',
		allowedPaths: [
			'docs/**/*.md',
			'**/README.md',
			'*.md', // Root docs allowed
		],
		maxFilesInDirectory: 15,
		autoFix: true,
	},

	// Test files placement
	{
		name: 'test-files-placement',
		description: 'Test files should be in tests/ or alongside source',
		pattern: '**/*{test,spec}.{ts,js}',
		allowedPaths: [
			'tests/**/*',
			'**/test/**/*',
			'**/tests/**/*',
			'**/*.test.{ts,js}',
			'**/*.spec.{ts,js}',
		],
		autoFix: true,
	},

	// Docker files organization
	{
		name: 'docker-files-placement',
		description: 'Docker files should be in docker/ directory',
		pattern: '**/Docker*',
		allowedPaths: [
			'docker/**/*',
			'**/Dockerfile*',
			'apps/**/Dockerfile*', // Apps can have their own Dockerfiles
		],
		autoFix: true,
	},

	// Scripts organization
	{
		name: 'scripts-placement',
		description: 'Scripts should be in scripts/ directory',
		pattern: '**/*.{sh,bash,py,js}',
		allowedPaths: [
			'scripts/**/*',
			'bin/**/*',
			'**/scripts/**/*',
			'apps/**/scripts/**/*',
			'packages/**/scripts/**/*',
		],
		disallowedPaths: ['*.{sh,bash,py,js}'], // No scripts in root
		autoFix: true,
	},

	// Required files in packages
	{
		name: 'package-required-files',
		description: 'Packages must have required files',
		pattern: 'packages/*/package.json',
		allowedPaths: ['packages/*/package.json'],
		requiredFiles: ['package.json', 'README.md'],
		autoFix: false,
	},

	// Prevent deep nesting
	{
		name: 'prevent-deep-nesting',
		description: 'Prevent excessive directory nesting (max 6 levels)',
		pattern: '**/*',
		allowedPaths: ['**/*'],
		autoFix: false,
	},
];

export class StructureValidator {
	private readonly rules: StructureRule[];

	constructor(rules: StructureRule[] = CORTEX_STRUCTURE_RULES) {
		this.rules = rules;
	}

	validateFile(filePath: string): StructureViolation[] {
		const violations: StructureViolation[] = [];

		for (const rule of this.rules) {
			if (!minimatch(filePath, rule.pattern)) continue;

			this.checkAllowedPaths(filePath, rule, violations);
			this.checkDisallowedPaths(filePath, rule, violations);
			this.checkNamingConvention(filePath, rule, violations);
			this.checkDirectoryDepth(filePath, rule, violations);
		}

		return violations;
	}

	private checkAllowedPaths(
		filePath: string,
		rule: StructureRule,
		violations: StructureViolation[],
	): void {
		const isInAllowedPath = rule.allowedPaths.some((p) => minimatch(filePath, p));
		if (isInAllowedPath) return;
		violations.push({
			type: 'misplaced_file',
			severity: 'error',
			file: filePath,
			message: `File violates rule: ${rule.description}`,
			suggestedPath: this.suggestCorrectPath(filePath, rule),
			autoFixable: rule.autoFix || false,
			rule: rule.name,
		});
	}

	private checkDisallowedPaths(
		filePath: string,
		rule: StructureRule,
		violations: StructureViolation[],
	): void {
		if (!rule.disallowedPaths) return;
		const isInDisallowedPath = rule.disallowedPaths.some((p) => minimatch(filePath, p));
		if (!isInDisallowedPath) return;
		violations.push({
			type: 'misplaced_file',
			severity: 'error',
			file: filePath,
			message: `File is in disallowed location: ${rule.description}`,
			suggestedPath: this.suggestCorrectPath(filePath, rule),
			autoFixable: rule.autoFix || false,
			rule: rule.name,
		});
	}

	private checkNamingConvention(
		filePath: string,
		rule: StructureRule,
		violations: StructureViolation[],
	): void {
		if (!rule.namingConvention) return;
		const fileName = filePath.split('/').pop() || '';
		if (rule.namingConvention.test(fileName)) return;
		violations.push({
			type: 'naming_violation',
			severity: 'warning',
			file: filePath,
			message: `File name doesn't follow naming convention for ${rule.name}`,
			autoFixable: false,
			rule: rule.name,
		});
	}

	private checkDirectoryDepth(
		filePath: string,
		rule: StructureRule,
		violations: StructureViolation[],
	): void {
		if (rule.name !== 'prevent-deep-nesting') return;
		const depth = filePath.split('/').length;
		if (depth <= 6) return;
		violations.push({
			type: 'architecture_violation',
			severity: 'warning',
			file: filePath,
			message: `File is nested too deeply (${depth} levels). Consider restructuring.`,
			autoFixable: false,
			rule: rule.name,
		});
	}

	private suggestCorrectPath(filePath: string, rule: StructureRule): string | undefined {
		const fileName = filePath.split('/').pop() || '';

		// Simple heuristics for path suggestions
		if (rule.name === 'applications-placement') {
			return `apps/${fileName}`;
		}

		if (rule.name === 'packages-placement') {
			return `packages/${fileName}`;
		}

		if (rule.name === 'libraries-placement') {
			return `libs/${fileName}`;
		}

		if (rule.name === 'typescript-organization') {
			if (fileName.includes('test') || fileName.includes('spec')) {
				return `tests/${fileName}`;
			}
			return `src/${fileName}`;
		}

		if (rule.name === 'documentation-organization') {
			return `docs/${fileName}`;
		}

		if (rule.name === 'scripts-placement') {
			return `scripts/${fileName}`;
		}

		return rule.allowedPaths[0]?.replace('**/*', fileName);
	}

	analyzeRepository(files: string[]): StructureAnalysisResult {
		const allViolations: StructureViolation[] = [];

		for (const file of files) {
			const violations = this.validateFile(file);
			allViolations.push(...violations);
		}

		// Calculate score (100 - penalty for violations)
		const errorPenalty = allViolations.filter((v) => v.severity === 'error').length * 10;
		const warningPenalty = allViolations.filter((v) => v.severity === 'warning').length * 5;
		const infoPenalty = allViolations.filter((v) => v.severity === 'info').length * 1;

		const totalPenalty = errorPenalty + warningPenalty + infoPenalty;
		const score = Math.max(0, 100 - totalPenalty);

		return {
			violations: allViolations,
			score,
			summary: {
				totalFiles: files.length,
				violationsCount: allViolations.length,
				autoFixableCount: allViolations.filter((v) => v.autoFixable).length,
			},
		};
	}
}
