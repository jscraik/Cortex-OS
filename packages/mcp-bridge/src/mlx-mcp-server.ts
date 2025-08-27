/**
 * @file_path apps/cortex-os/packages/mcp/src/mlx-mcp-server.ts
 * @description MLX MCP server integration for direct neuron access
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-20
 * @version 1.0.0
 * @status active
 */

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

interface MLXConfig {
  server: {
    host: string;
    port: number;
    workers: number;
    timeout: number;
    max_requests: number;
  };
  models: Record<
    string,
    {
      name: string;
      description: string;
    }
  >;
  cache: {
    hf_home: string;
  };
  performance: {
    batch_size: number;
    max_tokens: number;
    temperature: number;
    top_p: number;
  };
}

interface MLXRequest {
  model?: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface MLXResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message?: {
      role: string;
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * MLX MCP Server - Direct integration with MLX neuron
 * Provides chat, completion, and model management capabilities
 */
export class MLXMcpServer {
  private config: MLXConfig;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || join(process.cwd(), 'mlx-server-config.json');
  }

  /**
   * Initialize MLX server with configuration
   */
  async initialize(): Promise<void> {
    try {
      const configData = await readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(configData);
    } catch (error) {
      throw new Error(`Failed to load MLX config from ${this.configPath}: ${error}`);
    }
  }

  /**
   * Get available MLX models
   */
  getAvailableModels(): Array<{ id: string; name: string; description: string }> {
    if (!this.config) {
      throw new Error('MLX server not initialized');
    }

    return Object.entries(this.config.models).map(([id, model]) => ({
      id,
      name: model.name,
      description: model.description,
    }));
  }

  /**
   * Send chat completion request to MLX
   */
  async chat(request: MLXRequest): Promise<MLXResponse> {
    if (!this.config) {
      throw new Error('MLX server not initialized');
    }

    const modelKey = request.model || 'default';
    const model = this.config.models[modelKey];

    if (!model) {
      throw new Error(`Model ${modelKey} not found in configuration`);
    }

    return new Promise((resolve, reject) => {
      const process = spawn('python3', ['./scripts/mlx_chat.py', model.name], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const requestData = {
        messages: request.messages,
        temperature: request.temperature || this.config.performance.temperature,
        max_tokens: request.max_tokens || this.config.performance.max_tokens,
      };

      process.stdin.write(JSON.stringify(requestData) + '\n');
      process.stdin.end();

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`MLX process failed with code ${code}: ${errorOutput}`));
          return;
        }

        try {
          // Parse MLX output and convert to OpenAI-compatible format
          const lines = output.trim().split('\n');
          let fullContent = '';

          for (const line of lines) {
            if (!line) continue;
            try {
              const parsed = JSON.parse(line);
              if (parsed.token) {
                fullContent += parsed.token;
              }
            } catch {
              // Skip invalid JSON lines
            }
          }

          const response: MLXResponse = {
            id: `mlx-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: model.name,
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: fullContent,
                },
                finish_reason: 'stop',
              },
            ],
            usage: {
              prompt_tokens: this.estimateTokens(request.messages.map((m) => m.content).join('')),
              completion_tokens: this.estimateTokens(fullContent),
              total_tokens: 0, // Will be calculated
            },
          };

          response.usage!.total_tokens =
            response.usage!.prompt_tokens + response.usage!.completion_tokens;
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse MLX response: ${error}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to spawn MLX process: ${error}`));
      });
    });
  }

  /**
   * Stream chat completion from MLX
   */
  async *streamChat(request: MLXRequest): AsyncGenerator<MLXResponse> {
    if (!this.config) {
      throw new Error('MLX server not initialized');
    }

    const modelKey = request.model || 'default';
    const model = this.config.models[modelKey];

    if (!model) {
      throw new Error(`Model ${modelKey} not found in configuration`);
    }

    const process = spawn('python3', ['./scripts/mlx_chat.py', model.name], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const requestData = {
      messages: request.messages,
      temperature: request.temperature || this.config.performance.temperature,
      max_tokens: request.max_tokens || this.config.performance.max_tokens,
    };

    process.stdin.write(JSON.stringify(requestData) + '\n');
    process.stdin.end();

    let tokenIndex = 0;
    const id = `mlx-${Date.now()}`;

    yield new Promise<MLXResponse>((resolve, reject) => {
      process.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');

        for (const line of lines) {
          if (!line) continue;

          try {
            const parsed = JSON.parse(line);
            if (parsed.token) {
              const response: MLXResponse = {
                id,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: model.name,
                choices: [
                  {
                    index: 0,
                    delta: {
                      content: parsed.token,
                    },
                    finish_reason: null,
                  },
                ],
              };
              resolve(response);
              tokenIndex++;
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`MLX process failed with code ${code}`));
        } else {
          // Send final chunk
          const finalResponse: MLXResponse = {
            id,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: model.name,
            choices: [
              {
                index: 0,
                delta: {},
                finish_reason: 'stop',
              },
            ],
          };
          resolve(finalResponse);
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to spawn MLX process: ${error}`));
      });
    });
  }

  /**
   * Get MLX server health status
   */
  async getHealth(): Promise<{ status: string; models: number; uptime: number }> {
    const models = this.getAvailableModels();
    return {
      status: 'healthy',
      models: models.length,
      uptime: process.uptime(),
    };
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

// Export for MCP integration
export default MLXMcpServer;
