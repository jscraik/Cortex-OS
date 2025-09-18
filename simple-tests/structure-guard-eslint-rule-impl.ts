/**
 * @fileoverview Structure Guard ESLint Rule Implementation
 *
 * This ESLint rule enforces monorepo structure policies by preventing
 * forbidden cross-feature imports and maintaining architectural boundaries.
 */

// Mock ESLint Rule interface
interface ESLintRule {
	meta: {
		type: string;
		docs: {
			description: string;
			category: string;
		};
		fixable: boolean;
		messages: Record<string, string>;
		schema?: object[];
	};
	create: (context: ESLintContext) => Record<string, unknown>;
}

interface ImportDeclarationNode {
	type: 'ImportDeclaration';
	source: {
		type: 'Literal';
		value: string;
	};
}

interface ESLintContext {
	report: (options: {
		node: ImportDeclarationNode;
		messageId: string;
		data?: Record<string, string>;
	}) => void;
	getFilename: () => string;
	options: unknown[];
}

interface RuleOptions {
	bannedPatterns?: string[];
	allowedCrossPkgImports?: string[];
}

/**
 * Determines if an import path represents a cross-feature import
 */
function isCrossFeatureImport(importPath: string, currentFile: string): boolean {
	// Skip external packages and relative imports within same directory tree
	if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
		return false;
	}

	// Analyze the file path to determine current feature
	const currentFeature = extractFeatureFromPath(currentFile);
	const importFeature = extractFeatureFromImportPath(importPath, currentFile);

	if (!currentFeature || !importFeature) {
		return false;
	}

	// Cross-feature if different feature boundaries
	return currentFeature !== importFeature && isFeatureBoundaryViolation(currentFile, importPath);
}

/**
 * Extracts feature name from file path
 */
function extractFeatureFromPath(filePath: string): string | null {
	// Match patterns like: apps/cortex-os/packages/FEATURE/...
	const featureMatch = filePath.match(/\/packages\/([^/]+)\//);
	if (featureMatch) {
		return featureMatch[1];
	}

	// Match patterns like: packages/FEATURE/...
	const pkgMatch = filePath.match(/packages\/([^/]+)\//);
	if (pkgMatch) {
		return pkgMatch[1];
	}

	return null;
}

/**
 * Extracts target feature from import path relative to current file
 */
function extractFeatureFromImportPath(importPath: string, currentFile: string): string | null {
	// Handle relative imports that cross feature boundaries
	if (importPath.includes('../')) {
		// Count directory levels and check if crossing feature boundary
		const levels = (importPath.match(/\.\.\//g) || []).length;
		const currentSegments = currentFile.split('/');

		// Find packages directory in path
		const packagesIndex = currentSegments.lastIndexOf('packages');
		if (packagesIndex === -1) return null;

		// Check if we're going back enough levels to reach a sibling feature
		const currentFeatureIndex = packagesIndex + 1;
		if (levels >= currentSegments.length - currentFeatureIndex - 1) {
			// Extract target feature from import path
			const targetMatch = importPath.match(/\.\.\/([^/]+)\//);
			return targetMatch?.[1] || null;
		}
	}

	return null;
}

/**
 * Checks if import violates feature boundaries
 */
function isFeatureBoundaryViolation(_currentFile: string, importPath: string): boolean {
	// Allow imports from parent directories that aren't feature directories
	if (importPath.includes('../../shared/') || importPath.includes('../../../utils/')) {
		return false;
	}

	// Detect sibling feature directory imports
	return importPath.includes('../') && !importPath.includes('../../shared/');
}

/**
 * Checks if import matches banned patterns
 */
function matchesBannedPattern(importPath: string, bannedPatterns: string[]): string | null {
	for (const pattern of bannedPatterns) {
		try {
			if (new RegExp(pattern).test(importPath)) {
				return pattern;
			}
		} catch {
			// Invalid regex, skip
		}
	}
	return null;
}

/**
 * Checks if import is allowed via configuration
 */
function isAllowedImport(importPath: string, allowedPatterns: string[]): boolean {
	return allowedPatterns.some((pattern) => {
		try {
			return new RegExp(pattern).test(importPath);
		} catch {
			return importPath.includes(pattern);
		}
	});
}

export function createStructureGuardRule(): ESLintRule {
	return {
		meta: {
			type: 'problem',
			docs: {
				description: 'Enforces monorepo structure by preventing forbidden cross-feature imports',
				category: 'Architectural Integrity',
			},
			fixable: false,
			messages: {
				forbiddenImport:
					'Cross-feature imports are not allowed: "{{source}}". Use A2A events or MCP tools instead.',
				bannedPattern: 'Import matches banned pattern "{{pattern}}": "{{source}}"',
			},
			schema: [
				{
					type: 'object',
					properties: {
						bannedPatterns: {
							type: 'array',
							items: { type: 'string' },
							default: [
								'^@cortex-os/.*/dist/.*$',
								'^@cortex-os/.*/node_modules/.*$',
								'^packages/.*/packages/.*$',
							],
						},
						allowedCrossPkgImports: {
							type: 'array',
							items: { type: 'string' },
							default: [
								'@cortex-os/contracts**',
								'@cortex-os/types**',
								'@cortex-os/utils**',
								'@cortex-os/telemetry**',
								'@cortex-os/testing**',
								'@cortex-os/a2a**',
								'@cortex-os/mcp-core**',
								'@cortex-os/memories**',
								'@cortex-os/observability**',
							],
						},
					},
					additionalProperties: false,
				},
			],
		},

		create(context: ESLintContext) {
			const options = (context.options[0] || {}) as RuleOptions;
			const bannedPatterns = options.bannedPatterns || [
				'^@cortex-os/.*/dist/.*$',
				'^@cortex-os/.*/node_modules/.*$',
				'^packages/.*/packages/.*$',
			];
			const allowedCrossPkgImports = options.allowedCrossPkgImports || [
				'@cortex-os/contracts',
				'@cortex-os/types',
				'@cortex-os/utils',
				'@cortex-os/telemetry',
				'@cortex-os/testing',
				'@cortex-os/a2a',
				'@cortex-os/mcp-core',
				'@cortex-os/memories',
				'@cortex-os/observability',
			];

			return {
				ImportDeclaration(node: ImportDeclarationNode) {
					const importPath = node.source.value;
					const currentFile = context.getFilename();

					// Skip if import is explicitly allowed
					if (isAllowedImport(importPath, allowedCrossPkgImports)) {
						return;
					}

					// Check for banned patterns
					const matchedPattern = matchesBannedPattern(importPath, bannedPatterns);
					if (matchedPattern) {
						context.report({
							node,
							messageId: 'bannedPattern',
							data: {
								source: importPath,
								pattern: matchedPattern,
							},
						});
						return;
					}

					// Check for cross-feature imports
					if (isCrossFeatureImport(importPath, currentFile)) {
						context.report({
							node,
							messageId: 'forbiddenImport',
							data: {
								source: importPath,
							},
						});
					}
				},
			};
		},
	};
}
