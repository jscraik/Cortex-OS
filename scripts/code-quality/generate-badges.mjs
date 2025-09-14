#!/usr/bin/env node
/**
 * Generates simple static SVG badges for:
 *  - Branch coverage (latest sample from reports/branch-coverage-history.json or coverage/summary)
 *  - Mutation score (from reports/mutation/mutation.json produced by Stryker)
 *
 * Output: reports/badges/{branch-coverage.svg,mutation-score.svg}
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('reports/badges');
fs.mkdirSync(OUT_DIR, { recursive: true });

function loadBranchCoverage() {
    const historyFile = path.resolve('reports/branch-coverage-history.json');
    if (fs.existsSync(historyFile)) {
        try {
            const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
            if (Array.isArray(history) && history.length) return history[history.length - 1].branchesPct;
        } catch {
            // Silently fall back if file parsing fails
        }
    }
    const summaryFile = path.resolve('coverage/coverage-summary.json');
    if (fs.existsSync(summaryFile)) {
        try {
            const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
            return summary.total?.branches?.pct ?? 0;
        } catch {
            // Fall back if coverage summary parsing fails
        }
    }
    return 0;
}

function loadMutationScore() {
    // Stryker JSON default path
    const mutationFile = path.resolve('reports/mutation/mutation.json');
    if (fs.existsSync(mutationFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(mutationFile, 'utf8'));
            if (typeof data.mutationScore === 'number') return data.mutationScore;
        } catch {
            // Fall back if mutation data parsing fails
        }
    }
    return 0;
}

function colorScale(pct) {
    if (pct >= 90) return '#2e7d32';
    if (pct >= 80) return '#4caf50';
    if (pct >= 70) return '#8bc34a';
    if (pct >= 60) return '#ffc107';
    if (pct >= 50) return '#ff9800';
    return '#f44336';
}

function svgBadge(label, value, unit, color) {
    const text = `${value.toFixed(1)}${unit}`;
    const labelWidth = 6 * label.length + 20;
    const valueWidth = 6 * text.length + 20;
    const width = labelWidth + valueWidth;
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${label}: ${text}">\n  <linearGradient id="s" x2="0" y2="100%">\n    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>\n    <stop offset="1" stop-opacity=".1"/>\n  </linearGradient>\n  <rect rx="3" width="${width}" height="20" fill="#555"/>\n  <rect rx="3" x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>\n  <rect rx="3" width="${width}" height="20" fill="url(#s)"/>\n  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">\n    <text x="${labelWidth / 2}" y="14">${label}</text>\n    <text x="${labelWidth + valueWidth / 2}" y="14">${text}</text>\n  </g>\n</svg>`;
}

const branchPct = loadBranchCoverage();
const mutationPct = loadMutationScore();

// Thresholds (can be overridden by env later if needed)
const BRANCH_MIN = Number(process.env.BRANCH_MIN || 65);
const MUTATION_MIN = Number(process.env.MUTATION_MIN || 75);
const qualityGatePass = branchPct >= BRANCH_MIN && mutationPct >= MUTATION_MIN;

// 1. Standard badges
fs.writeFileSync(path.join(OUT_DIR, 'branch-coverage.svg'), svgBadge('branch', branchPct, '%', colorScale(branchPct)));
fs.writeFileSync(path.join(OUT_DIR, 'mutation-score.svg'), svgBadge('mutation', mutationPct, '%', colorScale(mutationPct)));

// 2. Composite quality gate badge
function qualityBadge(pass) {
    const label = 'quality';
    const text = pass ? 'pass' : 'fail';
    const color = pass ? '#2e7d32' : '#f44336';
    const labelWidth = 6 * label.length + 20;
    const valueWidth = 6 * text.length + 20;
    const width = labelWidth + valueWidth;
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${label}: ${text}">\n  <linearGradient id="s" x2="0" y2="100%">\n    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>\n    <stop offset="1" stop-opacity=".1"/>\n  </linearGradient>\n  <rect rx="3" width="${width}" height="20" fill="#555"/>\n  <rect rx="3" x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>\n  <rect rx="3" width="${width}" height="20" fill="url(#s)"/>\n  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">\n    <text x="${labelWidth / 2}" y="14">${label}</text>\n    <text x="${labelWidth + valueWidth / 2}" y="14">${text}</text>\n  </g>\n</svg>`;
}
fs.writeFileSync(path.join(OUT_DIR, 'quality-gate.svg'), qualityBadge(qualityGatePass));

// 3. Mutation history append (simple array of samples)
const mutationHistoryFile = path.resolve('reports/mutation-history.json');
let mutationHistory = [];
if (fs.existsSync(mutationHistoryFile)) {
    try { mutationHistory = JSON.parse(fs.readFileSync(mutationHistoryFile, 'utf8')); if (!Array.isArray(mutationHistory)) mutationHistory = []; } catch { mutationHistory = []; }
}
mutationHistory.push({ timestamp: new Date().toISOString(), mutationScore: Number(mutationPct.toFixed(2)) });
// Keep last 200 samples to avoid unbounded growth
if (mutationHistory.length > 200) mutationHistory = mutationHistory.slice(-200);
fs.mkdirSync(path.dirname(mutationHistoryFile), { recursive: true });
fs.writeFileSync(mutationHistoryFile, JSON.stringify(mutationHistory, null, 2));

// 4. Branch trend sparkline (mini inline chart)
function buildSparkline(values, opts = {}) {
    const w = opts.width || 120; const h = opts.height || 20; const pad = 2;
    if (!values.length) return '';
    const min = Math.min(...values); const max = Math.max(...values);
    const span = max - min || 1;
    const step = (w - pad * 2) / (values.length - 1 || 1);
    const pts = values.map((v, i) => {
        const x = pad + i * step;
        const y = h - pad - ((v - min) / span) * (h - pad * 2);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
    const last = values[values.length - 1];
    const lastY = h - pad - ((last - min) / span) * (h - pad * 2);
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" role="img" aria-label="branch trend">\n  <polyline fill="none" stroke="#4caf50" stroke-width="1" points="${pts}"/>\n  <circle cx="${(pad + (values.length - 1) * step).toFixed(2)}" cy="${lastY.toFixed(2)}" r="2" fill="#f44336"/>\n</svg>`;
}
// Build sparkline from branch coverage history if available
let branchHistory = [];
const branchHistoryFile = path.resolve('reports/branch-coverage-history.json');
if (fs.existsSync(branchHistoryFile)) {
    try {
        const raw = JSON.parse(fs.readFileSync(branchHistoryFile, 'utf8'));
        if (Array.isArray(raw)) branchHistory = raw.map(r => r.branchesPct).filter(v => typeof v === 'number');
    } catch { /* ignore */ }
}
if (branchHistory.length) {
    try { fs.writeFileSync(path.join(OUT_DIR, 'branch-trend.svg'), buildSparkline(branchHistory)); } catch { /* ignore */ }
}

// 5. Emit extended metrics JSON (include gate + history lengths)
// 5a. Mutation operator category summary (if available in Stryker JSON: killed, survived, noCoverage per mutator)
try {
    const mutationFile = path.resolve('reports/mutation/mutation.json');
    if (fs.existsSync(mutationFile)) {
        const raw = JSON.parse(fs.readFileSync(mutationFile, 'utf8'));
        if (raw.files) {
            const operatorStats = new Map();
            for (const filePath of Object.keys(raw.files)) {
                const fileEntry = raw.files[filePath];
                if (!fileEntry.mutants) continue;
                for (const m of fileEntry.mutants) {
                    const name = m.mutatorName || m.mutator || 'unknown';
                    const stats = operatorStats.get(name) || { killed: 0, survived: 0, noCoverage: 0, timeout: 0, total: 0 };
                    stats.total += 1;
                    switch (m.status) {
                        case 'Killed': stats.killed += 1; break;
                        case 'Survived': stats.survived += 1; break;
                        case 'NoCoverage': stats.noCoverage += 1; break;
                        case 'Timeout': stats.timeout += 1; break;
                        default: break;
                    }
                    operatorStats.set(name, stats);
                }
            }
            const operatorArray = Array.from(operatorStats.entries()).map(([mutator, stats]) => {
                const detected = stats.killed + stats.timeout; // treat timeout as detected
                const detectionRate = stats.total ? (detected / stats.total) * 100 : 0;
                return { mutator, ...stats, detectionRate: Number(detectionRate.toFixed(2)) };
            }).sort((a, b) => b.total - a.total);
            fs.writeFileSync(path.join(OUT_DIR, 'mutation-operators-summary.json'), JSON.stringify(operatorArray, null, 2));
            // Also emit a lightweight markdown table for human inspection
            const mdLines = ['| Mutator | Total | Killed | Survived | NoCoverage | Timeout | Detection % |', '|---------|-------|--------|----------|------------|---------|-------------|'];
            for (const op of operatorArray) {
                mdLines.push(`| ${op.mutator} | ${op.total} | ${op.killed} | ${op.survived} | ${op.noCoverage} | ${op.timeout} | ${op.detectionRate}% |`);
            }
            fs.writeFileSync(path.join(OUT_DIR, 'mutation-operators-summary.md'), mdLines.join('\n'));
        }
    }
} catch (e) {
    console.warn('[generate-badges] Failed to derive operator summary', e);
}
try {
    const metrics = {
        branchCoverage: Number(branchPct.toFixed(2)),
        mutationScore: Number(mutationPct.toFixed(2)),
        qualityGate: { pass: qualityGatePass, branchMin: BRANCH_MIN, mutationMin: MUTATION_MIN },
        branchSamples: branchHistory.length,
        mutationSamples: mutationHistory.length,
        generatedAt: new Date().toISOString()
    };
    fs.writeFileSync(path.join(OUT_DIR, 'metrics.json'), JSON.stringify(metrics, null, 2));
} catch (e) {
    console.warn('[generate-badges] Failed to write metrics.json', e);
}

console.log(`[generate-badges] branch=${branchPct.toFixed(1)}% mutation=${mutationPct.toFixed(1)}% gate=${qualityGatePass ? 'PASS' : 'FAIL'} -> ${OUT_DIR}`);
