/**
 * @file packages/prp-runner/src/orchestrator.ts
 * Functional PRP orchestrator using closure state.
 */
import { LLMBridge, type LLMConfig } from './llm-bridge.js';
export interface Blueprint {
	title: string;
	description: string;
	requirements: string[];
}
export interface ExecutionState {
	id: string;
	phase: 'strategy' | 'build' | 'evaluation';
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
	phase: 'strategy' | 'build' | 'evaluation';
	dependencies: string[];
	tools: string[];
	requiresLLM?: boolean;
	execute(
		state: ExecutionState,
		context: ExecutionContext,
	): Promise<NeuronResult>;
}
export interface NeuronResult {
	output: any;
	evidence: any[];
	nextSteps: string[];
	artifacts: any[];
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
	getNeuronsByPhase(phase: 'strategy' | 'build' | 'evaluation'): Neuron[];
	configureLLM(config: LLMConfig): void;
	getLLMConfig(): LLMConfig | undefined;
	createLLMBridge(): LLMBridge;
	executePRPCycle(blueprint: Blueprint): Promise<PRPExecutionResult>;
}
export declare function createPRPOrchestrator(): PRPOrchestrator;
//# sourceMappingURL=orchestrator.d.ts.map
