export type GraphEventType =
        | 'langgraph.state_shared'
        | 'langgraph.agent_handoff'
        | 'langgraph.workflow_completed';

export interface GraphToGraphEvent {
        type: GraphEventType;
        source: string;
        target?: string;
        payload: Record<string, unknown>;
        coordinationId: string;
        timestamp: string;
        branding: 'brAInwav';
}

export interface GraphEventPublisher {
        publish(event: GraphToGraphEvent): void | Promise<void>;
}

export type GraphEventListener = (event: GraphToGraphEvent) => void;

export class InMemoryGraphEventBus implements GraphEventPublisher {
        private readonly listeners = new Set<GraphEventListener>();

        private readonly recordedEvents: GraphToGraphEvent[] = [];

        subscribe(listener: GraphEventListener): () => void {
                this.listeners.add(listener);
                return () => {
                        this.listeners.delete(listener);
                };
        }

        get events(): GraphToGraphEvent[] {
                return this.recordedEvents.map((event) => ({ ...event }));
        }

        async publish(event: GraphToGraphEvent): Promise<void> {
                this.recordedEvents.push({ ...event });
                for (const listener of this.listeners) {
                        listener({ ...event });
                }
        }

        clear(): void {
                this.recordedEvents.length = 0;
        }
}
