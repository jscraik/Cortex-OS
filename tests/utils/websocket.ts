export interface MockWebSocketMessage {
        channel: string;
        payload: unknown;
        timestamp: number;
}

export class MockWebSocket {
        messages: MockWebSocketMessage[] = [];

        broadcast(channel: string, payload: unknown): void {
                this.messages.push({
                        channel,
                        payload,
                        timestamp: Date.now(),
                });
        }

        reset(): void {
                this.messages = [];
        }
}

export function createMockWebSocket(): MockWebSocket {
        return new MockWebSocket();
}
