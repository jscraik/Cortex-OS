import type { ExecutionContext, ExecutionState, Neuron, NeuronResult } from '../orchestrator.js';

export async function executeNeuron(
  neuron: Neuron,
  state: ExecutionState,
  context: ExecutionContext,
): Promise<NeuronResult> {
  try {
    return await neuron.execute(state, context);
  } catch (error) {
    console.error('Error executing neuron:', error);
    throw error;
  }
}
