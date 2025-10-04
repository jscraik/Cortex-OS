/**
 * @fileoverview Structured logging with redaction and ULID linking
 */
import pino from 'pino';
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
export function createLogger(component, level = 'info') {
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
export function logWithContext(logger, level, message, runId, traceContext, extra) {
    logger[level]({
        runId,
        traceContext,
        ...extra,
    }, message);
}
/**
 * Create structured log entry
 */
export function createLogEntry(component, level, message, runId, traceContext, extra) {
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
function redactSensitiveData(obj) {
    const result = { ...obj };
    for (const key of Object.keys(result)) {
        const lowerKey = key.toLowerCase();
        if (REDACTED_FIELDS.some((field) => lowerKey.includes(field))) {
            result[key] = '[REDACTED]';
        }
        else if (typeof result[key] === 'object' && result[key] !== null) {
            result[key] = redactSensitiveData(result[key]);
        }
    }
    return result;
}
/**
 * Log evidence pointer
 */
export function logEvidence(logger, runId, evidenceType, evidencePointer) {
    logger.info({
        runId,
        evidenceType,
        evidence: evidencePointer,
    }, `Evidence attached: ${evidenceType}`);
}
//# sourceMappingURL=index.js.map