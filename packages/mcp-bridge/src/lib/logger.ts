import { randomUUID } from 'node:crypto';

export interface LogFields {
  correlationId?: string;
  [key: string]: unknown;
}

export interface Logger {
  info: (msg: string, fields?: Record<string, unknown>) => void;
  warn: (msg: string, fields?: Record<string, unknown>) => void;
  error: (msg: string, fields?: Record<string, unknown>) => void;
  child: (fields: LogFields) => Logger;
  correlationId: string;
}

function log(level: string, message: string, fields: LogFields): void {
  const entry = {
    level,
    timestamp: new Date().toISOString(),
    ...fields,
    message,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));
}

export function createLogger(fields: LogFields = {}): Logger {
  const correlationId = fields.correlationId ?? randomUUID();
  const baseFields = { ...fields, correlationId };
  return {
    info: (msg, f = {}) => log('info', msg, { ...baseFields, ...f }),
    warn: (msg, f = {}) => log('warn', msg, { ...baseFields, ...f }),
    error: (msg, f = {}) => log('error', msg, { ...baseFields, ...f }),
    child: (f: LogFields) => createLogger({ ...baseFields, ...f }),
    correlationId,
  };
}
