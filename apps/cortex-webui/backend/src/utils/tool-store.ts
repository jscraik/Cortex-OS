export type ToolEvent = {
  id: string;
  name: string;
  args?: Record<string, unknown>;
  status?: 'start' | 'complete' | 'error';
  createdAt: string;
};

// Declare the global property
declare global {
  var __cortexToolStore: Map<string, ToolEvent[]> | undefined;
}

const toolStore: Map<string, ToolEvent[]> = globalThis.__cortexToolStore || new Map();
globalThis.__cortexToolStore = toolStore;

export function getToolEvents(sessionId: string): ToolEvent[] {
  return toolStore.get(sessionId) || [];
}

export function addToolEvent(
  sessionId: string,
  event: Omit<ToolEvent, 'createdAt' | 'id'> & { id?: string },
) {
  const list = toolStore.get(sessionId) || [];
  const createdAt = new Date().toISOString();
  const id = event.id || (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
  const redactedArgs = event.args ? redactArgs(event.args) : undefined;
  const e: ToolEvent = {
    id,
    name: event.name,
    args: redactedArgs,
    status: event.status,
    createdAt,
  };
  list.push(e);
  toolStore.set(sessionId, list);
  return e;
}

// Basic redaction: mask values with sensitive-looking keys and common secret patterns
export function redactArgs<T extends Record<string, unknown>>(args: T): T {
  const SENSITIVE_KEYS = ['key', 'token', 'secret', 'password', 'authorization', 'apikey'];
  const EMAIL_REGEX = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
  const BEARER_REGEX = /bearer\s+[a-z0-9-_.]+/i;

  const isSensitiveKey = (k: string) => SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s));
  const sanitizeString = (s: string) => {
    let out = s;
    if (EMAIL_REGEX.test(out)) out = out.replace(EMAIL_REGEX, '[EMAIL]');
    if (BEARER_REGEX.test(out)) out = out.replace(BEARER_REGEX, 'Bearer [REDACTED]');
    return out;
  };
  const sanitize = (val: unknown, visited: WeakSet<Record<string, unknown>>): unknown => {
    if (typeof val === 'string') return sanitizeString(val);
    if (Array.isArray(val)) return val.map((item) => sanitize(item, visited));
    if (val && typeof val === 'object') {
      if (visited.has(val as Record<string, unknown>)) {
        return '[Circular]';
      }
      visited.add(val as Record<string, unknown>);
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        if (isSensitiveKey(k)) out[k] = '[REDACTED]';
        else out[k] = sanitize(v, visited);
      }
      return out as unknown as T;
    }
    return val;
  };

  return sanitize(args, new WeakSet()) as T;
}
