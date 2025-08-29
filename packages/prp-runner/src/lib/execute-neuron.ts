import type { Neuron, ExecutionState, ExecutionContext, NeuronResult } from '../orchestrator.js';

  try {
    return await neuron.execute(state, context);
  } catch (error) {
    console.error('Error executing neuron:', error);
    throw error;
  }
}
