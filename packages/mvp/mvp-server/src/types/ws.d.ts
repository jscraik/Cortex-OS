declare module 'ws' {
  export interface WebSocket {
    on(event: string, listener: (...args: unknown[]) => void): this;
    send(data: string | Buffer): void;
    close(code?: number, reason?: string): void;
    emit?(event: string, ...args: unknown[]): boolean;
  }
  export default WebSocket;
}

