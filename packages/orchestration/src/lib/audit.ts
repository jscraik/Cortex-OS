import { promises as fs } from 'node:fs';
import path from 'node:path';

export function auditEvent(
  tool: string,
  action: string,
  ctx: { runId: string; traceId?: string },
  args: unknown,
) {
  return {
    id: crypto.randomUUID(),
    type: 'com.cortex.tool.invocation',
    time: new Date().toISOString(),
    subject: { tool, action, runId: ctx.runId, traceId: ctx.traceId ?? '' },
    data: { args },
    datacontenttype: 'application/json',
  };
}
let memoryBuffer: any[] | null = null;
let memoryBufferLimit = 1000;
let externalPublisher: ((evt: ReturnType<typeof auditEvent>) => Promise<void> | void) | null = null;

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
  return process.env.CORTEX_AUDIT_LOG || path.join(process.cwd(), 'report', 'audit.log');
}

export async function record(evt: ReturnType<typeof auditEvent>) {
  // append-only log, and attach to OTEL span if present
  try {
    // Lazy import to avoid hard dependency during tests

    const { context, trace } = require('@opentelemetry/api');
    const span = trace.getSpan(context.active());
    span?.addEvent('audit', { type: evt.type, subject: JSON.stringify(evt.subject) });
  } catch {}
  // Append to memory buffer
  if (memoryBuffer) {
    memoryBuffer.push(evt);
    if (memoryBuffer.length > memoryBufferLimit) memoryBuffer.shift();
  }
  // Append to file as JSONL
  try {
    const file = getAuditLogPath();
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.appendFile(file, JSON.stringify(evt) + '\n', 'utf8');
  } catch (e) {
    // Fallback to console if file write fails
    console.warn('Audit file logging failed; falling back to console:', (e as any)?.message);
    console.log('Audit event:', evt);
  }
  // Publish externally if configured (e.g., A2A bus, OTLP bridge)
  try {
    await externalPublisher?.(evt);
  } catch (e) {
    console.warn('Audit external publish failed:', (e as any)?.message);
  }
}
