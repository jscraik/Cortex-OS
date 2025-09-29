export interface ModelInvocationContext {
  prompt: string;
  variables?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface ModelInvocationResult {
  output: string;
  latencyMs: number;
  provider: string;
  metadata?: Record<string, unknown>;
}

export interface ModelAdapter {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  invoke(context: ModelInvocationContext): Promise<ModelInvocationResult>;
}

export type AvailabilityProbe = () => Promise<boolean> | boolean;

export class AvailabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvailabilityError";
  }
}

export function ensureAvailability(probe: AvailabilityProbe): Promise<boolean> {
  return Promise.resolve(probe());
}
