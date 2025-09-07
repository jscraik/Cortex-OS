import crypto from "node:crypto";

export interface EmbeddingConfig {
	provider: "sentence-transformers" | "local";
	model?: string;
	dimensions?: number;
	batchSize?: number;
	cachePath?: string;
}

export interface EmbeddingVector {
	id: string;
	text: string;
	vector: number[];
	metadata?: Record<string, any>;
	timestamp: string;
}

export interface EmbeddingQuery {
	text: string;
	topK?: number;
	threshold?: number;
	filter?: Record<string, any>;
}

export interface EmbeddingResult {
	id: string;
	text: string;
	similarity: number;
	metadata?: Record<string, any>;
}

export interface EmbeddingState {
	config: EmbeddingConfig;
	vectorStore: Map<string, EmbeddingVector>;
	pythonPath: string;
}

export const createEmbeddingState = (
	provider: EmbeddingConfig["provider"] = "sentence-transformers",
): EmbeddingState => {
	const configs: Record<EmbeddingConfig["provider"], EmbeddingConfig> = {
		"sentence-transformers": {
			provider: "sentence-transformers",
			model: "Qwen/Qwen3-Embedding-0.6B",
			dimensions: 1024,
		},
		local: {
			provider: "local",
			model: "Qwen/Qwen3-Embedding-0.6B",
			dimensions: 1024,
		},
	};

	const config = configs[provider];
	validateConfig(config);
	return { config, vectorStore: new Map(), pythonPath: "python" };
};

export const generateEmbeddings = async (
	state: EmbeddingState,
	texts: string | string[],
): Promise<number[][]> => {
	const textArray = Array.isArray(texts) ? texts : [texts];

	switch (state.config.provider) {
		case "sentence-transformers":
			return generateWithSentenceTransformers(
				state.pythonPath,
				state.config,
				textArray,
			);
		case "local":
			return generateWithLocal(state.pythonPath, textArray);
		default:
			throw new Error(
				`Embedding generation not implemented for provider: ${state.config.provider}`,
			);
	}
};

export const addDocuments = async (
	state: EmbeddingState,
	texts: string[],
	metadata?: Record<string, any>[],
	ids?: string[],
): Promise<{ state: EmbeddingState; ids: string[] }> => {
	const embeddings = await generateEmbeddings(state, texts);
	const newStore = new Map(state.vectorStore);
	const documentIds: string[] = [];

	for (let i = 0; i < texts.length; i++) {
		const id = ids?.[i] || generateId(texts[i]);
		const vector: EmbeddingVector = {
			id,
			text: texts[i],
			vector: embeddings[i],
			metadata: metadata?.[i],
			timestamp: new Date().toISOString(),
		};
		newStore.set(id, vector);
		documentIds.push(id);
	}

	return { state: { ...state, vectorStore: newStore }, ids: documentIds };
};

export const similaritySearch = async (
	state: EmbeddingState,
	query: EmbeddingQuery,
): Promise<EmbeddingResult[]> => {
	const queryEmbedding = await generateEmbeddings(state, query.text);
	const queryVector = queryEmbedding[0];
	const results: EmbeddingResult[] = [];

	for (const doc of state.vectorStore.values()) {
		if (query.filter && !matchesFilter(doc.metadata, query.filter)) {
			continue;
		}
		const similarity = cosineSimilarity(queryVector, doc.vector);
		if (!query.threshold || similarity >= query.threshold) {
			results.push({
				id: doc.id,
				text: doc.text,
				similarity,
				metadata: doc.metadata,
			});
		}
	}

	results.sort((a, b) => b.similarity - a.similarity);
	return query.topK ? results.slice(0, query.topK) : results;
};

export const getDocument = (
	state: EmbeddingState,
	id: string,
): EmbeddingVector | undefined => state.vectorStore.get(id);

export const removeDocument = (
	state: EmbeddingState,
	id: string,
): { state: EmbeddingState; removed: boolean } => {
	const newStore = new Map(state.vectorStore);
	const removed = newStore.delete(id);
	return { state: { ...state, vectorStore: newStore }, removed };
};

export const getStats = (state: EmbeddingState) => {
	const totalVectors = state.vectorStore.size;
	const dimensions = state.config.dimensions || 0;
	const memoryUsage = `${Math.round(((totalVectors * dimensions * 4) / 1024 / 1024) * 100) / 100} MB`;
	return {
		totalDocuments: totalVectors,
		dimensions,
		provider: state.config.provider,
		memoryUsage,
	};
};

const validateConfig = (config: EmbeddingConfig): void => {
	if (!["sentence-transformers", "local"].includes(config.provider)) {
		throw new Error(`Unsupported embedding provider: ${config.provider}`);
	}
};

const generateWithSentenceTransformers = async (
	pythonPath: string,
	config: EmbeddingConfig,
	texts: string[],
): Promise<number[][]> => {
	const model = config.model || "Qwen/Qwen3-Embedding-0.6B";
	const pythonScript = `
import json
import sys
import os
import tempfile

cache_path = os.environ.get('HF_HOME', tempfile.gettempdir())
os.environ['HF_HOME'] = cache_path
os.environ['TRANSFORMERS_CACHE'] = cache_path

from sentence_transformers import SentenceTransformer

model_name = '${model}'
model = SentenceTransformer(model_name)
texts = json.loads(sys.argv[1])
embeddings = model.encode(texts).tolist()
print(json.dumps(embeddings))
`;
	const result = await executePythonScript(pythonPath, pythonScript, [
		JSON.stringify(texts),
	]);
	return JSON.parse(result);
};

const generateWithLocal = async (
	pythonPath: string,
	texts: string[],
): Promise<number[][]> => {
	const pythonScript = `
import json
import sys
import os
import torch
import tempfile

cache_path = os.environ.get('HF_HOME', tempfile.gettempdir())
os.environ['HF_HOME'] = cache_path
os.environ['TRANSFORMERS_CACHE'] = cache_path

try:
    from transformers import AutoTokenizer, AutoModel

    model_name = "Qwen/Qwen3-Embedding-0.6B"
    cache_dir = os.environ.get('HF_HOME', tempfile.gettempdir())

    tokenizer = AutoTokenizer.from_pretrained(model_name, cache_dir=cache_dir)
    model = AutoModel.from_pretrained(model_name, cache_dir=cache_dir)

    texts = json.loads(sys.argv[1])
    embeddings = []

    for text in texts:
        inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=512)

        with torch.no_grad():
            outputs = model(**inputs)
            embedding = outputs.last_hidden_state.mean(dim=1).squeeze().tolist()
            embeddings.append(embedding)

    print(json.dumps(embeddings))

except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
`;
	const result = await executePythonScript(pythonPath, pythonScript, [
		JSON.stringify(texts),
	]);
	return JSON.parse(result);
};

const cosineSimilarity = (a: number[], b: number[]): number => {
	if (a.length !== b.length) {
		throw new Error("Vectors must have the same length");
	}
	let dotProduct = 0;
	let normA = 0;
	let normB = 0;
	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}
	if (normA === 0 || normB === 0) {
		return 0;
	}
	return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

const matchesFilter = (
	metadata: Record<string, any> | undefined,
	filter: Record<string, any>,
): boolean => {
	if (!metadata) return false;
	for (const [key, value] of Object.entries(filter)) {
		if (metadata[key] !== value) {
			return false;
		}
	}
	return true;
};

const generateId = (text: string): string => {
	return crypto
		.createHash("sha256")
		.update(text)
		.digest("hex")
		.substring(0, 16);
};

const executePythonScript = async (
	pythonPath: string,
	script: string,
	args: string[] = [],
): Promise<string> => {
	 
	// @ts-expect-error - dynamic import crosses package boundaries; resolved at runtime
	const { runPython } = await import("../../../../libs/python/exec.js");
	return runPython("-c", [script, ...args], { python: pythonPath } as any);
};
