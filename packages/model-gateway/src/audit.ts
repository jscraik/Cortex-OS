import { promises as fs } from 'fs';
import { createHash } from 'crypto';

export type AuditEvent = {
  service: string;
  operation: string;
  context: Record<string, unknown>;
  data: unknown;
  timestamp: string;
};

export type AuditRecord = AuditEvent & {
  prevHash: string;
  hash: string;
};

function computeRecord(event: AuditEvent, prevHash: string): AuditRecord {
  const base = { ...event, prevHash };
  const hash = createHash('sha256').update(JSON.stringify(base)).digest('hex');
  return { ...base, hash };
}

let lastMemoryHash = '0';

async function getLastHash(path: string): Promise<string> {
  try {
    const data = await fs.readFile(path, 'utf8');
    const lines = data.trim().split('\n');
    if (lines.length === 0) return '0';
    const last = JSON.parse(lines[lines.length - 1]) as AuditRecord;
    return last.hash;
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') return '0';
    throw error;
  }
}

export function auditEvent(
  service: string,
  operation: string,
  context: Record<string, unknown>,
  data: unknown,
): AuditEvent {
  return {
    service,
    operation,
    context,
    data,
    timestamp: new Date().toISOString(),
  };
}

export async function record(event: AuditEvent): Promise<void> {
  const logPath = process.env.CORTEX_AUDIT_LOG;
  const prevHash = logPath ? await getLastHash(logPath) : lastMemoryHash;
  const recordObj = computeRecord(event, prevHash);
  const line = JSON.stringify(recordObj) + '\n';
  if (logPath) {
    await fs.appendFile(logPath, line, 'utf8');
  } else {
    console.warn('audit', line.trim());
    lastMemoryHash = recordObj.hash;
  }
}
