import { performance } from 'node:perf_hooks';

export interface LangGraphNodeContext {
        memory: Record<string, unknown>;
        inputs: Record<string, unknown>;
}

export type LangGraphNodeHandler = (context: LangGraphNodeContext) => Promise<LangGraphNodeContext> | LangGraphNodeContext;

export interface LangGraphDefinition {
        entryNode: string;
        nodes: Record<string, LangGraphNodeHandler>;
        edges: Record<string, string[]>;
}

export interface LangGraphExecutionLogEntry {
        nodeId: string;
        startedAt: number;
        completedAt: number;
}

export interface LangGraphExecutionResult {
        executionLog: LangGraphExecutionLogEntry[];
        finalContext: LangGraphNodeContext;
}

export class LangGraphOrchestrator {
        constructor(private readonly definition: LangGraphDefinition) {
                if (!definition.nodes[definition.entryNode]) {
                        throw new Error('brAInwav LangGraph entry node missing handler');
                }
        }

        async execute(initialContext: LangGraphNodeContext): Promise<LangGraphExecutionResult> {
                const visited = new Set<string>();
                const executionLog: LangGraphExecutionLogEntry[] = [];
                let currentNode = this.definition.entryNode;
                let context = initialContext;

                while (currentNode) {
                        if (visited.has(currentNode)) {
                                throw new Error(`brAInwav LangGraph detected cycle at node ${currentNode}`);
                        }

                        const handler = this.definition.nodes[currentNode];
                        if (!handler) {
                                throw new Error(`brAInwav LangGraph missing handler for node ${currentNode}`);
                        }

                        const startedAt = performance.now();
                        const updatedContext = await handler(context);
                        const completedAt = performance.now();

                        executionLog.push({
                                nodeId: currentNode,
                                startedAt,
                                completedAt,
                        });

                        visited.add(currentNode);
                        context = {
                                memory: {
                                        ...context.memory,
                                        ...updatedContext.memory,
                                },
                                inputs: {
                                        ...context.inputs,
                                        ...updatedContext.inputs,
                                },
                        };

                        const nextNodes = this.definition.edges[currentNode] ?? [];
                        currentNode = nextNodes[0] ?? '';
                }

                return {
                        executionLog,
                        finalContext: context,
                };
        }
}
