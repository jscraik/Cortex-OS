#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const WORKSPACE_ROOT = process.cwd();
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

const packagesToCheck = [
	'packages/mcp-bridge',
	'packages/mcp-server',
	'packages/mcp-auth',
	'packages/memory-core',
	'packages/agent-toolkit',
];

const errors = [];
const warnings = [];

function log(level, message) {
	const color = level === 'error' ? RED : level === 'warn' ? YELLOW : GREEN;
	console.log(`${color}[${level.toUpperCase()}]${RESET} ${message}`);
}

function readJson(path) {
	return JSON.parse(readFileSync(path, 'utf8'));
}

function ensureEntryPoints(pkgDir, pkgJson) {
	if (pkgJson.main) {
		const mainPath = join(pkgDir, pkgJson.main);
		if (!existsSync(mainPath)) {
			errors.push(`${pkgJson.name}: missing main entry (${pkgJson.main})`);
		}
	}

	if (pkgJson.types) {
		const typesPath = join(pkgDir, pkgJson.types);
		if (!existsSync(typesPath)) {
			errors.push(`${pkgJson.name}: missing types entry (${pkgJson.types})`);
		}
	}
}

function runBuild(pkgName) {
	try {
		execSync(`pnpm --filter ${pkgName} build`, {
			stdio: 'ignore',
		});
	} catch (error) {
		errors.push(`${pkgName}: build command failed`);
	}
}

function validatePackage(packagePath) {
	const pkgJsonPath = join(packagePath, 'package.json');
	if (!existsSync(pkgJsonPath)) {
		return;
	}

	const pkgJson = readJson(pkgJsonPath);
	log('info', `Checking ${pkgJson.name}...`);

	const distPath = join(packagePath, 'dist');
	if (!existsSync(distPath)) {
		warnings.push(`${pkgJson.name}: dist/ directory missing`);
	}

	ensureEntryPoints(packagePath, pkgJson);
	runBuild(pkgJson.name);
}

function main() {
	log('info', 'Running build validation for selected packages');
	for (const pkg of packagesToCheck) {
		validatePackage(join(WORKSPACE_ROOT, pkg));
	}

	if (warnings.length > 0) {
		log('warn', `${warnings.length} warnings detected`);
		for (const warning of warnings) {
			console.log(`  ${YELLOW}⚠${RESET} ${warning}`);
		}
	}

	if (errors.length > 0) {
		log('error', `${errors.length} errors detected`);
		for (const error of errors) {
			console.log(`  ${RED}✗${RESET} ${error}`);
		}
		process.exit(1);
	}

	log('info', `${GREEN}All build validations completed successfully${RESET}`);
}

main();
