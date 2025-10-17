export interface NodeEventSourceInit {
    headers?: Record<string, string>;
}
export type MessageEventLike = {
    data: unknown;
};
export type EventHandler = (event: MessageEventLike) => void;
export type ErrorHandler = (error: unknown) => void;
export declare class NodeEventSource {
    private readonly es;
    onmessage: EventHandler | null;
    onerror: ErrorHandler | null;
    constructor(url: string, init?: NodeEventSourceInit);
    close(): void;
}
