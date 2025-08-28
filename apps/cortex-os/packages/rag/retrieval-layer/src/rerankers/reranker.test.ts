/**
 * @file_path packages/retrieval-layer/src/rerankers/reranker.test.ts
 * @description Tests for document reranking functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QueryResult, RerankerConfig, Document } from '../types';
import { LocalReranker } from './local';

describe('Document Reranker', () => {
  let reranker: LocalReranker;
  const config: RerankerConfig = {
    model: 'test-model',
    maxCandidates: 20,
    topK: 5,
    useLocal: true,
  };

  const mockCandidates: QueryResult[] = [
    {
      id: 'doc1',
      document: {
        id: 'doc1',
        path: '/test/typescript-guide.md',
        content: 'TypeScript is a programming language that builds on JavaScript',
        metadata: { title: 'TypeScript Guide' },
      },
      score: 0.8,
      rank: 1,
    },
    {
      id: 'doc2',
      document: {
        id: 'doc2',
        path: '/test/javascript-basics.md',
        content: 'JavaScript is a dynamic programming language for web development',
        metadata: { title: 'JavaScript Basics' },
      },
      score: 0.7,
      rank: 2,
    },
    {
      id: 'doc3',
      document: {
        id: 'doc3',
        path: '/test/python-tutorial.md',
        content: 'Python is a high-level programming language known for readability',
        metadata: { title: 'Python Tutorial' },
      },
      score: 0.6,
      rank: 3,
    },
  ];

  beforeEach(() => {
    reranker = new LocalReranker(config);
  });

  it('should initialize with correct configuration', () => {
    expect(reranker.getConfig()).toEqual(config);
  });

  it('should rerank documents based on query relevance', async () => {
    const query = 'TypeScript programming language';
    const reranked = await reranker.rerank(query, mockCandidates, 2);

    expect(reranked).toHaveLength(2);
    expect(reranked[0]).toMatchObject({
      id: expect.any(String),
      document: expect.objectContaining({
        content: expect.any(String),
      }),
      score: expect.any(Number),
      rank: expect.any(Number),
    });
  });

  it('should respect topK parameter', async () => {
    const query = 'programming language';
    const reranked = await reranker.rerank(query, mockCandidates, 1);

    expect(reranked).toHaveLength(1);
  });

  it('should handle empty candidates', async () => {
    const query = 'test query';
    const reranked = await reranker.rerank(query, [], 5);

    expect(reranked).toHaveLength(0);
    expect(Array.isArray(reranked)).toBe(true);
  });

  it('should update ranks after reranking', async () => {
    const query = 'TypeScript';
    const reranked = await reranker.rerank(query, mockCandidates, 3);

    // Verify ranks are sequential starting from 1
    reranked.forEach((result, index) => {
      expect(result.rank).toBe(index + 1);
    });
  });

  it('should handle queries with special characters', async () => {
    const query = 'TypeScript @types/node & interfaces';
    const reranked = await reranker.rerank(query, mockCandidates, 2);

    expect(reranked).toHaveLength(2);
    expect(reranked[0].score).toBeGreaterThanOrEqual(0);
  });
});
