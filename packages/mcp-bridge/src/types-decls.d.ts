// Minimal local declarations to satisfy TypeScript during workspace builds.
declare module "express" {
	const express: any;
	export default express;
}

declare module "ws" {
	class WebSocket {
		constructor(url: string, protocols?: any);
		on(event: string, cb: (...args: any[]) => void): void;
		send(data: any): void;
		close(): void;
	}
	export default WebSocket;
}
