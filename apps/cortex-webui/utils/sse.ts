'use client';

/**
 * Minimal SSE helper with optional auth token and auto-retry.
 * Aligns to Open WebUI-style streaming where events: start, token, done, error.
 */
export type SSEHandlers = {
  onOpen?: (ev: Event) => void;
  onMessage?: (data: string, event?: string) => void;
  onError?: (err: any) => void;
};

export type SSERetryOptions = {
  /** ms base delay for backoff */
  baseDelayMs?: number;
  /** max delay cap */
  maxDelayMs?: number;
};

export function openSSE(
  url: string,
  params: Record<string, string | number | boolean | undefined> = {},
  handlers: SSEHandlers = {},
  retry: SSERetryOptions = {},
) {
  const { onOpen, onMessage, onError } = handlers;
  const { baseDelayMs = 500, maxDelayMs = 8000 } = retry;

  let aborted = false;
  let es: EventSource | null = null;
  let attempt = 0;

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : undefined;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  if (token) qs.set('access_token', token);

  function connect() {
    if (aborted) return;
    const endpoint = qs.size ? `${url}?${qs.toString()}` : url;
    es = new EventSource(endpoint);

    es.onopen = (e) => {
      attempt = 0;
      onOpen?.(e);
    };

    es.onmessage = (e) => {
      onMessage?.(e.data, undefined);
    };

    es.onerror = (e) => {
      es?.close();
      if (aborted) return;
      onError?.(e);
      // backoff and reconnect
      attempt += 1;
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      setTimeout(connect, delay);
    };
  }

  connect();

  return () => {
    aborted = true;
    es?.close();
  };
}
