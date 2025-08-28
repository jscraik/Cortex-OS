/**
 * @file_path packages/retrieval-layer/src/rerankers/local.ts
 * @description Local reranker implementation using simple text matching
 */

import { Reranker, QueryResult, RerankerConfig } from '../types';

export class LocalReranker implements Reranker {
  private config: RerankerConfig;

  constructor(config: RerankerConfig) {
    this.config = config;
  }

  getConfig(): RerankerConfig {
    return { ...this.config };
  }

  async rerank(query: string, candidates: QueryResult[], topK?: number): Promise<QueryResult[]> {
    if (candidates.length === 0) {
      return [];
    }

    const k = Math.min(topK || this.config.topK, candidates.length);

    // Calculate relevance scores based on query-document similarity
    const scoredCandidates = candidates.map((candidate) => {
      const relevanceScore = this.calculateRelevanceScore(query, candidate);
      return {
        ...candidate,
        score: relevanceScore,
      };
    });

    // Sort by relevance score (descending) and take top-k
    const reranked = scoredCandidates
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map((result, index) => ({
        ...result,
        rank: index + 1,
      }));

    return reranked;
  }

  private calculateRelevanceScore(query: string, candidate: QueryResult): number {
    const queryTerms = this.tokenize(query.toLowerCase());
    const documentText = (
      candidate.document.content +
      ' ' +
      (candidate.document.metadata.title || '') +
      ' ' +
      candidate.document.path
    ).toLowerCase();

    const documentTerms = this.tokenize(documentText);

    // Calculate term overlap score
    const queryTermSet = new Set(queryTerms);
    const documentTermSet = new Set(documentTerms);

    const intersection = new Set([...queryTermSet].filter((x) => documentTermSet.has(x)));
    const overlapScore = intersection.size / queryTermSet.size;

    // Calculate TF-IDF-like score for matched terms
    let tfidfScore = 0;
    for (const term of intersection) {
      const termFreq = documentTerms.filter((t) => t === term).length / documentTerms.length;
      const inverseDocFreq = Math.log(1 / (termFreq + 0.001)); // Smoothing
      tfidfScore += termFreq * inverseDocFreq;
    }

    // Combine scores with weights
    const combinedScore = overlapScore * 0.6 + tfidfScore * 0.4;

    // Add original retrieval score as a factor
    return combinedScore * 0.8 + candidate.score * 0.2;
  }

  private tokenize(text: string): string[] {
    return text
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .split(/\s+/) // Split on whitespace
      .filter((token) => token.length > 2) // Filter short tokens
      .filter((token) => !this.isStopWord(token)); // Filter stop words
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'this',
      'that',
      'these',
      'those',
      'i',
      'me',
      'my',
      'myself',
      'we',
      'our',
      'ours',
      'ourselves',
      'you',
      'your',
      'yours',
      'yourself',
    ]);

    return stopWords.has(word.toLowerCase());
  }
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
