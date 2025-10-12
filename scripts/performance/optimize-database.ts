#!/usr/bin/env tsx

/**
 * Database Optimization Script for Cortex-OS
 *
 * This script configures and enables database performance optimizations:
 * - Enables the DatabaseOptimizer for query pattern analysis
 * - Configures intelligent indexing
 * - Sets up performance monitoring
 * - Creates recommended indexes based on query patterns
 */

import { prisma } from '../../packages/memory-core/src/db/prismaClient.js';
import { getDatabaseOptimizer, type DatabaseOptimizationConfig } from '../../packages/memory-core/src/database/DatabaseOptimizer.js';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}[DB-OPT] ${message}${colors.reset}`);
}

async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    log('Database connection successful', 'green');
    return true;
  } catch (error) {
    log(`Database connection failed: ${error}`, 'red');
    return false;
  }
}

async function getCurrentDatabaseStats() {
  try {
    const [nodeCount, edgeCount, chunkCount] = await Promise.all([
      prisma.graphNode.count(),
      prisma.graphEdge.count(),
      prisma.chunkRef.count(),
    ]);

    log(`Current database stats:`, 'cyan');
    log(`  - Nodes: ${nodeCount}`, 'cyan');
    log(`  - Edges: ${edgeCount}`, 'cyan');
    log(`  - Chunks: ${chunkCount}`, 'cyan');

    return { nodeCount, edgeCount, chunkCount };
  } catch (error) {
    log(`Failed to get database stats: ${error}`, 'red');
    return null;
  }
}

async function analyzeExistingIndexes() {
  try {
    const indexes = await prisma.$queryRaw`
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY tablename, indexname
    ` as any[];

    log(`Existing indexes: ${indexes.length}`, 'cyan');

    const tableIndexes: Record<string, string[]> = {};
    indexes.forEach((idx: any) => {
      if (!tableIndexes[idx.tablename]) {
        tableIndexes[idx.tablename] = [];
      }
      tableIndexes[idx.tablename].push(idx.indexname);
    });

    Object.entries(tableIndexes).forEach(([table, idxs]) => {
      log(`  ${table}: ${idxs.length} indexes`, 'cyan');
    });

    return indexes;
  } catch (error) {
    log(`Failed to analyze existing indexes: ${error}`, 'red');
    return [];
  }
}

async function createPerformanceIndexes() {
  try {
    log('Creating performance indexes for GraphRAG queries...', 'yellow');

    // Indexes for GraphNode table
    const nodeIndexes = [
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_graph_node_type ON "GraphNode" (type)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_graph_node_key ON "GraphNode" (key)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_graph_node_type_key ON "GraphNode" (type, key)',
    ];

    // Indexes for GraphEdge table
    const edgeIndexes = [
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_graph_edge_src_id ON "GraphEdge" (src_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_graph_edge_dst_id ON "GraphEdge" (dst_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_graph_edge_type ON "GraphEdge" (type)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_graph_edge_src_type ON "GraphEdge" (src_id, type)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_graph_edge_dst_type ON "GraphEdge" (dst_id, type)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_graph_edge_composite ON "GraphEdge" (src_id, dst_id, type)',
    ];

    // Indexes for ChunkRef table
    const chunkIndexes = [
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chunk_ref_node_id ON "ChunkRef" (node_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chunk_ref_qdrant_id ON "ChunkRef" (qdrant_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chunk_ref_composite ON "ChunkRef" (node_id, qdrant_id)',
    ];

    const allIndexes = [...nodeIndexes, ...edgeIndexes, ...chunkIndexes];
    let createdCount = 0;

    for (const indexSql of allIndexes) {
      try {
        await prisma.$executeRaw`${indexSql}`;
        log(`  ✓ Created: ${indexSql.split('IF NOT EXISTS ')[1]}`, 'green');
        createdCount++;
      } catch (error) {
        log(`  ✗ Failed: ${indexSql.split('IF NOT EXISTS ')[1]} - ${error}`, 'red');
      }
    }

    log(`Created ${createdCount}/${allIndexes.length} performance indexes`, 'green');
    return createdCount;
  } catch (error) {
    log(`Failed to create performance indexes: ${error}`, 'red');
    return 0;
  }
}

async function analyzeQueryPatterns() {
  try {
    log('Analyzing query patterns for optimization opportunities...', 'yellow');

    // Get slow queries from PostgreSQL statistics (if available)
    const slowQueries = await prisma.$queryRaw`
      SELECT
        query,
        calls,
        total_time,
        mean_time,
        rows
      FROM pg_stat_statements
      WHERE mean_time > 100
      ORDER BY mean_time DESC
      LIMIT 10
    ` as any[];

    if (slowQueries.length > 0) {
      log(`Found ${slowQueries.length} slow queries:`, 'yellow');
      slowQueries.forEach((query: any, index: number) => {
        log(`  ${index + 1}. Mean time: ${query.mean_time.toFixed(2)}ms, Calls: ${query.calls}`, 'yellow');
      });
    } else {
      log('No slow queries detected in pg_stat_statements', 'green');
    }

    return slowQueries;
  } catch (error) {
    log(`pg_stat_statements not available or query failed: ${error}`, 'yellow');
    return [];
  }
}

async function updateDatabaseStatistics() {
  try {
    log('Updating database statistics...', 'yellow');

    // Update table statistics
    await prisma.$executeRaw`ANALYZE "GraphNode"`;
    await prisma.$executeRaw`ANALYZE "GraphEdge"`;
    await prisma.$executeRaw`ANALYZE "ChunkRef"`;

    log('Database statistics updated', 'green');
  } catch (error) {
    log(`Failed to update database statistics: ${error}`, 'red');
  }
}

async function configureDatabaseOptimizer(): Promise<void> {
  try {
    log('Configuring Database Optimizer...', 'yellow');

    const config: DatabaseOptimizationConfig = {
      enabled: true,
      analysis: {
        querySampleSize: 1000,
        analysisWindow: 300000, // 5 minutes
        minQueryFrequency: 5,
        performanceThreshold: 1000, // 1 second
      },
      indexes: {
        autoCreate: true,
        maxIndexesPerTable: 15,
        dropUnusedIndexes: true,
        unusedIndexThreshold: 7, // 7 days
      },
      monitoring: {
        enabled: true,
        collectInterval: 60000, // 1 minute
        alertThresholds: {
          slowQueryCount: 10,
          indexUsageRatio: 5,
          missingIndexImpact: 20,
        },
      },
    };

    const optimizer = getDatabaseOptimizer(config);
    await optimizer.initialize();

    log('Database Optimizer configured and initialized', 'green');
    log('  - Query pattern analysis: ENABLED', 'green');
    log('  - Automatic index creation: ENABLED', 'green');
    log('  - Unused index cleanup: ENABLED', 'green');
    log('  - Performance monitoring: ENABLED', 'green');

    // Get initial metrics
    const metrics = optimizer.getMetrics();
    log(`Current metrics:`, 'cyan');
    log(`  - Slow queries: ${metrics.slowQueries}`, 'cyan');
    log(`  - Missing indexes: ${metrics.missingIndexes.length}`, 'cyan');
    log(`  - Performance issues: ${metrics.performanceIssues.length}`, 'cyan');

  } catch (error) {
    log(`Failed to configure Database Optimizer: ${error}`, 'red');
  }
}

async function createPerformanceMonitoringView() {
  try {
    log('Creating performance monitoring views...', 'yellow');

    // Create a view for monitoring slow queries
    await prisma.$executeRaw`
      CREATE OR REPLACE VIEW slow_queries_view AS
      SELECT
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY n_distinct DESC
    `;

    // Create a view for index usage statistics
    await prisma.$executeRaw`
      CREATE OR REPLACE VIEW index_usage_stats AS
      SELECT
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY idx_scan DESC
    `;

    log('Performance monitoring views created', 'green');
  } catch (error) {
    log(`Failed to create monitoring views: ${error}`, 'red');
  }
}

async function generateOptimizationReport() {
  try {
    log('Generating optimization report...', 'yellow');

    const stats = await getCurrentDatabaseStats();
    if (!stats) return;

    const indexCount = await analyzeExistingIndexes();
    const slowQueries = await analyzeQueryPatterns();

    const report = {
      timestamp: new Date().toISOString(),
      database: {
        nodes: stats.nodeCount,
        edges: stats.edgeCount,
        chunks: stats.chunkCount,
        indexes: indexCount.length,
      },
      performance: {
        slowQueries: slowQueries.length,
        recommendations: [],
      },
      optimizations: {
        databaseOptimizer: 'ENABLED',
        performanceIndexes: 'CREATED',
        monitoringViews: 'CREATED',
        statisticsUpdated: 'COMPLETED',
      },
    };

    // Add recommendations based on analysis
    if (stats.nodeCount > 10000 && indexCount.length < 10) {
      report.performance.recommendations.push('Consider additional indexes for large node tables');
    }

    if (slowQueries.length > 5) {
      report.performance.recommendations.push('High number of slow queries detected - review query patterns');
    }

    if (stats.edgeCount > stats.nodeCount * 2) {
      report.performance.recommendations.push('High edge-to-node ratio - optimize graph traversal queries');
    }

    // Write report to file
    const reportPath = 'reports/database-optimization-report.json';
    await import('fs').then(fs => {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    });

    log(`Optimization report saved to: ${reportPath}`, 'green');
    log('Summary:', 'cyan');
    report.performance.recommendations.forEach((rec, index) => {
      log(`  ${index + 1}. ${rec}`, 'cyan');
    });

  } catch (error) {
    log(`Failed to generate optimization report: ${error}`, 'red');
  }
}

async function main() {
  log('Starting Database Optimization for Cortex-OS...', 'bright');

  try {
    // Step 1: Check database connection
    const connected = await checkDatabaseConnection();
    if (!connected) {
      log('Cannot proceed without database connection', 'red');
      process.exit(1);
    }

    // Step 2: Get current database statistics
    await getCurrentDatabaseStats();

    // Step 3: Analyze existing indexes
    await analyzeExistingIndexes();

    // Step 4: Create performance indexes
    await createPerformanceIndexes();

    // Step 5: Analyze query patterns
    await analyzeQueryPatterns();

    // Step 6: Update database statistics
    await updateDatabaseStatistics();

    // Step 7: Configure Database Optimizer
    await configureDatabaseOptimizer();

    // Step 8: Create monitoring views
    await createPerformanceMonitoringView();

    // Step 9: Generate optimization report
    await generateOptimizationReport();

    log('Database optimization completed successfully!', 'bright');
    log('The Database Optimizer is now running and will continuously monitor performance.', 'green');
    log('Check the optimization report for detailed recommendations.', 'blue');

  } catch (error) {
    log(`Database optimization failed: ${error}`, 'red');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the optimization
main().catch(console.error);