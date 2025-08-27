/**
 * Memory Package: Neo4j + Qdrant integration for Cortex OS
 * Modular exports for vector search and knowledge graph operations.
 *
 * @module packages/memory/index.ts
 * @description Clean exports from canonical MemoryService implementation and utilities.
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-21
 * @version 0.2.0
 * @status active
 */

// Primary API exports from canonical implementation
export * from './src/adapters/neo4j.js';
export * from './src/adapters/qdrant.js';
export * from './src/MemoryService.js';
export * from './src/policy.js';
export * from './src/types.js';

// Context utilities (storage-agnostic) integrated from CLI prototype
// These helpers can be used to rank and compact memory entries into a context window.

export type MemoryPriority = "recent" | "relevant" | "important";

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function calculateRelevanceScore(
  entry: {
    content?: string;
    text?: string;
    tags?: string[];
    confidence?: number;
    timestamp?: string;
  },
  query: string,
): number {
  const queryLower = query.toLowerCase();
  const contentLower = ((entry.content ?? entry.text) || "").toLowerCase();
  let score = 0;
  if (contentLower.includes(queryLower)) score += 10;
  const queryWords = queryLower.split(/\s+/);
  const contentWords = contentLower.split(/\s+/);
  const matches = queryWords.filter((w) => contentWords.includes(w));
  score += matches.length * 2;
  const tagMatches = (entry.tags || []).filter((t) =>
    queryWords.some((qt) => t.toLowerCase().includes(qt)),
  );
  score += tagMatches.length * 3;
  score += (entry.confidence ?? 0) * 5;
  if (entry.timestamp) {
    const days =
      (Date.now() - new Date(entry.timestamp).getTime()) /
      (1000 * 60 * 60 * 24);
    score += Math.max(0, 5 - days);
  }
  return score;
}

export function sortMemoriesByPriority<
  T extends { confidence?: number; type?: string; timestamp?: string },
>(memories: T[], priority: MemoryPriority): T[] {
  switch (priority) {
    case "recent":
      return [...memories].sort(
        (a, b) =>
          new Date(b.timestamp || 0).getTime() -
          new Date(a.timestamp || 0).getTime(),
      );
    case "important":
      return [...memories].sort(
        (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0),
      );
    case "relevant":
    default:
      return [...memories].sort((a, b) => {
        const aScore = (a.confidence ?? 0) + (a.type === "context" ? 2 : 0);
        const bScore = (b.confidence ?? 0) + (b.type === "context" ? 2 : 0);
        return bScore - aScore;
      });
  }
}

export function buildContextWindow<
  T extends {
    content?: string;
    text?: string;
    confidence?: number;
    type?: string;
    timestamp?: string;
  },
>(
  memories: T[],
  maxTokens: number = 4000,
  priority: MemoryPriority = "relevant",
): { entries: T[]; overflow: T[]; currentTokens: number; maxTokens: number } {
  const ordered = sortMemoriesByPriority(memories, priority);
  const entries: T[] = [];
  const overflow: T[] = [];
  let currentTokens = 0;
  for (const m of ordered) {
    const t = estimateTokens(String(m.content ?? m.text ?? ""));
    if (currentTokens + t <= maxTokens) {
      entries.push(m);
      currentTokens += t;
    } else {
      overflow.push(m);
    }
  }
  return { entries, overflow, currentTokens, maxTokens };
}
