import { EventSource as ES } from 'eventsource';

export interface NodeEventSourceInit {
	headers?: Record<string, string>;
}

export type MessageEventLike = { data: unknown };
export type EventHandler = (event: MessageEventLike) => void;
export type ErrorHandler = (error: unknown) => void;

export class NodeEventSource {
	private readonly es: ES;
	public onmessage: EventHandler | null = null;
	public onerror: ErrorHandler | null = null;

	constructor(url: string, init?: NodeEventSourceInit) {
		this.es = new ES(url, {
			fetch: (input: string | URL, options?: RequestInit) => {
				const mergedHeaders: Record<string, string> = {
					...((options?.headers as Record<string, string> | undefined) ?? {}),
					...(init?.headers ?? {}),
				};
				return fetch(typeof input === 'string' ? input : input.toString(), {
					...(options ?? {}),
					headers: mergedHeaders,
				});
			},
		});

		this.es.addEventListener('message', (event: Event) => {
			// event is MessageEvent in browser-like environments; cast safely
			const me = event as MessageEvent | { data?: unknown };
			this.onmessage?.({ data: String(me.data) });
		});

		this.es.addEventListener('error', (err: unknown) => {
			const code = (err as { code?: number } | undefined)?.code;
			if (code === 401 || code === 403) {
				this.onerror?.(Object.assign(new Error('Unauthorized SSE connection'), { code }));
				return;
			}

			this.onerror?.(err);
		});
	}

	close(): void {
		this.es.close();
	}
}
