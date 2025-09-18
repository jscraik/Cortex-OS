#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const reportsDir = path.resolve(process.cwd(), 'reports');
const eslintDir = path.join(reportsDir, 'eslint');
async function main() {
	await fs.promises.mkdir(reportsDir, { recursive: true });
	await fs.promises.mkdir(eslintDir, { recursive: true });
	const files = await fs.promises.readdir(reportsDir);
	const findings = [];
	for (const f of files) {
		if (!f.startsWith('eslint-sonar-') || !f.endsWith('.out')) continue;
		const content = await fs.promises.readFile(
			path.join(reportsDir, f),
			'utf8',
		);
		const lines = content.split(/\r?\n/);
		for (const line of lines) {
			// match lines like: /abs/path/file:line:col: message [Error/sonarjs/cognitive-complexity]
			const m = line.match(
				/^(.*):(\d+):(\d+): .*\[Error\/sonarjs\/cognitive-complexity\]$/,
			);
			if (m) {
				findings.push({
					file: m[1],
					line: Number(m[2]),
					column: Number(m[3]),
					package: f.replace(/^eslint-sonar-/, '').replace(/\.out$/, ''),
				});
			}
		}
	}

	// Rank by file+line occurrence
	const byFile = {};
	for (const it of findings) {
		const key = `${it.file}:${it.line}`;
		if (!byFile[key]) byFile[key] = { ...it, count: 0 };
		byFile[key].count += 1;
	}

	const ranked = Object.values(byFile)
		.sort((a, b) => b.count - a.count)
		.slice(0, 200);
	const outPath = path.join(reportsDir, 'eslint-sonar-cognitive-index.json');
	await fs.promises.writeFile(outPath, JSON.stringify(ranked, null, 2), 'utf8');
	console.log(`Wrote ${outPath} with ${ranked.length} entries`);
	// Print top 20 summary
	console.log('\nTop cognitive-complexity findings:');
	ranked.slice(0, 20).forEach((r, i) => {
		console.log(
			`${i + 1}. ${r.package} - ${r.file}:${r.line} (count=${r.count})`,
		);
	});

	// Also write a text summary consumed by scheduled-lint workflow summary
	const txt = [
		'Top cognitive-complexity findings:',
		...ranked
			.slice(0, 50)
			.map(
				(r, i) =>
					`${i + 1}. ${r.package} - ${r.file}:${r.line} (count=${r.count})`,
			),
	].join('\n');
	const txtPath = path.join(eslintDir, 'sonarjs-aggregate.txt');
	await fs.promises.writeFile(txtPath, txt, 'utf8');
	console.log(`Wrote ${txtPath}`);
}

main().catch((err) => {
	console.error(err?.stack ? err.stack : String(err));
	process.exit(2);
});
