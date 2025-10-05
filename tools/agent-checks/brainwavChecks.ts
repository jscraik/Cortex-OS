// tools/agent-checks/brainwavChecks.ts
// brAInwav: Agent-toolkit integration for prohibition scanning
import { createAgentToolkit } from '@cortex-os/agent-toolkit';

export interface ProhibitionHit {
	file: string;
	line: number;
	pattern: string;
	match: string;
}

export interface ProhibitionScanResult {
	totalHits: number;
	hitsByPattern: Record<string, ProhibitionHit[]>;
	summary: string;
}

/**
 * Scans for brAInwav policy prohibitions using agent-toolkit
 * @param paths - Array of path patterns to scan
 * @returns Scan results with all prohibition hits
 */
export async function scanForProhibitions(
	paths: string[] = ['apps', 'packages', 'libs'],
): Promise<ProhibitionScanResult> {
	const toolkit = createAgentToolkit();

	// Core prohibition patterns from brAInwav policy
	const patterns = [
		{
			id: 'math-random',
			regex: String.raw`\bMath\.random\s*\(`,
			description: 'Math.random() in production code',
		},
		{
			id: 'mock-response',
			regex: `Mock (adapter|response)`,
			description: 'Mock responses in production paths',
		},
		{
			id: 'will-be-wired',
			regex: `will be wired later`,
			description: 'Placeholder implementation comments',
		},
		{
			id: 'todo-fixme',
			regex: String.raw`\b(TODO|FIXME)\b`,
			description: 'TODO/FIXME in production paths',
		},
		{
			id: 'not-implemented-warn',
			regex: String.raw`console\.warn\(["']not implemented["']\)`,
			description: 'console.warn("not implemented")',
		},
		{
			id: 'missing-branding',
			regex: String.raw`console\.(log|error|warn)\([^[]*$`,
			description: 'Console output missing [brAInwav] branding',
		},
	];

	const hitsByPattern: Record<string, ProhibitionHit[]> = {};
	let totalHits = 0;

	for (const pattern of patterns) {
		// Use agent-toolkit multiSearch for efficient pattern matching
		// Limit to TypeScript/JavaScript files in production paths
		const filePattern = `{${paths.join(',')}}/**/*.{ts,tsx,js,jsx}`;

		try {
			const hits = await toolkit.multiSearch(pattern.regex, filePattern);

			if (hits.length > 0) {
				console.log(`[brAInwav] policy-hit pattern=${pattern.id} count=${hits.length}`);

				hitsByPattern[pattern.id] = hits.map((hit) => ({
					file: hit.file,
					line: hit.line,
					pattern: pattern.id,
					match: hit.match,
				}));

				totalHits += hits.length;
			}
		} catch (error) {
			console.error(`[brAInwav] Error scanning pattern ${pattern.id}:`, error);
		}
	}

	// Generate summary
	const summary = generateSummary(totalHits, hitsByPattern, patterns);

	return {
		totalHits,
		hitsByPattern,
		summary,
	};
}

/**
 * Validates project structure and governance compliance
 * @param filePatterns - File patterns to validate
 */
export async function validateProjectCompliance(
	filePatterns: string[] = ['**/*.ts', '**/*.tsx'],
): Promise<void> {
	const toolkit = createAgentToolkit();

	console.log('[brAInwav] Running project structure validation...');

	try {
		await toolkit.validateProject(filePatterns);
		console.log('[brAInwav] ✅ Project validation passed');
	} catch (error) {
		console.error('[brAInwav] ❌ Project validation failed:', error);
		throw error;
	}
}

/**
 * Generates human-readable summary of prohibition scan results
 */
function generateSummary(
	totalHits: number,
	hitsByPattern: Record<string, ProhibitionHit[]>,
	patterns: Array<{ id: string; description: string }>,
): string {
	if (totalHits === 0) {
		return '[brAInwav] ✅ No policy violations detected';
	}

	const lines: string[] = [`[brAInwav] ⚠️  Found ${totalHits} policy violation(s):`, ''];

	for (const pattern of patterns) {
		const hits = hitsByPattern[pattern.id];
		if (hits && hits.length > 0) {
			lines.push(`  • ${pattern.description}: ${hits.length} occurrence(s)`);

			// Show first 3 examples
			for (const hit of hits.slice(0, 3)) {
				lines.push(`    - ${hit.file}:${hit.line}`);
			}

			if (hits.length > 3) {
				lines.push(`    ...and ${hits.length - 3} more`);
			}
		}
	}

	lines.push('');
	lines.push('Run with --fix flag to auto-remediate where possible');

	return lines.join('\n');
}

/**
 * CLI entry point for running prohibition scans
 */
export async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const paths = args.length > 0 ? args : ['apps', 'packages', 'libs'];

	console.log(`[brAInwav] Scanning paths: ${paths.join(', ')}`);

	const result = await scanForProhibitions(paths);

	console.log(`\n${result.summary}`);

	// Validate project structure
	await validateProjectCompliance();

	// Exit with error code if violations found
	if (result.totalHits > 0) {
		process.exit(1);
	}
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		console.error('[brAInwav] Scan failed:', error);
		process.exit(1);
	});
}
