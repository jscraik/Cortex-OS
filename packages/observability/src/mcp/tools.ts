import { z } from 'zod';

import { LogLevelSchema, ULIDSchema } from '../types.js';

/**
 * MCP tool response envelope used across observability handlers.
 */
export interface ObservabilityToolResponse {
        content: Array<{ type: 'text'; text: string }>;
        isError?: boolean;
}

/**
 * Contract for every observability MCP tool.
 */
export interface ObservabilityTool {
        name: string;
        description: string;
        inputSchema: z.ZodTypeAny;
        handler: (params: unknown) => Promise<ObservabilityToolResponse>;
}

const ObservabilitySeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
const AlertStatusSchema = z.enum(['triggered', 'acknowledged', 'resolved']);

const TimeRangeSchema = z
        .object({
                from: z.string().datetime().optional(),
                to: z.string().datetime().optional(),
        })
        .refine((range) => {
                if (range.from && range.to) {
                        return new Date(range.from) <= new Date(range.to);
                }
                return true;
        }, 'from must be before to');

const TagFilterSchema = z.record(z.string());

export const TraceQueryInputSchema = z
        .object({
                traceId: z.string().min(1).optional(),
                runId: ULIDSchema.optional(),
                service: z.string().optional(),
                operation: z.string().optional(),
                status: z.enum(['success', 'error', 'any']).default('any'),
                minDurationMs: z.number().int().nonnegative().optional(),
                maxDurationMs: z.number().int().nonnegative().optional(),
                tags: TagFilterSchema.optional(),
                timeRange: TimeRangeSchema.optional(),
                limit: z.number().int().positive().max(200).default(50),
                sortBy: z.enum(['startTime', 'duration']).default('startTime'),
                order: z.enum(['asc', 'desc']).default('desc'),
        })
        .refine((data) => {
                if (data.minDurationMs && data.maxDurationMs) {
                        return data.minDurationMs <= data.maxDurationMs;
                }
                return true;
        }, 'minDurationMs must be <= maxDurationMs');

export const LogSearchInputSchema = z.object({
        text: z.string().trim().min(1).optional(),
        level: LogLevelSchema.optional(),
        component: z.string().optional(),
        runId: ULIDSchema.optional(),
        traceId: z.string().optional(),
        timeRange: TimeRangeSchema.optional(),
        limit: z.number().int().positive().max(500).default(100),
        includeContext: z.boolean().default(true),
});

export const MetricRetrievalInputSchema = z.object({
        name: z.string().min(1),
        statistic: z
                .enum(['latest', 'sum', 'avg', 'min', 'max', 'count', 'p50', 'p95', 'p99'])
                .default('latest'),
        tags: TagFilterSchema.optional(),
        timeRange: TimeRangeSchema.optional(),
        groupBy: z.array(z.string().min(1)).max(4).optional(),
        includeSamples: z.boolean().default(false),
        limit: z.number().int().positive().max(500).default(100),
});

export const AlertQueryInputSchema = z.object({
        severity: ObservabilitySeveritySchema.optional(),
        status: AlertStatusSchema.optional(),
        rule: z.string().optional(),
        runId: ULIDSchema.optional(),
        tags: TagFilterSchema.optional(),
        timeRange: TimeRangeSchema.optional(),
        limit: z.number().int().positive().max(200).default(100),
});

export const DashboardRequestInputSchema = z
        .object({
                dashboardId: z.string().optional(),
                tag: z.string().optional(),
                includeWidgets: z.boolean().default(true),
        })
        .refine((data) => data.dashboardId || data.tag, {
                message: 'dashboardId or tag must be provided',
                path: ['dashboardId'],
        });

export type TraceQueryInput = z.infer<typeof TraceQueryInputSchema>;
export type LogSearchInput = z.infer<typeof LogSearchInputSchema>;
export type MetricRetrievalInput = z.infer<typeof MetricRetrievalInputSchema>;
export type AlertQueryInput = z.infer<typeof AlertQueryInputSchema>;
export type DashboardRequestInput = z.infer<typeof DashboardRequestInputSchema>;

/**
 * Trace record surfaced to MCP consumers.
 */
export interface TraceRecord {
        traceId: string;
        service: string;
        operation: string;
        status: 'success' | 'error';
        durationMs: number;
        runId?: string;
        startTime: string;
        endTime: string;
        tags?: Record<string, string>;
}

/**
 * Structured log record for MCP responses.
 */
export interface LogRecord {
        id: string;
        timestamp: string;
        level: z.infer<typeof LogLevelSchema>;
        component: string;
        message: string;
        runId?: string;
        traceId?: string;
        context?: Record<string, unknown>;
}

/**
 * Metric sample snapshot for retrieval tool.
 */
export interface MetricSample {
        name: string;
        value: number;
        type: 'counter' | 'gauge' | 'histogram' | 'timer';
        unit?: string;
        timestamp: string;
        tags?: Record<string, string>;
}

/**
 * Alert record exported to clients.
 */
export interface AlertRecord {
        alertId: string;
        rule: string;
        severity: z.infer<typeof ObservabilitySeveritySchema>;
        status: z.infer<typeof AlertStatusSchema>;
        message: string;
        triggeredAt: string;
        runId?: string;
        tags?: Record<string, string>;
}

export interface DashboardWidgetLayout {
        x: number;
        y: number;
        w: number;
        h: number;
}

export interface DashboardWidget {
        id: string;
        type: 'timeseries' | 'stat' | 'table' | 'logs' | 'histogram';
        title: string;
        query: string;
        layout?: DashboardWidgetLayout;
}

export interface DashboardDefinition {
        dashboardId: string;
        title: string;
        description?: string;
        tags?: Record<string, string>;
        lastUpdated: string;
        widgets: DashboardWidget[];
}

export interface ObservabilityDataSource {
        getTraces(): TraceRecord[];
        getLogs(): LogRecord[];
        getMetrics(): MetricSample[];
        getAlerts(): AlertRecord[];
        getDashboards(): DashboardDefinition[];
}

class InMemoryObservabilityStore implements ObservabilityDataSource {
        #traces: TraceRecord[] = [];
        #logs: LogRecord[] = [];
        #metrics: MetricSample[] = [];
        #alerts: AlertRecord[] = [];
        #dashboards: DashboardDefinition[] = [];

        setTraces(traces: TraceRecord[]): void {
                this.#traces = [...traces];
        }

        setLogs(logs: LogRecord[]): void {
                this.#logs = [...logs];
        }

        setMetrics(metrics: MetricSample[]): void {
                this.#metrics = [...metrics];
        }

        setAlerts(alerts: AlertRecord[]): void {
                this.#alerts = [...alerts];
        }

        setDashboards(dashboards: DashboardDefinition[]): void {
                this.#dashboards = [...dashboards];
        }

        getTraces(): TraceRecord[] {
                return [...this.#traces];
        }

        getLogs(): LogRecord[] {
                return [...this.#logs];
        }

        getMetrics(): MetricSample[] {
                return [...this.#metrics];
        }

        getAlerts(): AlertRecord[] {
                return [...this.#alerts];
        }

        getDashboards(): DashboardDefinition[] {
                return [...this.#dashboards];
        }
}

export { InMemoryObservabilityStore as InMemoryObservabilityDataSource };

const defaultDataSource = new InMemoryObservabilityStore();
let activeDataSource: ObservabilityDataSource = defaultDataSource;

/**
 * Replace the active data source. Useful for tests or adapters.
 */
export function setObservabilityDataSource(source: ObservabilityDataSource): void {
        activeDataSource = source;
}

/**
 * Reset the active data source to the default in-memory store.
 */
export function resetObservabilityDataSource(): void {
        activeDataSource = defaultDataSource;
}

function getDataSource(): ObservabilityDataSource {
        return activeDataSource;
}

function parseTimestamp(value: string): number {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? Number.NaN : parsed;
}

function isWithinTimeRange(
        timestamp: string,
        range?: { from?: string; to?: string },
): boolean {
        if (!range) return true;
        const ts = parseTimestamp(timestamp);
        if (Number.isNaN(ts)) return false;
        if (range.from) {
                const from = parseTimestamp(range.from);
                if (!Number.isNaN(from) && ts < from) {
                        return false;
                }
        }
        if (range.to) {
                const to = parseTimestamp(range.to);
                if (!Number.isNaN(to) && ts > to) {
                        return false;
                }
        }
        return true;
}

function matchesTagFilter(
        tags: Record<string, string> | undefined,
        filter?: Record<string, string>,
): boolean {
        if (!filter || Object.keys(filter).length === 0) {
                return true;
        }
        if (!tags) {
                return false;
        }
        return Object.entries(filter).every(([key, value]) => tags[key] === value);
}

function logContainsText(log: LogRecord, text?: string): boolean {
        if (!text) return true;
        const needle = text.toLowerCase();
        if (log.message.toLowerCase().includes(needle)) {
                return true;
        }
        if (log.context) {
                try {
                        const serialized = JSON.stringify(log.context).toLowerCase();
                        if (serialized.includes(needle)) {
                                return true;
                        }
                } catch (error) {
                        // ignore serialization errors and treat as non-match
                }
        }
        return false;
}

function calculatePercentile(values: number[], percentile: number): number {
        if (values.length === 0) {
                return 0;
        }
        const sorted = [...values].sort((a, b) => a - b);
        const index = (sorted.length - 1) * percentile;
        const lowerIndex = Math.floor(index);
        const upperIndex = Math.ceil(index);
        if (lowerIndex === upperIndex) {
                return sorted[lowerIndex];
        }
        const weight = index - lowerIndex;
        return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;
}

function average(values: number[]): number {
        if (values.length === 0) {
                return 0;
        }
        const total = values.reduce((sum, value) => sum + value, 0);
        return total / values.length;
}

function computeMetricStatistic(
        samples: MetricSample[],
        statistic: MetricRetrievalInput['statistic'],
): number {
        if (samples.length === 0) {
                return 0;
        }
        const values = samples.map((sample) => sample.value);
        switch (statistic) {
                case 'latest': {
                        const sorted = [...samples].sort((a, b) => {
                                const aTime = parseTimestamp(a.timestamp);
                                const bTime = parseTimestamp(b.timestamp);
                                const safeATime = Number.isNaN(aTime) ? 0 : aTime;
                                const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
                                return safeBTime - safeATime;
                        });
                        return sorted[0]?.value ?? 0;
                }
                case 'sum':
                        return values.reduce((sum, value) => sum + value, 0);
                case 'avg':
                        return average(values);
                case 'min':
                        return Math.min(...values);
                case 'max':
                        return Math.max(...values);
                case 'count':
                        return values.length;
                case 'p50':
                        return calculatePercentile(values, 0.5);
                case 'p95':
                        return calculatePercentile(values, 0.95);
                case 'p99':
                        return calculatePercentile(values, 0.99);
                default:
                        return 0;
        }
}

function matchesDashboardTag(dashboard: DashboardDefinition, tag?: string): boolean {
        if (!tag) return true;
        if (!dashboard.tags) return false;
        const normalized = tag.trim().toLowerCase();
        if (normalized.includes(':')) {
                const [rawKey, rawValue] = normalized.split(':', 2);
                const key = rawKey.trim();
                const value = rawValue?.trim();
                if (!key || !value) return false;
                const actual = dashboard.tags[key];
                return actual !== undefined && actual.toLowerCase() === value;
        }
        return Object.values(dashboard.tags).some(
                (value) => value.toLowerCase() === normalized,
        );
}

function createResponse(tool: string, payload: unknown, isError = false): ObservabilityToolResponse {
        return {
                content: [
                        {
                                type: 'text',
                                text: JSON.stringify(
                                        {
                                                tool,
                                                generatedAt: new Date().toISOString(),
                                                ...payload,
                                        },
                                        null,
                                        2,
                                ),
                        },
                ],
                isError,
        };
}

async function handleTraceQuery(params: unknown): Promise<ObservabilityToolResponse> {
        const input = TraceQueryInputSchema.parse(params);
        const dataSource = getDataSource();
        const traces = dataSource.getTraces();

        const filtered = traces.filter((trace) => {
                if (input.traceId && trace.traceId !== input.traceId) return false;
                if (input.runId && trace.runId !== input.runId) return false;
                if (input.service && trace.service !== input.service) return false;
                if (input.operation && trace.operation !== input.operation) return false;
                if (input.status !== 'any' && trace.status !== input.status) return false;
                if (input.minDurationMs !== undefined && trace.durationMs < input.minDurationMs)
                        return false;
                if (input.maxDurationMs !== undefined && trace.durationMs > input.maxDurationMs)
                        return false;
                if (!isWithinTimeRange(trace.startTime, input.timeRange)) return false;
                if (!matchesTagFilter(trace.tags, input.tags)) return false;
                return true;
        });

        const sorted = [...filtered].sort((a, b) => {
                if (input.sortBy === 'duration') {
                        const diff = a.durationMs - b.durationMs;
                        return input.order === 'asc' ? diff : -diff;
                }
                const aTime = parseTimestamp(a.startTime);
                const bTime = parseTimestamp(b.startTime);
                const safeATime = Number.isNaN(aTime) ? 0 : aTime;
                const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
                const diff = safeATime - safeBTime;
                return input.order === 'asc' ? diff : -diff;
        });

        const limited = sorted.slice(0, input.limit);
        const durations = filtered.map((trace) => trace.durationMs);
        const errorCount = filtered.filter((trace) => trace.status === 'error').length;
        const summary = {
                averageDurationMs: Number(average(durations).toFixed(3)),
                errorRate:
                        filtered.length === 0
                                ? 0
                                : Number(((errorCount / filtered.length) || 0).toFixed(4)),
                p95DurationMs: Number(calculatePercentile(durations, 0.95).toFixed(3)),
                p99DurationMs: Number(calculatePercentile(durations, 0.99).toFixed(3)),
        };

        const payload = {
                filters: input,
                matches: { total: filtered.length, returned: limited.length },
                summary,
                traces: limited,
        };

        return createResponse('observability_query_traces', payload);
}

async function handleLogSearch(params: unknown): Promise<ObservabilityToolResponse> {
        const input = LogSearchInputSchema.parse(params);
        const dataSource = getDataSource();
        const logs = dataSource.getLogs();

        const filtered = logs.filter((log) => {
                if (input.level && log.level !== input.level) return false;
                if (input.component && log.component !== input.component) return false;
                if (input.runId && log.runId !== input.runId) return false;
                if (input.traceId && log.traceId !== input.traceId) return false;
                if (!isWithinTimeRange(log.timestamp, input.timeRange)) return false;
                if (!logContainsText(log, input.text)) return false;
                return true;
        });

        const counts = filtered.reduce(
                (acc, log) => {
                        acc.byLevel[log.level] = (acc.byLevel[log.level] ?? 0) + 1;
                        acc.byComponent[log.component] =
                                (acc.byComponent[log.component] ?? 0) + 1;
                        return acc;
                },
                { byLevel: {} as Record<string, number>, byComponent: {} as Record<string, number> },
        );

        const sorted = [...filtered].sort((a, b) => {
                const aTime = parseTimestamp(a.timestamp);
                const bTime = parseTimestamp(b.timestamp);
                const safeATime = Number.isNaN(aTime) ? 0 : aTime;
                const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
                return safeBTime - safeATime;
        });

        const limited = sorted.slice(0, input.limit).map((log) => ({
                ...log,
                context: input.includeContext ? log.context : undefined,
        }));

        const payload = {
                filters: input,
                matches: { total: filtered.length, returned: limited.length },
                counts,
                logs: limited,
        };

        return createResponse('observability_search_logs', payload);
}

async function handleMetricRetrieval(params: unknown): Promise<ObservabilityToolResponse> {
        const input = MetricRetrievalInputSchema.parse(params);
        const dataSource = getDataSource();
        const metrics = dataSource.getMetrics();

        const filtered = metrics.filter((sample) => {
                if (sample.name !== input.name) return false;
                if (!matchesTagFilter(sample.tags, input.tags)) return false;
                if (!isWithinTimeRange(sample.timestamp, input.timeRange)) return false;
                return true;
        });

        const groupKeys = input.groupBy ?? [];
        const grouped = new Map<
                string,
                { group: Record<string, string>; samples: MetricSample[] }
        >();

        if (groupKeys.length === 0) {
                grouped.set('__all__', { group: {}, samples: filtered });
        } else {
                for (const sample of filtered) {
                        const groupDescriptor: Record<string, string> = {};
                        for (const key of groupKeys) {
                                groupDescriptor[key] = sample.tags?.[key] ?? 'unknown';
                        }
                        const identifier = groupKeys.map((key) => groupDescriptor[key]).join('|');
                        const bucket = grouped.get(identifier);
                        if (bucket) {
                                bucket.samples.push(sample);
                        } else {
                                grouped.set(identifier, {
                                        group: groupDescriptor,
                                        samples: [sample],
                                });
                        }
                }
        }

        const series = Array.from(grouped.entries())
                .map(([key, bucket]) => ({
                        key,
                        group: bucket.group,
                        value: Number(
                                computeMetricStatistic(bucket.samples, input.statistic).toFixed(3),
                        ),
                        sampleCount: bucket.samples.length,
                }))
                .sort((a, b) => a.key.localeCompare(b.key))
                .map(({ key, ...entry }) => entry);

        const sortedSamples = [...filtered].sort((a, b) => {
                const aTime = parseTimestamp(a.timestamp);
                const bTime = parseTimestamp(b.timestamp);
                const safeATime = Number.isNaN(aTime) ? 0 : aTime;
                const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
                return safeBTime - safeATime;
        });

        const payload = {
                filters: input,
                summary: {
                        statistic: input.statistic,
                        value: Number(
                                computeMetricStatistic(filtered, input.statistic).toFixed(3),
                        ),
                        sampleCount: filtered.length,
                },
                series,
                samples: input.includeSamples
                        ? sortedSamples.slice(0, input.limit)
                        : [],
        };

        return createResponse('observability_retrieve_metrics', payload);
}

async function handleAlertQuery(params: unknown): Promise<ObservabilityToolResponse> {
        const input = AlertQueryInputSchema.parse(params);
        const dataSource = getDataSource();
        const alerts = dataSource.getAlerts();

        const filtered = alerts.filter((alert) => {
                if (input.severity && alert.severity !== input.severity) return false;
                if (input.status && alert.status !== input.status) return false;
                if (
                        input.rule &&
                        !alert.rule.toLowerCase().includes(input.rule.toLowerCase())
                )
                        return false;
                if (input.runId && alert.runId !== input.runId) return false;
                if (!matchesTagFilter(alert.tags, input.tags)) return false;
                if (!isWithinTimeRange(alert.triggeredAt, input.timeRange)) return false;
                return true;
        });

        const severityCounts = filtered.reduce((acc, alert) => {
                acc[alert.severity] = (acc[alert.severity] ?? 0) + 1;
                return acc;
        }, {} as Record<string, number>);

        const statusCounts = filtered.reduce((acc, alert) => {
                acc[alert.status] = (acc[alert.status] ?? 0) + 1;
                return acc;
        }, {} as Record<string, number>);

        const sorted = [...filtered].sort((a, b) => {
                const aTime = parseTimestamp(a.triggeredAt);
                const bTime = parseTimestamp(b.triggeredAt);
                const safeATime = Number.isNaN(aTime) ? 0 : aTime;
                const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
                return safeBTime - safeATime;
        });

        const limited = sorted.slice(0, input.limit);

        const payload = {
                filters: input,
                matches: { total: filtered.length, returned: limited.length },
                counts: {
                        total: filtered.length,
                        bySeverity: severityCounts,
                        byStatus: statusCounts,
                },
                alerts: limited,
        };

        return createResponse('observability_alerts', payload);
}

async function handleDashboardRequest(params: unknown): Promise<ObservabilityToolResponse> {
        const input = DashboardRequestInputSchema.parse(params);
        const dataSource = getDataSource();
        const dashboards = dataSource.getDashboards();

        let dashboard = input.dashboardId
                ? dashboards.find((entry) => entry.dashboardId === input.dashboardId)
                : undefined;

        if (!dashboard && input.tag) {
                dashboard = dashboards.find((entry) => matchesDashboardTag(entry, input.tag));
        }

        const dashboardSummary = dashboard
                ? {
                          dashboardId: dashboard.dashboardId,
                          title: dashboard.title,
                          description: dashboard.description,
                          tags: dashboard.tags ?? {},
                          lastUpdated: dashboard.lastUpdated,
                          widgetCount: dashboard.widgets.length,
                  }
                : null;

        const widgets = dashboard && input.includeWidgets
                ? dashboard.widgets.map((widget) => ({ ...widget }))
                : [];

        const payload = {
                filters: input,
                dashboard: dashboardSummary,
                widgets,
        };

        return createResponse('observability_dashboard', payload, !dashboard);
}

/**
 * Discriminated union describing every observability MCP operation.
 */
export const ObservabilityOperationSchema = z.discriminatedUnion('tool', [
        z.object({ tool: z.literal('observability_query_traces'), params: TraceQueryInputSchema }),
        z.object({ tool: z.literal('observability_search_logs'), params: LogSearchInputSchema }),
        z.object({ tool: z.literal('observability_retrieve_metrics'), params: MetricRetrievalInputSchema }),
        z.object({ tool: z.literal('observability_alerts'), params: AlertQueryInputSchema }),
        z.object({ tool: z.literal('observability_dashboard'), params: DashboardRequestInputSchema }),
]);

/**
 * Tool contract exposing trace search capabilities.
 */
const traceQueryTool: ObservabilityTool = {
        name: 'observability_query_traces',
        description:
                'Query distributed traces filtered by service, operation, status, duration, and time range.',
        inputSchema: TraceQueryInputSchema,
        handler: (params: unknown) => handleTraceQuery(params),
};

/**
 * Tool contract exposing structured log search capabilities.
 */
const logSearchTool: ObservabilityTool = {
        name: 'observability_search_logs',
        description: 'Search structured logs with text, component, and severity filters.',
        inputSchema: LogSearchInputSchema,
        handler: (params: unknown) => handleLogSearch(params),
};

/**
 * Tool contract providing access to metric aggregations.
 */
const metricRetrievalTool: ObservabilityTool = {
        name: 'observability_retrieve_metrics',
        description: 'Retrieve metrics aggregates with optional grouping and raw samples.',
        inputSchema: MetricRetrievalInputSchema,
        handler: (params: unknown) => handleMetricRetrieval(params),
};

/**
 * Tool contract summarizing alert activity.
 */
const alertTool: ObservabilityTool = {
        name: 'observability_alerts',
        description: 'List alert activity and summarize severity and status.',
        inputSchema: AlertQueryInputSchema,
        handler: (params: unknown) => handleAlertQuery(params),
};

/**
 * Tool contract surfacing dashboard metadata for UI orchestration.
 */
const dashboardTool: ObservabilityTool = {
        name: 'observability_dashboard',
        description: 'Retrieve observability dashboard metadata and widget inventory.',
        inputSchema: DashboardRequestInputSchema,
        handler: (params: unknown) => handleDashboardRequest(params),
};

export const observabilityMcpTools: ObservabilityTool[] = [
        traceQueryTool,
        logSearchTool,
        metricRetrievalTool,
        alertTool,
        dashboardTool,
];
