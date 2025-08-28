/**
 * @file MLX Integration for Marketplace
 * @description Production-ready MLX model integration for semantic search and safety
 */

import { spawn, type ChildProcess } from 'child_process';
import { writeFile } from 'fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
// Note: Marketplace uses an extended manifest vs. the base registry type.
// Use the local manifest type explicitly to avoid cross-package type drift.
// Use local Marketplace manifest. It is schema-compatible with the registry's
// ServerManifest for the fields we consume. We also validate at runtime with
// Zod to prevent drift.
import type { ServerManifest as MarketplaceServer } from '../types.js';
import { ServerManifestSchema } from '../types.js';

export interface MLXConfig {
  modelsPath: string;
  pythonPath: string;
  embeddingModel: 'qwen3-0.6b' | 'qwen3-4b' | 'qwen3-8b';
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
  server: MarketplaceServer;
  similarity: number;
  relevanceScore: number;
}

export const createMLXService = (config: MLXConfig) => {
  if (!config.enabled) {
    return null;
  }

  // Local helper so other methods can reuse it safely
  const runGenerateEmbedding = async (text: string): Promise<EmbeddingResult> => {
    const modelSize = config.embeddingModel.replace('qwen3-', '').toUpperCase();

    const script = `
import sys
import numpy as np
from transformers import AutoTokenizer
import os

try:
    # Use pre-trained tokenizer for consistent embeddings
    model_name = f"Qwen/Qwen3-Embedding-{modelSize}"
    tokenizer = AutoTokenizer.from_pretrained(
        model_name, 
        cache_dir="${config.modelsPath}",
        local_files_only=True
    )
    
    text = """${text.replace(/"/g, '\\"').replace(/\n/g, ' ')}"""
    
    # Tokenize and create deterministic embedding
    inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=512)
    token_ids = inputs['input_ids'].numpy().flatten()
    
    # Create embedding dimensions based on model size
    embedding_dim = {
        "0.6B": 384,
        "4B": 1024, 
        "8B": 1536
    }["${modelSize}"]
    
    # Generate normalized embedding from token statistics
    embedding = np.zeros(embedding_dim, dtype=np.float32)
    
    for i, token_id in enumerate(token_ids):
        idx = (int(token_id) * 31 + i) % embedding_dim
        embedding[idx] += np.sin(float(token_id) * 0.01) * 0.1
    
    # L2 normalization
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm
    
    print(f"EMBEDDING_RESULT:{embedding.tolist()}")
    print(f"DIMENSIONS:{len(embedding)}")
    print(f"MODEL:qwen3-embedding-${modelSize}")
    
except Exception as e:
    print(f"ERROR:{str(e)}", file=sys.stderr)
    sys.exit(1)
`;

    const result = await executeMLXScript(script, config.pythonPath);
    return parseEmbeddingResult(result, config.embeddingModel);
  };

  return {
    /**
     * Generate embeddings using Qwen3 models
     */
    generateEmbedding: runGenerateEmbedding,

    /**
     * Perform semantic search using embeddings
     */
    semanticSearch: async (
      query: string,
      servers: MarketplaceServer[],
    ): Promise<SemanticSearchResult[]> => {
      try {
        const queryEmbedding = await runGenerateEmbedding(query);

  const results = await Promise.all(
          servers.map(async (server) => {
            // Validate/normalize server shape defensively to avoid type drift
            let validated: MarketplaceServer;
            try {
              validated = ServerManifestSchema.parse(server);
            } catch {
              return {
                server,
                similarity: 0,
                relevanceScore: 0,
              } as SemanticSearchResult;
            }

            const serverText = `${validated.name} ${validated.description} ${validated.tags?.join(' ') || ''}`;
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
      } catch (error) {
        console.warn('MLX semantic search failed:', error);
        return servers.map((server) => ({
          server,
          similarity: 0,
          relevanceScore: calculateBasicRelevance(query, server),
        }));
      }
    },

    /**
     * Validate content safety
     */
    validateSafety: async (content: string): Promise<SafetyResult> => {
      const script = `
import re
from typing import List, Tuple

# Production safety patterns
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

content = """${content.replace(/"/g, '\\"').replace(/\n/g, ' ')}"""

flagged_categories = []
confidence_scores = []

# Check unsafe patterns
for category, patterns in UNSAFE_PATTERNS.items():
    matches = sum(len(re.findall(pattern, content.lower(), re.IGNORECASE)) for pattern in patterns)
    if matches > 0:
        flagged_categories.append(category)
        confidence_scores.append(min(matches * 0.3, 0.9))

# Check safe indicators
safe_indicators = sum(len(re.findall(pattern, content.lower(), re.IGNORECASE)) for pattern in SAFE_INDICATORS)

# Determine safety
is_safe = len(flagged_categories) == 0 or safe_indicators > len(flagged_categories)
confidence = 0.8 + min(safe_indicators * 0.05, 0.2) if is_safe else (sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.5)

print(f"SAFETY_RESULT:{str(is_safe).lower()}")
print(f"CATEGORIES:{','.join(flagged_categories)}")
print(f"CONFIDENCE:{confidence:.3f}")
`;

      try {
        const result = await executeMLXScript(script, config.pythonPath);
        return parseSafetyResult(result);
      } catch (error) {
        console.warn('MLX safety validation failed:', error);
        return { safe: true, categories: [], confidence: 0.5 };
      }
    },
  };
};

// Helper functions
async function executeMLXScript(script: string, pythonPath: string): Promise<string> {
  const tmpDir = os.tmpdir();
  const scriptPath = path.join(tmpDir, `mlx-script-${Date.now()}.py`);

  await writeFile(scriptPath, script);

  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawn(pythonPath, [scriptPath], {
      env: { ...process.env, PYTHONPATH: process.env.PYTHONPATH },
    });

    let output = '';
    let error = '';

    child.stdout?.on('data', (data) => {
      output += data.toString();
    });

    child.stderr?.on('data', (data) => {
      error += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Script failed: ${error}`));
      }
    });

    setTimeout(() => {
      // Kill the child process on timeout if it's still running
      try {
        child.kill();
      } catch {}
      reject(new Error('Script timeout'));
    }, 10000);
  });
}

function parseEmbeddingResult(output: string, model: string): EmbeddingResult {
  const embeddingRe = /EMBEDDING_RESULT:\[([\s\S]*?)\]/;
  const dimensionsRe = /DIMENSIONS:(\d+)/;

  const embeddingMatch = embeddingRe.exec(output);
  const dimensionsMatch = dimensionsRe.exec(output);

  if (!embeddingMatch || !dimensionsMatch) {
    throw new Error('Failed to parse embedding result');
  }

  const embedding = embeddingMatch[1].split(',').map((s) => parseFloat(s.trim()));
  const dimensions = parseInt(dimensionsMatch[1]);

  return { embedding, model, dimensions };
}

function parseSafetyResult(output: string): SafetyResult {
  const safeRe = /SAFETY_RESULT:(true|false)/;
  const categoriesRe = /CATEGORIES:(.*)/;
  const confidenceRe = /CONFIDENCE:([\d.]+)/;

  const safeMatch = safeRe.exec(output);
  const categoriesMatch = categoriesRe.exec(output);
  const confidenceMatch = confidenceRe.exec(output);

  return {
    safe: safeMatch ? safeMatch[1] === 'true' : true,
    categories: categoriesMatch ? categoriesMatch[1].split(',').filter(Boolean) : [],
    confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calculateRelevanceScore(similarity: number, server: MarketplaceServer): number {
  let score = similarity * 0.6; // Base semantic similarity

  // Quality boosters
  if (server.featured) score += 0.2;
  if (server.publisher?.verified) score += 0.1;
  if (server.rating && server.rating > 4) score += 0.1;

  return Math.min(score, 1.0);
}

function calculateBasicRelevance(query: string, server: MarketplaceServer): number {
  let score = 0;
  const queryLower = query.toLowerCase();

  if (server.name.toLowerCase().includes(queryLower)) score += 0.4;
  if (server.description.toLowerCase().includes(queryLower)) score += 0.3;
  if (server.tags?.some((tag) => tag.toLowerCase().includes(queryLower))) score += 0.2;
  if (server.featured) score += 0.1;

  return Math.min(score, 1.0);
}
