import '@cortex-os/telemetry';
import { trace } from '@opentelemetry/api';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

export const spanExporter = new InMemorySpanExporter();

function attachExporter() {
  const provider: any = trace.getTracerProvider();
  const realProvider = provider.getDelegate ? provider.getDelegate() : provider;
  if (typeof realProvider.addSpanProcessor === 'function') {
    realProvider.addSpanProcessor(new SimpleSpanProcessor(spanExporter));
  } else {
    setTimeout(attachExporter, 10);
  }
}

attachExporter();
