/**
 * Frontend Structure Analysis Agent
 * Specialized analysis for React, Vue, Angular, and other frontend frameworks
 */

import * as path from 'node:path';

const FRONTEND_FRAMEWORKS = ['react', 'vue', 'angular', 'next', 'nuxt', 'svelte', 'auto'] as const;
type FrontendFramework = (typeof FRONTEND_FRAMEWORKS)[number];

export interface FrontendStructureConfig {
	framework: FrontendFramework;
	componentConvention: 'PascalCase' | 'kebab-case' | 'camelCase';
	fileExtensions: string[];
	enforceBarrelExports: boolean;
	maxComponentSize: number; // lines
}

export interface FrontendViolation {
	type: 'component' | 'hook' | 'utils' | 'styles' | 'assets' | 'routing';
	severity: 'error' | 'warning' | 'info';
	file: string;
	line?: number;
	message: string;
	suggestion: string;
	autoFixable: boolean;
}

export interface FrontendAnalysisResult {
	framework: string;
	score: number;
	violations: FrontendViolation[];
	recommendations: string[];
	componentAnalysis: {
		totalComponents: number;
		oversizedComponents: string[];
		misnamedComponents: string[];
		misplacedComponents: string[];
	};
	hookAnalysis: {
		customHooks: number;
		misnamedHooks: string[];
		unusedHooks: string[];
	};
	routingAnalysis: {
		routeFiles: string[];
		missingRoutePaths: string[];
		duplicateRoutes: string[];
	};
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _FRONTEND_RULES = {
	react: {
		componentDirs: ['src/components', 'components', 'src/pages', 'pages'],
		hookDirs: ['src/hooks', 'hooks'],
		utilDirs: ['src/utils', 'utils', 'src/lib', 'lib'],
		styleDirs: ['src/styles', 'styles', 'src/css', 'css'],
		assetDirs: ['src/assets', 'assets', 'public'],
		componentExtensions: ['.tsx', '.jsx'],
		hookPattern: /^use[A-Z][a-zA-Z]*$/,
		componentPattern: /^[A-Z][a-zA-Z]*$/,
	},
	vue: {
		componentDirs: ['src/components', 'components'],
		hookDirs: ['src/composables', 'composables'],
		utilDirs: ['src/utils', 'utils'],
		styleDirs: ['src/styles', 'styles'],
		assetDirs: ['src/assets', 'assets', 'public'],
		componentExtensions: ['.vue'],
		componentPattern: /^[A-Z][a-zA-Z]*$/,
	},
	angular: {
		componentDirs: ['src/app/components', 'src/app'],
		serviceDirs: ['src/app/services'],
		utilDirs: ['src/app/utils', 'src/app/shared'],
		styleDirs: ['src/styles'],
		assetDirs: ['src/assets'],
		componentExtensions: ['.component.ts'],
		serviceExtensions: ['.service.ts'],
	},
};

export async function analyzeFrontendStructure(
	repoPath: string,
	config: Partial<FrontendStructureConfig> = {},
): Promise<FrontendAnalysisResult> {
	const detectedFramework = await detectFramework(repoPath);

	const framework = pickOption<FrontendFramework>(
		config.framework,
		detectedFramework,
		FRONTEND_FRAMEWORKS,
		'auto',
	);

	const finalConfig: FrontendStructureConfig = {
		framework,
		componentConvention: config.componentConvention || 'PascalCase',
		fileExtensions: config.fileExtensions || getDefaultExtensions(framework),
		enforceBarrelExports: config.enforceBarrelExports ?? true,
		maxComponentSize: config.maxComponentSize || 300,
	};

	const violations: FrontendViolation[] = [];
	const recommendations: string[] = [];

	// Analyze components
	const componentAnalysis = await analyzeComponents(repoPath, finalConfig);
	violations.push(...componentAnalysis.violations);

	// Analyze hooks (for React/Vue)
	const hookAnalysis = await analyzeHooks(repoPath, finalConfig);
	violations.push(...hookAnalysis.violations);

	// Analyze routing
	const routingAnalysis = await analyzeRouting(repoPath, finalConfig);
	violations.push(...routingAnalysis.violations);

	// Calculate score
	const score = calculateFrontendScore(violations);

	// Generate recommendations
	recommendations.push(...generateFrontendRecommendations(violations, finalConfig));

	return {
		framework: detectedFramework,
		score,
		violations,
		recommendations,
		componentAnalysis: componentAnalysis.summary,
		hookAnalysis: hookAnalysis.summary,
		routingAnalysis: routingAnalysis.summary,
	};
}

async function detectFramework(repoPath: string): Promise<FrontendFramework> {
	// Check package.json for framework dependencies
	try {
		const packageJsonPath = path.join(repoPath, 'package.json');
		const packageJson = JSON.parse(
			await import('node:fs').then((fs) => fs.promises.readFile(packageJsonPath, 'utf-8')),
		);

		const dependencies = {
			...packageJson.dependencies,
			...packageJson.devDependencies,
		};

		if (dependencies['@angular/core']) return 'angular';
		if (dependencies.next) return 'next';
		if (dependencies.nuxt) return 'nuxt';
		if (dependencies.vue) return 'vue';
		if (dependencies.svelte) return 'svelte';
		if (dependencies.react) return 'react';

		return 'auto';
	} catch {
		return 'auto';
	}
}

function getDefaultExtensions(framework: FrontendFramework): string[] {
	switch (framework) {
		case 'react':
		case 'next':
			return ['.tsx', '.jsx', '.ts', '.js'];
		case 'vue':
		case 'nuxt':
			return ['.vue', '.ts', '.js'];
		case 'angular':
			return ['.component.ts', '.service.ts', '.module.ts'];
		case 'svelte':
			return ['.svelte', '.ts', '.js'];
		default:
			return ['.tsx', '.jsx', '.vue', '.ts', '.js'];
	}
}

function pickOption<T extends string>(
	input: unknown,
	detected: T,
	allowed: readonly T[],
	fallback: T,
): T {
	if (typeof input === 'string' && (allowed as readonly string[]).includes(input)) {
		return input as T;
	}
	if ((allowed as readonly string[]).includes(detected)) {
		return detected;
	}
	return fallback;
}

// Intentionally unused placeholders until implementation is provided
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function analyzeComponents(_repoPath: string, _config: FrontendStructureConfig) {
	const violations: FrontendViolation[] = [];
	const summary = {
		totalComponents: 0,
		oversizedComponents: [] as string[],
		misnamedComponents: [] as string[],
		misplacedComponents: [] as string[],
	};

	// Implementation would scan for component files and validate:
	// - Naming conventions
	// - File size
	// - Directory placement
	// - Export patterns

	return { violations, summary };
}

async function analyzeHooks(_repoPath: string, config: FrontendStructureConfig) {
	const violations: FrontendViolation[] = [];
	const summary = {
		customHooks: 0,
		misnamedHooks: [] as string[],
		unusedHooks: [] as string[],
	};

	if (config.framework === 'react' || config.framework === 'next') {
		// Scan for hook files and validate naming patterns
		// Check for unused hooks
		// Validate hook placement
	}

	return { violations, summary };
}

async function analyzeRouting(_repoPath: string, config: FrontendStructureConfig) {
	const violations: FrontendViolation[] = [];
	const summary = {
		routeFiles: [] as string[],
		missingRoutePaths: [] as string[],
		duplicateRoutes: [] as string[],
	};

	// Framework-specific routing analysis
	switch (config.framework) {
		case 'next':
			// Analyze pages/ or app/ directory structure
			break;
		case 'nuxt':
			// Analyze pages/ directory
			break;
		case 'react':
			// Look for react-router setup
			break;
		case 'vue':
			// Look for vue-router setup
			break;
	}

	return { violations, summary };
}

function calculateFrontendScore(violations: FrontendViolation[]): number {
	const errorWeight = 10;
	const warningWeight = 5;
	const infoWeight = 1;

	const penalty = violations.reduce((total, violation) => {
		switch (violation.severity) {
			case 'error':
				return total + errorWeight;
			case 'warning':
				return total + warningWeight;
			case 'info':
				return total + infoWeight;
			default:
				return total;
		}
	}, 0);

	return Math.max(0, 100 - penalty);
}

function generateFrontendRecommendations(
	violations: FrontendViolation[],
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_config: FrontendStructureConfig,
): string[] {
	const recommendations: string[] = [];

	const errorCount = violations.filter((v) => v.severity === 'error').length;
	const warningCount = violations.filter((v) => v.severity === 'warning').length;

	if (errorCount > 0) {
		recommendations.push(`Fix ${errorCount} critical structure errors`);
	}

	if (warningCount > 0) {
		recommendations.push(`Address ${warningCount} structure warnings`);
	}

	const autoFixableCount = violations.filter((v) => v.autoFixable).length;
	if (autoFixableCount > 0) {
		recommendations.push(`${autoFixableCount} issues can be auto-fixed with @insula frontend fix`);
	}

	return recommendations;
}

export async function fixFrontendStructure(
	repoPath: string,
	violations: FrontendViolation[],
): Promise<{ fixed: number; failed: string[] }> {
	const fixableViolations = violations.filter((v) => v.autoFixable);
	let fixedCount = 0;
	const failed: string[] = [];

	for (const violation of fixableViolations) {
		try {
			await applyFrontendFix(repoPath, violation);
			fixedCount++;
		} catch (error) {
			failed.push(`${violation.file}: ${error}`);
		}
	}

	return { fixed: fixedCount, failed };
}

async function applyFrontendFix(_repoPath: string, violation: FrontendViolation): Promise<void> {
	// Implementation would apply specific fixes based on violation type
	switch (violation.type) {
		case 'component':
			// Fix component naming, move files, etc.
			break;
		case 'hook':
			// Fix hook naming, move files, etc.
			break;
		case 'utils':
			// Organize utility functions
			break;
		case 'styles':
			// Organize CSS/styling files
			break;
		case 'routing':
			// Fix routing structure
			break;
	}
}
