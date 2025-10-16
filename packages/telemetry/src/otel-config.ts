import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { trace } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

const resource = resourceFromAttributes({
  [SemanticResourceAttributes.SERVICE_NAME]: "cortex-router",
  [SemanticResourceAttributes.SERVICE_VERSION]: "0.1.0",
});

const prom = new PrometheusExporter({ port: 9464 });

export const meterProvider = new MeterProvider({
  resource,
});

meterProvider.addMetricReader(prom);
void prom.startServer().catch((error) => {
  diag.error("brAInwav: Failed to start Prometheus exporter", error);
});

const tracerProvider = new NodeTracerProvider({
  resource,
  spanProcessors: [
    new SimpleSpanProcessor(
      new OTLPTraceExporter({ url: process.env.OTLP_HTTP || "http://localhost:4318/v1/traces" })
    ),
  ],
});
tracerProvider.register();

export const tracer = trace.getTracer("cortex-router");
export const meter = meterProvider.getMeter("cortex-router");
