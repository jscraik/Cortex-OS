declare module "ws" {
	import { EventEmitter } from "node:events";
	export class WebSocket extends EventEmitter {
		constructor(address?: string, protocols?: string | string[]);
		send(data: string | Buffer): void;
		close(code?: number, reason?: string): void;
		on(event: string, listener: (...args: any[]) => void): this;
		readyState?: number;
		static OPEN?: number;
		static CLOSED?: number;
	}
	export default WebSocket;
}
