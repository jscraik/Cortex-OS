import type {
  Neuron,
  ExecutionState,
  ExecutionContext,
  NeuronResult,
} from '../orchestrator.js';

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
