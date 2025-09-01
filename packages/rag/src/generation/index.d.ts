export interface GenerationConfig {
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
  provider?: 'mlx' | 'ollama';
}
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
export interface GenerationResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  provider: 'mlx' | 'ollama';
}
export interface Generator {
  generate(prompt: string, config?: Partial<GenerationConfig>): Promise<GenerationResponse>;
  chat(messages: ChatMessage[], config?: Partial<GenerationConfig>): Promise<GenerationResponse>;
  close?(): Promise<void>;
}
export * from './multi-model';
//# sourceMappingURL=index.d.ts.map
