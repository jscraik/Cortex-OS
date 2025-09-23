import axios from 'axios';
import type { Embedder } from '../ports/Embedder.js';
import { circuitBreaker } from '../resilience/circuit-breaker.js';

const DEFAULT_OLLAMA_MODEL = 'nomic-embed-text';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

export class OllamaEmbedder implements Embedder {
	private readonly modelName: string;
	private readonly client: any;

	constructor(modelName?: string) {
		this.modelName = modelName || DEFAULT_OLLAMA_MODEL;
		this.client = axios.create({
			baseURL: OLLAMA_BASE_URL,
			timeout: 30000,
			headers: {
				'Content-Type': 'application/json',
			},
		});
	}

	name(): string {
		return `ollama-${this.modelName}`;
	}

	async embed(texts: string[]): Promise<number[][]> {
		return await circuitBreaker.execute(
			`ollama-${this.modelName}`,
			async () => {
				// Check service health first
				await this.checkHealth();

				const requests = texts.map(async (text) => {
					const response = await this.client.post('/api/embeddings', {
						model: this.modelName,
						prompt: text,
					});

					if (response.data && Array.isArray(response.data.embedding)) {
						return response.data.embedding as number[];
					}
					throw new Error('Invalid response from Ollama embedding API');
				});

				return await Promise.all(requests);
			},
			{
				threshold: 5,
				timeout: 30000,
				resetTimeout: 60000,
			},
		);
	}

	private async checkHealth(): Promise<void> {
		try {
			const response = await this.client.get('/api/tags', {
				timeout: 5000,
			});

			if (response.status !== 200) {
				throw new Error(`Ollama health check failed: ${response.status}`);
			}
		} catch (error) {
			throw new Error(
				`Ollama service unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}
}
