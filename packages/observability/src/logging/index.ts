/**
 * @fileoverview Structured logging with redaction and ULID linking
 */

import pino from 'pino';
import type { LogEntry, LogLevel, TraceContext, ULID } from '../types.js';

// Sensitive fields to redact
const REDACTED_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'authorization',
  'cookie',
  'session',
];

/**
 * Create logger with redaction
 */
export function createLogger(component: string, level: LogLevel = 'info') {
  return pino({
    level,
    redact: {
      paths: REDACTED_FIELDS,
      censor: '[REDACTED]',
    },
    formatters: {
      log(object) {
        return {
          component,
          ...object,
        };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

/**
 * Log with ULID and trace context
 */
export function logWithContext(
  logger: pino.Logger,
  level: LogLevel,
  message: string,
  runId: ULID,
  traceContext?: TraceContext,
  extra?: Record<string, unknown>
): void {
  logger[level]({
    runId,
    traceContext,
    ...extra,
  }, message);
}

/**
 * Create structured log entry
 */
export function createLogEntry(
  component: string,
  level: LogLevel,
  message: string,
  runId: ULID,
  traceContext?: TraceContext,
  extra?: Record<string, unknown>
): LogEntry {
  return {
    runId,
    level,
    message,
    timestamp: new Date().toISOString(),
    component,
    traceContext,
    extra: extra ? redactSensitiveData(extra) : undefined,
  };
}

/**
 * Redact sensitive data from object
 */
function redactSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
  const result = { ...obj };
  
  for (const key of Object.keys(result)) {
    const lowerKey = key.toLowerCase();
    if (REDACTED_FIELDS.some(field => lowerKey.includes(field))) {
      result[key] = '[REDACTED]';
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = redactSensitiveData(result[key] as Record<string, unknown>);
    }
  }
  
  return result;
}

/**
 * Log evidence pointer
 */
export function logEvidence(
  logger: pino.Logger,
  runId: ULID,
  evidenceType: string,
  evidencePointer: {
    url?: string;
    line?: number;
    file?: string;
    hash?: string;
  }
): void {
  logger.info({
    runId,
    evidenceType,
    evidence: evidencePointer,
  }, `Evidence attached: ${evidenceType}`);
}