"use client";

/**
 * Minimal SSE helper that supports auth via token query param.
 * EventSource doesn’t allow custom headers, so pass ?token=… if needed.
 */
export function openSSE(
	url: string,
	opts?: {
		token?: string;
		onMessage?: (data: unknown) => void;
		onError?: (e: unknown) => void;
	},
) {
	let withToken = url;
	if (opts?.token) {
		const sep = url.includes("?") ? "&" : "?";
		const qp = `token=${encodeURIComponent(opts.token)}`;
		withToken = `${url}${sep}${qp}`;
	}
	const es = new EventSource(withToken);
	es.onmessage = (ev) => {
		try {
			const data = JSON.parse(ev.data);
			opts?.onMessage?.(data);
		} catch {
			opts?.onMessage?.(ev.data);
		}
	};
	es.onerror = (e) => {
		opts?.onError?.(e);
	};
	return es;
}
