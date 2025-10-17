import { DiagConsoleLogger, DiagLogLevel, diag, trace } from '@opentelemetry/api';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

const resource = resourceFromAttributes({
	[SemanticResourceAttributes.SERVICE_NAME]: 'cortex-router',
	[SemanticResourceAttributes.SERVICE_VERSION]: '0.1.0',
});

const prom = new PrometheusExporter({ port: 9464 });

export const meterProvider = new MeterProvider({
	resource,
});

meterProvider.addMetricReader(prom);
void prom.startServer().catch((error) => {
	diag.error('brAInwav: Failed to start Prometheus exporter', error);
});

const tracerProvider = new NodeTracerProvider({
	resource,
});
tracerProvider.addSpanProcessor(
	new SimpleSpanProcessor(
		new OTLPTraceExporter({ url: process.env.OTLP_HTTP || 'http://localhost:4318/v1/traces' }),
	),
);
tracerProvider.register();

export const tracer = trace.getTracer('cortex-router');
export const meter = meterProvider.getMeter('cortex-router');
