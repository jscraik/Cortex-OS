import { LLMBridge } from '../llm-bridge.js';
import type { ExecutionContext } from '../orchestrator.js';

export function createExecutionContext(llmBridge?: LLMBridge): ExecutionContext {
  return {
    workingDirectory: process.cwd(),
    projectRoot: process.cwd(),
    outputDirectory: './dist',
    tempDirectory: './tmp',
    environmentVariables: process.env,
    timeout: 30000,
    llmBridge,
  };
}
