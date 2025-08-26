#!/usr/bin/env node --experimental-strip-types

/**
 * @file Enhanced RAG Pipeline Demo
 * @description Comprehensive demonstration of the Enhanced RAG Pipeline
 * @author Cortex OS Team
 * @version 1.0.0
 *
 * Usage:
 *   node --experimental-strip-types packages/rag/src/demo/enhanced-rag-demo.ts
 *
 * Or via npm:
 *   npm run demo:enhanced-rag
 */

import { performance } from 'perf_hooks';
import {
  createEnhancedRagPipeline,
  type ContextBuildingOptions,
} from '../enhanced-rag-pipeline.js';

// ANSI color codes for beautiful console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatProgress(progress: number): string {
  const width = 20;
  const filled = Math.floor((progress / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${' '.repeat(empty)}] ${progress.toFixed(0)}%`;
}

async function main() {
  console.log(colorize('\n🚀 Enhanced RAG Pipeline Demo', 'bright'));
  console.log(colorize('=====================================', 'dim'));
  console.log(colorize('Showcasing Node.js Native TypeScript Execution\n', 'cyan'));

  const startTime = performance.now();

  try {
    // Create and initialize pipeline
    console.log(colorize('📦 Creating Enhanced RAG Pipeline...', 'blue'));
    const pipeline = createEnhancedRagPipeline({
      enableProgressiveBuilding: true,
      enableQualityTracking: true,
      qualityThreshold: 0.8,
      maxContextCacheSize: 100,
      fallbackToBasePipeline: true,
    });

    // Set up event listeners for real-time feedback
    pipeline.on('initialized', (data) => {
      console.log(colorize('✅ Pipeline initialized:', 'green'));
      console.log(`   - Embeddings: ${data.embeddingsAvailable ? '🟢' : '🔴'}`);
      console.log(`   - Reranker: ${data.rerankerAvailable ? '🟢' : '🔴'}`);
      console.log(`   - FAISS: ${data.faissAvailable ? '🟢' : '🔴'}`);
      console.log(`   - Base Pipeline: ${data.basePipelineAvailable ? '🟢' : '🔴'}`);
    });

    pipeline.on('query-analyzed', (data) => {
      console.log(
        colorize(
          `🔍 Query analyzed: ${data.analysis.complexity} complexity, ${data.analysis.domain} domain`,
          'yellow',
        ),
      );
    });

    pipeline.on('models-selected', (data) => {
      console.log(colorize(`🎯 Models selected:`, 'magenta'));
      console.log(`   - Embedding: ${data.strategy.embedding.model}`);
      console.log(`   - Reranker: ${data.strategy.reranking.model}`);
    });

    pipeline.on('cache-hit', (data) => {
      console.log(colorize('💨 Cache hit detected', 'cyan'));
    });

    pipeline.on('error', (error) => {
      console.log(colorize(`❌ Error: ${error.message}`, 'red'));
    });

    // Initialize the pipeline
    console.log(colorize('\n🔄 Initializing pipeline...', 'yellow'));
    await pipeline.initialize();

    // Demo queries with increasing complexity
    const demoQueries = [
      {
        query: 'What is AI?',
        description: 'Simple general query',
        options: { maxCandidates: 10, enableReranking: false } as ContextBuildingOptions,
      },
      {
        query: 'How do transformer architectures work in natural language processing?',
        description: 'Complex technical query',
        options: {
          maxCandidates: 25,
          enableReranking: true,
          qualityThreshold: 0.85,
        } as ContextBuildingOptions,
      },
      {
        query:
          'Explain the mathematical foundations of backpropagation in neural networks and its computational complexity',
        description: 'Highly complex academic query',
        options: {
          maxCandidates: 50,
          enableReranking: true,
          qualityThreshold: 0.9,
          priority: 'high',
        } as ContextBuildingOptions,
      },
    ];

    console.log(colorize('\n📚 Running Demo Queries', 'bright'));
    console.log(colorize('======================', 'dim'));

    for (let i = 0; i < demoQueries.length; i++) {
      const { query, description, options } = demoQueries[i];

      console.log(colorize(`\n${i + 1}. ${description}`, 'bright'));
      console.log(colorize(`Query: "${query}"`, 'white'));
      console.log(colorize(`Options: ${JSON.stringify(options)}`, 'dim'));

      // Demonstrate streaming context building
      console.log(colorize('\n🔄 Streaming Context Building:', 'blue'));
      const queryStartTime = performance.now();
      let finalProgress: any;

      try {
        for await (const progress of pipeline.buildContextStream(query, options)) {
          const progressBar = formatProgress(progress.progress);
          const phase = progress.phase.padEnd(10);
          const time = formatTime(progress.processingTimeMs || 0);

          console.log(`   ${progressBar} ${phase} (${time})`);

          if (progress.qualityScore !== undefined) {
            console.log(
              colorize(
                `   🎯 Quality Score: ${(progress.qualityScore * 100).toFixed(1)}%`,
                'green',
              ),
            );
          }

          finalProgress = progress;
        }

        const queryTime = performance.now() - queryStartTime;

        // Build final context for detailed analysis
        console.log(colorize('\n📊 Building final context...', 'blue'));
        const context = await pipeline.buildContext(query, options);

        // Display results
        console.log(colorize('\n📋 Results:', 'bright'));
        console.log(`   📈 Sources found: ${colorize(context.sources.length.toString(), 'green')}`);
        console.log(
          `   ⭐ Relevance Score: ${colorize((context.qualityMetrics.relevanceScore * 100).toFixed(1) + '%', 'green')}`,
        );
        console.log(
          `   🎨 Diversity Score: ${colorize((context.qualityMetrics.diversityScore * 100).toFixed(1) + '%', 'blue')}`,
        );
        console.log(
          `   📝 Completeness: ${colorize((context.qualityMetrics.completenessScore * 100).toFixed(1) + '%', 'magenta')}`,
        );
        console.log(
          `   🎯 Confidence: ${colorize((context.qualityMetrics.confidenceScore * 100).toFixed(1) + '%', 'cyan')}`,
        );

        console.log(colorize('\n⏱️  Processing Breakdown:', 'yellow'));
        console.log(`   🔤 Embedding: ${formatTime(context.processingStats.embeddingTimeMs)}`);
        console.log(`   🔍 Retrieval: ${formatTime(context.processingStats.retrievalTimeMs)}`);
        console.log(`   🎯 Reranking: ${formatTime(context.processingStats.rerankingTimeMs)}`);
        console.log(`   📋 Total: ${formatTime(context.processingStats.totalTimeMs)}`);

        console.log(colorize('\n🏷️  Metadata:', 'dim'));
        console.log(
          `   📊 Strategy: ${context.metadata.strategy.embedding.model} + ${context.metadata.strategy.reranking.model}`,
        );
        console.log(`   🔄 Fallback Used: ${context.metadata.fallbackUsed ? '✅' : '❌'}`);
        console.log(
          `   📈 Candidates: ${context.metadata.candidatesProcessed} → ${context.metadata.finalCandidateCount}`,
        );

        // Show top sources
        console.log(colorize('\n🏆 Top Sources:', 'bright'));
        context.sources.slice(0, 3).forEach((source, idx) => {
          console.log(
            `   ${idx + 1}. Score: ${colorize((source.score * 100).toFixed(1) + '%', 'green')} | ${source.content.slice(0, 80)}...`,
          );
        });
      } catch (error) {
        console.log(colorize(`❌ Query failed: ${error}`, 'red'));
      }
    }

    // Demonstrate multi-agent coordination
    console.log(colorize('\n🤖 Multi-Agent Coordination Demo', 'bright'));
    console.log(colorize('=================================', 'dim'));

    try {
      const complexQuery =
        'How can we optimize machine learning model performance while ensuring ethical AI practices?';
      console.log(colorize(`Query: "${complexQuery}"`, 'white'));

      const agentStartTime = performance.now();
      const multiAgentResult = await pipeline.coordinateWithAgents(complexQuery, [
        'retrieval',
        'reasoning',
        'safety',
      ]);
      const agentTime = performance.now() - agentStartTime;

      console.log(colorize('\n📊 Multi-Agent Results:', 'green'));
      console.log(`   👥 Agents: ${multiAgentResult.coordinationMetrics.totalAgents}`);
      console.log(`   ✅ Successful: ${multiAgentResult.coordinationMetrics.successfulAgents}`);
      console.log(
        `   ⏱️  Time: ${formatTime(multiAgentResult.coordinationMetrics.aggregationTimeMs)}`,
      );
      console.log(
        `   📈 Quality Gain: ${colorize((multiAgentResult.coordinationMetrics.qualityGain * 100).toFixed(1) + '%', 'green')}`,
      );

      console.log(colorize('\n👥 Agent Contributions:', 'blue'));
      multiAgentResult.agentContributions.forEach((contrib, idx) => {
        console.log(
          `   ${idx + 1}. ${contrib.capability}: ${formatTime(contrib.processingTime)} | Quality: ${(contrib.contribution.qualityMetrics.confidenceScore * 100).toFixed(1)}%`,
        );
      });
    } catch (error) {
      console.log(colorize(`⚠️  Multi-agent coordination not fully available: ${error}`, 'yellow'));
    }

    // MLX Services Coordination Demo
    console.log(colorize('\n🧠 MLX Services Coordination', 'bright'));
    console.log(colorize('=============================', 'dim'));

    const coordination = await pipeline.coordinateMLXServices('Test coordination query');

    console.log(colorize('🔗 Service Status:', 'blue'));
    console.log(
      `   🔤 Embeddings: ${coordination.servicesAvailable.embeddings ? '🟢 Available' : '🔴 Unavailable'}`,
    );
    console.log(
      `   🎯 Reranker: ${coordination.servicesAvailable.reranker ? '🟢 Available' : '🔴 Unavailable'}`,
    );

    console.log(colorize('\n⚖️  Load Balancing:', 'yellow'));
    console.log(`   💡 Decision: ${coordination.loadBalancingDecision.reasoning}`);
    if (coordination.loadBalancingDecision.selectedEmbeddingService) {
      console.log(
        `   🔤 Selected Embedding: ${coordination.loadBalancingDecision.selectedEmbeddingService}`,
      );
    }
    if (coordination.loadBalancingDecision.selectedRerankerService) {
      console.log(
        `   🎯 Selected Reranker: ${coordination.loadBalancingDecision.selectedRerankerService}`,
      );
    }

    // Performance Analysis
    console.log(colorize('\n📈 Performance Metrics', 'bright'));
    console.log(colorize('====================', 'dim'));

    const metrics = pipeline.getMetrics();
    console.log(colorize('🎯 Pipeline Metrics:', 'green'));
    console.log(`   📊 Total Queries: ${colorize(metrics.totalQueries.toString(), 'cyan')}`);
    console.log(
      `   💨 Cache Hits: ${colorize(metrics.cacheHits.toString(), 'green')} (${colorize((metrics.cacheHitRate * 100).toFixed(1) + '%', 'green')})`,
    );
    console.log(`   🔄 Fallbacks: ${colorize(metrics.fallbacksUsed.toString(), 'yellow')}`);
    console.log(`   ⏱️  Avg Latency: ${formatTime(metrics.averageLatency)}`);
    console.log(
      `   ⭐ Avg Quality: ${colorize((metrics.averageQuality * 100).toFixed(1) + '%', 'green')}`,
    );
    console.log(`   🔤 Embedding Reqs: ${colorize(metrics.embeddingRequests.toString(), 'blue')}`);
    console.log(
      `   🎯 Reranking Reqs: ${colorize(metrics.rerankingRequests.toString(), 'magenta')}`,
    );
    console.log(
      `   🤖 Multi-Agent Queries: ${colorize(metrics.multiAgentQueries.toString(), 'cyan')}`,
    );
    console.log(`   ❌ Errors: ${colorize(metrics.errors.toString(), 'red')}`);

    console.log(colorize('\n💾 Cache Status:', 'blue'));
    console.log(
      `   📋 Context Cache: ${colorize(metrics.contextCacheSize.toString(), 'cyan')} items`,
    );
    console.log(
      `   🔍 Query Analysis Cache: ${colorize(metrics.queryAnalysisCacheSize.toString(), 'yellow')} items`,
    );
    console.log(
      `   🎯 Model Selection Cache: ${colorize(metrics.modelSelectionCacheSize.toString(), 'magenta')} items`,
    );

    console.log(colorize('\n🏥 Service Health:', 'green'));
    Object.entries(metrics.servicesHealthy).forEach(([service, status]) => {
      const statusIcon = status === 'available' ? '🟢' : '🔴';
      console.log(`   ${statusIcon} ${service}: ${status}`);
    });

    // Health Check
    console.log(colorize('\n🏥 Comprehensive Health Check', 'bright'));
    console.log(colorize('===============================', 'dim'));

    const healthCheck = await pipeline.healthCheck();
    console.log(
      `Overall Health: ${healthCheck.healthy ? colorize('🟢 Healthy', 'green') : colorize('🔴 Unhealthy', 'red')}`,
    );

    if (healthCheck.details.services) {
      console.log(colorize('\n🔧 Service Details:', 'blue'));
      Object.entries(healthCheck.details.services).forEach(([service, details]: [string, any]) => {
        const status = typeof details === 'boolean' ? details : details.healthy;
        const statusIcon = status ? '🟢' : '🔴';
        console.log(`   ${statusIcon} ${service}: ${status ? 'Healthy' : 'Unhealthy'}`);
      });
    }

    // Cleanup
    console.log(colorize('\n🧹 Shutting down pipeline...', 'yellow'));
    await pipeline.shutdown();

    const totalTime = performance.now() - startTime;

    console.log(colorize('\n✨ Demo Complete!', 'bright'));
    console.log(colorize('================', 'dim'));
    console.log(`Total Demo Time: ${formatTime(totalTime)}`);
    console.log(
      colorize(
        '🎉 Enhanced RAG Pipeline successfully demonstrated Node.js native TypeScript execution!',
        'green',
      ),
    );
  } catch (error) {
    console.error(colorize(`\n❌ Demo failed: ${error}`, 'red'));
    if (error instanceof Error) {
      console.error(colorize(`Stack trace: ${error.stack}`, 'dim'));
    }
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(colorize('\n\n👋 Demo interrupted. Shutting down gracefully...', 'yellow'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(colorize('\n\n👋 Demo terminated. Shutting down gracefully...', 'yellow'));
  process.exit(0);
});

// Run the demo
if (require.main === module) {
  main().catch((error) => {
    console.error(colorize(`\n💥 Unhandled error: ${error}`, 'red'));
    process.exit(1);
  });
}

export { main as runEnhancedRagDemo };
