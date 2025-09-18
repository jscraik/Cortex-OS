import {
	type AlertTriggeredEvent,
	createObservabilityEvent,
} from '../events/observability-events.js';
import type { LogLevel, TraceContext, ULID } from '../types.js';
import {
	type AggregationMode,
	type EvaluateAlertInput,
	EvaluateAlertInputSchema,
	type GenerateDashboardInput,
	GenerateDashboardInputSchema,
	type GetMetricsInput,
	GetMetricsInputSchema,
	type QueryTracesInput,
	QueryTracesInputSchema,
	type SearchLogsInput,
	SearchLogsInputSchema,
} from './tools.js';

export type TraceStatus = 'success' | 'error';

export interface TraceRecord {
	traceId: string;
	service: string;
	operation: string;
	status: TraceStatus;
	durationMs: number;
	startTime: string;
	endTime?: string;
	tags?: Record<string, string>;
	runId?: ULID;
}

export interface LogRecord {
	id: string;
	level: LogLevel;
	message: string;
	timestamp: string;
	component: string;
	runId: ULID;
	traceId?: string;
	traceContext?: TraceContext;
	metadata?: Record<string, unknown>;
}

export interface MetricRecord {
	name: string;
	value: number;
	timestamp: string;
	unit?: string;
	labels?: Record<string, string>;
}

export type AlertComparison = '>' | '>=' | '<' | '<=';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AlertRule {
	id: string;
	metric: string;
	threshold: number;
	comparison: AlertComparison;
	severity: AlertSeverity;
	message: string;
	windowMs?: number;
	evaluation?: AggregationMode;
	tags?: Record<string, string>;
}

export interface DashboardDefinition {
	id: string;
	title?: string;
	description?: string;
	defaultRangeMs?: number;
}

export interface ObservabilityDataset {
	traces: TraceRecord[];
	logs: LogRecord[];
	metrics: MetricRecord[];
	alerts: AlertRule[];
	dashboards: DashboardDefinition[];
}

export interface TraceQueryResult {
	traces: TraceRecord[];
	totalMatches: number;
	hasMore: boolean;
}

export interface LogSearchResultItem extends Omit<LogRecord, 'metadata'> {
	metadata?: Record<string, unknown>;
}

export interface LogSearchResult {
	logs: LogSearchResultItem[];
	totalMatches: number;
	hasMore: boolean;
}

export interface MetricSeriesPoint {
	value: number;
	timestamp: string;
	labels?: Record<string, string>;
	unit?: string;
}

export interface MetricAggregationResult {
	name: string;
	aggregation?: AggregationMode;
	value: number | null;
	summary: {
		count: number;
		sum: number;
		min: number;
		max: number;
		avg: number;
	};
	series: MetricSeriesPoint[];
}

export interface MetricRetrievalResult {
	metrics: MetricAggregationResult[];
	totalMatches: number;
}

export interface AlertEvaluationResult {
	alertId: string;
	triggered: boolean;
	severity: AlertSeverity;
	threshold: number;
	comparison: AlertComparison;
	message: string;
	currentValue: number | null;
	windowMs?: number;
	tags?: Record<string, string>;
}

export interface DashboardSummary {
	dashboardId: string;
	timeRange: {
		start: string;
		end: string;
	};
	traces: {
		total: number;
		errors: number;
		errorRate: number;
		avgDurationMs: number;
		p95DurationMs: number;
		slowestTraceId: string | null;
	};
	logs: {
		total: number;
		byLevel: Record<LogLevel, number>;
		latest: LogSearchResultItem[];
	};
	metrics: Array<{
		name: string;
		avg: number;
		max: number;
		min: number;
		latest: number | null;
	}>;
	alerts: Array<{
		id: string;
		severity: AlertSeverity;
		triggered: boolean;
		threshold: number;
		comparison: AlertComparison;
		currentValue: number | null;
	}>;
}

export interface ObservabilityRuntimeOptions {
	dataset?: Partial<ObservabilityDataset>;
	maxResults?: number;
	onEvent?: (event: AlertTriggeredEvent) => void;
}

export interface ObservabilityToolRuntime {
	queryTraces(input: QueryTracesInput): Promise<TraceQueryResult>;
	searchLogs(input: SearchLogsInput): Promise<LogSearchResult>;
	getMetrics(input: GetMetricsInput): Promise<MetricRetrievalResult>;
	evaluateAlert(input: EvaluateAlertInput): Promise<AlertEvaluationResult>;
	generateDashboard(input: GenerateDashboardInput): Promise<DashboardSummary>;
}

const DEFAULT_MAX_RESULTS = 100;
const LOG_LEVELS: LogLevel[] = [
	'trace',
	'debug',
	'info',
	'warn',
	'error',
	'fatal',
];

function cloneDataset(
	dataset: Partial<ObservabilityDataset> | undefined,
): ObservabilityDataset {
	return {
		traces: (dataset?.traces ?? []).map((trace) => ({
			...trace,
			tags: trace.tags ? { ...trace.tags } : undefined,
		})),
		logs: (dataset?.logs ?? []).map((log) => ({
			...log,
			metadata: log.metadata ? { ...log.metadata } : undefined,
		})),
		metrics: (dataset?.metrics ?? []).map((metric) => ({
			...metric,
			labels: metric.labels ? { ...metric.labels } : undefined,
		})),
		alerts: (dataset?.alerts ?? []).map((alert) => ({
			...alert,
			tags: alert.tags ? { ...alert.tags } : undefined,
		})),
		dashboards: (dataset?.dashboards ?? []).map((dashboard) => ({
			...dashboard,
		})),
	};
}

function parseTime(value?: string): number | undefined {
	if (!value) return undefined;
	const timestamp = Date.parse(value);
	return Number.isNaN(timestamp) ? undefined : timestamp;
}

function clampLimit(requested: number | undefined, maxResults: number): number {
	const limit = requested ?? maxResults;
	return Math.max(1, Math.min(limit, maxResults));
}

function matchesTags(
	actual: Record<string, string> | undefined,
	expected: Record<string, string> | undefined,
): boolean {
	if (!expected) return true;
	if (!actual) return false;
	for (const [key, value] of Object.entries(expected)) {
		if (actual[key] !== value) {
			return false;
		}
	}
	return true;
}

function sanitizeMetadata(
	metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
	if (!metadata) return undefined;
	// Example redaction: remove sensitive keys (e.g., 'password', 'token')
	const SENSITIVE_KEYS = ['password', 'token', 'secret', 'apiKey'];
	const sanitized: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(metadata)) {
		if (!SENSITIVE_KEYS.includes(key)) {
			sanitized[key] = value;
		}
	}
	return sanitized;
}

function sanitizeLogs(records: LogRecord[]): LogSearchResultItem[] {
	return records.map((log) => ({
		...log,
		metadata: sanitizeMetadata(log.metadata),
	}));
}

function metadataContains(
	metadata: Record<string, unknown> | undefined,
	query: string,
): boolean {
	if (!metadata) return false;
	for (const value of Object.values(metadata)) {
		if (typeof value === 'string' && value.toLowerCase().includes(query)) {
			return true;
		}
		if (typeof value === 'number' && value.toString().includes(query)) {
			return true;
		}
		if (value && typeof value === 'object') {
			if (metadataContains(value as Record<string, unknown>, query)) {
				return true;
			}
		}
	}
	return false;
}

function aggregate(
	values: number[],
	mode: AggregationMode | undefined,
): number | null {
	if (values.length === 0 || !mode) {
		return mode ? 0 : null;
	}

	switch (mode) {
		case 'sum':
			return values.reduce((total, value) => total + value, 0);
		case 'avg':
			return values.reduce((total, value) => total + value, 0) / values.length;
		case 'count':
			return values.length;
		case 'max':
			return Math.max(...values);
		case 'min':
			return Math.min(...values);
		default:
			return null;
	}
}

function summarize(values: number[]): {
	count: number;
	sum: number;
	min: number;
	max: number;
	avg: number;
} {
	if (values.length === 0) {
		return {
			count: 0,
			sum: 0,
			min: 0,
			max: 0,
			avg: 0,
		};
	}

	const sum = values.reduce((total, value) => total + value, 0);
	return {
		count: values.length,
		sum,
		min: Math.min(...values),
		max: Math.max(...values),
		avg: sum / values.length,
	};
}

// Quickselect algorithm to find the k-th smallest element
function quickselect(arr: number[], k: number): number {
	if (arr.length === 1) return arr[0];
	let left = 0,
		right = arr.length - 1;
	while (left <= right) {
		// Choose a random pivot
		const pivotIndex = left + Math.floor(Math.random() * (right - left + 1));
		const pivotValue = arr[pivotIndex];
		// Partition
		let i = left,
			j = right;
		while (i <= j) {
			while (arr[i] < pivotValue) i++;
			while (arr[j] > pivotValue) j--;
			if (i <= j) {
				[arr[i], arr[j]] = [arr[j], arr[i]];
				i++;
				j--;
			}
		}
		if (k <= j) {
			right = j;
		} else if (k >= i) {
			left = i;
		} else {
			return arr[k];
		}
	}
	return arr[k];
}

function percentile(values: number[], percentileValue: number): number {
	if (values.length === 0) return 0;
	const n = values.length;
	const index = Math.min(
		n - 1,
		Math.max(0, Math.ceil((percentileValue / 100) * n) - 1),
	);
	// Make a copy to avoid mutating the original array
	const arrCopy = [...values];
	return quickselect(arrCopy, index);
}

function compareThreshold(
	value: number,
	threshold: number,
	comparison: AlertComparison,
): boolean {
	switch (comparison) {
		case '>':
			return value > threshold;
		case '>=':
			return value >= threshold;
		case '<':
			return value < threshold;
		case '<=':
			return value <= threshold;
		default:
			return false;
	}
}

function filterLogsByQuery(log: LogRecord, query: string): boolean {
	const lowered = query.toLowerCase();
	if (log.message.toLowerCase().includes(lowered)) {
		return true;
	}
	return metadataContains(log.metadata, lowered);
}

function filterByLabels(
	labels: Record<string, string> | undefined,
	expected: Record<string, string> | undefined,
): boolean {
	if (!expected) return true;
	if (!labels) return false;
	for (const [key, value] of Object.entries(expected)) {
		if (labels[key] !== value) return false;
	}
	return true;
}

function resolveTimeRange(
	start?: string,
	end?: string,
): { start?: number; end?: number; startIso?: string; endIso?: string } {
	const startMs = parseTime(start);
	const endMs = parseTime(end);
	return {
		start: startMs,
		end: endMs,
		startIso: startMs ? new Date(startMs).toISOString() : start,
		endIso: endMs ? new Date(endMs).toISOString() : end,
	};
}

interface RuleEvaluationContext {
	rule: AlertRule;
	metrics: MetricRecord[];
	overrideAggregation?: AggregationMode;
}

function evaluateRule({
	rule,
	metrics,
	overrideAggregation,
}: RuleEvaluationContext): { triggered: boolean; value: number | null } {
	const relevant = metrics.filter((metric) => metric.name === rule.metric);
	const values = relevant.map((metric) => metric.value);
	const aggregationMode = overrideAggregation ?? rule.evaluation ?? 'avg';
	const aggregated = aggregate(values, aggregationMode);
	if (aggregated === null) {
		return { triggered: false, value: null };
	}
	return {
		triggered: compareThreshold(aggregated, rule.threshold, rule.comparison),
		value: aggregated,
	};
}

export function createObservabilityToolRuntime(
	options: ObservabilityRuntimeOptions = {},
): ObservabilityToolRuntime {
	const dataset = cloneDataset(options.dataset);
	const maxResults = options.maxResults ?? DEFAULT_MAX_RESULTS;

	return {
		async queryTraces(input) {
			const parsed = QueryTracesInputSchema.parse(input);
			const { start, end } = resolveTimeRange(parsed.startTime, parsed.endTime);

			const filtered = dataset.traces
				.filter((trace) => {
					const traceStart = parseTime(trace.startTime);
					if (start !== undefined && (traceStart ?? 0) < start) return false;
					if (end !== undefined && (traceStart ?? 0) > end) return false;
					if (parsed.service && trace.service !== parsed.service) return false;
					if (parsed.operation && trace.operation !== parsed.operation)
						return false;
					if (parsed.status && trace.status !== parsed.status) {
						return false;
					}
					return matchesTags(trace.tags, parsed.tags);
				})
				.sort(
					(a, b) =>
						(parseTime(b.startTime) ?? 0) - (parseTime(a.startTime) ?? 0),
				);

			const limit = clampLimit(parsed.limit, maxResults);
			const results = filtered.slice(0, limit);

			return {
				traces: results,
				totalMatches: filtered.length,
				hasMore: filtered.length > limit,
			} satisfies TraceQueryResult;
		},

		async searchLogs(input) {
			const parsed = SearchLogsInputSchema.parse(input);
			const { start, end } = resolveTimeRange(parsed.startTime, parsed.endTime);

			const filtered = dataset.logs
				.filter((log) => {
					const timestamp = parseTime(log.timestamp) ?? 0;
					if (start !== undefined && timestamp < start) return false;
					if (end !== undefined && timestamp > end) return false;
					if (parsed.level && log.level !== parsed.level) return false;
					if (parsed.component && log.component !== parsed.component) {
						return false;
					}
					if (parsed.runId && log.runId !== parsed.runId) return false;
					if (parsed.traceId && log.traceId !== parsed.traceId) return false;
					if (
						parsed.traceContext &&
						log.traceContext?.traceId !== parsed.traceContext.traceId
					) {
						return false;
					}
					if (
						!matchesTags(log.metadata as Record<string, string>, parsed.tags)
					) {
						return false;
					}
					if (parsed.query && !filterLogsByQuery(log, parsed.query)) {
						return false;
					}
					return true;
				})
				.sort(
					(a, b) =>
						(parseTime(b.timestamp) ?? 0) - (parseTime(a.timestamp) ?? 0),
				);

			const limit = clampLimit(parsed.limit, maxResults);
			const sanitized = sanitizeLogs(filtered);
			const results = sanitized.slice(0, limit);

			return {
				logs: results,
				totalMatches: sanitized.length,
				hasMore: sanitized.length > limit,
			} satisfies LogSearchResult;
		},

		async getMetrics(input) {
			const parsed = GetMetricsInputSchema.parse(input);
			const { start, end } = resolveTimeRange(parsed.startTime, parsed.endTime);

			const filtered = dataset.metrics
				.filter((metric) => {
					const timestamp = parseTime(metric.timestamp) ?? 0;
					if (start !== undefined && timestamp < start) return false;
					if (end !== undefined && timestamp > end) return false;
					if (parsed.name && metric.name !== parsed.name) return false;
					return filterByLabels(metric.labels, parsed.labels);
				})
				.sort(
					(a, b) =>
						(parseTime(b.timestamp) ?? 0) - (parseTime(a.timestamp) ?? 0),
				);

			const byName = new Map<string, MetricRecord[]>();
			for (const metric of filtered) {
				const bucket = byName.get(metric.name);
				if (bucket) {
					bucket.push(metric);
				} else {
					byName.set(metric.name, [metric]);
				}
			}

			const limit = clampLimit(parsed.limit, maxResults);
			const aggregations: MetricAggregationResult[] = [];
			for (const [name, records] of byName.entries()) {
				const values = records.map((record) => record.value);
				const summary = summarize(values);
				const value = aggregate(values, parsed.aggregation);
				const series = records.map<MetricSeriesPoint>((record) => ({
					value: record.value,
					timestamp: record.timestamp,
					labels: record.labels ? { ...record.labels } : undefined,
					unit: record.unit,
				}));
				aggregations.push({
					name,
					aggregation: parsed.aggregation,
					value,
					summary,
					series,
				});
			}

			const sortedAggregations = aggregations.sort((a, b) => {
				const latestA = parseTime(a.series[0]?.timestamp ?? '') ?? 0;
				const latestB = parseTime(b.series[0]?.timestamp ?? '') ?? 0;
				return latestB - latestA;
			});

			const limited = sortedAggregations.slice(0, limit);

			return {
				metrics: limited,
				totalMatches: aggregations.length,
			} satisfies MetricRetrievalResult;
		},

		async evaluateAlert(input) {
			const parsed = EvaluateAlertInputSchema.parse(input);
			const rule = dataset.alerts.find(
				(candidate) => candidate.id === parsed.alertId,
			);
			if (!rule) {
				throw new Error(`Alert rule not found: ${parsed.alertId}`);
			}

			const metricName = parsed.metricWindow?.metric ?? rule.metric;
			const { start, end } = resolveTimeRange(
				parsed.metricWindow?.startTime,
				parsed.metricWindow?.endTime,
			);
			const metricsForName = dataset.metrics.filter(
				(metric) => metric.name === metricName,
			);
			const latestTimestamp = metricsForName.reduce((latest, metric) => {
				const timestamp = parseTime(metric.timestamp);
				if (timestamp === undefined) {
					return latest;
				}
				return timestamp > latest ? timestamp : latest;
			}, Number.NEGATIVE_INFINITY);
			const computedWindowStart =
				start !== undefined
					? start
					: rule.windowMs && latestTimestamp !== Number.NEGATIVE_INFINITY
						? latestTimestamp - rule.windowMs
						: undefined;
			const metrics = metricsForName.filter((metric) => {
				const timestamp = parseTime(metric.timestamp) ?? 0;
				if (
					computedWindowStart !== undefined &&
					timestamp < computedWindowStart
				) {
					return false;
				}
				if (end !== undefined && timestamp > end) {
					return false;
				}
				return true;
			});

			const evaluation = evaluateRule({
				rule,
				metrics,
				overrideAggregation: parsed.metricWindow?.aggregation,
			});

			if (evaluation.triggered && options.onEvent) {
				const alertEvent = createObservabilityEvent.alertTriggered({
					alertId: rule.id,
					rule: `${metricName} ${rule.comparison} ${rule.threshold}`,
					severity: rule.severity,
					message: rule.message,
					triggeredAt: new Date().toISOString(),
				});
				options.onEvent(alertEvent.data);
			}

			return {
				alertId: rule.id,
				triggered: evaluation.triggered,
				severity: rule.severity,
				threshold: rule.threshold,
				comparison: rule.comparison,
				message: rule.message,
				currentValue: evaluation.value,
				windowMs: rule.windowMs,
				tags: rule.tags ? { ...rule.tags } : undefined,
			} satisfies AlertEvaluationResult;
		},

		async generateDashboard(input) {
			const parsed = GenerateDashboardInputSchema.parse(input);
			const definition = dataset.dashboards.find(
				(dashboard) => dashboard.id === parsed.dashboardId,
			);

			if (!definition) {
				throw new Error(`Dashboard not found: ${parsed.dashboardId}`);
			}

			const startIso = parsed.timeRange?.start;
			const endIso = parsed.timeRange?.end;
			const {
				start,
				end,
				startIso: normalizedStart,
				endIso: normalizedEnd,
			} = resolveTimeRange(startIso, endIso);

			const traces = dataset.traces.filter((trace) => {
				const timestamp = parseTime(trace.startTime) ?? 0;
				if (start !== undefined && timestamp < start) return false;
				if (end !== undefined && timestamp > end) return false;
				return true;
			});

			const logs = dataset.logs.filter((log) => {
				const timestamp = parseTime(log.timestamp) ?? 0;
				if (start !== undefined && timestamp < start) return false;
				if (end !== undefined && timestamp > end) return false;
				return true;
			});

			const metrics = dataset.metrics.filter((metric) => {
				const timestamp = parseTime(metric.timestamp) ?? 0;
				if (start !== undefined && timestamp < start) return false;
				if (end !== undefined && timestamp > end) return false;
				return true;
			});

			const traceDurations = traces.map((trace) => trace.durationMs);
			const totalTraces = traces.length;
			const errorCount = traces.filter(
				(trace) => trace.status === 'error',
			).length;
			const avgDuration = totalTraces
				? traceDurations.reduce((total, value) => total + value, 0) /
				totalTraces
				: 0;
			const p95 = percentile(traceDurations, 95);
			const slowest = traces.reduce<TraceRecord | null>((slow, trace) => {
				if (!slow) return trace;
				return trace.durationMs > slow.durationMs ? trace : slow;
			}, null);

			const logCounts: Record<LogLevel, number> = LOG_LEVELS.reduce(
				(acc, level) => {
					acc[level] = 0;
					return acc;
				},
				{} as Record<LogLevel, number>,
			);
			for (const log of logs) {
				logCounts[log.level] = (logCounts[log.level] ?? 0) + 1;
			}

			const sanitizedLogs = sanitizeLogs(logs).slice(
				0,
				clampLimit(parsed.limit, maxResults),
			);

			const metricsByName = new Map<string, MetricRecord[]>();
			for (const metric of metrics) {
				const bucket = metricsByName.get(metric.name);
				if (bucket) {
					bucket.push(metric);
				} else {
					metricsByName.set(metric.name, [metric]);
				}
			}

			const metricSummaries = Array.from(metricsByName.entries()).map(
				([name, records]) => {
					const values = records.map((record) => record.value);
					const sum = values.reduce((total, value) => total + value, 0);
					const avg = values.length ? sum / values.length : 0;
					const max = values.length ? Math.max(...values) : 0;
					const min = values.length ? Math.min(...values) : 0;
					const latestRecord = records.reduce<MetricRecord | null>(
						(latest, record) => {
							if (!latest) return record;
							return (parseTime(record.timestamp) ?? 0) >=
								(parseTime(latest.timestamp) ?? 0)
								? record
								: latest;
						},
						null,
					);
					return {
						name,
						avg,
						max,
						min,
						latest: latestRecord?.value ?? null,
					};
				},
			);

			const alerts = dataset.alerts.map((rule) => {
				const evaluation = evaluateRule({
					rule,
					metrics,
				});
				return {
					id: rule.id,
					severity: rule.severity,
					triggered: evaluation.triggered,
					threshold: rule.threshold,
					comparison: rule.comparison,
					currentValue: evaluation.value,
				};
			});

			return {
				dashboardId: parsed.dashboardId,
				timeRange: {
					start:
						normalizedStart ??
						traces.map((trace) => trace.startTime).sort()[0] ??
						logs.map((log) => log.timestamp).sort()[0] ??
						new Date(0).toISOString(),
					end:
						normalizedEnd ??
						traces
							.map((trace) => trace.startTime)
							.sort()
							.reverse()[0] ??
						logs
							.map((log) => log.timestamp)
							.sort()
							.reverse()[0] ??
						new Date().toISOString(),
				},
				traces: {
					total: totalTraces,
					errors: errorCount,
					errorRate: totalTraces ? errorCount / totalTraces : 0,
					avgDurationMs: avgDuration,
					p95DurationMs: p95,
					slowestTraceId: slowest?.traceId ?? null,
				},
				logs: {
					total: logs.length,
					byLevel: logCounts,
					latest: sanitizedLogs,
				},
				metrics: metricSummaries,
				alerts,
			} satisfies DashboardSummary;
		},
	} satisfies ObservabilityToolRuntime;
}

export type ObservabilityToolHandler = (input: unknown) => Promise<unknown>;
export type ObservabilityToolHandlers = Record<
	string,
	ObservabilityToolHandler
>;

export function createObservabilityToolHandlers(
	runtime: ObservabilityToolRuntime,
): ObservabilityToolHandlers {
	return {
		query_traces: async (input) =>
			runtime.queryTraces(input as QueryTracesInput),
		search_logs: async (input) => runtime.searchLogs(input as SearchLogsInput),
		get_metrics: async (input) => runtime.getMetrics(input as GetMetricsInput),
		evaluate_alert: async (input) =>
			runtime.evaluateAlert(input as EvaluateAlertInput),
		generate_dashboard: async (input) =>
			runtime.generateDashboard(input as GenerateDashboardInput),
	};
}
