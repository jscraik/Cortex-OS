import fs from 'node:fs';

export function parse(path = '.tmp/semgrep.json') {
	let raw;
	try {
		raw = JSON.parse(fs.readFileSync(path, 'utf8'));
	} catch (err) {
		console.error(`Failed to read or parse JSON file at ${path}:`, err.message);
		return [];
	}
	const out = [];
	for (const r of raw.results ?? []) {
		out.push({
			tool: 'semgrep',
			ruleId: r.check_id,
			message: r.extra?.message || r.extra?.metadata?.short_description || '',
			severity: semgrepToSeverity(r.extra?.severity),
			file: r.path,
			startLine: r.start?.line,
			endLine: r.end?.line,
			evidence: r.extra?.lines || '',
			tags: r.extra?.metadata || {},
		});
	}
	return out;
}

function semgrepToSeverity(s = '') {
	const v = s.toUpperCase();
	if (v === 'ERROR') return 'HIGH';
	if (v === 'WARNING') return 'MEDIUM';
	return 'LOW';
}
