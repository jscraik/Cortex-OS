import type { Neuron, ExecutionState, ExecutionContext, NeuronResult } from '../orchestrator.js';

export async function executeNeuron(
  neuron: Neuron,
  state: ExecutionState,
  context: ExecutionContext,
): Promise<NeuronResult> {
  return neuron.execute(state, context);
}
