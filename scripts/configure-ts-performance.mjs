#!/usr/bin/env node
/**
 * brAInwav TypeScript Performance Configuration Script
 * Co-authored-by: brAInwav Development Team <dev@brainwav.dev>
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const WORKSPACE_ROOT = process.cwd();
const TSCONFIG_PATH = join(WORKSPACE_ROOT, 'tsconfig.json');
const PERFORMANCE_CONFIG_PATH = join(WORKSPACE_ROOT, 'tsconfig.performance.json');
const VSCODE_SETTINGS_PATH = join(WORKSPACE_ROOT, '.vscode/settings.json');

console.log('🔧 brAInwav TypeScript Performance Configuration');
console.log('===============================================');

// Step 1: Backup current tsconfig.json
if (existsSync(TSCONFIG_PATH)) {
	const backup = readFileSync(TSCONFIG_PATH, 'utf8');
	writeFileSync(`${TSCONFIG_PATH}.backup.${Date.now()}`, backup);
	console.log('✅ Current tsconfig.json backed up');
}

// Step 2: Apply performance-optimized configuration
if (existsSync(PERFORMANCE_CONFIG_PATH)) {
	const performanceConfig = readFileSync(PERFORMANCE_CONFIG_PATH, 'utf8');
	writeFileSync(TSCONFIG_PATH, performanceConfig);
	console.log('✅ Performance-optimized tsconfig.json applied');
} else {
	console.error('❌ Performance configuration file not found');
	process.exit(1);
}

// Step 3: Create optimized VS Code settings
const vscodeSettings = {
	'typescript.preferences.includePackageJsonAutoImports': 'off',
	'typescript.suggest.autoImports': false,
	'typescript.suggest.enabled': false,
	'typescript.preferences.includeCompletionsForModuleExports': false,
	'typescript.preferences.includeCompletionsWithSnippetText': false,
	'typescript.preferences.includeCompletionsForImportStatements': false,
	'typescript.workspaceSymbols.enabled': false,
	'typescript.suggest.completeFunctionCalls': false,
	'typescript.suggest.jsdoc.generateReturns': false,
	'typescript.updateImportsOnFileMove.enabled': 'never',
	'typescript.preferences.disableSuggestions': true,
	'typescript.tsserver.maxTsServerMemory': 8192,
	'typescript.tsserver.experimental.enableProjectDiagnostics': false,
	'typescript.tsserver.useSeparateSyntaxServer': true,
	'typescript.preferences.enableRenameShorthandProperties': false,
	'typescript.suggest.includeCompletionsWithInsertText': false,
	'files.watcherExclude': {
		'**/node_modules/**': true,
		'**/dist/**': true,
		'**/build/**': true,
		'**/.nx/**': true,
		'**/.cache/**': true,
		'**/.turbo/**': true,
		'**/coverage/**': true,
		'**/reports/**': true,
		'**/data/**': true,
		'**/logs/**': true,
		'**/.tsbuildinfo': true,
	},
	'search.exclude': {
		'**/node_modules': true,
		'**/dist': true,
		'**/build': true,
		'**/.nx': true,
		'**/.cache': true,
		'**/.turbo': true,
		'**/coverage': true,
		'**/reports': true,
		'**/data': true,
		'**/logs': true,
	},
	'files.exclude': {
		'**/.tsbuildinfo': true,
		'**/node_modules': true,
		'**/dist': false,
		'**/.nx': true,
		'**/.cache': true,
	},
	// Disable problematic extensions
	'extensions.ignoreRecommendations': true,
	'nrwl.angular-console.enable': false,
};

// Ensure .vscode directory exists
import { mkdirSync } from 'fs';

const vscodeDir = join(WORKSPACE_ROOT, '.vscode');
if (!existsSync(vscodeDir)) {
	mkdirSync(vscodeDir, { recursive: true });
}

// Merge with existing settings if they exist
let existingSettings = {};
if (existsSync(VSCODE_SETTINGS_PATH)) {
	try {
		existingSettings = JSON.parse(readFileSync(VSCODE_SETTINGS_PATH, 'utf8'));
	} catch (error) {
		console.warn('⚠️  Could not parse existing VS Code settings, creating new file');
	}
}

const mergedSettings = { ...existingSettings, ...vscodeSettings };
writeFileSync(VSCODE_SETTINGS_PATH, JSON.stringify(mergedSettings, null, 2));
console.log('✅ VS Code settings optimized for TypeScript performance');

console.log('');
console.log('🎯 Configuration Complete!');
console.log('');
console.log('📋 Applied optimizations:');
console.log('  ✓ Disabled auto-imports and completions');
console.log('  ✓ Increased tsserver memory limit to 8192MB');
console.log('  ✓ Enabled incremental builds');
console.log('  ✓ Excluded build directories from watching');
console.log('  ✓ Disabled nrwl.angular-console extension');
console.log('');
console.log('🔄 Next steps:');
console.log('  1. Restart your IDE');
console.log('  2. Check TypeScript server status');
console.log('  3. Monitor memory usage');
console.log('');
console.log('💡 If issues persist, run: pnpm ts:server:restart');
