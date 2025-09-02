import { afterEach, vi } from "vitest";

// Disable any accidental network egress during tests
process.env.MCP_NETWORK_EGRESS = process.env.MCP_NETWORK_EGRESS || "disabled";
process.env.CORTEX_MCP_ROOT = process.env.CORTEX_MCP_ROOT || process.cwd();
process.env.CORTEX_MCP_TOKEN = process.env.CORTEX_MCP_TOKEN || "test-token";

// Mock ws so no real sockets are opened
vi.mock("ws", () => {
	class MockWebSocket {
		static OPEN = 1;
		readyState = 1;
		messages: any[] = [];
		listeners = new Map<string, ((payload: any) => void)[]>();
		send(data: any) {
			this.messages.push(data);
		}
		on(event: string, handler: (payload: any) => void) {
			const arr = this.listeners.get(event) || [];
			arr.push(handler);
			this.listeners.set(event, arr);
		}
		emit(event: string, payload: any) {
			const arr = this.listeners.get(event) || [];
			for (const fn of arr) fn(payload);
		}
		close() {
			this.readyState = 3; // CLOSED
		}
	}
	return { WebSocket: MockWebSocket };
});

afterEach(() => {
	vi.resetAllMocks();
});
