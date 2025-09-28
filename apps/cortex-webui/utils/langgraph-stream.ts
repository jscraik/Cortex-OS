export interface MessageEventLike<T = string> {
        data: T;
}

export interface EventSourceLike {
        addEventListener(type: 'message', listener: (event: MessageEventLike<string>) => void): void;
        removeEventListener?(type: 'message', listener: (event: MessageEventLike<string>) => void): void;
        close?(): void;
}

export interface LangGraphClientEnvelope<T = unknown> {
        type: 'brAInwav.langgraph.event' | 'brAInwav.langgraph.complete' | 'brAInwav.langgraph.error';
        event: string;
        payload: T;
        runId: string;
        branding: 'brAInwav';
        timestamp: string;
        sequence: number;
        metadata?: Record<string, unknown>;
        aborted?: boolean;
}

export interface LangGraphStreamHandlers {
        onEvent?: (envelope: LangGraphClientEnvelope) => void;
        onComplete?: (envelope: LangGraphClientEnvelope<{ emitted: number }>) => void;
        onError?: (error: Error) => void;
}

export interface LangGraphStreamObserver {
        stop(): void;
}

export function observeLangGraphStream(
        source: EventSourceLike,
        handlers: LangGraphStreamHandlers,
): LangGraphStreamObserver {
        const onMessage = (event: MessageEventLike<string>) => {
                try {
                        const envelope = JSON.parse(event.data) as LangGraphClientEnvelope;
                        handlers.onEvent?.(envelope);
                        if (envelope.type === 'brAInwav.langgraph.complete') {
                                handlers.onComplete?.(
                                        envelope as LangGraphClientEnvelope<{ emitted: number }>,
                                );
                        } else if (envelope.type === 'brAInwav.langgraph.error') {
                                const payload = envelope.payload as Record<string, unknown> | undefined;
                                const message =
                                        typeof payload?.message === 'string'
                                                ? payload.message
                                                : 'Unknown LangGraph stream error';
                                handlers.onError?.(new Error(message));
                        }
                } catch (error) {
                        const err = error instanceof Error ? error : new Error(String(error));
                        handlers.onError?.(err);
                }
        };

        source.addEventListener('message', onMessage);

        return {
                stop() {
                        source.removeEventListener?.('message', onMessage);
                        source.close?.();
                },
        };
}
