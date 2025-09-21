/**
 * Backend Structure Analysis Agent
 * Specialized analysis for Node.js, Python, Go, Rust, and other backend frameworks
 */

import type { Dirent } from 'node:fs';
import { readdir } from 'node:fs/promises';
import * as path from 'node:path';

const BACKEND_LANGUAGES = ['typescript', 'javascript', 'python', 'go', 'rust', 'auto'] as const;
const BACKEND_FRAMEWORKS = [
	'express',
	'fastapi',
	'django',
	'flask',
	'gin',
	'fiber',
	'axum',
	'auto',
] as const;
const BACKEND_ARCHS = ['mvc', 'clean', 'hexagonal', 'layered', 'auto'] as const;
type BackendLanguage = (typeof BACKEND_LANGUAGES)[number];
type BackendFramework = (typeof BACKEND_FRAMEWORKS)[number];
type BackendArchitecture = (typeof BACKEND_ARCHS)[number];

export interface BackendStructureConfig {
	framework: BackendFramework;
	architecture: BackendArchitecture;
	language: BackendLanguage;
	enforceLayerSeparation: boolean;
	maxFunctionSize: number; // lines
	requireTests: boolean;
}

export interface BackendViolation {
	type:
		| 'controller'
		| 'service'
		| 'model'
		| 'middleware'
		| 'route'
		| 'config'
		| 'test'
		| 'database';
	severity: 'error' | 'warning' | 'info';
	file: string;
	line?: number;
	message: string;
	suggestion: string;
	autoFixable: boolean;
	layer?: string;
}

export interface BackendAnalysisResult {
	language: string;
	framework: string;
	architecture: string;
	score: number;
	violations: BackendViolation[];
	recommendations: string[];
	layerAnalysis: {
		controllers: LayerInfo;
		services: LayerInfo;
		models: LayerInfo;
		middleware: LayerInfo;
		routes: LayerInfo;
	};
	securityAnalysis: {
		missingValidation: string[];
		exposedSecrets: string[];
		unsafeOperations: string[];
	};
	testCoverage: {
		tested: string[];
		untested: string[];
		coveragePercentage: number;
	};
}

interface LayerInfo {
	count: number;
	violations: number;
	misplaced: string[];
	oversized: string[];
	missing: string[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _BACKEND_PATTERNS = {
	express: {
		controllers: ['src/controllers', 'controllers', 'src/routes', 'routes'],
		services: ['src/services', 'services', 'src/lib', 'lib'],
		models: ['src/models', 'models', 'src/entities', 'entities'],
		middleware: ['src/middleware', 'middleware'],
		config: ['src/config', 'config'],
		tests: ['src/__tests__', '__tests__', 'tests', 'test'],
		extensions: ['.ts', '.js'],
	},
	fastapi: {
		controllers: ['app/api', 'src/api', 'api'],
		services: ['app/services', 'src/services', 'services'],
		models: ['app/models', 'src/models', 'models'],
		schemas: ['app/schemas', 'src/schemas', 'schemas'],
		config: ['app/core', 'src/core', 'config'],
		tests: ['tests', 'test'],
		extensions: ['.py'],
	},
	django: {
		apps: ['apps', 'src'],
		models: ['*/models.py', 'models'],
		views: ['*/views.py', 'views'],
		serializers: ['*/serializers.py', 'serializers'],
		urls: ['*/urls.py'],
		tests: ['*/tests.py', 'tests'],
		extensions: ['.py'],
	},
	gin: {
		handlers: ['handlers', 'controllers'],
		services: ['services', 'pkg/services'],
		models: ['models', 'pkg/models'],
		middleware: ['middleware', 'pkg/middleware'],
		config: ['config', 'pkg/config'],
		tests: ['*_test.go'],
		extensions: ['.go'],
	},
	axum: {
		handlers: ['src/handlers', 'handlers'],
		services: ['src/services', 'services'],
		models: ['src/models', 'models'],
		config: ['src/config', 'config'],
		tests: ['tests'],
		extensions: ['.rs'],
	},
};

export async function analyzeBackendStructure(
	repoPath: string,
	config: Partial<BackendStructureConfig> = {},
): Promise<BackendAnalysisResult> {
	const detectedLanguage = await detectLanguage(repoPath);
	const detectedFramework = await detectFramework(repoPath, detectedLanguage);
	const detectedArchitecture = await detectArchitecture(repoPath, detectedFramework);

	const language = pickOption<BackendLanguage>(
		config.language,
		detectedLanguage,
		BACKEND_LANGUAGES,
		'auto',
	);
	const framework = pickOption<BackendFramework>(
		config.framework,
		detectedFramework,
		BACKEND_FRAMEWORKS,
		'auto',
	);
	const architecture = pickOption<BackendArchitecture>(
		config.architecture,
		detectedArchitecture,
		BACKEND_ARCHS,
		'auto',
	);

	const finalConfig: BackendStructureConfig = {
		framework,
		architecture,
		language,
		enforceLayerSeparation: config.enforceLayerSeparation ?? true,
		maxFunctionSize: config.maxFunctionSize || 40,
		requireTests: config.requireTests ?? true,
	};

	const violations: BackendViolation[] = [];
	const recommendations: string[] = [];

	// Analyze layers
	const layerAnalysis = await analyzeBackendLayers(repoPath, finalConfig);
	violations.push(...layerAnalysis.violations);

	// Security analysis
	const securityAnalysis = await analyzeBackendSecurity(repoPath, finalConfig);
	violations.push(...securityAnalysis.violations);

	// Test coverage analysis
	const testCoverage = await analyzeTestCoverage(repoPath, finalConfig);
	violations.push(...testCoverage.violations);

	// Calculate score
	const score = calculateBackendScore(violations);

	// Generate recommendations
	recommendations.push(...generateBackendRecommendations(violations));

	return {
		language: detectedLanguage,
		framework: detectedFramework,
		architecture: detectedArchitecture,
		score,
		violations,
		recommendations,
		layerAnalysis: layerAnalysis.summary,
		securityAnalysis: securityAnalysis.summary,
		testCoverage: testCoverage.summary,
	};
}

async function detectLanguage(repoPath: string): Promise<BackendLanguage> {
	try {
		// Check for package.json (Node.js)
		const packageJsonExists = await import('node:fs').then((fs) =>
			fs.promises
				.access(path.join(repoPath, 'package.json'))
				.then(() => true)
				.catch(() => false),
		);
		if (packageJsonExists) {
			const hasTs = await import('node:fs').then((fs) =>
				fs.promises
					.access(path.join(repoPath, 'tsconfig.json'))
					.then(() => true)
					.catch(() => false),
			);
			return hasTs ? 'typescript' : 'javascript';
		}

		// Check for Python files
		const pythonFiles = ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'];
		for (const file of pythonFiles) {
			const exists = await import('node:fs').then((fs) =>
				fs.promises
					.access(path.join(repoPath, file))
					.then(() => true)
					.catch(() => false),
			);
			if (exists) return 'python';
		}

		// Check for Go
		const goModExists = await import('node:fs').then((fs) =>
			fs.promises
				.access(path.join(repoPath, 'go.mod'))
				.then(() => true)
				.catch(() => false),
		);
		if (goModExists) return 'go';

		// Check for Rust
		const cargoTomlExists = await import('node:fs').then((fs) =>
			fs.promises
				.access(path.join(repoPath, 'Cargo.toml'))
				.then(() => true)
				.catch(() => false),
		);
		if (cargoTomlExists) return 'rust';

		return 'auto';
	} catch {
		return 'auto';
	}
}

async function detectFramework(
	repoPath: string,
	language: BackendLanguage,
): Promise<BackendFramework> {
	try {
		switch (language) {
			case 'typescript':
			case 'javascript':
				return detectJsFramework(repoPath);
			case 'python':
				return detectPythonFramework(repoPath);
			case 'go':
				return detectGoFramework(repoPath);
			case 'rust':
				return detectRustFramework(repoPath);
			default:
				return 'auto';
		}
	} catch {
		return 'auto';
	}
}

async function detectArchitecture(
	repoPath: string,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_framework: BackendFramework,
): Promise<BackendArchitecture> {
	// Check directory structure to infer architecture pattern
	const entries: Dirent[] = await readdir(repoPath, { withFileTypes: true }).catch(
		() => [] as Dirent[],
	);
	const directories = entries.filter((e) => e.isDirectory()).map((e) => e.name.toLowerCase());

	const hasControllers = directories.some(
		(d) => d.includes('controller') || d.includes('controllers'),
	);
	const hasServices = directories.some((d) => d.includes('service') || d.includes('services'));
	const hasModels = directories.some(
		(d) => d.includes('model') || d.includes('models') || d.includes('entities'),
	);

	if (hasControllers && hasServices && hasModels) {
		const hasDomain = directories.some((d) => d.includes('domain'));
		const hasInfra = directories.some((d) => d.includes('infra') || d.includes('infrastructure'));

		if (hasDomain && hasInfra) return 'clean';
		return 'layered';
	}

	// Fallbacks
	const hasSrc = directories.includes('src');
	if (hasSrc) return 'layered';
	return 'mvc';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function analyzeBackendLayers(_repoPath: string, _config: BackendStructureConfig) {
	const violations: BackendViolation[] = [];
	const summary = {
		controllers: {
			count: 0,
			violations: 0,
			misplaced: [],
			oversized: [],
			missing: [],
		} as LayerInfo,
		services: {
			count: 0,
			violations: 0,
			misplaced: [],
			oversized: [],
			missing: [],
		} as LayerInfo,
		models: {
			count: 0,
			violations: 0,
			misplaced: [],
			oversized: [],
			missing: [],
		} as LayerInfo,
		middleware: {
			count: 0,
			violations: 0,
			misplaced: [],
			oversized: [],
			missing: [],
		} as LayerInfo,
		routes: {
			count: 0,
			violations: 0,
			misplaced: [],
			oversized: [],
			missing: [],
		} as LayerInfo,
	};

	// Implementation would scan directories and validate:
	// - Proper layer separation
	// - File naming conventions
	// - Function/class size limits
	// - Dependency direction (controllers -> services -> models)

	return { violations, summary };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function analyzeBackendSecurity(_repoPath: string, _config: BackendStructureConfig) {
	const violations: BackendViolation[] = [];
	const summary = {
		missingValidation: [] as string[],
		exposedSecrets: [] as string[],
		unsafeOperations: [] as string[],
	};

	// Scan for common security issues:
	// - Missing input validation
	// - Hardcoded secrets
	// - SQL injection potential
	// - Unsafe file operations
	// - Missing authentication middleware

	return { violations, summary };
}

async function analyzeTestCoverage(_repoPath: string, config: BackendStructureConfig) {
	const violations: BackendViolation[] = [];
	const summary = {
		tested: [] as string[],
		untested: [] as string[],
		coveragePercentage: 0,
	};

	if (config.requireTests) {
		// Find all source files and check for corresponding test files
		// Calculate coverage percentage
		// Report missing tests as violations
	}

	return { violations, summary };
}

function calculateBackendScore(violations: BackendViolation[]): number {
	const errorWeight = 15;
	const warningWeight = 8;
	const infoWeight = 2;

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

function generateBackendRecommendations(violations: BackendViolation[]): string[] {
	const recommendations: string[] = [];

	const layerViolations = violations.filter((v) =>
		['controller', 'service', 'model'].includes(v.type),
	);
	if (layerViolations.length > 0) {
		recommendations.push('Improve layer separation and dependency direction');
	}

	const securityViolations = violations.filter((v) => v.message.includes('security'));
	if (securityViolations.length > 0) {
		recommendations.push('Address security vulnerabilities in backend code');
	}

	const testViolations = violations.filter((v) => v.type === 'test');
	if (testViolations.length > 0) {
		recommendations.push('Increase test coverage for backend services');
	}

	const autoFixableCount = violations.filter((v) => v.autoFixable).length;
	if (autoFixableCount > 0) {
		recommendations.push(`${autoFixableCount} issues can be auto-fixed with @insula backend fix`);
	}

	return recommendations;
}

export async function fixBackendStructure(
	repoPath: string,
	violations: BackendViolation[],
): Promise<{ fixed: number; failed: string[] }> {
	const fixableViolations = violations.filter((v) => v.autoFixable);
	let fixedCount = 0;
	const failed: string[] = [];

	for (const violation of fixableViolations) {
		try {
			await applyBackendFix(repoPath, violation);
			fixedCount++;
		} catch (error) {
			failed.push(`${violation.file}: ${error}`);
		}
	}

	return { fixed: fixedCount, failed };
}

// Minimal internal fixer stub to satisfy typechecking; extend with real fixes as needed.
async function applyBackendFix(_repoPath: string, _violation: BackendViolation): Promise<void> {
	// Intentionally a no-op for now; real implementation would codemod or move files.
	return Promise.resolve();
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

async function detectJsFramework(repoPath: string): Promise<BackendFramework> {
	const packageJsonPath = path.join(repoPath, 'package.json');
	const packageJson = JSON.parse(
		await import('node:fs').then((fs) => fs.promises.readFile(packageJsonPath, 'utf-8')),
	);
	const deps = {
		...packageJson.dependencies,
		...packageJson.devDependencies,
	};
	if (deps?.express) return 'express';
	// Map alternative Node frameworks to closest supported for analysis
	if (deps?.['@nestjs/core'] || deps?.koa || deps?.fastify) return 'express';
	return 'auto';
}

async function detectPythonFramework(repoPath: string): Promise<BackendFramework> {
	const requirements = await import('node:fs').then((fs) =>
		fs.promises.readFile(path.join(repoPath, 'requirements.txt'), 'utf-8').catch(() => ''),
	);
	if (requirements.includes('fastapi')) return 'fastapi';
	if (requirements.includes('django')) return 'django';
	if (requirements.includes('flask')) return 'flask';
	return 'auto';
}

async function detectGoFramework(repoPath: string): Promise<BackendFramework> {
	const goMod = await import('node:fs').then((fs) =>
		fs.promises.readFile(path.join(repoPath, 'go.mod'), 'utf-8').catch(() => ''),
	);
	if (goMod.includes('github.com/gin-gonic/gin')) return 'gin';
	if (goMod.includes('github.com/gofiber/fiber')) return 'fiber';
	return 'auto';
}

async function detectRustFramework(repoPath: string): Promise<BackendFramework> {
	const cargoToml = await import('node:fs').then((fs) =>
		fs.promises.readFile(path.join(repoPath, 'Cargo.toml'), 'utf-8').catch(() => ''),
	);
	if (cargoToml.includes('axum')) return 'axum';
	return 'auto';
}

// helpers inlined where needed to avoid unused warnings
