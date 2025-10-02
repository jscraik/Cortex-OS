import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface BaselineMetric {
	percentage: number;
	available: boolean;
	source: string | null;
	covered?: number;
	total?: number;
}

export interface CoverageBaseline {
	generatedAt: string;
	line: BaselineMetric;
	branch: BaselineMetric;
	mutation: BaselineMetric;
}

export interface CodemapBaseline {
	available: boolean;
	source: string | null;
	nodes: number | null;
	edges: number | null;
	files: number | null;
}

export interface PackageAuditBaseline {
	available: boolean;
	source: string | null;
	critical: number | null;
	high: number | null;
	moderate: number | null;
	low: number | null;
}

export interface FlakeBaseline {
	available: boolean;
	source: string | null;
	flakeRate: number | null;
	averageDurationMs: number | null;
	testRuns: number | null;
}

export interface GenerateBaselineOptions {
	metricsDir?: string;
	outputDir?: string;
	codemapPath?: string;
	packageAuditPath?: string;
	flakeStatsPath?: string;
}

export interface BaselineSummary {
	generatedAt: string;
	coverage: CoverageBaseline;
	codemap: CodemapBaseline;
	packageAudit: PackageAuditBaseline;
	flakes: FlakeBaseline;
}

const DEFAULT_METRICS_DIR = 'out';
const DEFAULT_OUTPUT_DIR = path.join('reports', 'baseline');
const DEFAULT_CODEMAP_PATH = path.join(DEFAULT_METRICS_DIR, 'codemap.json');
const DEFAULT_PACKAGE_AUDIT_PATH = path.join(DEFAULT_METRICS_DIR, 'package-audit.json');
const DEFAULT_FLAKE_STATS_PATH = path.join(DEFAULT_METRICS_DIR, 'flake-metrics.json');

export async function getCoverageBaseline(
	metricsDir: string = DEFAULT_METRICS_DIR,
): Promise<CoverageBaseline> {
	const now = new Date().toISOString();
	const coverageFileCandidates = [
		path.join(metricsDir, 'coverage.json'),
		path.join(metricsDir, 'coverage-summary.json'),
		path.join(metricsDir, 'coverage', 'coverage-summary.json'),
	];

	const mutationFile = path.join(metricsDir, 'mutation.json');

	const coverageResult = await readFirstAvailableJson(coverageFileCandidates);
	const mutationResult = await readJson(mutationFile);

	const lineMetric = buildCoverageMetric(
		coverageResult,
		['total', 'lines'],
		coverageResult?.source ?? null,
	);
	const branchMetric = buildCoverageMetric(
		coverageResult,
		['total', 'branches'],
		coverageResult?.source ?? null,
	);
	const mutationMetric = buildMutationMetric(mutationResult);

	return {
		generatedAt: now,
		line: lineMetric,
		branch: branchMetric,
		mutation: mutationMetric,
	};
}

export async function collectCodemapBaseline(
	codemapPath: string = DEFAULT_CODEMAP_PATH,
): Promise<CodemapBaseline> {
	const codemapData = await readJson(codemapPath);

	if (!codemapData?.data) {
		return {
			available: false,
			source: codemapData?.source ?? null,
			nodes: null,
			edges: null,
			files: null,
		};
	}

	const data = codemapData.data;
	const files = Array.isArray(data.files) ? data.files.length : null;
	const nodes = typeof data.nodeCount === 'number' ? data.nodeCount : null;
	const edges = typeof data.edgeCount === 'number' ? data.edgeCount : null;

	return {
		available: true,
		source: codemapData.source ?? codemapPath,
		nodes,
		edges,
		files,
	};
}

export async function collectPackageAuditBaseline(
	packageAuditPath: string = DEFAULT_PACKAGE_AUDIT_PATH,
): Promise<PackageAuditBaseline> {
	const auditData = await readJson(packageAuditPath);

	if (!auditData?.data) {
		return {
			available: false,
			source: auditData?.source ?? null,
			critical: null,
			high: null,
			moderate: null,
			low: null,
		};
	}

	const vulnerabilities = auditData.data.vulnerabilities ?? {};

	return {
		available: true,
		source: auditData.source ?? packageAuditPath,
		critical: coerceNumber(vulnerabilities.critical),
		high: coerceNumber(vulnerabilities.high),
		moderate: coerceNumber(vulnerabilities.moderate),
		low: coerceNumber(vulnerabilities.low),
	};
}

export async function collectFlakeBaseline(
	flakeStatsPath: string = DEFAULT_FLAKE_STATS_PATH,
): Promise<FlakeBaseline> {
	const flakeData = await readJson(flakeStatsPath);

	if (!flakeData?.data) {
		return {
			available: false,
			source: flakeData?.source ?? null,
			flakeRate: null,
			averageDurationMs: null,
			testRuns: null,
		};
	}

	const metrics = flakeData.data;

	return {
		available: true,
		source: flakeData.source ?? flakeStatsPath,
		flakeRate: coerceNumber(metrics.flakeRate),
		averageDurationMs: coerceNumber(metrics.averageDurationMs),
		testRuns: coerceNumber(metrics.testRuns),
	};
}

export async function generateBaselineReport(
	options: GenerateBaselineOptions = {},
): Promise<BaselineSummary> {
	const metricsDir = options.metricsDir ?? DEFAULT_METRICS_DIR;
	const outputDir = options.outputDir ?? DEFAULT_OUTPUT_DIR;
	const codemapPath = options.codemapPath ?? DEFAULT_CODEMAP_PATH;
	const packageAuditPath = options.packageAuditPath ?? DEFAULT_PACKAGE_AUDIT_PATH;
	const flakeStatsPath = options.flakeStatsPath ?? DEFAULT_FLAKE_STATS_PATH;

	const [coverage, codemap, packageAudit, flakes] = await Promise.all([
		getCoverageBaseline(metricsDir),
		collectCodemapBaseline(codemapPath),
		collectPackageAuditBaseline(packageAuditPath),
		collectFlakeBaseline(flakeStatsPath),
	]);

	const summary: BaselineSummary = {
		generatedAt: new Date().toISOString(),
		coverage,
		codemap,
		packageAudit,
		flakes,
	};

	await fs.mkdir(outputDir, { recursive: true });

	await Promise.all([
		writeJson(path.join(outputDir, 'coverage.json'), coverage),
		writeJson(path.join(outputDir, 'codemap.json'), codemap),
		writeJson(path.join(outputDir, 'package-audit.json'), packageAudit),
		writeJson(path.join(outputDir, 'flakes.json'), flakes),
		writeJson(path.join(outputDir, 'summary.json'), summary),
	]);

	return summary;
}

async function readFirstAvailableJson(
	candidates: string[],
): Promise<{ data: any; source: string } | null> {
	for (const candidate of candidates) {
		const result = await readJson(candidate);
		if (result?.data) {
			return { data: result.data, source: result.source ?? candidate };
		}
	}
	return null;
}

async function readJson(filePath: string): Promise<{ data: any; source: string } | null> {
	try {
		const content = await fs.readFile(filePath, 'utf8');
		return {
			data: JSON.parse(content),
			source: filePath,
		};
	} catch (error) {
		if (isFileNotFound(error)) {
			return null;
		}
		throw error;
	}
}

async function writeJson(filePath: string, payload: unknown): Promise<void> {
	await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function buildCoverageMetric(
	coverageResult: { data: any; source: string } | null,
	pathSegments: string[],
	source: string | null,
): BaselineMetric {
	if (!coverageResult?.data) {
		return {
			percentage: 0,
			available: false,
			source,
		};
	}

	const scopeValue = resolveNestedValue(coverageResult.data, [...pathSegments, 'pct']);
	const covered = resolveNestedValue(coverageResult.data, [...pathSegments, 'covered']);
	const total = resolveNestedValue(coverageResult.data, [...pathSegments, 'total']);

	if (typeof scopeValue !== 'number') {
		return {
			percentage: 0,
			available: false,
			source,
		};
	}

	return {
		percentage: scopeValue,
		available: true,
		source,
		covered: typeof covered === 'number' ? covered : undefined,
		total: typeof total === 'number' ? total : undefined,
	};
}

function buildMutationMetric(
	mutationResult: { data: any; source: string } | null,
): BaselineMetric {
	if (!mutationResult?.data) {
		return {
			percentage: 0,
			available: false,
			source: mutationResult?.source ?? null,
		};
	}

	const mutationScore = resolveNestedValue(mutationResult.data, ['score']);
	if (typeof mutationScore !== 'number') {
		return {
			percentage: 0,
			available: false,
			source: mutationResult.source,
		};
	}

	return {
		percentage: mutationScore,
		available: true,
		source: mutationResult.source,
	};
}

function resolveNestedValue(subject: any, pathSegments: string[]): unknown {
	return pathSegments.reduce<unknown>((cursor, segment) => {
		if (cursor && typeof cursor === 'object' && segment in cursor) {
			return (cursor as Record<string, unknown>)[segment];
		}
		return undefined;
	}, subject);
}

function coerceNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === 'string') {
		const parsed = Number.parseFloat(value);
		if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return null;
}

function isFileNotFound(error: unknown): boolean {
	return Boolean(
		error &&
		typeof error === 'object' &&
		'name' in error &&
		(error as NodeJS.ErrnoException).code === 'ENOENT',
	);
}
