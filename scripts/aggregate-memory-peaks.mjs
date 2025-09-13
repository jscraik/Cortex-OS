#!/usr/bin/env node
/**
 * scripts/aggregate-memory-peaks.mjs
 * Aggregates peak rssMB & heapUsedMB across one or more sampler JSONL files.
 *
 * Usage:
 *   node scripts/aggregate-memory-peaks.mjs .memory/install-cold.jsonl .memory/build.jsonl
 *
 * Output example:
 *   FILE,PEAK_RSS_MB,PEAK_HEAP_MB,SAMPLES
 *   install-cold.jsonl,812.34,201.77,120
 *   build.jsonl,623.11,180.02,95
 *   TOTAL_MAX_RSS_MB=812.34
 */

import fs from 'node:fs';
import path from 'node:path';

if (process.argv.length < 3) {
    console.error('Usage: node scripts/aggregate-memory-peaks.mjs <file1.jsonl> [file2.jsonl ...]');
    process.exit(1);
}

let globalPeak = 0;
console.log('FILE,PEAK_RSS_MB,PEAK_HEAP_MB,SAMPLES');
for (const p of process.argv.slice(2)) {
    if (!fs.existsSync(p)) { console.error(`Missing: ${p}`); continue; }
    let peakRss = 0; let peakHeap = 0; let samples = 0;
    const rl = fs.readFileSync(p, 'utf8').split(/\n+/).filter(Boolean);
    for (const line of rl) {
        try {
            const j = JSON.parse(line);
            peakRss = Math.max(peakRss, j.rssMB || 0);
            peakHeap = Math.max(peakHeap, j.heapUsedMB || 0);
            samples++;
        } catch { /* ignore */ }
    }
    globalPeak = Math.max(globalPeak, peakRss);
    console.log(`${path.basename(p)},${peakRss.toFixed(2)},${peakHeap.toFixed(2)},${samples}`);
}
console.log(`TOTAL_MAX_RSS_MB=${globalPeak.toFixed(2)}`);
