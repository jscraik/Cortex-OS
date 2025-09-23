import { createObservabilityEvent } from '../events/observability-events.js';
import type { LogLevel, TraceContext, ULID } from '../types.js';
import {
	type AggregationMode,
	type EvaluateAlertInput,
	type GenerateDashboardInput,
	type GetMetricsInput,
	type QueryTracesInput,
	type SearchLogsInput,
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
type AlertTriggeredEnvelope = ReturnType<typeof createObservabilityEvent.alertTriggered>;
export interface ObservabilityRuntimeOptions {
	dataset?: Partial<ObservabilityDataset>;
	maxResults?: number;
	onEvent?: (event: AlertTriggeredEnvelope) => void;
}
export interface ObservabilityToolRuntime {
	queryTraces(input: QueryTracesInput): Promise<TraceQueryResult>;
	searchLogs(input: SearchLogsInput): Promise<LogSearchResult>;
	getMetrics(input: GetMetricsInput): Promise<MetricRetrievalResult>;
	evaluateAlert(input: EvaluateAlertInput): Promise<AlertEvaluationResult>;
	generateDashboard(input: GenerateDashboardInput): Promise<DashboardSummary>;
}
export declare function createObservabilityToolRuntime(
	options?: ObservabilityRuntimeOptions,
): ObservabilityToolRuntime;
export type ObservabilityToolHandler = (input: unknown) => Promise<unknown>;
export type ObservabilityToolHandlers = Record<string, ObservabilityToolHandler>;
export declare function createObservabilityToolHandlers(
	runtime: ObservabilityToolRuntime,
): ObservabilityToolHandlers;
//# sourceMappingURL=runtime.d.ts.map
