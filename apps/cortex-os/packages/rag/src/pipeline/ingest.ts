/**
 * @file_path src/rag/pipeline/ingest.ts
 * Simple ingestion entry that loads retrieval policy and runs planAndDispatch with embedding generation.
 */

import type { DispatchResult, ProcessingFile } from '../chunkers/dispatch';
import { createEmbeddingService } from '../embeddingService';
import { createDispatcherFromPolicy, loadRetrievalPolicy, planAndDispatch } from '../policy/load';

export interface IngestOptions {
  configPath?: string;
  schemaPath?: string;
  generateEmbeddings?: boolean;
  embeddingBatchSize?: number;
  embeddingParallel?: boolean;
}

/**
 * Ingest a single file using the configured retrieval policy and dispatcher.
 * Optionally generates embeddings for chunks using the model gateway.
 */
export async function ingestFile(
  file: ProcessingFile,
  options: IngestOptions = {},
): Promise<DispatchResult> {
  const { configPath, schemaPath, generateEmbeddings = true } = options;
  const { policy, engine } = await loadRetrievalPolicy(configPath, schemaPath);
  const dispatcher = createDispatcherFromPolicy(policy);
  const result = await planAndDispatch(file, file.mimeType, engine, dispatcher, policy);

  // Generate embeddings for chunks if requested and ingestion was successful
  if (generateEmbeddings && result.success && result.chunks) {
    try {
      const embeddingService = createEmbeddingService({
        batchSize: options.embeddingBatchSize,
        enableParallel: options.embeddingParallel,
      });

      await embeddingService.embedChunks(result.chunks);
      console.log(`Generated embeddings for ${result.chunks.length} chunks from ${file.path}`);
    } catch (error) {
      console.error(`Failed to generate embeddings for ${file.path}:`, error);
      // Don't fail the entire ingestion if embedding generation fails
      // The chunks are still stored, just without embeddings
    }
  }

  return result;
}

/**
 * Ingest multiple files. Processes sequentially to keep resource usage predictable.
 * Generates embeddings for all chunks if requested.
 */
export async function ingestFiles(
  files: ProcessingFile[],
  options: IngestOptions = {},
): Promise<DispatchResult[]> {
  const results: DispatchResult[] = [];
  for (const file of files) {
    const res = await ingestFile(file, options);
    results.push(res);
  }
  return results;
}
