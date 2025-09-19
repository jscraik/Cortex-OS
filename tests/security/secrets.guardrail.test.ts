/**
 * Guardrail test: prevent hardcoded secrets in ecosystem configs
 *
 * Scans PM2 ecosystem files for patterns resembling secrets
 * (e.g., GitHub PAT prefixes, long hex strings, direct string assignment of sensitive envs).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function walk(dir: string): string[] {
	const results: string[] = [];
	const entries = readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...walk(full));
		} else if (entry.isFile()) {
			results.push(full);
		}
	}
	return results;
}

function looksLikeEcosystemConfig(file: string): boolean {
	const name = file.toLowerCase();
	return (
		name.endsWith('ecosystem.config.js') ||
		name.endsWith('ecosystem.config.cjs') ||
		name.endsWith('ecosystem.config.json') ||
		name.endsWith('ecosystem.tsx.config.js') ||
		name.endsWith('ecosystem.json')
	);
}

describe('Guardrails: ecosystem configs do not contain hardcoded secrets', () => {
	const repoRoot = join(__dirname, '..', '..');
	const packagesDir = join(repoRoot, 'packages');

	it('contains no hardcoded GitHub PATs or webhook secrets', () => {
		// Skip if packages directory not found
		let files: string[] = [];
		try {
			if (statSync(packagesDir).isDirectory()) {
				files = walk(packagesDir).filter(looksLikeEcosystemConfig);
			}
		} catch {
			// If the repo layout changes, the test should not crash
			files = [];
		}

		for (const file of files) {
			const content = readFileSync(file, 'utf8');

			// 1) Direct GitHub PAT patterns (github_pat_ prefix)
			// Hyphen placed at the end to avoid range behavior
			expect(content).not.toMatch(/github_pat_[A-Za-z0-9_-]{10,}/);

			// 2) Suspicious long hex-like secrets (64+ hex chars) assigned in quotes
			expect(content).not.toMatch(/['"][a-f0-9]{64,}['"]/i);

			// 3) Explicit WEBHOOK_SECRET assigned to string literal (not process.env)
			//    Matches: WEBHOOK_SECRET: '...'
			expect(content).not.toMatch(/WEBHOOK_SECRET\s*:\s*['"][^'"]+['"]/);

			// 4) Explicit GITHUB_TOKEN assigned to string literal (not process.env)
			//    Matches: GITHUB_TOKEN: '...'
			expect(content).not.toMatch(/GITHUB_TOKEN\s*:\s*['"][^'"]+['"]/);
		}
	});
});
