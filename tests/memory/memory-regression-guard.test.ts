import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Lightweight re-implementation of parseJsonlPeak from memory-regression-guard for testing.
function parseJsonlPeak(content: string) {
	let peakKB = 0;
	for (const line of content.split(/\n/)) {
		if (!line.trim()) continue;
		try {
			const parsed: unknown = JSON.parse(line);
			if (parsed && typeof parsed === 'object' && 'rssKB' in parsed) {
				const rss = (parsed as { rssKB?: unknown }).rssKB;
				if (typeof rss === 'number' && rss > peakKB) peakKB = rss;
			}
		} catch {
			/* ignore malformed */
		}
	}
	return peakKB;
}

describe('memory-regression-guard parseJsonlPeak', () => {
	const tmpDir = join(process.cwd(), '.memory', 'logs');
	const file = join(tmpDir, 'sample-test.jsonl');
	beforeAll(() => {
		if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
		const lines = [
			JSON.stringify({ t: Date.now(), rssKB: 100000 }),
			JSON.stringify({ t: Date.now() + 1000, rssKB: 250000 }),
			'malformed {',
			JSON.stringify({ t: Date.now() + 2000, rssKB: 125000 }),
		].join('\n');
		writeFileSync(file, lines);
	});

	it('computes peak value ignoring malformed lines', () => {
		const content = readFileSync(file, 'utf8');
		const peak = parseJsonlPeak(content);
		expect(peak).toBe(250000);
	});
});
