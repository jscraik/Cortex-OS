#!/usr/bin/env node
/**
 * memory-regression-guard.mjs
 *
 * Evaluates recent memory usage logs (produced by memory-snapshot-runner) against
 * a baseline or configured budget. Designed for CI gating to prevent silent regressions.
 *
 * Data Sources:
 *   - Reads .memory/logs/*jsonl for latest run (or --file path)
 *   - Optional baseline: reports/memory-baseline.json (auto-created if missing) OR provided via --baseline
 *
 * Threshold Logic:
 *   1. Absolute hard limit: env MEMORY_GUARD_MAX_MB or --max-mb (fail if peak > limit)
 *   2. Percent regression: env MEMORY_GUARD_ALLOWED_PCT or --allowed-pct (fail if (peak - baselinePeak)/baselinePeak * 100 > pct)
 *   3. Absolute delta: env MEMORY_GUARD_ALLOWED_DELTA_MB or --allowed-delta-mb (fail if peak - baselinePeak > delta)
 *
 * If baseline missing, script will create baseline and exit 0 (bootstrap mode).
 *
 * Usage:
 *   node scripts/memory-regression-guard.mjs [--file path] [--baseline path] [--max-mb N] [--allowed-pct P] [--allowed-delta-mb D] [--tiered] [--tiers spec] [--prom] [--json]
 *
 * Tier Format (when --tiered):
 *   limit:pct[:hardMax]
 *   Examples:
 *     800:15,1200:20,999999:25
 *     700:12:900,900:15:1100,1100:18:1300,1300:20:1500,999999:22:1600
 *   Meaning: if baselinePeak <= limit use pct% threshold; if hardMax present enforce peakMB <= hardMax for that tier.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');
const logDir = join(rootDir, '.memory', 'logs');
const reportsDir = join(rootDir, 'reports');

function log(level, msg) {
  const ts = new Date().toISOString();
  console.error(`[${ts}] [MEM-GUARD] [${level}] ${msg}`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    file: null,
    baselinePath: join(reportsDir, 'memory-baseline.json'),
    maxMb: process.env.MEMORY_GUARD_MAX_MB ? parseInt(process.env.MEMORY_GUARD_MAX_MB, 10) : null,
    allowedPct: process.env.MEMORY_GUARD_ALLOWED_PCT ? parseFloat(process.env.MEMORY_GUARD_ALLOWED_PCT) : 25,
    allowedDeltaMb: process.env.MEMORY_GUARD_ALLOWED_DELTA_MB ? parseInt(process.env.MEMORY_GUARD_ALLOWED_DELTA_MB, 10) : null,
    json: false,
    tiered: process.env.MEMORY_GUARD_TIERED === '1' || false,
    customTiers: process.env.MEMORY_GUARD_TIERS || null,
    prom: process.env.MEMORY_GUARD_PROM === '1' || false,
  };
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    switch (a) {
      case '--file': opts.file = args[i + 1]; i += 2; break;
      case '--baseline': opts.baselinePath = args[i + 1]; i += 2; break;
      case '--max-mb': opts.maxMb = parseInt(args[i + 1], 10); i += 2; break;
      case '--allowed-pct': opts.allowedPct = parseFloat(args[i + 1]); i += 2; break;
      case '--allowed-delta-mb': opts.allowedDeltaMb = parseInt(args[i + 1], 10); i += 2; break;
      case '--json': opts.json = true; i += 1; break;
      case '--tiered': opts.tiered = true; i += 1; break;
      case '--tiers': opts.customTiers = args[i + 1]; i += 2; break;
      case '--prom': opts.prom = true; i += 1; break;
      case '--help':
      case '-h':
        console.log('Usage: node scripts/memory-regression-guard.mjs [--file path] [--baseline path] [--max-mb N] [--allowed-pct P] [--allowed-delta-mb D] [--tiered] [--tiers spec] [--prom] [--json]');
        process.exit(0);
      default: i += 1; break;
    }
  }
  return opts;
}

// removed legacy parseTiers (superseded by parseTierConfig)

function latestLogFile() {
  try {
    const files = readdirSync(logDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => ({ f, path: join(logDir, f), mtime: statSync(join(logDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    return files.length ? files[0].path : null;
  } catch { return null; }
}

function parseJsonlPeak(file) {
  let peakKB = 0;
  const content = readFileSync(file, 'utf8');
  for (const line of content.split(/\n/)) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (typeof obj.rssKB === 'number' && obj.rssKB > peakKB) peakKB = obj.rssKB;
    } catch { /* ignore malformed line */ }
  }
  return peakKB; // KB
}

function readBaseline(path) {
  try {
    const raw = readFileSync(path, 'utf8');
    return JSON.parse(raw);
  } catch { return null; }
}

function writeBaseline(path, data) {
  try { if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true }); } catch { }
  writeFileSync(path, JSON.stringify(data, null, 2));
}

// Parse tier specification string into sorted array of {thresholdMB, allowedPct, hardMax?}
function parseTierConfig(tierSpec) {
  if (!tierSpec) return [];
  return tierSpec.split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(entry => {
      const [thresholdStr, rest] = entry.split(':');
      const thresholdMB = parseInt(thresholdStr, 10);
      let allowedPct = 0;
      let hardMax;
      if (rest) {
        const parts = rest.split(':').map(p => p.trim());
        if (parts.length > 0) allowedPct = parseInt(parts[0], 10);
        if (parts.length > 1) hardMax = parseInt(parts[1], 10);
      }
      return { thresholdMB, allowedPct, hardMax };
    })
    .filter(t => Number.isFinite(t.thresholdMB) && Number.isFinite(t.allowedPct))
    .sort((a, b) => a.thresholdMB - b.thresholdMB);
}

// Determine which tier applies given the higher of baseline/current and compute allowed pct + hard max hit
function computeTierDecision({ baselinePeak, currentPeak, tiers, explicitPctAllowed }) {
  if (!tiers || tiers.length === 0) return { pctAllowed: explicitPctAllowed, matchedTier: null, hardMaxHit: false, hardMaxValue: undefined };
  const reference = Math.max(baselinePeak ?? 0, currentPeak ?? 0);
  let matched = tiers[tiers.length - 1];
  for (const tier of tiers) {
    if (reference <= tier.thresholdMB) { matched = tier; break; }
  }
  const pctAllowed = matched.allowedPct;
  const hardMaxHit = matched.hardMax ? currentPeak > matched.hardMax : false;
  return { pctAllowed, matchedTier: matched, hardMaxHit, hardMaxValue: matched.hardMax };
}

// Evaluate failure conditions and produce reasons + reasonCode
function evaluateFailure({ baselinePeak, currentPeak, deltaAllowedMB, pctAllowed, hardMaxDecision, explicitMaxMB }) {
  const reasons = [];
  let reasonCode = null;
  let failed = false;
  if (hardMaxDecision.hardMaxHit) {
    failed = true; reasonCode = 'HARD_MAX';
    reasons.push(`Current peak ${currentPeak}MB exceeded hardMax ${hardMaxDecision.hardMaxValue}MB (tier threshold ${hardMaxDecision.matchedTier?.thresholdMB ?? 'n/a'})`);
    return { failed, reasons, reasonCode };
  }
  if (explicitMaxMB && currentPeak > explicitMaxMB) {
    failed = true; reasonCode = 'ABSOLUTE_MAX';
    reasons.push(`Current peak ${currentPeak}MB exceeded maxMb ${explicitMaxMB}MB`);
  }
  if (!failed && typeof baselinePeak === 'number' && baselinePeak >= 0) {
    const absoluteAllowed = baselinePeak + deltaAllowedMB;
    if (currentPeak > absoluteAllowed) {
      failed = true; reasonCode = 'DELTA';
      reasons.push(`Current peak ${currentPeak}MB exceeds allowed delta (${baselinePeak}MB + ${deltaAllowedMB}MB = ${absoluteAllowed}MB)`);
    }
  }
  if (!failed && typeof baselinePeak === 'number' && baselinePeak > 0 && pctAllowed != null) {
    const pctLimit = Math.round(baselinePeak * (1 + pctAllowed / 100));
    if (currentPeak > pctLimit) {
      failed = true; reasonCode = 'PCT_TIER';
      reasons.push(`Current peak ${currentPeak}MB exceeds pct tier limit ${pctLimit}MB (${pctAllowed}% over baseline ${baselinePeak}MB)`);
    }
  }
  return { failed, reasons, reasonCode };
}

// Build Prometheus metrics text exposition for summary
function buildPromMetrics(summary) {
  const lines = [];
  const escape = (v) => String(v).replace(/\\/g, '\\\\').replace(/"/g, '"'); // escaping retained for consistency
  const labels = (extra = {}) => {
    const all = { reason: summary.reasonCode || 'NONE', decision: summary.tierDecision || 'none', outcome: summary.failed ? 'fail' : 'pass', ...extra };
    return '{' + Object.entries(all).map(([k, v]) => `${k}="${escape(v)}"`).join(',') + '}';
  };
  const pushGauge = (name, value, help) => {
    if (help) lines.push(`# HELP memory_guard_${name} ${help}`);
    lines.push(`# TYPE memory_guard_${name} gauge`);
    lines.push(`memory_guard_${name}${labels()} ${value}`);
  };
  const pushInfo = () => {
    lines.push(`# TYPE memory_guard_info gauge`);
    lines.push(`memory_guard_info${labels({ baseline: summary.baselinePeak ?? 'NaN', current: summary.currentPeak ?? 'NaN', allowed_pct: summary.tier?.allowedPct ?? 'NaN' })} 1`);
  };
  pushGauge('baseline_peak_mb', summary.baselinePeak ?? 0, 'Baseline peak memory in MB');
  pushGauge('current_peak_mb', summary.currentPeak ?? 0, 'Current run peak memory in MB');
  pushGauge('delta_allowed_mb', summary.deltaAllowedMB ?? 0, 'Configured absolute delta allowance in MB');
  pushGauge('pct_allowed', summary.tier?.allowedPct ?? -1, 'Allowed percentage increase');
  pushGauge('hard_max_mb', summary.tier?.hardMax ?? (summary.maxMb || 0), 'Hard max MB from tier or explicit');
  pushGauge('failed', summary.failed ? 1 : 0, '1 if regression guard failed');
  pushInfo();
  return lines.join('\n') + '\n';
}

function handleBootstrap({ baselinePath, peakMB, opts }) {
  log('WARN', 'Baseline not found. Creating new baseline (bootstrap mode).');
  writeBaseline(baselinePath, { createdAt: new Date().toISOString(), peakMB });
  const summary = { status: 'bootstrap', peakMB, baselineCreated: true };
  if (opts.json) console.log(JSON.stringify(summary));
  return summary;
}

function decideTierPolicy({ baselinePeak, opts, peakMB }) {
  if (!opts.tiered) return { effectiveAllowedPct: opts.allowedPct, tierDecision: null, tierHardMaxTriggered: false };
  const tiers = parseTierConfig(opts.customTiers || '800:15,1200:20,999999:25');
  for (const t of tiers) {
    if (baselinePeak <= t.thresholdMB) {
      const tierDecision = { limit: t.thresholdMB, pct: t.allowedPct, hardMax: t.hardMax ?? null, tiers };
      const tierHardMaxTriggered = t.hardMax != null && peakMB > t.hardMax;
      log('INFO', `Tiered policy active: allowedPct adjusted to ${t.allowedPct}% (baseline=${baselinePeak.toFixed(2)}MB)`);
      return { effectiveAllowedPct: t.allowedPct, tierDecision, tierHardMaxTriggered };
    }
  }
  const last = tiers[tiers.length - 1];
  return { effectiveAllowedPct: last.allowedPct, tierDecision: { limit: last.thresholdMB, pct: last.allowedPct, hardMax: last.hardMax ?? null, tiers }, tierHardMaxTriggered: last.hardMax != null && peakMB > last.hardMax };
}

function writeGuardPromMetrics(summary, opts, peakMB) {
  try {
    const metricsDir = join(rootDir, '.memory', 'metrics');
    if (!existsSync(metricsDir)) mkdirSync(metricsDir, { recursive: true });
    const lines = [];
    lines.push('# HELP cortex_memory_guard_peak_bytes Peak RSS in bytes for evaluated run');
    lines.push('# TYPE cortex_memory_guard_peak_bytes gauge');
    lines.push(`cortex_memory_guard_peak_bytes{status="${summary.status}",reason="${summary.reasonCode}",tiered="${summary.policy.tiered}"} ${peakMB * 1024 * 1024}`);
    if (summary.policy.tierDecision) {
      const td = summary.policy.tierDecision;
      const hardMaxVal = td.hardMax != null ? td.hardMax : 'NaN';
      lines.push('# HELP cortex_memory_guard_tier_info Tier decision metadata (limit & allowedPct)');
      lines.push('# TYPE cortex_memory_guard_tier_info gauge');
      lines.push(`cortex_memory_guard_tier_info{limit="${td.limit}",allowedPct="${td.pct}",hardMax="${hardMaxVal}"} 1`);
    }
    writeFileSync(join(metricsDir, 'memory-guard.prom'), lines.join('\n') + '\n');
    log('INFO', 'Prometheus guard metrics written (memory-guard.prom)');
  } catch (e) {
    log('WARN', `Failed to write Prometheus metrics: ${e.message}`);
  }
}

function loadOrBootstrapBaseline({ opts, peakMB }) {
  const baseline = readBaseline(opts.baselinePath);
  if (baseline) return { baseline, bootstrapped: false };
  const summary = handleBootstrap({ baselinePath: opts.baselinePath, peakMB, opts });
  return { baseline: null, bootstrapped: true, summary };
}

function buildEvaluation({ peakMB, baseline, opts }) {
  const baselinePeak = baseline.peakMB;
  const delta = peakMB - baselinePeak;
  const pct = baselinePeak > 0 ? (delta / baselinePeak) * 100 : 0;
  const tierInfo = decideTierPolicy({ baselinePeak, opts, peakMB });
  let failed = false;
  let reasonCode = 'NONE';
  const reasons = [];
  if (opts.maxMb && peakMB > opts.maxMb) { failed = true; reasonCode = 'HARD_MAX'; reasons.push(`Peak ${peakMB.toFixed(2)}MB exceeds hard max ${opts.maxMb}MB`); }
  if (!failed && tierInfo.tierHardMaxTriggered) { failed = true; reasonCode = 'HARD_MAX_TIER'; reasons.push(`Peak ${peakMB.toFixed(2)}MB exceeds tier hardMax ${tierInfo.tierDecision.hardMax}MB (tier limit ${tierInfo.tierDecision.limit})`); }
  if (!failed && opts.allowedDeltaMb != null && delta > opts.allowedDeltaMb) { failed = true; reasonCode = 'DELTA'; reasons.push(`Delta ${delta.toFixed(2)}MB exceeds allowed delta ${opts.allowedDeltaMb}MB`); }
  if (!failed && pct > tierInfo.effectiveAllowedPct) { failed = true; reasonCode = opts.tiered ? 'PCT_TIER' : 'PCT'; reasons.push(`Increase ${pct.toFixed(1)}% exceeds allowed ${tierInfo.effectiveAllowedPct}%`); }
  return { baselinePeak, delta, pct, tierInfo, failed, reasonCode, reasons };
}

function main() {
  const opts = parseArgs();
  const file = opts.file || latestLogFile();
  if (!file) { log('ERROR', 'No memory log file found (.memory/logs/*.jsonl). Run memory-snapshot-runner first.'); process.exit(1); }
  log('INFO', `Analyzing memory log: ${basename(file)}`);

  const peakKB = parseJsonlPeak(file);
  const peakMB = peakKB / 1024;
  log('INFO', `Peak RSS current run: ${peakMB.toFixed(2)}MB`);

  const baselineLoad = loadOrBootstrapBaseline({ opts, peakMB });
  if (baselineLoad.bootstrapped) return process.exit(0);
  const baseline = baselineLoad.baseline;

  const evalResult = buildEvaluation({ peakMB, baseline, opts });
  log('INFO', `Baseline peak: ${evalResult.baselinePeak.toFixed(2)}MB | Delta: ${evalResult.delta.toFixed(2)}MB (${evalResult.pct.toFixed(1)}%)`);

  const summary = {
    status: evalResult.failed ? 'fail' : 'pass',
    peakMB: parseFloat(peakMB.toFixed(2)),
    baselinePeakMB: parseFloat(evalResult.baselinePeak.toFixed(2)),
    deltaMB: parseFloat(evalResult.delta.toFixed(2)),
    percentIncrease: parseFloat(evalResult.pct.toFixed(2)),
    reasons: evalResult.reasons,
    baselinePath: opts.baselinePath,
    logFile: file,
    policy: {
      maxMb: opts.maxMb,
      allowedPct: evalResult.tierInfo.effectiveAllowedPct,
      allowedDeltaMb: opts.allowedDeltaMb,
      tiered: opts.tiered,
      tierDecision: evalResult.tierInfo.tierDecision,
    },
    reasonCode: evalResult.reasonCode,
  };

  try { if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true }); } catch { }
  writeBaseline(join(reportsDir, 'memory-regression-last.json'), summary);
  if (opts.prom) writeGuardPromMetrics(summary, opts, peakMB);

  if (opts.json) console.log(JSON.stringify(summary));
  else if (evalResult.failed) log('ERROR', `Memory regression detected (reasonCode=${summary.reasonCode}): ${summary.reasons.join('; ')}`);
  else log('INFO', 'Memory regression guard PASS');

  process.exit(evalResult.failed ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { main(); } catch (err) { log('ERROR', err.stack || err.message); process.exit(1); }
}

export { };

