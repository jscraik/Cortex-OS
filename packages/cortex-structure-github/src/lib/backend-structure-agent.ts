/**
 * Backend Structure Analysis Agent
 * Specialized analysis for Node.js, Python, Go, Rust, and other backend frameworks
 */

import * as path from 'node:path';

export interface BackendStructureConfig {
	framework: 'express' | 'fastapi' | 'django' | 'flask' | 'gin' | 'fiber' | 'axum' | 'auto';
	architecture: 'mvc' | 'clean' | 'hexagonal' | 'layered' | 'auto';
	language: 'typescript' | 'javascript' | 'python' | 'go' | 'rust' | 'auto';
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

	const finalConfig: BackendStructureConfig = {
		framework: (
			['express', 'fastapi', 'gin', 'django', 'flask', 'fiber', 'axum', 'auto'] as const
		).includes(config.framework as any)
			? (config.framework as any)
			: (
						['express', 'fastapi', 'gin', 'django', 'flask', 'fiber', 'axum', 'auto'] as const
					).includes(detectedFramework as any)
				? (detectedFramework as any)
				: 'auto',
		architecture: (['mvc', 'clean', 'hexagonal', 'layered', 'auto'] as const).includes(
			config.architecture as any,
		)
			? (config.architecture as any)
			: (['mvc', 'clean', 'hexagonal', 'layered', 'auto'] as const).includes(
						detectedArchitecture as any,
					)
				? (detectedArchitecture as any)
				: 'auto',
		language: (['typescript', 'javascript', 'python', 'go', 'rust', 'auto'] as const).includes(
			config.language as any,
		)
			? (config.language as any)
			: (['typescript', 'javascript', 'python', 'go', 'rust', 'auto'] as const).includes(
						detectedLanguage as any,
					)
				? (detectedLanguage as any)
				: 'auto',
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
	recommendations.push(...generateBackendRecommendations(violations, finalConfig));

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

async function detectLanguage(repoPath: string): Promise<string> {
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

async function detectFramework(repoPath: string, language: string): Promise<string> {
	try {
		switch (language) {
			case 'typescript':
			case 'javascript': {
				const packageJsonPath = path.join(repoPath, 'package.json');
				const packageJson = JSON.parse(
					await import('node:fs').then((fs) => fs.promises.readFile(packageJsonPath, 'utf-8')),
				);
				const deps = {
					...packageJson.dependencies,
					...packageJson.devDependencies,
				};

				if (deps.express) return 'express';
				if (deps['@nestjs/core']) return 'nestjs';
				if (deps.koa) return 'koa';
				if (deps.fastify) return 'fastify';
				return 'express'; // default for Node.js
			}

			case 'python': {
				const requirements = await import('node:fs').then((fs) =>
					fs.promises.readFile(path.join(repoPath, 'requirements.txt'), 'utf-8').catch(() => ''),
				);

				if (requirements.includes('fastapi')) return 'fastapi';
				if (requirements.includes('django')) return 'django';
				if (requirements.includes('flask')) return 'flask';
				return 'fastapi'; // default for Python
			}

			case 'go': {
				const goMod = await import('node:fs').then((fs) =>
					fs.promises.readFile(path.join(repoPath, 'go.mod'), 'utf-8').catch(() => ''),
				);

				if (goMod.includes('github.com/gin-gonic/gin')) return 'gin';
				if (goMod.includes('github.com/gofiber/fiber')) return 'fiber';
				if (goMod.includes('github.com/gorilla/mux')) return 'gorilla';
				return 'gin'; // default for Go
			}

			case 'rust': {
				const cargoToml = await import('node:fs').then((fs) =>
					fs.promises.readFile(path.join(repoPath, 'Cargo.toml'), 'utf-8').catch(() => ''),
				);

				if (cargoToml.includes('axum')) return 'axum';
				if (cargoToml.includes('warp')) return 'warp';
				if (cargoToml.includes('actix-web')) return 'actix';
				return 'axum'; // default for Rust
			}

			default:
				return 'auto';
		}
	} catch {
		return 'auto';
	}
}

async function detectArchitecture(repoPath: string, _framework: string): Promise<string> {
	// Check directory structure to infer architecture pattern
	const directories = await import('node:fs').then((fs) =>
		fs.promises
			.readdir(repoPath, { withFileTypes: true })
			.then((entries) => entries.filter((e) => e.isDirectory()).map((e) => e.name))
			.catch(() => []),
	);

	const hasControllers = directories.some((d) => d.includes('controller') || d.includes('handler'));
	const hasServices = directories.some((d) => d.includes('service'));
	const hasModels = directories.some((d) => d.includes('model') || d.includes('entity'));

	if (hasControllers && hasServices && hasModels) {
		const hasDomain = directories.some((d) => d.includes('domain'));
		const hasInfra = directories.some((d) => d.includes('infra') || d.includes('infrastructure'));

		if (hasDomain && hasInfra) return 'clean';
		return 'layered';
	}

	return 'mvc'; // default
}

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

function generateBackendRecommendations(
	violations: BackendViolation[],
	_config: BackendStructureConfig,
): string[] {
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

async function applyBackendFix(_repoPath: string, violation: BackendViolation): Promise<void> {
	// Implementation would apply specific fixes based on violation type
	switch (violation.type) {
		case 'controller':
			// Move files to proper controller directory, fix naming
			break;
		case 'service':
			// Organize service layer, extract business logic
			break;
		case 'model':
			// Move models to proper directory, fix schemas
			break;
		case 'middleware':
			// Organize middleware, fix application order
			break;
		case 'route':
			// Consolidate routes, fix RESTful patterns
			break;
		case 'config':
			// Organize configuration files
			break;
		case 'test':
			// Generate missing test files
			break;
	}
}
