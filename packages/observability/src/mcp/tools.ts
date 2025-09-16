
import { randomUUID } from 'node:crypto';

import { z, ZodError, type ZodIssue, type ZodTypeAny } from 'zod';

import { createLogger } from '../logging/index.js';

const logger = createLogger('observability-mcp-tools', 'debug');

export type ObservabilityErrorCode = 'validation_error' | 'security_error' | 'internal_error';

export class ObservabilityToolError extends Error {
        constructor(
                public code: ObservabilityErrorCode,
                message: string,
                public details: string[] = [],
        ) {
                super(message);
                this.name = 'ObservabilityToolError';
        }
}

interface ObservabilityToolResponseContent {
        type: 'text';
        text: string;
}

export interface ObservabilityToolResponse {
        content: ObservabilityToolResponseContent[];
        metadata: {
                tool: ObservabilityToolName;
                correlationId: string;
                timestamp: string;
        };
        isError?: boolean;
}

const TRACE_ID_PATTERN = /^(?:[0-9a-f]{16}|[0-9a-f]{32})$/i;
const METRIC_NAME_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;
const MAX_OPERATION_NAME_LENGTH = 128;
const MAX_TAGS = 32;
const MAX_TAG_KEY_LENGTH = 64;
const MAX_TAG_VALUE_LENGTH = 256;
const UNSAFE_TAG_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function createCorrelationId(): string {
        return randomUUID();
}

function mapZodIssues(issues: ZodIssue[]): string[] {
        return issues.map((issue) => `${issue.path.join('.') || issue.code}: ${issue.message}`);
}

function normalizeError(error: unknown): ObservabilityToolError {
        if (error instanceof ObservabilityToolError) {
                return error;
        }

        if (error instanceof ZodError) {
                return new ObservabilityToolError(
                        'validation_error',
                        'Invalid input payload',
                        mapZodIssues(error.issues),
                );
        }

        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        return new ObservabilityToolError('internal_error', message);
}

function ensurePlainObject(value: unknown, context: string): asserts value is Record<string, unknown> {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                throw new ObservabilityToolError(
                        'validation_error',
                        `${context} must be an object`,
                        [`${context} must be an object`],
                );
        }

        const proto = Reflect.getPrototypeOf(value);
        if (proto !== Object.prototype) {
                throw new ObservabilityToolError(
                        'security_error',
                        `${context} has an unsafe prototype`,
                        [`${context} must be a plain object`],
                );
        }
}

function sanitizeTags(
        tags: Record<string, string> | undefined,
        context: string,
): Record<string, string> | undefined {
        if (!tags) {
                return undefined;
        }

        const proto = Reflect.getPrototypeOf(tags);
        if (proto !== Object.prototype) {
                throw new ObservabilityToolError(
                        'security_error',
                        `${context} has an unsafe prototype`,
                        [`${context} must be a plain object`],
                );
        }

        const entries = Object.entries(tags);
        if (entries.length > MAX_TAGS) {
                throw new ObservabilityToolError(
                        'validation_error',
                        `${context} cannot contain more than ${MAX_TAGS} entries`,
                        [`${context} contains ${entries.length} entries`],
                );
        }

        const sanitized = Object.create(null) as Record<string, string>;

        for (const [rawKey, rawValue] of entries) {
                const key = rawKey.trim();
                if (!key) {
                        throw new ObservabilityToolError(
                                'validation_error',
                                `${context} keys cannot be empty`,
                                [`${context} keys cannot be empty`],
                        );
                }
                if (key.length > MAX_TAG_KEY_LENGTH) {
                        throw new ObservabilityToolError(
                                'validation_error',
                                `${context} key "${key}" exceeds ${MAX_TAG_KEY_LENGTH} characters`,
                                [`${context} key "${key}" exceeds ${MAX_TAG_KEY_LENGTH} characters`],
                        );
                }
                if (UNSAFE_TAG_KEYS.has(key) || key.startsWith('__')) {
                        throw new ObservabilityToolError(
                                'security_error',
                                `Unsafe ${context} key "${key}" detected`,
                                [`${context} key "${key}" is not allowed`],
                        );
                }

                const value = rawValue.trim();
                if (!value) {
                        throw new ObservabilityToolError(
                                'validation_error',
                                `${context} value for "${key}" cannot be empty`,
                                [`${context} value for "${key}" cannot be empty`],
                        );
                }
                if (value.length > MAX_TAG_VALUE_LENGTH) {
                                throw new ObservabilityToolError(
                                        'validation_error',
                                        `${context} value for "${key}" exceeds ${MAX_TAG_VALUE_LENGTH} characters`,
                                        [
                                                `${context} value for "${key}" exceeds ${MAX_TAG_VALUE_LENGTH} characters`,
                                        ],
                                );
                }

                sanitized[key] = value;
        }

        return sanitized;
}

function sanitizeTimestamp(value: string | undefined, field: string): string | undefined {
        if (value === undefined) {
                return undefined;
        }
        const trimmed = value.trim();
        if (!trimmed) {
                throw new ObservabilityToolError(
                        'validation_error',
                        `${field} cannot be empty`,
                        [`${field} cannot be empty`],
                );
        }
        const timestamp = Date.parse(trimmed);
        if (Number.isNaN(timestamp)) {
                throw new ObservabilityToolError(
                        'validation_error',
                        `${field} must be a valid ISO 8601 timestamp`,
                        [`${field} must be a valid ISO 8601 timestamp`],
                );
        }
        return new Date(timestamp).toISOString();
}

function ensureChronologicalOrder(
        start: string | undefined,
        end: string | undefined,
): void {
        if (!start || !end) {
                return;
        }
        const startTime = Date.parse(start);
        const endTime = Date.parse(end);
        if (startTime > endTime) {
                throw new ObservabilityToolError(
                        'validation_error',
                        'startTime must be before endTime',
                        [`startTime ${start} occurs after endTime ${end}`],
                );
        }
}

const isoTimestampSchema = z
        .string()
        .trim()
        .min(1, 'Timestamp is required')
        .superRefine((value, ctx) => {
                if (Number.isNaN(Date.parse(value))) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Invalid ISO 8601 timestamp',
                        });
                }
        });

const TagsSchema = z.record(z.string()).optional();

const CreateTraceInputSchema = z
        .object({
                traceId: z
                        .string()
                        .trim()
                        .regex(TRACE_ID_PATTERN, 'traceId must be a 16 or 32 character hex string'),
                operationName: z
                        .string()
                        .trim()
                        .min(1, 'operationName is required')
                        .max(MAX_OPERATION_NAME_LENGTH, 'operationName is too long'),
                tags: TagsSchema,
                startTime: isoTimestampSchema.optional(),
        })
        .strict();

const RecordMetricInputSchema = z
        .object({
                name: z
                        .string()
                        .trim()
                        .regex(
                                METRIC_NAME_PATTERN,
                                'name must use alphanumeric characters plus ".", "-", ":", or "_"',
                        ),
                value: z
                        .number({ invalid_type_error: 'value must be a number' })
                        .finite('value must be a finite number'),
                tags: TagsSchema,
                timestamp: isoTimestampSchema.optional(),
        })
        .strict();

const QueryTracesInputSchema = z
        .object({
                service: z
                        .string()
                        .trim()
                        .min(1, 'service cannot be empty')
                        .max(MAX_OPERATION_NAME_LENGTH, 'service is too long')
                        .optional(),
                operation: z
                        .string()
                        .trim()
                        .min(1, 'operation cannot be empty')
                        .max(MAX_OPERATION_NAME_LENGTH, 'operation is too long')
                        .optional(),
                startTime: isoTimestampSchema.optional(),
                endTime: isoTimestampSchema.optional(),
                tags: TagsSchema,
        })
        .strict()
        .refine(
                (value) =>
                        Boolean(
                                value.service ??
                                        value.operation ??
                                        value.startTime ??
                                        value.endTime ??
                                        (value.tags && Object.keys(value.tags).length > 0),
                        ),
                {
                        message:
                                'At least one filter (service, operation, time range, or tags) must be provided',
                },
        );

const GetMetricsInputSchema = z
        .object({
                name: z
                        .string()
                        .trim()
                        .regex(
                                METRIC_NAME_PATTERN,
                                'name must use alphanumeric characters plus ".", "-", ":", or "_"',
                        )
                        .optional(),
                startTime: isoTimestampSchema.optional(),
                endTime: isoTimestampSchema.optional(),
                aggregation: z.enum(['sum', 'avg', 'count', 'max', 'min']).optional(),
        })
        .strict()
        .refine(
                (value) => Boolean(value.name ?? value.startTime ?? value.endTime),
                {
                        message: 'Provide a metric name or time range to query metrics',
                },
        );

export type CreateTraceInput = z.infer<typeof CreateTraceInputSchema>;
export type RecordMetricInput = z.infer<typeof RecordMetricInputSchema>;
export type QueryTracesInput = z.infer<typeof QueryTracesInputSchema>;
export type GetMetricsInput = z.infer<typeof GetMetricsInputSchema>;

type ObservabilityToolInputMap = {
        create_trace: CreateTraceInput;
        record_metric: RecordMetricInput;
        query_traces: QueryTracesInput;
        get_metrics: GetMetricsInput;
};

export type ObservabilityToolName = keyof ObservabilityToolInputMap;

export interface ObservabilityTool {
        name: ObservabilityToolName;
        description: string;
        inputSchema: ZodTypeAny;
}

export const observabilityMcpTools: ObservabilityTool[] = [
        {
                name: 'create_trace',
                description: 'Create a new distributed trace',
                inputSchema: CreateTraceInputSchema,
        },
        {
                name: 'record_metric',
                description: 'Record a metric value',
                inputSchema: RecordMetricInputSchema,
        },
        {
                name: 'query_traces',
                description: 'Query traces by service, operation, and time range',
                inputSchema: QueryTracesInputSchema,
        },
        {
                name: 'get_metrics',
                description: 'Retrieve metrics with optional aggregation',
                inputSchema: GetMetricsInputSchema,
        },
];

const toolSchemas: Record<ObservabilityToolName, ZodTypeAny> = {
        create_trace: CreateTraceInputSchema,
        record_metric: RecordMetricInputSchema,
        query_traces: QueryTracesInputSchema,
        get_metrics: GetMetricsInputSchema,
};

export type ObservabilityToolInput<TTool extends ObservabilityToolName> =
        ObservabilityToolInputMap[TTool];

function postProcessInput<TTool extends ObservabilityToolName>(
        tool: TTool,
        parsed: ObservabilityToolInputMap[TTool],
): ObservabilityToolInputMap[TTool] {
        switch (tool) {
                case 'create_trace': {
                        const input = parsed as CreateTraceInput;
                        const tags = sanitizeTags(input.tags, 'tags');
                        const startTime = sanitizeTimestamp(input.startTime, 'startTime');
                        return {
                                traceId: input.traceId.trim(),
                                operationName: input.operationName.trim(),
                                ...(tags ? { tags } : {}),
                                ...(startTime ? { startTime } : {}),
                        } as ObservabilityToolInputMap[TTool];
                }
                case 'record_metric': {
                        const input = parsed as RecordMetricInput;
                        const tags = sanitizeTags(input.tags, 'tags');
                        const timestamp = sanitizeTimestamp(input.timestamp, 'timestamp');
                        return {
                                name: input.name.trim(),
                                value: input.value,
                                ...(tags ? { tags } : {}),
                                ...(timestamp ? { timestamp } : {}),
                        } as ObservabilityToolInputMap[TTool];
                }
                case 'query_traces': {
                        const input = parsed as QueryTracesInput;
                        const tags = sanitizeTags(input.tags, 'tags');
                        const startTime = sanitizeTimestamp(input.startTime, 'startTime');
                        const endTime = sanitizeTimestamp(input.endTime, 'endTime');
                        ensureChronologicalOrder(startTime, endTime);
                        return {
                                ...(input.service ? { service: input.service.trim() } : {}),
                                ...(input.operation ? { operation: input.operation.trim() } : {}),
                                ...(tags ? { tags } : {}),
                                ...(startTime ? { startTime } : {}),
                                ...(endTime ? { endTime } : {}),
                        } as ObservabilityToolInputMap[TTool];
                }
                case 'get_metrics': {
                        const input = parsed as GetMetricsInput;
                        const startTime = sanitizeTimestamp(input.startTime, 'startTime');
                        const endTime = sanitizeTimestamp(input.endTime, 'endTime');
                        ensureChronologicalOrder(startTime, endTime);
                        return {
                                ...(input.name ? { name: input.name.trim() } : {}),
                                ...(startTime ? { startTime } : {}),
                                ...(endTime ? { endTime } : {}),
                                ...(input.aggregation ? { aggregation: input.aggregation } : {}),
                        } as ObservabilityToolInputMap[TTool];
                }
                default:
                        throw new ObservabilityToolError(
                                'internal_error',
                                `Unsupported tool "${tool}"`,
                        );
        }
}

export function validateObservabilityToolInput<TTool extends ObservabilityToolName>(
        tool: TTool,
        params: unknown,
): ObservabilityToolInput<TTool> {
        const schema = toolSchemas[tool];
        if (!schema) {
                const error = new ObservabilityToolError(
                        'internal_error',
                        `Unknown observability tool: ${tool}`,
                );
                logger.error({ tool, error }, `${tool} validation failed`);
                throw error;
        }

        try {
                if (tool === 'create_trace' || tool === 'record_metric' || tool === 'query_traces') {
                        if (typeof params === 'object' && params !== null) {
                                const raw = params as Record<string, unknown>;
                                if ('tags' in raw && raw.tags !== undefined) {
                                        ensurePlainObject(raw.tags, 'tags');
                                }
                        }
                }

                const parsed = schema.parse(params) as ObservabilityToolInputMap[TTool];
                const sanitized = postProcessInput(tool, parsed);
                logger.debug({ tool, payload: sanitized }, 'validated observability tool input');
                return sanitized;
        } catch (error) {
                const normalized = normalizeError(error);
                if (normalized.code === 'internal_error') {
                        logger.error({ tool, error: normalized }, `${tool} validation failed`);
                } else {
                        logger.warn({ tool, error: normalized }, `${tool} validation failed`);
                }
                throw normalized;
        }
}

export function createObservabilityErrorResponse(
        tool: ObservabilityToolName,
        error: unknown,
        correlationId: string = createCorrelationId(),
): ObservabilityToolResponse {
        const normalized = normalizeError(error);
        const timestamp = new Date().toISOString();
        const logPayload = {
                tool,
                correlationId,
                error: {
                        code: normalized.code,
                        message: normalized.message,
                        details: normalized.details,
                },
        };

        if (normalized.code === 'internal_error') {
                logger.error(logPayload, `${tool} failed`);
        } else {
                logger.warn(logPayload, `${tool} validation failed`);
        }

        return {
                content: [
                        {
                                type: 'text',
                                text: JSON.stringify({
                                        success: false,
                                        error: {
                                                code: normalized.code,
                                                message: normalized.message,
                                                details: normalized.details,
                                        },
                                        correlationId,
                                        timestamp,
                                }),
                        },
                ],
                metadata: {
                        tool,
                        correlationId,
                        timestamp,
                },
                isError: true,
        };
}

