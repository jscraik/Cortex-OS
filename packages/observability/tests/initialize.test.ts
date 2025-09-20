import { beforeEach, describe, expect, it, vi } from 'vitest';

type SDKLike = { config: Record<string, unknown> };
const { sdkInstances } = vi.hoisted(() => ({ sdkInstances: [] as SDKLike[] }));

vi.mock('@opentelemetry/sdk-node', () => ({
	NodeSDK: class NodeSDK {
		config: Record<string, unknown>;
		constructor(config: Record<string, unknown>) {
			this.config = config;
			sdkInstances.push(this);
		}
		start() { /* noop for test */ }
		shutdown() { /* noop for test */ }
	},
}));
vi.mock('@opentelemetry/auto-instrumentations-node', () => ({
	getNodeAutoInstrumentations: () => [],
}));
vi.mock('@opentelemetry/resources', () => ({
	Resource: class Resource {
		constructor(public attrs: Record<string, unknown>) { }
	},
	resourceFromAttributes: (attributes: Record<string, unknown>) => ({
		attributes,
	}),
}));
vi.mock('@opentelemetry/semantic-conventions', () => ({
	ATTR_SERVICE_NAME: 'service.name',
	ATTR_SERVICE_VERSION: 'service.version',
}));
vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
	OTLPTraceExporter: class OTLPTraceExporter { constructor(..._args: unknown[]) { } },
}));
vi.mock('@opentelemetry/exporter-jaeger', () => ({
	JaegerExporter: class JaegerExporter { constructor(..._args: unknown[]) { } },
}));
vi.mock('@opentelemetry/sdk-trace-base', () => ({
	ConsoleSpanExporter: class ConsoleSpanExporter { constructor(..._args: unknown[]) { } },
}));
vi.mock('@opentelemetry/sdk-metrics', () => ({
	ConsoleMetricExporter: class ConsoleMetricExporter { constructor(..._args: unknown[]) { } },
	PeriodicExportingMetricReader: class PeriodicExportingMetricReader {
		exporter: unknown;
		constructor(opts: { exporter: unknown }) {
			this.exporter = opts.exporter;
		}
	},
}));
vi.mock('@opentelemetry/exporter-metrics-otlp-http', () => ({
	OTLPMetricExporter: class OTLPMetricExporter { constructor(..._args: unknown[]) { } },
}));

import { initializeObservability } from '../src/tracing/index.js';

const { ConsoleSpanExporter } = await import('@opentelemetry/sdk-trace-base');
const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
const { ConsoleMetricExporter } = await import('@opentelemetry/sdk-metrics');
const { OTLPMetricExporter } = await import('@opentelemetry/exporter-metrics-otlp-http');

describe('initializeObservability', () => {
	beforeEach(() => {
		sdkInstances.length = 0;
		process.env.TRACE_EXPORTER = '';
		process.env.METRIC_EXPORTER = '';
	});

	it('defaults to OTLP exporters', () => {
		initializeObservability('svc');
		const config = sdkInstances[0].config as { metricReader: { exporter: unknown }; traceExporter: unknown };
		expect(config.traceExporter).toBeInstanceOf(OTLPTraceExporter);
		expect(config.metricReader.exporter).toBeInstanceOf(OTLPMetricExporter);
	});

	it('uses console exporters when env vars set', () => {
		process.env.TRACE_EXPORTER = 'console';
		process.env.METRIC_EXPORTER = 'console';
		initializeObservability('svc');
		const config = sdkInstances[0].config as { metricReader: { exporter: unknown }; traceExporter: unknown };
		expect(config.traceExporter).toBeInstanceOf(ConsoleSpanExporter);
		expect(config.metricReader.exporter).toBeInstanceOf(ConsoleMetricExporter);
	});
});
