/**
 * Query Optimizer for Unified Memory Operations
 * Optimizes cross-library queries and reduces redundant operations
 */

export interface QueryPlan {
  id: string;
  libraries: string[];
  estimatedCost: number;
  parallelizable: boolean;
  cacheKey?: string;
}

export class QueryOptimizer {
  private queryPlans = new Map<string, QueryPlan>();

  /**
   * Optimize a unified search query
   */
  optimizeSearch(query: string, libraries: string[]): QueryPlan {
    const planId = this.generatePlanId(query, libraries);

    if (this.queryPlans.has(planId)) {
      return this.queryPlans.get(planId)!;
    }

    const plan: QueryPlan = {
      id: planId,
      libraries: this.optimizeLibraryOrder(libraries),
      estimatedCost: this.estimateQueryCost(query, libraries),
      parallelizable: libraries.length > 1,
      cacheKey: this.generateCacheKey(query, libraries),
    };

    this.queryPlans.set(planId, plan);
    return plan;
  }

  private generatePlanId(query: string, libraries: string[]): string {
    const hash = this.simpleHash(query + libraries.join(','));
    return `plan_${hash}`;
  }

  private optimizeLibraryOrder(libraries: string[]): string[] {
    // Optimize order based on typical performance characteristics
    const performance = { letta: 1, mem0: 2, graphiti: 3 };

    return libraries.sort(
      (a, b) =>
        (performance[a as keyof typeof performance] || 999) -
        (performance[b as keyof typeof performance] || 999),
    );
  }

  private estimateQueryCost(query: string, libraries: string[]): number {
    const baseCost = query.length * 0.1;
    const libraryCost = libraries.length * 10;
    return baseCost + libraryCost;
  }

  private generateCacheKey(query: string, libraries: string[]): string {
    return `cache_${this.simpleHash(query + libraries.sort().join(','))}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}
