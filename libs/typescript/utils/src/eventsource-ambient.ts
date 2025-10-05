// Ambient declaration for 'eventsource' to avoid adding an external @types dependency.
declare module 'eventsource' {
	export interface EventSourceOptions {
		headers?: Record<string, string>;
		fetch?: (input: string | URL, init?: RequestInit) => Promise<Response>;
	}

	export default class EventSourcePolyfill extends globalThis.EventSource {
		constructor(url: string | URL, options?: EventSourceOptions);
	}
}
