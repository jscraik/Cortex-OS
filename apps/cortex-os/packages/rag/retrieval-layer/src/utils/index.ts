/**
 * @file_path packages/retrieval-layer/src/utils/index.ts
 * @description Utility functions for the retrieval layer
 */

import { Document, Evidence } from "../types";
import crypto from "crypto";

/**
 * Generate content hash for document
 */
export function generateContentHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Generate document hash including metadata
 */
export function generateDocumentHash(document: Document): string {
  const hashInput = JSON.stringify({
    path: document.path,
    content: document.content,
    metadata: document.metadata,
  });
  return generateContentHash(hashInput);
}

/**
 * Validate evidence against document content
 */
export function validateEvidence(
  evidence: Evidence,
  document: Document,
): boolean {
  if (evidence.start > evidence.end) {
    return false;
  }

  if (evidence.end > document.content.length) {
    return false;
  }

  const extractedText = document.content.slice(evidence.start, evidence.end);
  const evidenceHash = generateContentHash(extractedText);

  return evidenceHash === evidence.hash;
}

/**
 * Extract text evidence from document
 */
export function extractEvidence(
  document: Document,
  start: number,
  end: number,
  claim: string,
): Evidence {
  if (start > end || end > document.content.length) {
    throw new Error("Invalid text range for evidence extraction");
  }

  const extractedText = document.content.slice(start, end);
  const hash = generateContentHash(extractedText);

  return {
    path: document.path,
    start,
    end,
    claim,
    hash,
  };
}

/**
 * Normalize file path for consistent comparison
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

/**
 * Check if document has changed based on hash
 */
export function hasDocumentChanged(
  oldHash: string,
  document: Document,
): boolean {
  const newHash = generateDocumentHash(document);
  return oldHash !== newHash;
}

/**
 * Split large document into chunks for processing
 */
export function chunkDocument(
  document: Document,
  maxChunkSize: number = 1000,
): Document[] {
  if (document.content.length <= maxChunkSize) {
    return [document];
  }

  const chunks: Document[] = [];
  let start = 0;

  while (start < document.content.length) {
    const end = Math.min(start + maxChunkSize, document.content.length);

    // Try to break at sentence or word boundary
    let chunkEnd = end;
    if (end < document.content.length) {
      const sentenceEnd = document.content.lastIndexOf(".", end);
      const wordEnd = document.content.lastIndexOf(" ", end);

      if (sentenceEnd > start + maxChunkSize * 0.8) {
        chunkEnd = sentenceEnd + 1;
      } else if (wordEnd > start + maxChunkSize * 0.8) {
        chunkEnd = wordEnd;
      }
    }

    const chunkContent = document.content.slice(start, chunkEnd);
    const chunkId = `${document.id}_chunk_${chunks.length}`;

    chunks.push({
      id: chunkId,
      path: `${document.path}#chunk-${chunks.length}`,
      content: chunkContent,
      metadata: {
        ...document.metadata,
        originalId: document.id,
        chunkIndex: chunks.length,
        startOffset: start,
        endOffset: chunkEnd,
      },
    });

    start = chunkEnd;
  }

  return chunks;
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
