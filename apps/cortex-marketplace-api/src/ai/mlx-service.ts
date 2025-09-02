/**
 * @file MLX Integration for Marketplace
 * @description Production-ready MLX model integration for semantic search and safety
 */

import type { ChildProcess } from "node:child_process";
import { writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { type ServerManifest, ServerManifestSchema } from "../types.js";

export interface MLXConfig {
	modelsPath: string;
	pythonPath: string;
	embeddingModel: "qwen3-0.6b" | "qwen3-4b" | "qwen3-8b";
	enabled: boolean;
}

export interface EmbeddingResult {
	embedding: number[];
	model: string;
	dimensions: number;
}

export interface SafetyResult {
	safe: boolean;
	categories: string[];
	confidence: number;
}

export interface SemanticSearchResult {
	server: ServerManifest;
	similarity: number;
	relevanceScore: number;
}

export const createMLXService = (config: MLXConfig) => {
	if (!config.enabled) return null;

	const runGenerateEmbedding = async (
		text: string,
	): Promise<EmbeddingResult> => {
		const modelSize = config.embeddingModel.replace("qwen3-", "").toUpperCase();
		const script = `
import json, sys
import mlx.core as mx
from transformers import AutoTokenizer, AutoModel

model_name = "Qwen/Qwen3-Embedding-${modelSize}"
text = """${text.replace(/"/g, '\\"').replace(/\n/g, " ")}"""

try:
    tokenizer = AutoTokenizer.from_pretrained(model_name, cache_dir="${config.modelsPath}", local_files_only=True, trust_remote_code=True)
    model = AutoModel.from_pretrained(model_name, cache_dir="${config.modelsPath}", local_files_only=True, trust_remote_code=True)
    inputs = tokenizer(text, return_tensors="np", padding=True, truncation=True, max_length=512)
    input_ids = mx.array(inputs["input_ids"])
    attention_mask = mx.array(inputs["attention_mask"])
    outputs = model(input_ids=input_ids, attention_mask=attention_mask)
    mask = mx.expand_dims(attention_mask, -1)
    summed = mx.sum(outputs.last_hidden_state * mask, axis=1)
    counts = mx.sum(mask, axis=1)
    embedding = (summed / mx.maximum(counts, 1e-9)).tolist()[0]
    print(json.dumps({"embedding": embedding, "dimensions": len(embedding), "model": model_name}))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;
		const result = await executeMLXScript(script, config.pythonPath);
		return parseEmbeddingResult(result, config.embeddingModel);
	};

	const semanticSearch = async (
		query: string,
		servers: ServerManifest[],
	): Promise<SemanticSearchResult[]> => {
		const queryEmbedding = await runGenerateEmbedding(query);
		const results = await Promise.all(
			servers.map(async (server) => {
				let validated: ServerManifest;
				try {
					validated = ServerManifestSchema.parse(server);
				} catch {
					return { server, similarity: 0, relevanceScore: 0 };
				}
				const serverText = `${validated.name} ${validated.description} ${validated.tags?.join(" ") || ""}`;
				const serverEmbedding = await runGenerateEmbedding(serverText);
				const similarity = cosineSimilarity(
					queryEmbedding.embedding,
					serverEmbedding.embedding,
				);
				const relevanceScore = calculateRelevanceScore(similarity, validated);
				return { server: validated, similarity, relevanceScore };
			}),
		);
		return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
	};

	const rerank = async (
		query: string,
		servers: ServerManifest[],
	): Promise<SemanticSearchResult[]> => {
		const script = `
import json, sys
import mlx.core as mx
from transformers import AutoTokenizer, AutoModelForSequenceClassification

data = json.loads(sys.stdin.read())
query = data["query"]
texts = data["docs"]
model_name = "Qwen/Qwen3-Reranker-4B"

try:
    tokenizer = AutoTokenizer.from_pretrained(model_name, cache_dir="${config.modelsPath}", local_files_only=True, trust_remote_code=True)
    model = AutoModelForSequenceClassification.from_pretrained(model_name, cache_dir="${config.modelsPath}", local_files_only=True, trust_remote_code=True)
    scores = []
    for doc in texts:
        inputs = tokenizer(query, doc, return_tensors="np", padding=True, truncation=True, max_length=512)
        ids = mx.array(inputs["input_ids"])
        mask = mx.array(inputs["attention_mask"])
        logits = model(input_ids=ids, attention_mask=mask).logits
        score = float(mx.sigmoid(logits)[0][0])
        scores.append(score)
    print(json.dumps({"scores": scores}))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;
		const docs = servers.map(
			(s) => `${s.name} ${s.description} ${s.tags?.join(" ") || ""}`,
		);
		const payload = JSON.stringify({ query, docs });
		const result = await executeMLXScriptWithInput(
			script,
			config.pythonPath,
			payload,
		);
		const scores = JSON.parse(result).scores as number[];
		return servers
			.map((server, i) => ({
				server,
				similarity: 0,
				relevanceScore: scores[i] || 0,
			}))
			.sort((a, b) => b.relevanceScore - a.relevanceScore);
	};

	const validateSafety = async (content: string): Promise<SafetyResult> => {
		const script = `
import re
from typing import List, Tuple

UNSAFE_PATTERNS = {
    'violence': [r'\\b(kill|murder|weapon|bomb|attack|violence)\\b'],
    'hate_speech': [r'\\b(hate|racist|discrimination|offensive)\\b'],
    'illegal_activity': [r'\\b(illegal|criminal|fraud|piracy|hack|crack|exploit)\\b'],
    'privacy_violation': [r'\\b(steal.*data|exfiltrat|unauthorized.*access)\\b'],
    'system_access': [r'\\b(system.*exec|root.*access|admin.*privilege)\\b']
}

SAFE_INDICATORS = [
    r'\\b(education|learning|help|assist|development|programming)\\b',
    r'\\b(open.*source|MIT|Apache|GPL|documentation)\\b'
]

content = """${content.replace(/"/g, '\\"').replace(/\n/g, " ")}"""
flagged = []
conf_scores = []
for cat, pats in UNSAFE_PATTERNS.items():
    matches = sum(len(re.findall(p, content.lower(), re.IGNORECASE)) for p in pats)
    if matches > 0:
        flagged.append(cat)
        conf_scores.append(min(matches * 0.3, 0.9))

safe_inds = sum(len(re.findall(p, content.lower(), re.IGNORECASE)) for p in SAFE_INDICATORS)
is_safe = len(flagged) == 0 or safe_inds > len(flagged)
confidence = 0.8 + min(safe_inds * 0.05, 0.2) if is_safe else (sum(conf_scores) / len(conf_scores) if conf_scores else 0.5)
print(f"SAFETY_RESULT:{str(is_safe).lower()}")
print(f"CATEGORIES:{','.join(flagged)}")
print(f"CONFIDENCE:{confidence:.3f}")
`;
		try {
			const result = await executeMLXScript(script, config.pythonPath);
			return parseSafetyResult(result);
		} catch (error) {
			console.warn("MLX safety validation failed:", error);
			return { safe: true, categories: [], confidence: 0.5 };
		}
	};

	return {
		generateEmbedding: runGenerateEmbedding,
		semanticSearch,
		rerank,
		validateSafety,
	};
};

async function executeMLXScript(
	script: string,
	pythonPath: string,
): Promise<string> {
	const tmpDir = os.tmpdir();
	const scriptPath = path.join(tmpDir, `mlx-script-${Date.now()}.py`);
	await writeFile(scriptPath, script);
	// Use the centralized Python spawner so env merging and PYTHONPATH handling are consistent
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	const { spawnPythonProcess } = await import(
		"../../../../libs/python/exec.js"
	);
	return new Promise((resolve, reject) => {
		const child: ChildProcess = spawnPythonProcess([scriptPath], {
			python: pythonPath,
		});
		let output = "";
		let error = "";
		child.stdout?.on("data", (d) => {
			output += d.toString();
		});
		child.stderr?.on("data", (d) => {
			error += d.toString();
		});
		child.on("close", (code) =>
			code === 0
				? resolve(output)
				: reject(new Error(`Script failed: ${error}`)),
		);
		const to = setTimeout(() => {
			try {
				child.kill();
			} catch {}
			reject(new Error("Script timeout"));
		}, 10000);
		// clear timeout if process exits
		child.on("exit", () => clearTimeout(to));
	});
}

async function executeMLXScriptWithInput(
	script: string,
	pythonPath: string,
	input: string,
): Promise<string> {
	const tmpDir = os.tmpdir();
	const scriptPath = path.join(tmpDir, `mlx-script-${Date.now()}.py`);
	await writeFile(scriptPath, script);
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	const { spawnPythonProcess } = await import(
		"../../../../libs/python/exec.js"
	);
	return new Promise((resolve, reject) => {
		const child: ChildProcess = spawnPythonProcess([scriptPath], {
			python: pythonPath,
		});
		let output = "";
		let error = "";
		child.stdout?.on("data", (d) => {
			output += d.toString();
		});
		child.stderr?.on("data", (d) => {
			error += d.toString();
		});
		child.on("close", (code) =>
			code === 0
				? resolve(output)
				: reject(new Error(`Script failed: ${error}`)),
		);
		if (child.stdin) {
			child.stdin.write(input);
			child.stdin.end();
		}
		const to = setTimeout(() => {
			try {
				child.kill();
			} catch {}
			reject(new Error("Script timeout"));
		}, 10000);
		child.on("exit", () => clearTimeout(to));
	});
}

function parseEmbeddingResult(output: string, model: string): EmbeddingResult {
	const parsed = JSON.parse(output.trim());
	return { embedding: parsed.embedding, model, dimensions: parsed.dimensions };
}

function parseSafetyResult(output: string): SafetyResult {
	const safeRe = /SAFETY_RESULT:(true|false)/;
	const categoriesRe = /CATEGORIES:(.*)/;
	const confidenceRe = /CONFIDENCE:([\d.]+)/;
	const safeMatch = safeRe.exec(output);
	const categoriesMatch = categoriesRe.exec(output);
	const confidenceMatch = confidenceRe.exec(output);
	return {
		safe: safeMatch ? safeMatch[1] === "true" : true,
		categories: categoriesMatch
			? categoriesMatch[1].split(",").filter(Boolean)
			: [],
		confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
	};
}

function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length) return 0;
	let dot = 0;
	let normA = 0;
	let normB = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}
	return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calculateRelevanceScore(
	similarity: number,
	server: ServerManifest,
): number {
	let score = similarity * 0.6;
	if (server.featured) score += 0.2;
	if (server.publisher?.verified) score += 0.1;
	if (server.rating && server.rating > 4) score += 0.1;
	return Math.min(score, 1.0);
}
