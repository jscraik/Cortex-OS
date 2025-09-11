import { promises as fs } from 'node:fs';
import path from 'node:path';
import { CloudEvent } from '../integrations/cloudevents.js';

export function auditEvent(
	tool: string,
	action: string,
	ctx: { runId: string; traceId?: string },
	args: unknown,
) {
	return new CloudEvent({
		id: crypto.randomUUID(),
		source: `cortex.orchestration/${tool}`,
		type: `com.cortex.${tool}.${action}`,
		subject: ctx.runId,
		time: new Date().toISOString(),
		datacontenttype: 'application/json',
		data: { args, traceId: ctx.traceId ?? '' },
	});
}
let memoryBuffer: unknown[] | null = null;
let memoryBufferLimit = 1000;
let externalPublisher:
	| ((evt: ReturnType<typeof auditEvent>) => Promise<void> | void)
	| null = null;

export function enableMemoryAuditBuffer(limit = 1000) {
	memoryBuffer = [];
	memoryBufferLimit = limit;
}
export function getMemoryAuditBuffer() {
	return memoryBuffer ? [...memoryBuffer] : null;
}

export function setAuditPublisher(
	fn: (evt: ReturnType<typeof auditEvent>) => Promise<void> | void,
) {
	externalPublisher = fn;
}

function getAuditLogPath() {
	return (
		process.env.CORTEX_AUDIT_LOG ||
		path.join(process.cwd(), 'report', 'audit.log')
	);
}

export async function record(evt: ReturnType<typeof auditEvent>) {
	// append-only log, and attach to OTEL span if present
	try {
		// Lazy import to avoid hard dependency during tests
		const { context, trace } = await import('@opentelemetry/api');
		const span = trace.getSpan(context.active());
		span?.addEvent('audit', {
			type: evt.type,
			subject: evt.subject,
		});
	} catch {
		// ignore optional telemetry failures
	}
	// Append to memory buffer
	if (memoryBuffer) {
		memoryBuffer.push(evt);
		if (memoryBuffer.length > memoryBufferLimit) memoryBuffer.shift();
	}
	// Append to file as JSONL
	try {
		const file = getAuditLogPath();
		await fs.mkdir(path.dirname(file), { recursive: true });
		await fs.appendFile(file, `${JSON.stringify(evt)}\n`, 'utf8');
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		console.warn('Audit file logging failed; falling back to console:', msg);
		console.warn('Audit event:', evt);
	}
	// Publish externally if configured (e.g., A2A bus, OTLP bridge)
	try {
		await externalPublisher?.(evt);
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		console.warn('Audit external publish failed:', msg);
	}
}
