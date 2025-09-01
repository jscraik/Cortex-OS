import { ChatCompletionRequest, ModelInfo } from './types.js';

const BASE_URL = 'https://models.github.ai';

export class GhModelsClient {
  constructor(private token?: string) {}

  private headers() {
    return {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    const res = await fetch(`${BASE_URL}/v1/models`, { headers: this.headers() });
    if (!res.ok) throw new Error(`Failed to list models: ${res.status}`);
    const data = await res.json();
    return data.data;
  }

  async chat(req: ChatCompletionRequest) {
    const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(req)
    });
    if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
    return res.json();
  }
}
