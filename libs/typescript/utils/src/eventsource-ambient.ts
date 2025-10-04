// Ambient declaration for 'eventsource' to avoid adding an external @types dependency.
declare module 'eventsource' {
	export interface EventSourceOptions {
		headers?: Record<string, string>;
		fetch?: (input: string | URL, init?: RequestInit) => Promise<Response>;
	}

	export class EventSource {
		constructor(url: string, options?: EventSourceOptions);
		addEventListener(type: string, handler: (ev: Event) => void): void;
		close(): void;
	}

	export default EventSource;
}
