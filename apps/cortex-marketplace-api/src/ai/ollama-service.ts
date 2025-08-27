/**
 * @file Ollama Integration for Marketplace
 * @description Ollama service integration as fallback for MLX
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, no-console */

import type { ServerManifest } from '../types.js';

export interface OllamaConfig {
  baseUrl: string;
  defaultModel: string;
  timeout: number;
  enabled: boolean;
}

export interface OllamaEmbeddingResult {
  embedding: number[];
  model: string;
}

export interface QueryEnhancementResult {
  enhancedQuery: string;
  intent: 'find_tool' | 'solve_problem' | 'explore_category' | 'general_search';
  suggestedFilters: Record<string, any>;
}

export const createOllamaService = (config: OllamaConfig) => {
  if (!config.enabled) {
    return null;
  }

  const makeRequest = async (endpoint: string, body: any): Promise<any> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(`${config.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  return {
    /**
     * Health check
     */
    healthCheck: async (): Promise<boolean> => {
      try {
        const response = await fetch(`${config.baseUrl}/api/tags`, {
          method: 'GET'
        });
        return response.ok;
      } catch {
        return false;
      }
    },

    /**
     * Generate embeddings
     */
    generateEmbedding: async (text: string): Promise<OllamaEmbeddingResult> => {
      const result = await makeRequest('/api/embeddings', {
        model: config.defaultModel,
        prompt: text
      });

      return {
        embedding: result.embedding,
        model: config.defaultModel
      };
    },

    /**
     * Enhance search query using reasoning models
     */
    enhanceQuery: async (query: string): Promise<QueryEnhancementResult> => {
      const prompt = `Analyze this MCP server search query and enhance it:

Query: "${query}"

Provide JSON response with:
1. enhancedQuery: Improved search terms with synonyms
2. intent: One of [find_tool, solve_problem, explore_category, general_search]
3. suggestedFilters: Object with category, riskLevel, capabilities suggestions

Response:`;

      try {
        const result = await makeRequest('/api/generate', {
          model: 'phi4-mini-reasoning:latest',
          prompt,
          stream: false,
          options: { temperature: 0.3 }
        });

        // Parse JSON from response
        const jsonMatch = result.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }

        // Fallback parsing
        return parseEnhancementFallback(query, result.response);
      } catch (error) {
        console.warn('Query enhancement failed:', error);
        return {
          enhancedQuery: query,
          intent: 'general_search' as const,
          suggestedFilters: {}
        };
      }
    },

    /**
     * Validate server quality
     */
    validateServerQuality: async (server: ServerManifest): Promise<{
      qualityScore: number;
      safetyAssessment: { safe: boolean; concerns: string[] };
      suggestions: string[];
    }> => {
      const prompt = `Evaluate this MCP server for quality and safety:

Name: ${server.name}
Description: ${server.description}
Category: ${server.category}
Permissions: ${server.permissions?.join(', ') || 'None'}

Provide JSON with:
1. qualityScore: 0-100 based on clarity, completeness
2. safetyAssessment: {safe: boolean, concerns: string[]}  
3. suggestions: string[] for improvements

Response:`;

      try {
        const result = await makeRequest('/api/generate', {
          model: config.defaultModel,
          prompt,
          stream: false,
          options: { temperature: 0.2 }
        });

        const jsonMatch = result.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }

        return parseValidationFallback(server);
      } catch (error) {
        console.warn('Server validation failed:', error);
        return parseValidationFallback(server);
      }
    },

    /**
     * Calculate semantic similarity
     */
    calculateSimilarity: async (query: string, servers: ServerManifest[]): Promise<Array<{ server: ServerManifest; similarity: number }>> => {
      try {
        const queryEmbedding = await generateEmbedding(query);
        
        const results = [];
        const batchSize = 5;
        
        for (let i = 0; i < servers.length; i += batchSize) {
          const batch = servers.slice(i, i + batchSize);
          
          const batchResults = await Promise.all(
            batch.map(async (server) => {
              const serverText = `${server.name} ${server.description} ${server.tags?.join(' ') || ''}`;
              try {
                const serverEmbedding = await generateEmbedding(serverText);
                const similarity = cosineSimilarity(queryEmbedding.embedding, serverEmbedding.embedding);
                return { server, similarity };
              } catch {
                return { server, similarity: 0 };
              }
            })
          );
          
          results.push(...batchResults);
          
          // Rate limiting
          if (i + batchSize < servers.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        return results.sort((a, b) => b.similarity - a.similarity);
      } catch (error) {
        console.warn('Semantic similarity failed:', error);
        return servers.map(server => ({ server, similarity: 0 }));
      }
    }
  };

  // Helper functions
  function parseEnhancementFallback(query: string, response: string): QueryEnhancementResult {
    const intent = response.toLowerCase().includes('find') ? 'find_tool' :
                  response.toLowerCase().includes('help') ? 'solve_problem' :
                  response.toLowerCase().includes('category') ? 'explore_category' : 'general_search';
                  
    return {
      enhancedQuery: query,
      intent: intent as any,
      suggestedFilters: inferFilters(query)
    };
  }

  function parseValidationFallback(server: ServerManifest) {
    let qualityScore = 50;
    
    if (server.description.length > 50) qualityScore += 20;
    if (server.tags && server.tags.length > 0) qualityScore += 15;
    if (server.publisher?.verified) qualityScore += 15;
    
    const highRiskPerms = server.permissions?.some(p => 
      ['system:exec', 'files:write', 'admin'].some(danger => p.includes(danger))
    ) || false;
    
    return {
      qualityScore: Math.min(qualityScore, 100),
      safetyAssessment: {
        safe: !highRiskPerms,
        concerns: highRiskPerms ? ['high_risk_permissions'] : []
      },
      suggestions: [
        'Add more detailed description',
        'Include usage examples',
        'Add installation troubleshooting'
      ]
    };
  }

  function inferFilters(query: string): Record<string, any> {
    const filters: Record<string, any> = {};
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('development')) filters.category = 'development';
    if (queryLower.includes('safe')) filters.riskLevel = 'low';
    if (queryLower.includes('popular')) filters.sortBy = 'downloads';
    
    return filters;
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

  async function generateEmbedding(text: string): Promise<OllamaEmbeddingResult> {
    const result = await makeRequest('/api/embeddings', {
      model: config.defaultModel,
      prompt: text
    });

    return {
      embedding: result.embedding,
      model: config.defaultModel
    };
  }
};