export type PRPPhase = 'strategy' | 'build' | 'evaluation';
import { LLMBridge, type LLMConfig } from './llm-bridge.js';
export interface Blueprint {
	title: string;
	description: string;
	requirements: string[];
}
export interface ExecutionState {
	id: string;
	phase: PRPPhase;
	blueprint: Blueprint;
	outputs: Record<string, unknown>;
}
export interface ExecutionContext {
	workingDirectory: string;
	projectRoot: string;
	outputDirectory: string;
	tempDirectory: string;
	environmentVariables: NodeJS.ProcessEnv;
	timeout: number;
	llmBridge?: LLMBridge;
}
export interface PRPExecutionResult extends ExecutionState {
	status: 'completed' | 'failed';
}
export interface Neuron {
	id: string;
	role: string;
	phase: PRPPhase;
	dependencies: string[];
	tools: string[];
	requiresLLM?: boolean;
	execute(
		state: ExecutionState,
		context: ExecutionContext,
	): Promise<NeuronResult>;
}
export interface NeuronResult {
	output: unknown;
	evidence: unknown[];
	nextSteps: string[];
	artifacts: unknown[];
	metrics: ExecutionMetrics;
}
export interface ExecutionMetrics {
	startTime: string;
	endTime: string;
	duration: number;
	toolsUsed: string[];
	filesCreated: number;
	filesModified: number;
	commandsExecuted: number;
}
export interface PRPOrchestrator {
	getNeuronCount(): number;
	registerNeuron(neuron: Neuron): void;
	getNeuronsByPhase(phase: PRPPhase): Neuron[];
	configureLLM(config: LLMConfig): void;
	getLLMConfig(): LLMConfig | undefined;
	createLLMBridge(): LLMBridge;
	executePRPCycle(blueprint: Blueprint): Promise<PRPExecutionResult>;
	generateProductRequirementsPrompt(blueprint: Blueprint): Promise<string>;
}
export declare function createPRPOrchestrator(): PRPOrchestrator;
//# sourceMappingURL=orchestrator.d.ts.map
