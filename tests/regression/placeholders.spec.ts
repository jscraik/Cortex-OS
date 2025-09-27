import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanRepoForPlaceholders } from '../../scripts/brainwav-production-guard';

const forbiddenTokens = ['TODO:', 'Mock', 'not yet implemented'];
const allowlist = [
	/docs\//,
	/README\.md$/,
	/tests\/regression\/__fixtures__\/placeholder-baseline\.json$/,
];
const baselinePath = path.join(__dirname, '__fixtures__/placeholder-baseline.json');

type PlaceholderDebt = { readonly file: string; readonly token: string };

function loadBaseline(): PlaceholderDebt[] {
	if (!fs.existsSync(baselinePath)) {
		return [];
	}
	const contents = fs.readFileSync(baselinePath, 'utf8');
	return JSON.parse(contents) as PlaceholderDebt[];
}

function createKey(file: string, token: string): string {
	return `${file}::${token}`;
}

describe('brAInwav placeholder regression', () => {
	it('should not find forbidden placeholder tokens in codebase', async () => {
		const results = await scanRepoForPlaceholders(forbiddenTokens, allowlist);
		const baseline = loadBaseline();
		const repoRoot = process.cwd();
		const baselineSet = new Set(baseline.map(({ file, token }) => createKey(file, token)));
		const resultKeys = new Set(
			results.map(({ file, token }) => createKey(path.relative(repoRoot, file), token)),
		);

		const newFindings = results.filter(({ file, token }) => {
			const key = createKey(path.relative(repoRoot, file), token);
			return !baselineSet.has(key);
		});

		const resolvedEntries = baseline.filter(({ file, token }) => {
			const key = createKey(file, token);
			return !resultKeys.has(key);
		});

		if (resolvedEntries.length > 0) {
			const formattedResolved = resolvedEntries
				.map(({ file, token }) => `• ${file} → "${token}"`)
				.join('\n');
			console.log('🎉 brAInwav placeholder debt reduced for entries:\n' + formattedResolved);
		}

		if (newFindings.length > 0) {
			const formatted = newFindings
				.map(({ file, token }) => `• ${path.relative(process.cwd(), file)} → "${token}"`)
				.join('\n');
			throw new Error(
				`Forbidden placeholder tokens detected:\n${formatted}\n` +
					'Apply real implementations before merging (enforced by brAInwav standards).',
			);
		}
		expect(newFindings).toEqual([]);
	});
});
