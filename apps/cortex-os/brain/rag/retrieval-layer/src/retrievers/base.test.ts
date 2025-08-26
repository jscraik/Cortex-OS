/**
 * @file_path packages/retrieval-layer/src/retrievers/base.test.ts
 * @description Tests for base retriever functionality
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  Document,
  RetrieverConfig,
  QueryResult,
  DocumentSchema,
} from "../types";
import { FaissRetriever } from "./faiss";

describe("Base Retriever Functionality", () => {
  let retriever: FaissRetriever;
  const mockDocuments: Document[] = [
    {
      id: "doc1",
      path: "/test/file1.ts",
      content: "This is a TypeScript file with classes and interfaces",
      embedding: [0.1, 0.2, 0.3, 0.4],
      metadata: { title: "File 1", fileType: "ts", size: 1000 },
    },
    {
      id: "doc2",
      path: "/test/file2.py",
      content: "This is a Python file with functions and modules",
      embedding: [0.5, 0.6, 0.7, 0.8],
      metadata: { title: "File 2", fileType: "py", size: 2000 },
    },
    {
      id: "doc3",
      path: "/test/README.md",
      content: "This is a markdown documentation file with examples",
      embedding: [0.2, 0.4, 0.1, 0.9],
      metadata: { title: "README", fileType: "md", size: 500 },
    },
  ];

  const config: RetrieverConfig = {
    dimension: 4,
    metric: "cosine",
    indexType: "faiss",
    cacheEnabled: true,
    maxCacheSize: 100,
  };

  beforeEach(() => {
    retriever = new FaissRetriever(config);
  });

  it("should initialize with correct configuration", () => {
    expect(retriever.getConfig()).toEqual(config);
  });

  it("should index documents successfully", async () => {
    await expect(retriever.index(mockDocuments)).resolves.not.toThrow();
  });

  it("should query documents and return ranked results", async () => {
    await retriever.index(mockDocuments);

    const queryVector = [0.1, 0.3, 0.2, 0.5];
    const results = await retriever.query(queryVector, 2);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      id: expect.any(String),
      document: expect.objectContaining({
        id: expect.any(String),
        path: expect.any(String),
        content: expect.any(String),
      }),
      score: expect.any(Number),
    });

    // Results should be sorted by score (descending for cosine similarity)
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
  });

  it("should handle empty query gracefully", async () => {
    await retriever.index(mockDocuments);

    const results = await retriever.query([0, 0, 0, 0], 5);
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it("should limit results to topK parameter", async () => {
    await retriever.index(mockDocuments);

    const queryVector = [0.1, 0.2, 0.3, 0.4];
    const results = await retriever.query(queryVector, 1);

    expect(results).toHaveLength(1);
  });

  it("should validate document schema", () => {
    const invalidDoc = {
      // Missing required fields
      invalidField: "test",
    };

    expect(() => {
      DocumentSchema.parse(invalidDoc);
    }).toThrow();
  });
});
