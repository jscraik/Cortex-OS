import { AdapterRegistry } from './adapters/adapterRegistry.js';
import type { GenerationRequest } from './adapters/types.js';
import type { LangGraphExecutionResult } from './orchestrator.js';
import { LangGraphOrchestrator } from './orchestrator.js';

export interface AgentStep {
        id: string;
        adapterId: string;
        prompt: string;
}

export interface ExecutionContext {
        memory: Record<string, unknown>;
        inputs?: Record<string, unknown>;
}

export interface AgentExecutionResult {
        workflow: LangGraphExecutionResult;
        stepLogs: Array<{
                stepId: string;
                adapterId: string;
                output: string;
        }>;
}

export class MasterAgentOrchestrator {
        constructor(
                private readonly adapters: AdapterRegistry,
                private readonly langGraph: LangGraphOrchestrator,
        ) {}

        async execute(request: { steps: AgentStep[]; context: ExecutionContext }): Promise<AgentExecutionResult> {
                if (!request.steps.length) {
                        throw new Error('brAInwav orchestration received an empty plan');
                }

                const stepLogs: AgentExecutionResult['stepLogs'] = [];

                for (const step of request.steps) {
                        const adapterPayload: GenerationRequest = {
                                prompt: step.prompt,
                                metadata: {
                                        stepId: step.id,
                                        inputs: request.context.inputs ?? {},
                                },
                        };

                        const response = await this.adapters.invoke(step.adapterId, adapterPayload);
                        stepLogs.push({
                                stepId: step.id,
                                adapterId: step.adapterId,
                                output: response.output,
                        });
                        request.context.memory[step.id] = response.output;
                }

                const workflow = await this.langGraph.execute({
                        memory: request.context.memory,
                        inputs: request.context.inputs ?? {},
                });

                return {
                        workflow,
                        stepLogs,
                };
        }
}
