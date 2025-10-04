#!/usr/bin/env node
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import yaml from 'js-yaml';

const CONFIG_PATH = 'config/coverage-rotation.yml';
const GLOBAL_SUMMARY_PATH = 'coverage/coverage-summary.json';
const ROTATION_DIR = 'coverage/rotation';
const ROTATION_SUMMARY_PATH = `${ROTATION_DIR}/coverage-summary.json`;
const BASELINE_PATH = 'reports/coverage-baseline.json';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const METRICS = ['lines', 'branches', 'functions', 'statements'];
const GOAL_ENV_KEYS = new Map([
	['lines', 'WEEKLY_GOAL_LINES'],
	['branches', 'WEEKLY_GOAL_BRANCHES'],
	['functions', 'WEEKLY_GOAL_FUNCTIONS'],
	['statements', 'WEEKLY_GOAL_STATEMENTS'],
]);
const LOG_PREFIX = '[brAInwav][coverage-rotation]';

export function loadRotationConfig(path = CONFIG_PATH) {
	const absolute = resolve(path);
	const config = yaml.load(readFileSync(absolute, 'utf8'));
	if (!config || typeof config !== 'object' || !Array.isArray(config.weeks) || config.weeks.length === 0) {
		throw new Error(`${LOG_PREFIX} rotation config at ${absolute} must define a non-empty weeks array.`);
	}
	return config;
}

const coerceNowMs = (value) => {
	if (value instanceof Date) return value.getTime();
	const parsed = Date.parse(value);
	return Number.isNaN(parsed) ? Date.now() : parsed;
};

export function resolveWeekIndex(config, env = process.env, now = new Date()) {
	const override = Number.parseInt(env.ROTATION_WEEK ?? '', 10);
	if (!Number.isNaN(override) && override > 0 && config.weeks.length > 0) {
		return (override - 1) % config.weeks.length;
	}
	const startMs = typeof config.start === 'string' ? Date.parse(`${config.start}T00:00:00Z`) : Number.NaN;
	if (Number.isNaN(startMs) || config.weeks.length === 0) return 0;
	const elapsed = Math.max(0, Math.floor((coerceNowMs(now) - startMs) / WEEK_MS));
	return elapsed % config.weeks.length;
}

const buildGoalOverride = (env) => {
	const goal = {};
	for (const [metric, key] of GOAL_ENV_KEYS.entries()) {
		const raw = env[key];
		if (!raw) continue;
		const value = Number.parseFloat(raw);
		if (!Number.isNaN(value)) goal[metric] = value;
	}
	return goal;
};

export function selectRotationWeek(config, env = process.env, now = new Date()) {
	const index = resolveWeekIndex(config, env, now);
	const week = config.weeks[index] ?? config.weeks[0];
	const overrideTarget = env.WEEKLY_TARGET?.trim();
	return {
		index,
		target: overrideTarget && overrideTarget.length > 0 ? overrideTarget : week?.target,
		goal: { ...(week?.goal ?? {}), ...buildGoalOverride(env) },
	};
}

const extractMetricValue = (totals, metric) => {
	const value = totals?.[metric];
	if (typeof value === 'number') return value;
	if (value && typeof value === 'object' && typeof value.pct === 'number') return value.pct;
	return undefined;
};

export function readCoverageTotals(path) {
	const absolute = resolve(path);
	if (!existsSync(absolute)) return undefined;
	const summary = JSON.parse(readFileSync(absolute, 'utf8'));
	const totals = summary.total ?? summary;
	const result = {};
	for (const metric of METRICS) {
		const value = extractMetricValue(totals, metric);
		if (typeof value === 'number') result[metric] = value;
	}
	return Object.keys(result).length === 0 ? undefined : result;
}

const formatValue = (value) => (typeof value === 'number' ? value.toFixed(2) : 'n/a');

export function assertThresholds(totals, thresholds, label) {
	if (!thresholds || Object.keys(thresholds).length === 0) return;
	const failures = [];
	for (const [metric, minimum] of Object.entries(thresholds)) {
		if (typeof minimum !== 'number') continue;
		const actual = totals?.[metric];
		if (typeof actual !== 'number' || actual + 0.0001 < minimum) {
			failures.push(`${metric}: ${formatValue(actual)} < ${minimum}`);
		}
	}
	if (failures.length > 0) {
		throw new Error(`${LOG_PREFIX} ${label} failed (${failures.join(', ')}).`);
	}
}

export function enforceRegression(baseline, current, maxDrop) {
	if (typeof maxDrop !== 'number') return;
	const breaches = [];
	for (const metric of METRICS) {
		const base = baseline?.[metric];
		const actual = current?.[metric];
		if (typeof base !== 'number' || typeof actual !== 'number') continue;
		if (base - actual - 0.0001 > maxDrop) {
			breaches.push(`${metric}: ${formatValue(actual)} (baseline ${formatValue(base)})`);
		}
	}
	if (breaches.length > 0) {
		throw new Error(`${LOG_PREFIX} coverage regression detected beyond ${maxDrop}: ${breaches.join(', ')}.`);
	}
}

const runFocusedCoverage = (target, env) => {
	if (!target) throw new Error(`${LOG_PREFIX} unable to determine rotation target.`);
	console.log(`${LOG_PREFIX} running focused coverage for ${target}.`);
	rmSync(resolve(ROTATION_DIR), { force: true, recursive: true });
	const args = [
		'vitest',
		'run',
		target,
		'--coverage',
		`--coverage.dir=${ROTATION_DIR}`,
		'--coverage.reporter=text-summary',
		'--coverage.reporter=json-summary',
	];
	const mergedEnv = {
		...env,
		NODE_OPTIONS: env.NODE_OPTIONS ?? '--max-old-space-size=4096 --expose-gc',
		VITEST_MAX_THREADS: env.VITEST_MAX_THREADS ?? '1',
		VITEST_MIN_THREADS: env.VITEST_MIN_THREADS ?? '1',
		VITEST_MAX_FORKS: env.VITEST_MAX_FORKS ?? '1',
		VITEST_MIN_FORKS: env.VITEST_MIN_FORKS ?? '1',
	};
	const result = spawnSync('pnpm', args, { stdio: 'inherit', env: mergedEnv });
	if (result.status !== 0) {
		throw new Error(`${LOG_PREFIX} vitest run failed for ${target}.`);
	}
};

export function runRotation(mode = 'auto', options = {}) {
	const env = options.env ?? process.env;
	const effectiveMode = mode === 'auto' ? (env.CI === 'true' ? 'ci' : 'dev') : mode;
	const config = loadRotationConfig(options.configPath ?? CONFIG_PATH);
	const activeWeek = selectRotationWeek(config, env, options.now ?? new Date());
	const policy = config.policy ?? {};
	if (effectiveMode !== 'floor') {
		if (options.skipVitest !== true) runFocusedCoverage(activeWeek.target, env);
		const targetTotals = readCoverageTotals(options.rotationSummaryPath ?? ROTATION_SUMMARY_PATH);
		if (!targetTotals) {
			throw new Error(`${LOG_PREFIX} coverage summary missing for ${activeWeek.target} at ${options.rotationSummaryPath ?? ROTATION_SUMMARY_PATH}.`);
		}
		assertThresholds(targetTotals, activeWeek.goal ?? {}, `weekly goal for ${activeWeek.target}`);
		console.log(`${LOG_PREFIX} weekly goal satisfied for ${activeWeek.target}.`);
	}
	const globalTotals = readCoverageTotals(options.globalSummaryPath ?? GLOBAL_SUMMARY_PATH);
	if (!globalTotals) {
		throw new Error(`${LOG_PREFIX} global coverage summary not found at ${options.globalSummaryPath ?? GLOBAL_SUMMARY_PATH}.`);
	}
	assertThresholds(globalTotals, policy.global_floor ?? {}, 'global floor');
	if (typeof policy.max_regression === 'number') {
		const baselineTotals = readCoverageTotals(options.baselinePath ?? BASELINE_PATH);
		if (!baselineTotals) {
			console.warn(`${LOG_PREFIX} baseline coverage missing at ${options.baselinePath ?? BASELINE_PATH}; skipping regression guard.`);
		} else {
			enforceRegression(baselineTotals, globalTotals, policy.max_regression);
		}
	}
	console.log(`${LOG_PREFIX} checks complete (mode=${effectiveMode}).`);
}

const determineMode = (args, env) => {
	for (const arg of args) {
		if (arg.startsWith('--mode=')) return arg.split('=')[1];
	}
	return env.CI === 'true' ? 'ci' : 'dev';
};

if (import.meta.main) {
	const mode = determineMode(process.argv.slice(2), process.env);
	try {
		runRotation(mode);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`${LOG_PREFIX} ${message}`);
		process.exit(1);
	}
}
