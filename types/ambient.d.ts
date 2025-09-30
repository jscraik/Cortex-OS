declare module 'circuit-breaker-js';

declare module '@opentelemetry/sdk-trace-base' {
	export class SimpleSpanProcessor {
		constructor(exporter: unknown);
	}
	export class ConsoleSpanExporter {
		export(span: unknown): void;
		shutdown(): Promise<void>;
	}
}

declare module '@opentelemetry/sdk-trace-node' {
	export class NodeTracerProvider {
		addSpanProcessor(processor: unknown): void;
	}
}

declare module '@opentelemetry/api' {
	export const trace: unknown;
	export const SpanStatusCode: unknown;
}

declare module '@opentelemetry/instrumentation' {
	export function registerInstrumentations(opts: unknown): void;
}
