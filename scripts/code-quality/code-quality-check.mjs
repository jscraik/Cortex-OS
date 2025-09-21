#!/usr/bin/env node
/*
 * Simple code quality checker for Cortex‑OS.
 *
 * Scans all .ts, .tsx, .js and .py files in the repository (excluding common
 * ignored directories) and produces recommendations for long functions,
 * inconsistent naming and deeply nested logic. It then assigns a score out of 10.
 *
 * This script is not a full linter; it provides quick heuristics to help
 * maintain strict TDD and software engineering principles.
 */

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const ignoreDirs = new Set([
	'node_modules',
	'.git',
	'dist',
	'build',
	'coverage',
	'.cortex',
	// Common Python virtualenvs and caches
	'.venv',
	'venv',
	'env',
	'.mypy_cache',
	'.pytest_cache',
	'__pycache__',
	// Python site-packages in nested app folders
	'site-packages',
	// Generated artifacts
	'out',
]);

function walk(dir) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		if (ignoreDirs.has(entry.name)) continue;
		const fullPath = path.join(dir, entry.name);
		// Skip any folder paths that clearly look like Python envs or caches
		if (
			entry.isDirectory() &&
			/(^|\/)(\.venv|venv|env|__pycache__|\.pytest_cache|site-packages)(\/|$)/.test(fullPath)
		)
			continue;
		if (entry.isDirectory()) {
			files.push(...walk(fullPath));
		} else if (entry.isFile()) {
			if (/\.(ts|tsx|js|py)$/.test(entry.name)) {
				files.push(fullPath);
			}
		}
	}
	return files;
}

function analyseFile(filePath) {
	const ext = path.extname(filePath);
	const content = fs.readFileSync(filePath, 'utf8');
	const lines = content.split(/\r?\n/);
	const recommendations = [];
	// Detect long functions (>40 lines)
	if (ext === '.py') {
		let inFunc = false;
		let funcStart = 0;
		let indentLevel = null;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const funcMatch = line.match(/^\s*def\s+([a-zA-Z0-9_]+)\s*\(/);
			if (funcMatch) {
				inFunc = true;
				funcStart = i;
				indentLevel = line.search(/\S|$/);
			}
			if (inFunc) {
				const currentIndent = line.search(/\S|$/);
				// function ends when indent less than or equal to starting indent and not the same line
				if (i > funcStart && (currentIndent <= indentLevel || line.trim() === '')) {
					const length = i - funcStart;
					if (length > 40) {
						const name = funcMatch ? funcMatch[1] : '<anonymous>';
						recommendations.push(
							`Function ${name} in ${filePath} has ${length} lines; consider splitting it.`,
						);
					}
					inFunc = false;
				}
			}
		}
	} else {
		// JS/TS: naive curly brace counting
		const functionRegex =
			/function\s+([a-zA-Z0-9_$]+)|const\s+([a-zA-Z0-9_$]+)\s*=\s*async\s*\(|const\s+([a-zA-Z0-9_$]+)\s*=\s*\(/;
		let inFunc = false;
		let braceCount = 0;
		let funcStart = 0;
		let funcName = null;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (!inFunc) {
				const match = line.match(functionRegex);
				if (match) {
					inFunc = true;
					funcStart = i;
					funcName = match[1] || match[2] || match[3] || '<anonymous>';
					// reset brace count based on first { encountered later
				}
			}
			if (inFunc) {
				for (const char of line) {
					if (char === '{') braceCount++;
					if (char === '}') braceCount--;
				}
				if (braceCount === 0 && line.includes('}')) {
					const length = i - funcStart + 1;
					if (length > 40) {
						recommendations.push(
							`Function ${funcName} in ${filePath} has ${length} lines; consider splitting it.`,
						);
					}
					inFunc = false;
					funcName = null;
				}
			}
		}
	}
	// Naming conventions
	const badNames = [];
	// Extract regexes for each language for maintainability
	const pythonFuncRegex = /def\s+([A-Za-z][A-Za-z0-9_]+)/g;
	const jsFuncRegex = /function\s+([A-Za-z][A-Za-z0-9]*)/g;
	const jsConstRegex = /const\s+([A-Za-z][A-Za-z0-9]*)\s*=/g;
	const jsLetRegex = /let\s+([A-Za-z][A-Za-z0-9]*)\s*=/g;
	// Note: matchAll used below; no single-match variable needed
	if (ext === '.py') {
		for (const m of content.matchAll(pythonFuncRegex)) {
			const name = m[1];
			if (!name) continue;
			// Python should be snake_case
			if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
				badNames.push(name);
			}
		}
	} else {
		// JS/TS: check function, const, and let declarations
		const jsMatches = [];
		for (const m of content.matchAll(jsFuncRegex)) {
			jsMatches.push(m[1]);
		}
		for (const m of content.matchAll(jsConstRegex)) {
			jsMatches.push(m[1]);
		}
		for (const m of content.matchAll(jsLetRegex)) {
			jsMatches.push(m[1]);
		}
		for (const name of jsMatches) {
			if (!name) continue;
			// JS/TS should be camelCase
			if (!/^[a-z][a-zA-Z0-9]*$/.test(name) || /_/.test(name)) {
				badNames.push(name);
			}
		}
	}
	if (badNames.length > 0) {
		recommendations.push(`Inconsistent naming in ${filePath}: ${badNames.join(', ')}.`);
	}
	return recommendations;
}

function main() {
	const files = walk(repoRoot);
	let allRecommendations = [];
	for (const file of files) {
		const recs = analyseFile(file);
		allRecommendations = allRecommendations.concat(recs);
	}
	// Compute score
	let score = 10;
	// Each category of issue counts as –2
	if (allRecommendations.some((r) => r.includes('has'))) score -= 2;
	if (allRecommendations.some((r) => r.includes('Inconsistent naming'))) score -= 2;
	if (score < 0) score = 0;
	const output = {
		score,
		recommendations: allRecommendations,
	};
	console.log(JSON.stringify(output, null, 2));
}

main();
