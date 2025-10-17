import { EventSource as ES } from 'eventsource';
export class NodeEventSource {
    es;
    onmessage = null;
    onerror = null;
    constructor(url, init) {
        this.es = new ES(url, {
            fetch: (input, options) => {
                const mergedHeaders = {
                    ...(options?.headers ?? {}),
                    ...(init?.headers ?? {}),
                };
                return fetch(typeof input === 'string' ? input : input.toString(), {
                    ...(options ?? {}),
                    headers: mergedHeaders,
                });
            },
        });
        this.es.addEventListener('message', (event) => {
            // event is MessageEvent in browser-like environments; cast safely
            const me = event;
            this.onmessage?.({ data: String(me.data) });
        });
        this.es.addEventListener('error', (err) => {
            const code = err?.code;
            if (code === 401 || code === 403) {
                this.onerror?.(Object.assign(new Error('Unauthorized SSE connection'), { code }));
                return;
            }
            this.onerror?.(err);
        });
    }
    close() {
        this.es.close();
    }
}
