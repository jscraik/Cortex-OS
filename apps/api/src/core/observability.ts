import { randomUUID } from 'node:crypto';

import type { AuditEntry } from './types.js';

export interface LogEntry {
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly message: string;
  readonly timestamp: number;
  readonly details?: Record<string, unknown>;
}

export class StructuredLogger {
  private readonly entries: LogEntry[] = [];

  get history(): readonly LogEntry[] {
    return this.entries;
  }

  debug(message: string, details?: Record<string, unknown>): void {
    this.write('debug', message, details);
  }

  info(message: string, details?: Record<string, unknown>): void {
    this.write('info', message, details);
  }

  warn(message: string, details?: Record<string, unknown>): void {
    this.write('warn', message, details);
  }

  error(message: string, details?: Record<string, unknown>): void {
    this.write('error', message, details);
  }

  private write(level: LogEntry['level'], message: string, details?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      details,
      timestamp: Date.now(),
    };
    this.entries.push(entry);
    // mirror to console for visibility in tests if needed
    if (level === 'error') {
      console.error(message, details ?? {});
    } else if (level === 'warn') {
      console.warn(message, details ?? {});
    }
  }
}

export class MetricsCollector {
  private readonly counters = new Map<string, number>();

  increment(name: string, value = 1): void {
    const current = this.counters.get(name) ?? 0;
    this.counters.set(name, current + value);
  }

  get(name: string): number {
    return this.counters.get(name) ?? 0;
  }
}

export class AuditLogger {
  private readonly entries: AuditEntry[] = [];

  record(entry: Omit<AuditEntry, 'id' | 'timestamp'> & { readonly timestamp?: number }): AuditEntry {
    const normalized: AuditEntry = {
      id: randomUUID(),
      timestamp: entry.timestamp ?? Date.now(),
      routeId: entry.routeId,
      statusCode: entry.statusCode,
      latencyMs: entry.latencyMs,
      requestId: entry.requestId,
      correlationId: entry.correlationId,
      metadata: entry.metadata,
    };
    this.entries.push(normalized);
    return normalized;
  }

  list(): readonly AuditEntry[] {
    return this.entries;
  }
}

export class PerformanceMonitor {
  measure<T>(name: string, fn: () => T): { result: T; durationMs: number } {
    const start = performance.now();
    const result = fn();
    return { result, durationMs: performance.now() - start };
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
    const start = performance.now();
    const result = await fn();
    return { result, durationMs: performance.now() - start };
  }
}
