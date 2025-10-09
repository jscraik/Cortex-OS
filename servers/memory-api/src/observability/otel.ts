import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import type { FastifyInstance } from 'fastify';

export function withOpenTelemetry(server: FastifyInstance) {
	const sdk = new NodeSDK({
		resource: new Resource({
			[SemanticResourceAttributes.SERVICE_NAME]: 'memory-api',
		}),
		spanProcessor: new SimpleSpanProcessor(new OTLPTraceExporter()),
	});

	sdk.start();

	server.addHook('onRequest', (request, _reply, done) => {
		const { tracer } = require('@opentelemetry/api');
		const span = tracer.startSpan(`http.request.${request.method}.${request.url}`);
		request.span = span;
		done();
	});

	server.addHook('onResponse', (request, reply, done) => {
		if (request.span) {
			request.span.setAttributes({
				'http.status_code': reply.statusCode,
			});
			request.span.end();
		}
		done();
	});
}
