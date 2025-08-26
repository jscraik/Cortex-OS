/**
 * @file_path src/rag/pipeline/ingest.ts
 * Simple ingestion entry that loads retrieval policy and runs planAndDispatch.
 */

import {
  loadRetrievalPolicy,
  planAndDispatch,
  createDispatcherFromPolicy,
} from "../policy/load";
import type { ProcessingFile } from "../chunkers/dispatch";
import type { DispatchResult } from "../chunkers/dispatch";

export interface IngestOptions {
  configPath?: string;
  schemaPath?: string;
}

/**
 * Ingest a single file using the configured retrieval policy and dispatcher.
 */
export async function ingestFile(
  file: ProcessingFile,
  options: IngestOptions = {},
): Promise<DispatchResult> {
  const { configPath, schemaPath } = options;
  const { policy, engine } = await loadRetrievalPolicy(configPath, schemaPath);
  const dispatcher = createDispatcherFromPolicy(policy);
  return planAndDispatch(file, file.mimeType, engine, dispatcher, policy);
}

/**
 * Ingest multiple files. Processes sequentially to keep resource usage predictable.
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
