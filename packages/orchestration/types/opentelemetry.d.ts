declare module '@opentelemetry/resources' {
    export class Resource {
        constructor(attrs?: Record<string, unknown>);
    }
}

declare module '@opentelemetry/semantic-conventions' {
    export const SemanticResourceAttributes: {
        SERVICE_NAME: string;
        SERVICE_VERSION: string;
        SERVICE_INSTANCE_ID: string;
        [key: string]: string;
    };
}

declare module '@opentelemetry/api' {
    export const context: {
        active(): unknown;
    };

    export class DiagConsoleLogger {
        // minimal shim
    }

    export enum DiagLogLevel {
        INFO = 1,
        WARN = 2,
        ERROR = 3,
    }

    export const diag: {
        setLogger: (logger: unknown, level?: DiagLogLevel) => void;
    };

    export type Exception = unknown;
    export type AttributeValue = string | number | boolean | Array<string | number | boolean> | Record<string, unknown> | Date | undefined;
    export type Attributes = Record<string, AttributeValue> | undefined;
    export type TimeInput = number | Date;

    export type SpanOptions = { attributes?: Record<string, AttributeValue> | undefined };

    export enum SpanStatusCode {
        OK = 0,
        ERROR = 1,
    }

    export type Span = {
        setStatus(status: { code: SpanStatusCode; message?: string }): void;
        recordException(exception: Exception): void;
        end(): void;
        setAttribute(key: string, value: AttributeValue): void;
        setAttributes(attrs: Attributes): void;
        addEvent(name: string, attributes?: Attributes): void;
        spanContext(): { traceId: string; spanId: string };
    };

    export type Tracer = {
        startActiveSpan<T>(name: string, fn: (span: Span) => Promise<T> | T): Promise<T>;
        startActiveSpan<T>(name: string, opts: SpanOptions | undefined, fn: (span: Span) => Promise<T> | T): Promise<T>;
        startSpan(name: string, opts?: SpanOptions): Span;
        startSpan(name: string, opts?: SpanOptions, ctx?: unknown): Span;
    };

    export const trace: {
        getTracer(name: string, version?: string): Tracer;
        getActiveSpan(): Span | undefined;
        getSpan(ctx: unknown): Span | undefined;
    };

    // minimal metrics shim
    export type Histogram = {
        record(value: number, attributes?: Attributes): void;
    };
    export type Counter = { add(value: number, attributes?: Attributes): void };
    export type UpDownCounter = { add(value: number, attributes?: Attributes): void };
    export type Gauge = { set(value: number, attributes?: Attributes): void };

    export const metrics: {
        getMeter(name: string): {
            createHistogram(name: string, opts?: { description?: string; unit?: string }): Histogram;
            createCounter(name: string, opts?: { description?: string }): Counter;
            createUpDownCounter(name: string, opts?: { description?: string }): UpDownCounter;
            createGauge(name: string, opts?: { description?: string }): Gauge;
        };
    };
}
