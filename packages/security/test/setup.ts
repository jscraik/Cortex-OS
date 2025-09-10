import '@cortex-os/telemetry';
import { trace } from '@opentelemetry/api';
import {
	InMemorySpanExporter,
	SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';

export const spanExporter = new InMemorySpanExporter();

function attachExporter() {
	// The return type of trace.getTracerProvider() may be a proxy with a getDelegate method,
	// so we use a type assertion to allow access to getDelegate, with a comment explaining why.
	const provider = trace.getTracerProvider() as {
		getDelegate?: () => import('@opentelemetry/api').TracerProvider;
	} & import('@opentelemetry/api').TracerProvider;
	const realProvider = provider.getDelegate ? provider.getDelegate() : provider;
	if (typeof realProvider.addSpanProcessor === 'function') {
		realProvider.addSpanProcessor(new SimpleSpanProcessor(spanExporter));
	} else {
		setTimeout(attachExporter, 10);
	}
}

attachExporter();
