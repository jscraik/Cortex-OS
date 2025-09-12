#!/usr/bin/env node
/**
 * Coverage Diff Gate
 *
 * Compares the current Vitest JSON summary against a stored baseline and
 * fails (exit code 1) if any metric regresses beyond an allowed tolerance.
 *
 * Metrics checked: lines, statements, functions, branches.
 * Baseline file default: reports/coverage-baseline.json
 * Current summary default: coverage/coverage-summary.json (Vitest default when using --coverage.reporter=json-summary)
 *
 * Usage examples:
 *   node scripts/code-quality/coverage-diff-gate.mjs
 *   node scripts/code-quality/coverage-diff-gate.mjs --tolerance 0.05
 *   node scripts/code-quality/coverage-diff-gate.mjs --baseline custom/baseline.json --current coverage/coverage-summary.json
 *   pnpm coverage:gate (after adding package script)
 *
 * To set (or refresh) the baseline intentionally after an approved improvement:
 *   pnpm coverage:baseline
 *
 * Tolerance notes:
 *   A tolerance of 0.1 allows a 0.1 percentage point drop (e.g. 92.3 -> 92.2 passes if tolerance >= 0.1).
 *   Default tolerance is 0.0 (strict, no regression permitted).
 */

import fs from 'node:fs';

// --- Simple CLI arg parsing ---
const args = process.argv.slice(2);
function getArgValue(flag) {
    const idx = args.indexOf(flag);
    if (idx === -1) return undefined;
    return args[idx + 1];
}

const baselinePath = getArgValue('--baseline') || 'reports/coverage-baseline.json';
const currentPath = getArgValue('--current') || 'coverage/coverage-summary.json';
const tolerance = parseFloat(getArgValue('--tolerance') || '0');
const allowIncreaseOnly = args.includes('--allow-increase-only');

if (Number.isNaN(tolerance) || tolerance < 0) {
    console.error(`Invalid --tolerance value: ${tolerance}`);
    process.exit(2);
}

function readJson(p) {
    if (!fs.existsSync(p)) return undefined;
    try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {
        console.error(`Failed to parse JSON at ${p}:`, e.message);
        return undefined;
    }
}

function extractTotals(summary) {
    // Vitest (istanbul) json-summary format has total block
    if (!summary || typeof summary !== 'object') return undefined;
    const total = summary.total || summary; // fallback if shape differs
    const mapKey = (key) => (typeof total[key] === 'object' ? total[key].pct : undefined);
    return {
        lines: mapKey('lines'),
        statements: mapKey('statements'),
        functions: mapKey('functions'),
        branches: mapKey('branches')
    };
}

const baseline = readJson(baselinePath);
if (!baseline) {
    console.error(`Baseline coverage file not found or invalid: ${baselinePath}`);
    console.error('Run "pnpm coverage:baseline" to create/update the baseline.');
    process.exit(1);
}

const current = readJson(currentPath);
if (!current) {
    console.error(`Current coverage summary not found or invalid: ${currentPath}`);
    console.error('Did you run the coverage command first? e.g. pnpm test:coverage');
    process.exit(1);
}

const baseTotals = extractTotals(baseline);
const currTotals = extractTotals(current);

if (!baseTotals || !currTotals) {
    console.error('Could not extract totals from baseline or current summary.');
    process.exit(1);
}

const metrics = ['lines', 'statements', 'functions', 'branches'];
const regressions = [];
const improvements = [];

for (const m of metrics) {
    const b = baseTotals[m];
    const c = currTotals[m];
    if (typeof b !== 'number' || typeof c !== 'number') {
        console.warn(`Skipping metric ${m} (missing numeric values).`);
        continue;
    }
    const delta = c - b;
    if (delta < 0) {
        const allowed = -tolerance; // e.g. tolerance 0.1 means delta can be >= -0.1
        if (delta < allowed) {
            regressions.push({ metric: m, baseline: b, current: c, delta });
        }
    } else if (delta > 0) {
        improvements.push({ metric: m, baseline: b, current: c, delta });
    }
}

const report = { baseline: baseTotals, current: currTotals, tolerance, regressions, improvements };

// Pretty print
console.log('Coverage Diff Gate Report');
console.log(JSON.stringify(report, null, 2));

if (regressions.length > 0) {
    console.error('\nFAIL: Coverage regression detected beyond allowed tolerance.');
    process.exit(1);
}

if (allowIncreaseOnly && improvements.length === 0) {
    console.error('\nFAIL: --allow-increase-only specified but no improvements detected.');
    process.exit(1);
}

console.log('\nPASS: No disallowed coverage regressions.');
process.exit(0);
