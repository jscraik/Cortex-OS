#!/usr/bin/env node
/**
 * Branch Coverage History Tracker
 *
 * Usage:
 *  node scripts/code-quality/branch-coverage-history.mjs append   # run after coverage to append current branch %
 *  node scripts/code-quality/branch-coverage-history.mjs report   # print simple trend report
 *
 * Stores history in reports/branch-coverage-history.json:
 * [ { timestamp, gitRef, branchesPct } ]
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const COVERAGE_SUMMARY = path.resolve('coverage/coverage-summary.json');
const HISTORY_FILE = path.resolve('reports/branch-coverage-history.json');

function readCoverage() {
    if (!fs.existsSync(COVERAGE_SUMMARY)) {
        throw new Error(`Coverage summary not found at ${COVERAGE_SUMMARY}. Run coverage first.`);
    }
    const data = JSON.parse(fs.readFileSync(COVERAGE_SUMMARY, 'utf8'));
    const total = data.total;
    if (!total || !total.branches || typeof total.branches.pct !== 'number') {
        throw new Error('Branch coverage % not found in coverage-summary.json');
    }
    return total.branches.pct;
}

function loadHistory() {
    if (!fs.existsSync(HISTORY_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch {
        return [];
    }
}

function saveHistory(history) {
    fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function gitRef() {
    try {
        return require('child_process').execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    } catch {
        return 'unknown';
    }
}

function append() {
    const pct = readCoverage();
    const history = loadHistory();
    const entry = { timestamp: new Date().toISOString(), gitRef: gitRef(), branchesPct: pct };
    history.push(entry);
    saveHistory(history);
    console.log(`[branch-coverage-history] appended ${pct.toFixed(2)}%`);
}

function report() {
    const history = loadHistory();
    if (history.length === 0) {
        console.log('No history recorded. Run append first.');
        return;
    }
    console.log('Branch Coverage History (most recent last):');
    for (const h of history) {
        console.log(`${h.timestamp}\t${h.gitRef}\t${h.branchesPct.toFixed(2)}%`);
    }
    const last = history[history.length - 1];
    const first = history[0];
    const delta = last.branchesPct - first.branchesPct;
    console.log(`\nNet Change: ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}% over ${history.length} samples.`);
    if (history.length >= 2) {
        const prev = history[history.length - 2];
        const recentDelta = last.branchesPct - prev.branchesPct;
        console.log(`Recent Delta: ${recentDelta >= 0 ? '+' : ''}${recentDelta.toFixed(2)}%`);
    }
}

const cmd = process.argv[2];
if (cmd === 'append') append();
else if (cmd === 'report') report();
else {
    console.log('Usage: branch-coverage-history.mjs <append|report>');
    process.exit(1);
}
