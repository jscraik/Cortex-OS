// brAInwav PRP contracts – types used across kernel without importing runner implementation

export interface PRPState {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  updatedAt?: string;
}

export interface Neuron<Input = unknown, Output = unknown> {
  name: string;
  run: (input: Input) => Promise<Output>;
}

export interface PRPOrchestrator {
  start(state: PRPState): Promise<void>;
  stop(id: string): Promise<void>;
  status(id: string): Promise<PRPState | null>;
}
