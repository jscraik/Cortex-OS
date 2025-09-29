import {
  AvailabilityError,
  ModelAdapter,
  ModelInvocationContext,
  ModelInvocationResult,
  AvailabilityProbe,
  ensureAvailability,
} from "./base.js";

export interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OllamaClient {
  chat(input: {
    model: string;
    messages: OllamaChatMessage[];
    stream?: boolean;
    options?: Record<string, unknown>;
    signal?: AbortSignal;
  }): Promise<{ message: { content: string } }>;
}

export interface OllamaAdapterOptions {
  client: OllamaClient;
  model: string;
  availabilityProbe?: AvailabilityProbe;
  clock?: () => number;
}

export class OllamaAdapter implements ModelAdapter {
  readonly name = "ollama";

  private readonly client: OllamaClient;
  private readonly model: string;
  private readonly probe: AvailabilityProbe;
  private readonly clock: () => number;

  constructor(options: OllamaAdapterOptions) {
    if (!options.client) {
      throw new AvailabilityError("brAInwav Ollama adapter requires a client instance");
    }

    if (!options.model) {
      throw new AvailabilityError("brAInwav Ollama adapter requires a model identifier");
    }

    this.client = options.client;
    this.model = options.model;
    this.probe = options.availabilityProbe ?? (() => true);
    this.clock = options.clock ?? (() => Date.now());
  }

  async isAvailable(): Promise<boolean> {
    return ensureAvailability(this.probe);
  }

  async invoke(context: ModelInvocationContext): Promise<ModelInvocationResult> {
    const isReady = await this.isAvailable();

    if (!isReady) {
      throw new AvailabilityError("brAInwav Ollama runtime is not available");
    }

    const startedAt = this.clock();
    const response = await this.client.chat({
      model: this.model,
      stream: false,
      signal: context.signal,
      messages: [
        { role: "system", content: "You are a brAInwav Cortex orchestrator assistant." },
        { role: "user", content: context.prompt },
      ],
      options: context.variables,
    });

    const latencyMs = this.clock() - startedAt;

    return {
      output: response.message.content,
      latencyMs,
      provider: this.name,
      metadata: {
        model: this.model,
        variables: context.variables ?? {},
      },
    };
  }
}
