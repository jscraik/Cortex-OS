import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { describe, expect, it } from 'vitest';

type TodoFinding = {
	readonly file: string;
	readonly line: number;
	readonly text: string;
};

const repoRoot = path.resolve(__dirname, '..', '..');
const baselinePath = path.join(__dirname, '__fixtures__/todo-baseline.json');

const includePatterns = [
	'apps/**/*.{ts,tsx,js,jsx,mjs,cjs,cts,mts,rs,py}',
	'packages/**/*.{ts,tsx,js,jsx,mjs,cjs,cts,mts,rs,py}',
	'services/**/*.{ts,tsx,js,jsx,mjs,cjs,cts,mts,rs,py}',
	'servers/**/*.{ts,tsx,js,jsx,mjs,cjs,cts,mts,rs,py}',
	'libs/**/*.{ts,tsx,js,jsx,mjs,cjs,cts,mts,rs,py}',
	'src/**/*.{ts,tsx,js,jsx,mjs,cjs,cts,mts,rs,py}',
	'scripts/**/*.{ts,tsx,js,jsx,mjs,cjs,cts,mts,rs,py,sh}',
	'config/**/*.{ts,tsx,js,jsx,mjs,cjs,cts,mts,rs,py,sh}',
	'infra/**/*.{ts,tsx,js,jsx,mjs,cjs,cts,mts,rs,py,sh}',
];

const ignorePatterns = [
	'**/node_modules/**',
	'**/.turbo/**',
	'**/.next/**',
	'**/dist/**',
	'**/build/**',
	'**/.venv/**',
	'**/.git/**',
	'**/tests/**',
	'**/__tests__/**',
	'**/__mocks__/**',
	'**/__fixtures__/**',
	'**/*.test.*',
	'**/*.spec.*',
	'**/*.stories.*',
	'**/*.d.ts',
	'**/*.map',
	'**/*.snap',
	'**/docs/**',
	'tests/**',
	'project-documentation/**',
	'website/**',
	'**/README.md',
	'**/CHANGELOG.md',
	'**/LICENSE',
	'**/NOTICE',
];

function loadBaseline(): TodoFinding[] {
	if (!fs.existsSync(baselinePath)) {
		return [];
	}
	const raw = fs.readFileSync(baselinePath, 'utf8');
	return JSON.parse(raw) as TodoFinding[];
}

async function scanForForbiddenComments(): Promise<TodoFinding[]> {
	const files = await fg(includePatterns, {
		cwd: repoRoot,
		ignore: ignorePatterns,
		dot: false,
		absolute: true,
	});

	const findings: TodoFinding[] = [];

	for (const file of files) {
		const content = fs.readFileSync(file, 'utf8');
		const lines = content.split(/\r?\n/);

		lines.forEach((line, index) => {
			if (/\b(TODO|FIXME)\b/i.test(line)) {
				findings.push({
					file: path.relative(repoRoot, file),
					line: index + 1,
					text: line.trim(),
				});
			}
		});
	}

	findings.sort((a, b) => {
		if (a.file === b.file) {
			return a.line - b.line;
		}
		return a.file.localeCompare(b.file);
	});

	return findings;
}

function createKey(entry: TodoFinding): string {
	return `${entry.file}:${entry.line}::${entry.text}`;
}

describe('brAInwav security TODO/FIXME ban', () => {
	it('does not allow TODO or FIXME comments in runtime code paths', async () => {
		const findings = await scanForForbiddenComments();
		const baseline = loadBaseline();

		const baselineKeys = new Set(baseline.map(createKey));
		const findingKeys = new Set(findings.map(createKey));

		const newFindings = findings.filter((entry) => !baselineKeys.has(createKey(entry)));
		const resolvedEntries = baseline.filter((entry) => !findingKeys.has(createKey(entry)));

		if (resolvedEntries.length > 0) {
			const formattedResolved = resolvedEntries
				.map((entry) => `• ${entry.file}:${entry.line} → "${entry.text}"`)
				.join('\n');
			console.log(`🎉 Security TODO/FIXME debt reduced for entries:\n${formattedResolved}`);
		}

		if (newFindings.length > 0) {
			const formatted = newFindings
				.map((entry) => `• ${entry.file}:${entry.line} → "${entry.text}"`)
				.join('\n');
			throw new Error(
				`Forbidden TODO/FIXME comments detected outside allowlist:\n${formatted}\n` +
					'Replace these with implemented logic or documented tasks before merging.',
			);
		}

		expect(newFindings).toEqual([]);
	});
});
