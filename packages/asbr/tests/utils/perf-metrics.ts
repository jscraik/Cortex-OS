import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Env flags
const ENABLED = process.env.PERF_METRICS === '1' || process.env.PERF_METRICS === 'true';
const ENFORCE = process.env.PERF_ENFORCE === '1' || process.env.PERF_ENFORCE === 'true';
const BASELINE_PATH =
	process.env.PERF_BASELINE || join(process.cwd(), 'tests', 'performance-baseline.json');
const OUTPUT_PATH =
	process.env.PERF_OUTPUT || join(process.cwd(), 'tests', 'performance-current.json');
const MAX_DELTA_PCT = Number(process.env.PERF_BUDGET_PCT || '20'); // % allowed regression

export interface MetricSample {
	name: string;
	value: number; // ms
	timestamp: string;
}

interface AggregatedMetric {
	name: string;
	count: number;
	min: number;
	max: number;
	mean: number;
	p50: number;
	p90: number;
	p95: number;
	p99: number;
	samples: number[];
}

interface MetricsFileFormat {
	generatedAt: string;
	metrics: Record<string, AggregatedMetric>;
}

const samples: Record<string, number[]> = {};

export function recordMetric(name: string, value: number) {
	if (!ENABLED) return;
	if (!samples[name]) samples[name] = [];
	samples[name].push(value);
}

function percentile(arr: number[], p: number): number {
	if (arr.length === 0) return 0;
	const sorted = [...arr].sort((a, b) => a - b);
	const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
	return sorted[idx];
}

function aggregate(): MetricsFileFormat {
	const metrics: Record<string, AggregatedMetric> = {};
	for (const [name, vals] of Object.entries(samples)) {
		const sum = vals.reduce((a, b) => a + b, 0);
		metrics[name] = {
			name,
			count: vals.length,
			min: Math.min(...vals),
			max: Math.max(...vals),
			mean: sum / vals.length,
			p50: percentile(vals, 50),
			p90: percentile(vals, 90),
			p95: percentile(vals, 95),
			p99: percentile(vals, 99),
			samples: vals,
		};
	}
	return { generatedAt: new Date().toISOString(), metrics };
}

function ensureDir(path: string) {
	const dir = path.split('/').slice(0, -1).join('/');
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function loadBaseline(): MetricsFileFormat | null {
	if (!existsSync(BASELINE_PATH)) return null;
	try {
		return JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as MetricsFileFormat;
	} catch {
		return null;
	}
}

export function finalizeMetrics() {
	if (!ENABLED) return;
	const aggregated = aggregate();
	ensureDir(OUTPUT_PATH);
	writeFileSync(OUTPUT_PATH, JSON.stringify(aggregated, null, 2));

	const baseline = loadBaseline();
	if (!baseline) {
		// No baseline yet; treat current as initial reference unless enforcement requested.
		if (ENFORCE) {
			throw new Error(
				'Performance baseline missing while PERF_ENFORCE is enabled. Add baseline file or disable enforcement.',
			);
		}
		return;
	}

	const regressions: string[] = [];
	for (const [name, current] of Object.entries(aggregated.metrics)) {
		const base = baseline.metrics[name];
		if (!base) continue; // new metric, ignore for now
		const delta = ((current.p95 - base.p95) / base.p95) * 100;
		if (delta > MAX_DELTA_PCT) {
			regressions.push(
				`${name} p95 regression ${delta.toFixed(1)}% (baseline ${base.p95.toFixed(2)}ms -> current ${current.p95.toFixed(2)}ms)`,
			);
		}
	}

	if (regressions.length && ENFORCE) {
		throw new Error(
			`Performance regressions detected (allowed ${MAX_DELTA_PCT}%):\n${regressions.join('\n')}`,
		);
	}
}

// Optional convenience wrapper to time an async function
export async function measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
	const start = performance.now();
	try {
		return await fn();
	} finally {
		const duration = performance.now() - start;
		recordMetric(name, duration);
	}
}

// Hook into Vitest global teardown if enabled
if (ENABLED) {
	// Vitest provides afterAll in test files; here we rely on dynamic import usage in tests.
	// Tests must call finalizeMetrics() explicitly or import this module in a file that registers a process exit handler.
	process.on('exit', () => {
		try {
			finalizeMetrics();
		} catch (err) {
			console.error('[perf-metrics] finalize error', err);
		}
	});
}

export const perfEnv = {
	ENABLED,
	ENFORCE,
	BASELINE_PATH,
	OUTPUT_PATH,
	MAX_DELTA_PCT,
};
