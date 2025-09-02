import { tmpdir } from "node:os";
import path, { join } from "node:path";

/**
 * Document with relevance score for reranking
 */
export interface RerankDocument {
	id: string;
	text: string;
	score?: number;
}

/**
 * Interface for reranking documents based on query relevance
 */
export interface Reranker {
	/**
	 * Rerank documents based on relevance to the query
	 * @param query The search query
	 * @param documents Documents to rerank
	 * @param topK Number of top documents to return
	 * @returns Reranked documents with relevance scores
	 */
	rerank(
		query: string,
		documents: RerankDocument[],
		topK?: number,
	): Promise<RerankDocument[]>;
}

/**
 * Configuration for Qwen3 reranker
 */
export interface Qwen3RerankOptions {
	/** Model path or identifier */
	modelPath?: string;
	/** Maximum sequence length for input */
	maxLength?: number;
	/** Number of top documents to return */
	topK?: number;
	/** Batch size for processing */
	batchSize?: number;
	/** Cache directory for model files */
	cacheDir?: string;
	/** Custom Python executable path */
	pythonPath?: string;
	/** Timeout in milliseconds for Python process */
	timeoutMs?: number;
}

/**
 * Qwen3-4B reranker for improved document relevance scoring
 *
 * Uses the Qwen3-Reranker-4B model to provide more accurate relevance
 * scoring between queries and documents compared to simple cosine similarity.
 */
export class Qwen3Reranker implements Reranker {
	private readonly modelPath: string;
	private readonly maxLength: number;
	private readonly topK: number;
	private readonly batchSize: number;
	private readonly cacheDir: string;
	private readonly pythonPath: string;
	private readonly timeoutMs: number;

	constructor(options: Qwen3RerankOptions = {}) {
		const defaultPath =
			process.env.QWEN_RERANKER_MODEL_PATH ||
			path.resolve(process.cwd(), "models/Qwen3-Reranker-4B");
		this.modelPath = options.modelPath || defaultPath;
		this.maxLength = options.maxLength || 512;
		this.topK = options.topK || 10;
		this.batchSize = options.batchSize || 32;

		this.cacheDir =
			options.cacheDir ||
			join(process.env.HF_HOME || tmpdir(), "qwen3-reranker-cache");
		this.pythonPath = options.pythonPath || "python3";
		this.timeoutMs = options.timeoutMs ?? 30000;
	}

	/**
	 * Rerank documents using Qwen3-Reranker-4B model
	 */
	async rerank(
		query: string,
		documents: RerankDocument[],
		topK?: number,
	): Promise<RerankDocument[]> {
		if (documents.length === 0) {
			return [];
		}

		const actualTopK = topK || this.topK;
		const batches = this.createBatches(documents, this.batchSize);
		const allScores: number[] = [];

		// Process documents in batches
		for (const batch of batches) {
			const batchScores = await this.scoreBatch(query, batch);
			allScores.push(...batchScores);
		}

		// Combine documents with scores and sort by relevance
		const scoredDocs = documents.map((doc, index) => ({
			...doc,
			score: allScores[index] || 0,
		}));

		// Sort by score (highest first) and return top K
		scoredDocs.sort((a, b) => (b.score || 0) - (a.score || 0));
		return scoredDocs.slice(0, actualTopK);
	}

	/**
   * Score a batch of documents against the query

  private scoreBatch(query: string, documents: RerankDocument[]): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const pythonScript = this.getPythonScript();
      const child = spawn(this.pythonPath, ['-c', pythonScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          TRANSFORMERS_CACHE: this.cacheDir,
          HF_HOME: this.cacheDir,
        },
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        child.kill();
        reject(new Error('Qwen3 reranker timed out'));
      }, this.timeoutMs);

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new Error(`Qwen3 reranker failed with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout.trim());
          if (result.error) {
            reject(new Error(`Qwen3 reranker error: ${result.error}`));
          } else {
            resolve(result.scores || []);
          }
        } catch (err) {
          reject(new Error(`Failed to parse Qwen3 reranker output: ${err}`));
        }
      });

      child.on('error', (err) => {
        reject(new Error(`Failed to spawn Qwen3 reranker process: ${err}`));
      });

      // Send input data
      const input = {
        query,
        documents: documents.map((doc) => doc.text),
        model_path: this.modelPath,
        max_length: this.maxLength,
      };

      child.stdin?.write(JSON.stringify(input));
      child.stdin?.end();
    });

  }

  /**
   * Create batches from documents array
   */
	private createBatches(
		documents: RerankDocument[],
		batchSize: number,
	): RerankDocument[][] {
		const batches: RerankDocument[][] = [];
		for (let i = 0; i < documents.length; i += batchSize) {
			batches.push(documents.slice(i, i + batchSize));
		}
		return batches;
	}

	/**
	 * Cleanup resources if needed
	 */
	async close(): Promise<void> {
		// No persistent resources to cleanup
	}
}

/**
 * Factory function for easy Qwen3 reranker creation
 */
export function createQwen3Reranker(
	options?: Qwen3RerankOptions,
): Qwen3Reranker {
	return new Qwen3Reranker(options);
}

/**
 * Preset configurations for different use cases
 */
export const Qwen3RerankPresets = {
	/** Fast reranking with smaller batch size */
	fast: {
		batchSize: 16,
		maxLength: 256,
		topK: 5,
	},

	/** Balanced performance and accuracy */
	balanced: {
		batchSize: 32,
		maxLength: 512,
		topK: 10,
	},

	/** High accuracy with larger context */
	accurate: {
		batchSize: 8,
		maxLength: 1024,
		topK: 20,
	},
} as const;
