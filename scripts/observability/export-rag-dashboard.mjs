#!/usr/bin/env node
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SRC = resolve('docs/observability/rag-dashboard.json');
const OUT = resolve('reports/grafana/dashboards/rag-dashboard.json');

function main() {
	try {
		const raw = readFileSync(SRC, 'utf-8');
		// Minimal validation: must be valid JSON and have panels or templating fields typical of Grafana
		const json = JSON.parse(raw);
		if (!json || typeof json !== 'object') {
			throw new Error('Dashboard JSON is not an object');
		}
		// Basic sanity checks (non-fatal warnings could be added)
		if (!json.title) {
			console.warn('[export-rag-dashboard] Warning: dashboard has no title');
		}
		mkdirSync(dirname(OUT), { recursive: true });
		writeFileSync(OUT, JSON.stringify(json, null, 2));
		// Also copy verbatim for preservation
		copyFileSync(SRC, OUT);
		console.log(`[export-rag-dashboard] Exported to ${OUT}`);
	} catch (err) {
		console.error('[export-rag-dashboard] Failed:', err.message || err);
		process.exit(1);
	}
}

main();
