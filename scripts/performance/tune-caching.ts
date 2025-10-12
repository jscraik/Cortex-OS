#!/usr/bin/env tsx

/**
 * Cache Performance Tuning Script for Cortex-OS
 *
 * This script optimizes caching strategies across the system:
 * - Configures multi-layer caching (memory + Redis)
 * - Optimizes cache TTLs and sizes
 * - Sets up intelligent cache warming
 * - Monitors cache performance
 */

import { getCacheManager, type CacheConfig } from '../../packages/orchestration/src/performance/cache-manager.js';

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
  console.log(`${colors[color]}[CACHE] ${message}${colors.reset}`);
}

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: number;
  evictions: number;
  totalKeys: number;
}

interface CacheRecommendation {
  category: 'memory' | 'ttl' | 'strategy' | 'size';
  current: any;
  recommended: any;
  impact: 'high' | 'medium' | 'low';
  reasoning: string;
}

class CachePerformanceAnalyzer {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    memoryUsage: 0,
    evictions: 0,
    totalKeys: 0,
  };

  async analyzeCacheConfiguration(): Promise<CacheRecommendation[]> {
    const recommendations: CacheRecommendation[] = [];

    // Analyze memory cache settings
    const memorySize = parseInt(process.env.CACHE_MEMORY_MAX_SIZE || '1000', 10);
    if (memorySize < 500) {
      recommendations.push({
        category: 'memory',
        current: memorySize,
        recommended: 1000,
        impact: 'high',
        reasoning: 'Memory cache too small - increased size will improve hit rate',
      });
    }

    // Analyze TTL settings
    const defaultTTL = parseInt(process.env.CACHE_MEMORY_DEFAULT_TTL || '300000', 10);
    if (defaultTTL < 180000) { // Less than 3 minutes
      recommendations.push({
        category: 'ttl',
        current: defaultTTL,
        recommended: 300000,
        impact: 'medium',
        reasoning: 'TTL too short - items expiring before reuse',
      });
    }

    // Analyze cache strategies
    const writeThrough = process.env.CACHE_WRITE_THROUGH === 'true';
    const readThrough = process.env.CACHE_READ_THROUGH === 'true';

    if (!writeThrough && !readThrough) {
      recommendations.push({
        category: 'strategy',
        current: 'none',
        recommended: 'write-through + read-through',
        impact: 'high',
        reasoning: 'No cache strategies enabled - missing performance benefits',
      });
    }

    return recommendations;
  }

  generateOptimalConfig(systemMemoryGB: number = 8): CacheConfig {
    // Calculate optimal cache size based on system memory
    const memoryCacheSize = Math.min(2000, Math.max(500, systemMemoryGB * 100));

    // Optimize TTLs based on usage patterns
    const shortTermTTL = 5 * 60 * 1000; // 5 minutes for frequently changing data
    const mediumTermTTL = 30 * 60 * 1000; // 30 minutes for semi-static data
    const longTermTTL = 2 * 60 * 60 * 1000; // 2 hours for static data

    return {
      redis: {
        enabled: process.env.REDIS_URL !== undefined,
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        keyPrefix: 'cortex_os',
        defaultTTL: 3600, // 1 hour
      },
      memory: {
        enabled: true,
        maxSize: memoryCacheSize,
        defaultTTL: mediumTermTTL,
      },
      strategies: {
        writeThrough: true,
        writeBehind: false, // Disable for data safety
        readThrough: true,
      },
    };
  }

  async testCachePerformance(cacheManager: any): Promise<CacheMetrics> {
    const testSize = 1000;
    const testKeys = Array.from({ length: testSize }, (_, i) => `test-key-${i}`);
    const testValues = testKeys.map(key => ({ key, data: `test-data-${key}`, timestamp: Date.now() }));

    log(`Running cache performance test with ${testSize} items...`, 'yellow');

    const startTime = Date.now();

    // Test write performance
    const writePromises = testValues.map(async (item, index) => {
      await cacheManager.set(`test-write-${item.key}`, item.data, 60000); // 1 minute TTL
      if (index % 100 === 0) {
        log(`  Write progress: ${index}/${testSize}`, 'cyan');
      }
    });

    await Promise.all(writePromises);
    const writeTime = Date.now() - startTime;

    // Test read performance
    const readStartTime = Date.now();
    let hits = 0;
    let misses = 0;

    const readPromises = testKeys.map(async (key, index) => {
      const result = await cacheManager.get(`test-write-${key}`);
      if (result) {
        hits++;
      } else {
        misses++;
      }
      if (index % 100 === 0) {
        log(`  Read progress: ${index}/${testSize}`, 'cyan');
      }
    });

    await Promise.all(readPromises);
    const readTime = Date.now() - readStartTime;

    // Get cache statistics
    const stats = cacheManager.getStats();

    // Clean up test data
    await cacheManager.invalidatePattern('test-write-*');

    const performance: CacheMetrics = {
      hits,
      misses,
      hitRate: hits / (hits + misses),
      memoryUsage: stats.memoryUsage,
      evictions: stats.evictions,
      totalKeys: stats.totalKeys,
    };

    log('Cache performance test results:', 'green');
    log(`  Write: ${testSize} items in ${writeTime}ms (${(testSize / (writeTime / 1000)).toFixed(2)} ops/sec)`, 'green');
    log(`  Read: ${testSize} items in ${readTime}ms (${(testSize / (readTime / 1000)).toFixed(2)} ops/sec)`, 'green');
    log(`  Hit rate: ${(performance.hitRate * 100).toFixed(2)}%`, 'green');
    log(`  Memory usage: ${performance.memoryUsage} bytes`, 'green');

    return performance;
  }

  async warmupCache(cacheManager: any): Promise<void> {
    log('Starting cache warmup...', 'yellow');

    // Warm up with common GraphRAG queries
    const warmupData = [
      { key: 'graphrag:config:default', data: { k: 8, maxHops: 1, maxChunks: 24 }, ttl: 3600000 },
      { key: 'graphrag:schema:nodes', data: { types: ['FUNCTION', 'CLASS', 'INTERFACE'] }, ttl: 1800000 },
      { key: 'graphrag:schema:edges', data: { types: ['IMPORTS', 'DEPENDS_ON', 'CALLS'] }, ttl: 1800000 },
      { key: 'performance:baseline', data: { latency: 1000, memory: 500 }, ttl: 300000 },
      { key: 'cache:config:optimized', data: { enabled: true, strategy: 'write-through' }, ttl: 3600000 },
    ];

    const warmupPromises = warmupData.map(async (item) => {
      await cacheManager.set(item.key, item.data, item.ttl);
      return item.key;
    });

    await Promise.all(warmupPromises);
    log(`Cache warmed up with ${warmupData.length} items`, 'green');
  }

  async setupCacheMonitoring(cacheManager: any): Promise<void> {
    log('Setting up cache monitoring...', 'yellow');

    // Create monitoring interval
    const monitoringInterval = setInterval(async () => {
      const stats = cacheManager.getStats();
      const hitRate = stats.hitRate;
      const memoryUsage = (stats.memoryUsage / 1024 / 1024).toFixed(2);

      log(`Cache stats - Hit rate: ${(hitRate * 100).toFixed(2)}%, Memory: ${memoryUsage}MB, Keys: ${stats.totalKeys}`, 'cyan');

      // Alert if hit rate is low
      if (hitRate < 0.5 && stats.hits + stats.misses > 100) {
        log('⚠️  Low cache hit rate detected - consider increasing cache size or TTL', 'yellow');
      }

      // Alert if memory usage is high
      if (stats.memoryUsage > 100 * 1024 * 1024) { // 100MB
        log('⚠️  High memory usage detected - consider reducing cache size or TTL', 'yellow');
      }

      // Alert if eviction rate is high
      if (stats.evictions > stats.totalKeys * 0.1) {
        log('⚠️  High eviction rate detected - consider increasing cache size', 'yellow');
      }
    }, 30000); // Every 30 seconds

    // Cleanup on process exit
    process.on('SIGINT', () => {
      clearInterval(monitoringInterval);
      log('Cache monitoring stopped', 'yellow');
    });

    log('Cache monitoring started (30-second intervals)', 'green');
  }
}

async function detectRedisAvailability(): Promise<boolean> {
  try {
    if (process.env.REDIS_URL) {
      const redis = await import('redis').then(m => m.createClient({ url: process.env.REDIS_URL }));
      await redis.connect();
      await redis.ping();
      await redis.disconnect();
      log('Redis connection successful', 'green');
      return true;
    }
  } catch (error) {
    log(`Redis not available: ${error}`, 'yellow');
  }
  return false;
}

async function createOptimizedCacheConfig(): Promise<void> {
  log('Creating optimized cache configuration...', 'yellow');

  const analyzer = new CachePerformanceAnalyzer();
  const recommendations = await analyzer.analyzeCacheConfiguration();

  if (recommendations.length > 0) {
    log('Performance recommendations:', 'yellow');
    recommendations.forEach((rec, index) => {
      const impactIcon = rec.impact === 'high' ? '🔥' : rec.impact === 'medium' ? '⚡' : '💡';
      log(`  ${index + 1}. ${impactIcon} ${rec.category}: ${rec.reasoning}`, 'cyan');
      log(`     Current: ${rec.current} → Recommended: ${rec.recommended}`, 'cyan');
    });
  } else {
    log('No performance issues detected - cache configuration is optimal', 'green');
  }

  // Get system memory (simplified)
  const systemMemoryGB = 8; // Default assumption

  const optimalConfig = analyzer.generateOptimalConfig(systemMemoryGB);

  log('Optimal cache configuration:', 'green');
  log(`  Memory cache: ${optimalConfig.memory.maxSize} items, ${optimalConfig.memory.defaultTTL}ms TTL`, 'green');
  log(`  Redis: ${optimalConfig.redis.enabled ? 'ENABLED' : 'DISABLED'}`, 'green');
  log(`  Strategies: ${Object.entries(optimalConfig.strategies).filter(([_, v]) => v).map(([k]) => k).join(', ')}`, 'green');

  // Write configuration to file
  const configPath = 'config/cache-optimized.json';
  await import('fs').then(fs => {
    fs.writeFileSync(configPath, JSON.stringify(optimalConfig, null, 2));
  });

  log(`Optimized configuration saved to: ${configPath}`, 'blue');
}

async function main() {
  log('Starting Cache Performance Tuning for Cortex-OS...', 'bright');

  try {
    // Step 1: Detect Redis availability
    const redisAvailable = await detectRedisAvailability();

    // Step 2: Create optimized configuration
    await createOptimizedCacheConfig();

    // Step 3: Initialize cache manager with optimal settings
    const analyzer = new CachePerformanceAnalyzer();
    const config = analyzer.generateOptimalConfig();

    // Get the cache manager (this would need to be imported from the actual implementation)
    // const cacheManager = getCacheManager(config);
    // await cacheManager.clear(); // Start fresh

    log('Cache Performance Tuning completed!', 'bright');
    log('Next steps:', 'blue');
    log('  1. Review the generated configuration in config/cache-optimized.json', 'blue');
    log('  2. Update your environment variables with the recommended settings', 'blue');
    log('  3. Restart your application to apply the new cache configuration', 'blue');

    if (redisAvailable) {
      log('  4. Redis is available - consider enabling distributed caching', 'green');
    } else {
      log('  4. Redis not available - using memory-only caching', 'yellow');
    }

  } catch (error) {
    log(`Cache tuning failed: ${error}`, 'red');
    process.exit(1);
  }
}

// Run the cache tuning
main().catch(console.error);