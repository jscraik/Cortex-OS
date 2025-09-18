/*
 * Node-compatible EventSource wrapper with headers and retry support.
 * Uses 'eventsource' package under the hood.
 */
import ES from 'eventsource';

export interface NodeEventSourceInit {
  headers?: Record<string, string>;
  withCredentials?: boolean;
  // Reconnect delay in ms
  retry?: number;
}

export type MessageEvent = {
  data: string;
};

export type EventHandler = (event: MessageEvent) => void;
export type ErrorHandler = (error: unknown) => void;

export class NodeEventSource {
  private es: ES;
  public onmessage: EventHandler | null = null;
  public onerror: ErrorHandler | null = null;

  constructor(url: string, init?: NodeEventSourceInit) {
    const opts: ES.EventSourceInitDict = {
      headers: init?.headers,
      withCredentials: init?.withCredentials ?? false,
      // eventsource package supports 'rejectUnauthorized' etc; leave defaults
    };
    this.es = new ES(url, opts);

    this.es.onmessage = (e: ES.MessageEvent) => {
      this.onmessage?.({ data: e.data as string });
    };

    this.es.onerror = (err: unknown) => {
      this.onerror?.(err);
    };
  }

  close() {
    this.es.close();
  }
}
