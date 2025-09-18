#!/usr/bin/env -S node --enable-source-maps
/**
 * Validate structure/boundaries per AGENTS.md for MCP ecosystem.
 * - No cross-domain imports using internal src/ or dist/ paths
 * - Limit scope to MCP-related packages to avoid false positives
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import fg from 'fast-glob';

const ROOT = process.cwd();
const SCOPE = [
	'packages/mcp/**/src/**/*.{ts,tsx,js,mjs,cjs}',
	'packages/mcp-bridge/src/**/*.{ts,tsx,js,mjs,cjs}',
	'packages/mcp-registry/src/**/*.{ts,tsx,js,mjs,cjs}',
	'packages/mcp-server/src/**/*.{ts,tsx,js,mjs,cjs}',
	'packages/model-gateway/src/adapters/mcp-adapter.ts',
];

const IMPORT_RE = /^(?:\s*)import\s+[^'"\n]+\s+from\s+['"]([^'"\n]+)['"];?\s*$/;

function fail(msg: string) {
	console.error(`❌ ${msg}`);
	process.exitCode = 1;
}

async function main() {
	// Ensure AGENTS.md authority line present (delegates to existing tooling)
	const agents = readFileSync('AGENTS.md', 'utf8');
	if (!agents.includes('AGENTS.md is authoritative for structure and behavior')) {
		fail('AGENTS.md missing authority declaration');
	}

	const files = (await fg(SCOPE, { cwd: ROOT, dot: false })).filter(
		(f) => !f.includes('/node_modules/'),
	);
	const violations: string[] = [];

	for (const f of files) {
		const content = readFileSync(join(ROOT, f), 'utf8');
		for (const line of content.split('\n')) {
			const m = line.match(IMPORT_RE);
			if (!m) continue;
			const spec = m[1];
			// Ignore relative imports
			if (spec.startsWith('.') || spec.startsWith('..')) continue;
			// Absolute file path is always a violation
			if (spec.startsWith('/')) {
				violations.push(`${f}: ${spec}`);
				continue;
			}
			if (spec.includes('/src/') || spec.includes('/dist/')) {
				violations.push(`${f}: ${spec}`);
			}
		}
	}

	if (violations.length) {
		console.error('❌ Cross-domain internal import(s) detected (src/ or dist/):');
		for (const v of violations) {
			console.error(` - ${v}`);
		}
		process.exitCode = 1;
	} else {
		console.log('✅ Structure OK for MCP packages (no internal cross-domain imports)');
	}
}

main().catch((e) => {
	console.error('❌ validate-structure failed:', e);
	process.exit(1);
});
