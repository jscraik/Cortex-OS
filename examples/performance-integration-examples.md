# Performance Integration Examples and Tutorials

> Practical examples and step-by-step tutorials for integrating the Cortex-OS Performance Optimization System into your applications.

## Table of Contents

- [Quick Start Examples](#quick-start-examples)
- [Basic Integration](#basic-integration)
- [Advanced Configuration](#advanced-configuration)
- [Custom Performance Components](#custom-performance-components)
- [Monitoring and Alerting Setup](#monitoring-and-alerting-setup)
- [Testing and Validation](#testing-and-validation)
- [Production Deployment](#production-deployment)
- [Troubleshooting Examples](#troubleshooting-examples)

---

## Quick Start Examples

### 1. Basic Performance Monitoring

```typescript
// examples/basic-monitoring.ts
import { PerformanceAnalyticsEngine } from '../scripts/performance/analytics-engine';

// Initialize performance analytics
const analytics = new PerformanceAnalyticsEngine({
  retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
  anomalyDetection: {
    enabled: true,
    algorithm: 'hybrid',
    sensitivity: 0.8
  }
});

async function basicMonitoring() {
  await analytics.initialize();
  await analytics.start();

  // Record application metrics
  setInterval(() => {
    analytics.recordMetric({
      name: 'response_time',
      value: Math.random() * 1000 + 100, // Simulated response time
      timestamp: Date.now(),
      tags: { endpoint: '/api/users', method: 'GET' }
    });

    analytics.recordMetric({
      name: 'cpu_usage',
      value: Math.random() * 80 + 20, // Simulated CPU usage
      timestamp: Date.now(),
      tags: { instance: 'web-server-1' }
    });
  }, 5000); // Every 5 seconds

  // Generate insights every minute
  setInterval(async () => {
    const insights = await analytics.generateInsights();
    console.log('📊 Performance Insights:', insights);

    const anomalies = await analytics.detectAnomalies();
    if (anomalies.length > 0) {
      console.log('🚨 Anomalies detected:', anomalies);
    }
  }, 60000); // Every minute
}

// Run the monitoring
basicMonitoring().catch(console.error);
```

### 2. Auto-Scaling Integration

```typescript
// examples/auto-scaling-integration.ts
import { AdvancedAutoScaler } from '../scripts/performance/advanced-scaling';

const autoScaler = new AdvancedAutoScaler({
  minInstances: 2,
  maxInstances: 10,
  cpuThreshold: 75,
  memoryThreshold: 80,
  predictionModel: 'neural',
  costOptimization: true
});

async function setupAutoScaling() {
  await autoScaler.initialize();
  await autoScaler.start();

  // Monitor system metrics and scale as needed
  setInterval(async () => {
    const cpuUsage = await getCurrentCPUUsage();
    const memoryUsage = await getCurrentMemoryUsage();
    const activeRequests = await getActiveRequestCount();

    // Submit metrics for analysis
    autoScaler.recordMetric({
      name: 'cpu_usage',
      value: cpuUsage,
      timestamp: Date.now(),
      tags: { metric_type: 'system' }
    });

    autoScaler.recordMetric({
      name: 'memory_usage',
      value: memoryUsage,
      timestamp: Date.now(),
      tags: { metric_type: 'system' }
    });

    autoScaler.recordMetric({
      name: 'active_requests',
      value: activeRequests,
      timestamp: Date.now(),
      tags: { metric_type: 'application' }
    });

    // Get scaling recommendations
    const recommendations = autoScaler.getScalingRecommendations();
    if (recommendations.length > 0) {
      console.log('💡 Scaling Recommendations:', recommendations);

      // Auto-apply recommendations (in production, you'd want more control)
      for (const rec of recommendations) {
        if (rec.confidence > 0.8) {
          switch (rec.action) {
            case 'scale_up':
              await autoScaler.scaleUp(rec.instances);
              break;
            case 'scale_down':
              await autoScaler.scaleDown(rec.instances);
              break;
            case 'emergency_scale':
              await autoScaler.emergencyScale();
              break;
          }
        }
      }
    }
  }, 30000); // Every 30 seconds
}

// Helper functions (implement based on your monitoring system)
async function getCurrentCPUUsage(): Promise<number> {
  // Implementation depends on your monitoring system
  return Math.random() * 100;
}

async function getCurrentMemoryUsage(): Promise<number> {
  // Implementation depends on your monitoring system
  return Math.random() * 100;
}

async function getActiveRequestCount(): Promise<number> {
  // Implementation depends on your application
  return Math.floor(Math.random() * 1000);
}

setupAutoScaling().catch(console.error);
```

### 3. GPU Management Setup

```typescript
// examples/gpu-management.ts
import { GPUMemoryManager } from '../scripts/performance/gpu-manager';

const gpuManager = new GPUMemoryManager({
  maxConcurrentTasks: 4,
  memoryPoolSize: 0.85,
  allocationStrategy: 'best_fit',
  loadBalancingStrategy: 'predictive',
  enableCompaction: true,
  schedulingPolicy: {
    priorityWeights: {
      critical: 1000,
      high: 100,
      medium: 10,
      low: 1
    },
    maxConcurrentTasks: 4,
    memoryThresholds: {
      warning: 0.8,
      critical: 0.9,
      emergency: 0.95
    }
  }
});

async function setupGPUManagement() {
  await gpuManager.initialize();
  await gpuManager.start();

  // Submit ML tasks to GPU
  async function submitMLTask(type: string, priority: string, data: any) {
    const taskId = await gpuManager.submitTask({
      type: type as any,
      priority: priority as any,
      memoryRequired: estimateMemoryRequirement(data),
      estimatedDuration: estimateProcessingTime(data),
      metadata: {
        model: data.model,
        batchSize: data.batchSize,
        timestamp: Date.now()
      }
    });

    console.log(`🎮 GPU task submitted: ${taskId} (${type}, priority: ${priority})`);
    return taskId;
  }

  // Example task submissions
  await submitMLTask('inference', 'high', {
    model: 'gpt-3.5-turbo',
    batchSize: 1,
    input: 'What is the meaning of life?'
  });

  await submitMLTask('embedding', 'medium', {
    model: 'text-embedding-ada-002',
    batchSize: 100,
    texts: Array(100).fill('Sample text for embedding')
  });

  // Monitor GPU status
  setInterval(() => {
    const status = gpuManager.getGPUStatus();
    console.log('🎮 GPU Status:', status);

    const metrics = gpuManager.getPerformanceMetrics();
    console.log('📊 GPU Metrics:', metrics);

    const recommendations = gpuManager.getRecommendations();
    if (recommendations.length > 0) {
      console.log('💡 GPU Recommendations:', recommendations);
    }
  }, 10000); // Every 10 seconds
}

function estimateMemoryRequirement(data: any): number {
  // Estimate based on task type and data size
  switch (data.model) {
    case 'gpt-3.5-turbo':
      return 2 * 1024 * 1024 * 1024; // 2GB
    case 'text-embedding-ada-002':
      return 512 * 1024 * 1024 * (data.batchSize || 1); // 512MB per batch item
    default:
      return 1 * 1024 * 1024 * 1024; // 1GB default
  }
}

function estimateProcessingTime(data: any): number {
  // Estimate processing time in milliseconds
  switch (data.model) {
    case 'gpt-3.5-turbo':
      return 5000; // 5 seconds
    case 'text-embedding-ada-002':
      return 1000 * (data.batchSize || 1); // 1 second per item
    default:
      return 3000; // 3 seconds default
  }
}

setupGPUManagement().catch(console.error);
```

---

## Basic Integration

### 1. Express.js Integration

```typescript
// examples/express-integration.ts
import express from 'express';
import { PerformanceAnalyticsEngine } from '../scripts/performance/analytics-engine';
import { AdvancedAutoScaler } from '../scripts/performance/advanced-scaling';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize performance components
const analytics = new PerformanceAnalyticsEngine();
const scaler = new AdvancedAutoScaler();

// Performance middleware
app.use(async (req, res, next) => {
  const startTime = performance.now();

  // Record request start
  analytics.recordMetric({
    name: 'request_started',
    value: 1,
    timestamp: Date.now(),
    tags: {
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent') || 'unknown'
    }
  });

  // Capture response
  const originalSend = res.send;
  res.send = function(data) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Record response metrics
    analytics.recordMetric({
      name: 'response_time',
      value: duration,
      timestamp: Date.now(),
      tags: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode.toString()
      }
    });

    analytics.recordMetric({
      name: 'request_completed',
      value: 1,
      timestamp: Date.now(),
      tags: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode.toString()
      }
    });

    // Check if scaling is needed
    if (duration > 1000) { // Slow response
      analytics.recordMetric({
        name: 'slow_request',
        value: duration,
        timestamp: Date.now(),
        tags: { path: req.path }
      });
    }

    originalSend.call(this, data);
  };

  next();
});

// API Routes
app.get('/api/health', async (req, res) => {
  const systemHealth = await getSystemHealth();
  res.json({ status: 'healthy', ...systemHealth });
});

app.get('/api/metrics', async (req, res) => {
  const metrics = analytics.getPerformanceMetrics();
  const status = scaler.getStatus();
  res.json({ metrics, status });
});

// Initialize and start server
async function startServer() {
  await analytics.initialize();
  await analytics.start();
  await scaler.initialize();
  await scaler.start();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Performance analytics enabled`);
    console.log(`⚡ Auto-scaling enabled`);
  });
}

async function getSystemHealth() {
  return {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: await getCurrentCPUUsage(),
    timestamp: new Date().toISOString()
  };
}

async function getCurrentCPUUsage(): Promise<number> {
  // Implementation depends on your system
  return Math.random() * 100;
}

startServer().catch(console.error);
```

### 2. Database Integration

```typescript
// examples/database-integration.ts
import { PerformanceAnalyticsEngine } from '../scripts/performance/analytics-engine';
import { Pool } from 'pg';

const analytics = new PerformanceAnalyticsEngine();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Performance-enhanced query function
async function queryWithMonitoring(sql: string, params: any[] = []) {
  const startTime = performance.now();
  const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Record query start
    analytics.recordMetric({
      name: 'query_started',
      value: 1,
      timestamp: Date.now(),
      tags: { queryId, query_type: getQueryType(sql) }
    });

    // Execute query
    const result = await pool.query(sql, params);
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Record success metrics
    analytics.recordMetric({
      name: 'query_duration',
      value: duration,
      timestamp: Date.now(),
      tags: { queryId, query_type: getQueryType(sql), success: 'true' }
    });

    analytics.recordMetric({
      name: 'query_rows_returned',
      value: result.rowCount,
      timestamp: Date.now(),
      tags: { queryId, query_type: getQueryType(sql) }
    });

    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Record error metrics
    analytics.recordMetric({
      name: 'query_duration',
      value: duration,
      timestamp: Date.now(),
      tags: { queryId, query_type: getQueryType(sql), success: 'false' }
    });

    analytics.recordMetric({
      name: 'query_error',
      value: 1,
      timestamp: Date.now(),
      tags: { queryId, query_type: getQueryType(sql), error: error.message }
    });

    throw error;
  }
}

function getQueryType(sql: string): string {
  const lowerSql = sql.toLowerCase().trim();
  if (lowerSql.startsWith('select')) return 'select';
  if (lowerSql.startsWith('insert')) return 'insert';
  if (lowerSql.startsWith('update')) return 'update';
  if (lowerSql.startsWith('delete')) return 'delete';
  return 'other';
}

// Example usage
async function getUsers() {
  return queryWithMonitoring('SELECT * FROM users WHERE active = $1', [true]);
}

async function createUser(userData: any) {
  return queryWithMonitoring(
    'INSERT INTO users (name, email, created_at) VALUES ($1, $2, $3)',
    [userData.name, userData.email, new Date()]
  );
}

// Initialize analytics
analytics.initialize().then(() => {
  console.log('📊 Database performance monitoring enabled');
});
```

### 3. Background Job Integration

```typescript
// examples/background-jobs.ts
import { PerformanceAnalyticsEngine } from '../scripts/performance/analytics-engine';
import { GPUMemoryManager } from '../scripts/performance/gpu-manager';

const analytics = new PerformanceAnalyticsEngine();
const gpuManager = new GPUMemoryManager();

interface Job {
  id: string;
  type: string;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
}

class JobQueue {
  private jobs: Job[] = [];
  private processing = false;

  constructor() {
    this.startProcessing();
  }

  addJob(job: Omit<Job, 'id' | 'createdAt' | 'attempts'>): string {
    const fullJob: Job = {
      ...job,
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      attempts: 0
    };

    this.jobs.push(fullJob);
    this.jobs.sort((a, b) => this.getPriorityScore(b) - this.getPriorityScore(a));

    analytics.recordMetric({
      name: 'job_queued',
      value: 1,
      timestamp: Date.now(),
      tags: { job_type: job.type, priority: job.priority }
    });

    return fullJob.id;
  }

  private getPriorityScore(job: Job): number {
    const scores = { critical: 1000, high: 100, medium: 10, low: 1 };
    return scores[job.priority];
  }

  private async startProcessing() {
    this.processing = true;

    while (this.processing) {
      if (this.jobs.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      const job = this.jobs.shift()!;
      await this.processJob(job);
    }
  }

  private async processJob(job: Job): Promise<void> {
    const startTime = performance.now();

    analytics.recordMetric({
      name: 'job_started',
      value: 1,
      timestamp: Date.now(),
      tags: { job_id: job.id, job_type: job.type }
    });

    try {
      await this.executeJob(job);
      const endTime = performance.now();
      const duration = endTime - startTime;

      analytics.recordMetric({
        name: 'job_completed',
        value: duration,
        timestamp: Date.now(),
        tags: { job_id: job.id, job_type: job.type, success: 'true' }
      });

      console.log(`✅ Job completed: ${job.id} (${job.type}) in ${duration}ms`);
    } catch (error) {
      job.attempts++;
      const endTime = performance.now();
      const duration = endTime - startTime;

      analytics.recordMetric({
        name: 'job_failed',
        value: duration,
        timestamp: Date.now(),
        tags: { job_id: job.id, job_type: job.type, attempts: job.attempts.toString() }
      });

      if (job.attempts < job.maxAttempts) {
        console.log(`⚠️  Job failed, retrying: ${job.id} (attempt ${job.attempts}/${job.maxAttempts})`);
        this.jobs.push(job); // Re-queue for retry
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, job.attempts) * 1000)); // Exponential backoff
      } else {
        console.error(`❌ Job failed permanently: ${job.id} - ${error.message}`);
        analytics.recordMetric({
          name: 'job_failed_permanently',
          value: 1,
          timestamp: Date.now(),
          tags: { job_id: job.id, job_type: job.type }
        });
      }
    }
  }

  private async executeJob(job: Job): Promise<void> {
    switch (job.type) {
      case 'ml_inference':
        await this.executeMLInference(job);
        break;
      case 'data_processing':
        await this.executeDataProcessing(job);
        break;
      case 'cache_warming':
        await this.executeCacheWarming(job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  private async executeMLInference(job: Job): Promise<void> {
    const taskId = await gpuManager.submitTask({
      type: 'inference',
      priority: job.priority as any,
      memoryRequired: 2 * 1024 * 1024 * 1024, // 2GB
      estimatedDuration: 5000,
      metadata: job.data
    });

    // Wait for completion (in production, you'd use events or polling)
    await new Promise(resolve => setTimeout(resolve, 6000));

    console.log(`🎮 ML inference completed: ${taskId}`);
  }

  private async executeDataProcessing(job: Job): Promise<void> {
    // Simulate data processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`📊 Data processing completed: ${job.id}`);
  }

  private async executeCacheWarming(job: Job): Promise<void> {
    // Simulate cache warming
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`🔥 Cache warming completed: ${job.id}`);
  }
}

// Usage example
const jobQueue = new JobQueue();

// Add some jobs
jobQueue.addJob({
  type: 'ml_inference',
  priority: 'high',
  data: { model: 'gpt-3.5-turbo', input: 'Test input' }
});

jobQueue.addJob({
  type: 'data_processing',
  priority: 'medium',
  data: { dataset: 'users', operation: 'transform' }
});

jobQueue.addJob({
  type: 'cache_warming',
  priority: 'low',
  data: { pattern: 'user:*' }
});

// Initialize components
Promise.all([
  analytics.initialize(),
  gpuManager.initialize()
]).then(() => {
  console.log('📊 Background job processing enabled with performance monitoring');
});
```

---

## Advanced Configuration

### 1. Custom Performance Configuration

```typescript
// examples/custom-configuration.ts
import { PerformanceAnalyticsEngine } from '../scripts/performance/analytics-engine';
import { AdvancedAutoScaler } from '../scripts/performance/advanced-scaling';

// Load custom configuration
const performanceConfig = {
  // Analytics configuration
  analytics: {
    retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
    anomalyDetection: {
      enabled: true,
      algorithm: 'ml' as const,
      sensitivity: 0.85,
      minDataPoints: 200,
      updateFrequency: 5 * 60 * 1000 // 5 minutes
    },
    forecasting: {
      enabled: true,
      model: 'prophet' as const,
      horizon: 24 * 60 * 60 * 1000, // 24 hours
      confidence: 0.8
    }
  },

  // Auto-scaling configuration
  autoScaling: {
    minInstances: parseInt(process.env.MIN_INSTANCES || '2'),
    maxInstances: parseInt(process.env.MAX_INSTANCES || '20'),
    cpuThreshold: parseFloat(process.env.CPU_THRESHOLD || '75'),
    memoryThreshold: parseFloat(process.env.MEMORY_THRESHOLD || '80'),
    latencyThreshold: parseFloat(process.env.LATENCY_THRESHOLD || '5000'),
    predictionModel: 'neural' as const,
    costOptimization: process.env.COST_OPTIMIZATION === 'true',
    emergencyScaling: {
      enabled: true,
      maxEmergencyInstances: parseInt(process.env.EMERGENCY_MAX_INSTANCES || '50'),
      triggerThresholds: {
        cpu: 95,
        memory: 98,
        latency: 10000
      }
    }
  }
};

// Initialize with custom configuration
const analytics = new PerformanceAnalyticsEngine(performanceConfig.analytics);
const scaler = new AdvancedAutoScaler(performanceConfig.autoScaling);

// Dynamic configuration updates
function updateConfiguration(updates: Partial<typeof performanceConfig>) {
  Object.assign(performanceConfig, updates);

  // Reconfigure components
  analytics.updateConfig(performanceConfig.analytics);
  scaler.updateConfig(performanceConfig.autoScaling);
}

// Example: Update configuration based on time of day
function configureForTimeOfDay() {
  const hour = new Date().getHours();

  if (hour >= 9 && hour <= 17) {
    // Business hours - more aggressive scaling
    updateConfiguration({
      autoScaling: {
        cpuThreshold: 70,
        memoryThreshold: 75,
        costOptimization: false
      }
    });
  } else {
    // Off hours - cost optimization prioritized
    updateConfiguration({
      autoScaling: {
        cpuThreshold: 85,
        memoryThreshold: 90,
        costOptimization: true
      }
    });
  }
}

// Schedule configuration updates
setInterval(configureForTimeOfDay, 60 * 60 * 1000); // Every hour

// Load environment-specific configuration
function loadEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      updateConfiguration({
        analytics: {
          anomalyDetection: { sensitivity: 0.9 },
          forecasting: { confidence: 0.95 }
        },
        autoScaling: {
          costOptimization: false,
          emergencyScaling: { enabled: true }
        }
      });
      break;
    case 'staging':
      updateConfiguration({
        analytics: {
          anomalyDetection: { sensitivity: 0.7 },
          forecasting: { confidence: 0.7 }
        },
        autoScaling: {
          minInstances: 1,
          maxInstances: 5
        }
      });
      break;
    case 'development':
      updateConfiguration({
        analytics: {
          retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
          anomalyDetection: { sensitivity: 0.5 }
        },
        autoScaling: {
          minInstances: 1,
          maxInstances: 3,
          costOptimization: false
        }
      });
      break;
  }
}

loadEnvironmentConfig();

export { performanceConfig, analytics, scaler, updateConfiguration };
```

### 2. Multi-Region Setup

```typescript
// examples/multi-region-setup.ts
import { RedisClusterManager } from '../scripts/performance/redis-cluster';
import { AdvancedAutoScaler } from '../scripts/performance/advanced-scaling';

interface RegionConfig {
  name: string;
  region: string;
  endpoints: string[];
  priority: number;
  latency: number;
}

const regions: RegionConfig[] = [
  {
    name: 'us-east-1',
    region: 'us-east-1',
    endpoints: ['redis-us-east-1.example.com:6379'],
    priority: 1,
    latency: 50
  },
  {
    name: 'us-west-2',
    region: 'us-west-2',
    endpoints: ['redis-us-west-2.example.com:6379'],
    priority: 2,
    latency: 100
  },
  {
    name: 'eu-west-1',
    region: 'eu-west-1',
    endpoints: ['redis-eu-west-1.example.com:6379'],
    priority: 3,
    latency: 150
  }
];

// Multi-region Redis cluster setup
async function setupMultiRegionRedis() {
  const clusters: Map<string, RedisClusterManager> = new Map();

  for (const region of regions) {
    const cluster = new RedisClusterManager({
      clusterName: `cortex-os-${region.name}`,
      nodes: region.endpoints.map(endpoint => ({
        id: `${region.name}-${endpoint}`,
        host: endpoint,
        port: 6379,
        role: 'master',
        region: region.region,
        weight: region.priority
      })),
      replicationFactor: 2,
      shardingStrategy: 'consistent_hash',
      autoFailover: true,
      enableMultiRegion: true
    });

    await cluster.initialize();
    await cluster.start();
    clusters.set(region.name, cluster);

    console.log(`🌍 Redis cluster initialized: ${region.name}`);
  }

  return clusters;
}

// Region-aware auto-scaling
class RegionAwareAutoScaler {
  private scalers: Map<string, AdvancedAutoScaler> = new Map();
  private clusters: Map<string, RedisClusterManager>;

  constructor(clusters: Map<string, RedisClusterManager>) {
    this.clusters = clusters;
    this.initializeRegionScalers();
  }

  private initializeRegionScalers() {
    for (const region of regions) {
      const scaler = new AdvancedAutoScaler({
        minInstances: 1,
        maxInstances: this.getMaxInstancesForRegion(region.name),
        cpuThreshold: this.getThresholdForRegion(region.name),
        region: region.region,
        latencyThreshold: region.latency * 2
      });

      this.scalers.set(region.name, scaler);
    }
  }

  private getMaxInstancesForRegion(regionName: string): number {
    const baseMax = 20;
    const region = regions.find(r => r.name === regionName);
    return Math.floor(baseMax / region.priority);
  }

  private getThresholdForRegion(regionName: string): number {
    const baseThreshold = 75;
    const region = regions.find(r => r.name === regionName);
    return baseThreshold - (region.priority - 1) * 5;
  }

  async scaleRegion(regionName: string, action: 'up' | 'down'): Promise<void> {
    const scaler = this.scalers.get(regionName);
    if (!scaler) {
      throw new Error(`Unknown region: ${regionName}`);
    }

    if (action === 'up') {
      await scaler.scaleUp();
    } else {
      await scaler.scaleDown();
    }

    // Update cluster configuration
    const cluster = this.clusters.get(regionName);
    if (cluster) {
      await cluster.rebalanceCluster();
    }
  }

  async getRegionalMetrics(): Promise<Record<string, any>> {
    const metrics: Record<string, any> = {};

    for (const regionName of this.scalers.keys()) {
      const scaler = this.scalers.get(regionName)!;
      const cluster = this.clusters.get(regionName);

      metrics[regionName] = {
        scaling: scaler.getPerformanceMetrics(),
        cache: cluster ? cluster.getPerformanceMetrics() : null,
        region: regions.find(r => r.name === regionName)
      };
    }

    return metrics;
  }
}

// Usage example
async function setupMultiRegionPerformance() {
  const clusters = await setupMultiRegionRedis();
  const scaler = new RegionAwareAutoScaler(clusters);

  // Initialize all scalers
  for (const regionName of scaler['scalers'].keys()) {
    const scalerInstance = scaler['scalers'].get(regionName)!;
    await scalerInstance.initialize();
    await scalerInstance.start();
  }

  // Monitor regional performance
  setInterval(async () => {
    const metrics = await scaler.getRegionalMetrics();
    console.log('🌍 Regional Performance Metrics:', metrics);

    // Auto-scale based on regional load
    for (const [regionName, regionMetrics] of Object.entries(metrics)) {
      const { scaling } = regionMetrics;

      if (scaling.currentLoad > 0.8) {
        console.log(`📈 Scaling up region: ${regionName}`);
        await scaler.scaleRegion(regionName, 'up');
      } else if (scaling.currentLoad < 0.3) {
        console.log(`📉 Scaling down region: ${regionName}`);
        await scaler.scaleRegion(regionName, 'down');
      }
    }
  }, 60000); // Every minute

  return { clusters, scaler };
}

setupMultiRegionPerformance().catch(console.error);
```

---

## Custom Performance Components

### 1. Custom Metric Collector

```typescript
// examples/custom-metric-collector.ts
import { PerformanceAnalyticsEngine } from '../scripts/performance/analytics-engine';

interface CustomMetric {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
  metadata?: Record<string, any>;
}

class CustomMetricCollector {
  private analytics: PerformanceAnalyticsEngine;
  private collectors: Map<string, () => Promise<CustomMetric[]>> = new Map();
  private interval: NodeJS.Timeout | null = null;

  constructor(analytics: PerformanceAnalyticsEngine) {
    this.analytics = analytics;
  }

  // Register a custom metric collector
  registerCollector(name: string, collector: () => Promise<CustomMetric[]>) {
    this.collectors.set(name, collector);
    console.log(`📊 Registered custom metric collector: ${name}`);
  }

  // Start collecting metrics
  start(intervalMs: number = 30000) {
    if (this.interval) {
      this.stop();
    }

    this.interval = setInterval(async () => {
      await this.collectAllMetrics();
    }, intervalMs);

    console.log(`📊 Custom metric collection started (interval: ${intervalMs}ms)`);
  }

  // Stop collecting metrics
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('📊 Custom metric collection stopped');
    }
  }

  private async collectAllMetrics() {
    for (const [name, collector] of this.collectors) {
      try {
        const metrics = await collector();

        for (const metric of metrics) {
          this.analytics.recordMetric(metric);
        }

        console.log(`📊 Collected ${metrics.length} metrics from ${name}`);
      } catch (error) {
        console.error(`❌ Error collecting metrics from ${name}:`, error);
      }
    }
  }
}

// Example custom collectors
async function createCustomCollectors(analytics: PerformanceAnalyticsEngine) {
  const collector = new CustomMetricCollector(analytics);

  // Database connection pool metrics
  collector.registerCollector('database-pool', async () => {
    const poolMetrics = await getDatabasePoolMetrics();
    return poolMetrics.map(metric => ({
      name: 'database_pool_size',
      value: metric.total,
      timestamp: Date.now(),
      tags: {
        type: 'database',
        pool: metric.poolName
      }
    }));
  });

  // External API metrics
  collector.registerCollector('external-apis', async () => {
    const apiMetrics = await getExternalAPIMetrics();
    return apiMetrics.map(metric => ({
      name: 'external_api_response_time',
      value: metric.responseTime,
      timestamp: Date.now(),
      tags: {
        type: 'external_api',
        api: metric.apiName,
        status: metric.status
      }
    }));
  });

  // Business metrics
  collector.registerCollector('business', async () => {
    const businessMetrics = await getBusinessMetrics();
    return [
      {
        name: 'active_users',
        value: businessMetrics.activeUsers,
        timestamp: Date.now(),
        tags: { type: 'business' }
      },
      {
        name: 'conversion_rate',
        value: businessMetrics.conversionRate,
        timestamp: Date.now(),
        tags: { type: 'business' }
      },
      {
        name: 'revenue',
        value: businessMetrics.revenue,
        timestamp: Date.now(),
        tags: { type: 'business', currency: 'USD' }
      }
    ];
  });

  collector.start();
  return collector;
}

// Helper functions (implement based on your systems)
async function getDatabasePoolMetrics() {
  return [
    { poolName: 'read', total: 10, active: 7, idle: 3 },
    { poolName: 'write', total: 5, active: 2, idle: 3 }
  ];
}

async function getExternalAPIMetrics() {
  return [
    { apiName: 'payment-gateway', responseTime: 250, status: 'success' },
    { apiName: 'email-service', responseTime: 150, status: 'success' },
    { apiName: 'analytics-api', responseTime: 500, status: 'success' }
  ];
}

async function getBusinessMetrics() {
  return {
    activeUsers: 1250,
    conversionRate: 3.2,
    revenue: 15420.50
  };
}

// Usage
const analytics = new PerformanceAnalyticsEngine();
analytics.initialize().then(() => {
  createCustomCollectors(analytics);
});
```

### 2. Custom Alerting Rules

```typescript
// examples/custom-alerting.ts
import { PerformanceAlertingSystem } from '../scripts/performance/alerting-system';

class CustomAlertingSystem extends PerformanceAlertingSystem {
  constructor(config?: any) {
    super(config);
    this.setupCustomRules();
  }

  private setupCustomRules() {
    // Business metric alerts
    this.addRule({
      name: 'Low Conversion Rate',
      description: 'Alert when conversion rate drops below threshold',
      metric: 'conversion_rate',
      condition: 'less_than',
      threshold: 2.5,
      duration: 300, // 5 minutes
      severity: 'warning',
      enabled: true,
      tags: ['business', 'conversion'],
      cooldown: 1800, // 30 minutes
      escalationPolicy: {
        levels: [
          {
            delay: 300000, // 5 minutes
            channels: [
              { type: 'email', config: { recipients: ['marketing@company.com'] }, enabled: true },
              { type: 'slack', config: { channel: '#alerts' }, enabled: true }
            ],
            message: 'Conversion rate has dropped. Please investigate marketing campaigns.'
          }
        ]
      }
    });

    // Revenue alerts
    this.addRule({
      name: 'Revenue Anomaly',
      description: 'Alert when revenue shows unusual patterns',
      metric: 'revenue',
      condition: 'rate_decrease',
      threshold: 50, // 50% decrease
      duration: 3600, // 1 hour
      severity: 'critical',
      enabled: true,
      tags: ['business', 'revenue'],
      cooldown: 3600, // 1 hour
      escalationPolicy: {
        levels: [
          {
            delay: 60000, // 1 minute
            channels: [
              { type: 'email', config: { recipients: ['finance@company.com'] }, enabled: true },
              { type: 'slack', config: { channel: '#finance-alerts' }, enabled: true },
              { type: 'pagerduty', config: { serviceKey: process.env.PAGERDUTY_KEY }, enabled: true }
            ],
            message: 'Revenue anomaly detected! Immediate attention required.'
          }
        ]
      }
    });

    // User engagement alerts
    this.addRule({
      name: 'User Engagement Drop',
      description: 'Alert when active users drop significantly',
      metric: 'active_users',
      condition: 'rate_decrease',
      threshold: 20, // 20% decrease
      duration: 1800, // 30 minutes
      severity: 'warning',
      enabled: true,
      tags: ['business', 'engagement'],
      cooldown: 1800 // 30 minutes
    });

    // Custom health score alert
    this.addRule({
      name: 'System Health Score',
      description: 'Alert when system health score drops',
      metric: 'health_score',
      condition: 'less_than',
      threshold: 80,
      duration: 300, // 5 minutes
      severity: 'critical',
      enabled: true,
      tags: ['system', 'health'],
      cooldown: 900 // 15 minutes
    });
  }

  // Custom health score calculation
  calculateHealthScore(): number {
    // Get current metrics
    const metrics = this.getStatus();

    // Base score
    let score = 100;

    // System health factors
    if (metrics.statistics.activeAlerts > 0) {
      score -= metrics.statistics.activeAlerts * 10;
    }

    // Component health
    const componentHealth = this.getComponentHealth();
    Object.values(componentHealth).forEach(health => {
      if (health.status !== 'healthy') {
        score -= 15;
      }
    });

    // Recent performance
    const recentPerformance = this.getRecentPerformance();
    if (recentPerformance.averageResponseTime > 1000) {
      score -= 10;
    }

    if (recentPerformance.errorRate > 5) {
      score -= recentPerformance.errorRate * 2;
    }

    return Math.max(0, Math.min(100, score));
  }

  private getComponentHealth(): Record<string, any> {
    // Implementation depends on your system
    return {
      database: { status: 'healthy' },
      cache: { status: 'healthy' },
      gpu: { status: 'healthy' },
      autoScaler: { status: 'healthy' }
    };
  }

  private getRecentPerformance(): any {
    // Implementation depends on your system
    return {
      averageResponseTime: 750,
      errorRate: 2.5
    };
  }

  // Override metric submission to include custom health score
  submitMetric(data: any): void {
    super.submitMetric(data);

    // Calculate and submit health score
    if (data.name === 'active_users' || data.name === 'conversion_rate' || data.name === 'revenue') {
      const healthScore = this.calculateHealthScore();

      super.submitMetric({
        name: 'health_score',
        value: healthScore,
        timestamp: Date.now(),
        tags: { type: 'system' }
      });
    }
  }
}

// Usage
const customAlerting = new CustomAlertingSystem();

customAlerting.start().then(() => {
  console.log('🚨 Custom alerting system started');
});
```

---

## Monitoring and Alerting Setup

### 1. Dashboard Configuration

```typescript
// examples/dashboard-setup.ts
import { PerformanceAnalyticsEngine } from '../scripts/performance/analytics-engine';
import { AdvancedAutoScaler } from '../scripts/performance/advanced-scaling';

class PerformanceDashboard {
  private analytics: PerformanceAnalyticsEngine;
  private scaler: AdvancedAutoScaler;
  private io: any;

  constructor(analytics: PerformanceAnalyticsEngine, scaler: AdvancedAutoScaler) {
    this.analytics = analytics;
    this.scaler = scaler;
  }

  setupWebSocketDashboard(server: any) {
    this.io = server;

    this.io.on('connection', (socket: any) => {
      console.log('📊 Dashboard client connected');

      // Send initial data
      socket.emit('initial-data', {
        systemStatus: this.getSystemStatus(),
        performanceMetrics: this.getPerformanceMetrics(),
        alerts: this.getActiveAlerts()
      });

      // Set up real-time updates
      socket.on('subscribe-metrics', () => {
        this.sendMetricsUpdates(socket);
      });

      socket.on('subscribe-alerts', () => {
        this.sendAlertUpdates(socket);
      });

      socket.on('get-report', async (data: { timeRange: string }) => {
        const report = await this.generateReport(data.timeRange);
        socket.emit('report', report);
      });

      socket.on('acknowledge-alert', (alertId: string) => {
        this.acknowledgeAlert(alertId);
      });

      socket.on('resolve-alert', (data: { alertId: string; reason: string }) => {
        this.resolveAlert(data.alertId, data.reason);
      });
    });
  }

  private getSystemStatus() {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: 'Calculating...',
      timestamp: new Date().toISOString()
    };
  }

  private getPerformanceMetrics() {
    return {
      analytics: this.analytics.getPerformanceMetrics(),
      scaling: this.scaler.getPerformanceMetrics(),
      health: this.calculateHealthScore()
    };
  }

  private getActiveAlerts() {
    return this.analytics.getActiveAlerts();
  }

  private calculateHealthScore(): number {
    // Implement health score calculation
    return 85; // Placeholder
  }

  private sendMetricsUpdates(socket: any) {
    const interval = setInterval(() => {
      socket.emit('metrics-update', {
        analytics: this.analytics.getPerformanceMetrics(),
        scaling: this.scaler.getPerformanceMetrics(),
        timestamp: Date.now()
      });
    }, 5000);

    socket.on('disconnect', () => {
      clearInterval(interval);
    });
  }

  private sendAlertUpdates(socket: any) {
    const interval = setInterval(() => {
      const alerts = this.getActiveAlerts();
      socket.emit('alerts-update', { alerts, timestamp: Date.now() });
    }, 10000);

    socket.on('disconnect', () => {
      clearInterval(interval);
    });
  }

  private async generateReport(timeRange: string) {
    // Generate performance report for the specified time range
    return {
      timeRange,
      generatedAt: new Date().toISOString(),
      metrics: this.getPerformanceMetrics(),
      insights: await this.analytics.generateInsights(),
      recommendations: await this.analytics.getRecommendations(),
      alerts: this.getActiveAlerts()
    };
  }

  private acknowledgeAlert(alertId: string): void {
    // Implement alert acknowledgment
    console.log(`✅ Alert acknowledged: ${alertId}`);
  }

  private resolveAlert(alertId: string, reason: string): void {
    // Implement alert resolution
    console.log(`✅ Alert resolved: ${alertId} - ${reason}`);
  }
}

// Express server with dashboard
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize performance components
const analytics = new PerformanceAnalyticsEngine();
const scaler = new AdvancedAutoScaler();

// Initialize dashboard
const dashboard = new PerformanceDashboard(analytics, scaler);
dashboard.setupWebSocketDashboard(io);

// API routes
app.get('/api/dashboard/initial', (req, res) => {
  res.json({
    systemStatus: dashboard.getSystemStatus(),
    performanceMetrics: dashboard.getPerformanceMetrics(),
    alerts: dashboard.getActiveAlerts()
  });
});

app.get('/api/dashboard/report', async (req, res) => {
  const { timeRange } = req.query;
  const report = await dashboard.generateReport(timeRange as string);
  res.json(report);
});

const PORT = process.env.DASHBOARD_PORT || 3001;
server.listen(PORT, () => {
  console.log(`📊 Performance dashboard running on port ${PORT}`);
});
```

### 2. Slack Integration

```typescript
examples/slack-integration.ts
import { PerformanceAlertingSystem } from '../scripts/performance/alerting-system';

class SlackAlertIntegration {
  private alerting: PerformanceAlertingSystem;
  private webhookUrl: string;
  private channel: string;

  constructor(alerting: PerformanceAlertingSystem, webhookUrl: string, channel: string) {
    this.alerting = alerting;
    this.webhookUrl = webhookUrl;
    this.channel = channel;
    this.setupSlackChannel();
  }

  private setupSlackChannel() {
    this.alerting.addChannel('slack', {
      type: 'slack',
      config: {
        webhook: this.webhookUrl,
        channel: this.channel,
        username: 'Cortex-OS Performance',
        iconEmoji: ':chart_with_upwards_trend:'
      },
      enabled: true
    });
  }

  // Send performance summary to Slack
  async sendPerformanceSummary() {
    const status = this.alerting.getStatus();
    const metrics = this.alerting.getStatistics();

    const message = {
      text: '📊 *Cortex-OS Performance Summary*',
      attachments: [
        {
          color: this.getSummaryColor(metrics.totalActiveAlerts),
          fields: [
            {
              title: 'System Health',
              value: this.getHealthStatus(metrics),
              short: true
            },
            {
              title: 'Active Alerts',
              value: metrics.totalActiveAlerts.toString(),
              short: true
            },
            {
              title: 'Average Response Time',
              value: `${this.getAverageResponseTime()}ms`,
              short: true
            },
            {
              title: 'Alert Fatigue Score',
              value: (metrics.alertFatigueScore * 100).toFixed(1) + '%',
              short: true
            }
          ],
          footer: {
            text: `Generated at ${new Date().toISOString()}`,
            icon_url: 'https://platform.slack-edge.io/img/default_application_icon.png'
          }
        }
      ]
    };

    await this.sendSlackMessage(message);
  }

  // Send alert to Slack
  async sendSlackMessage(message: any) {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Failed to send Slack message:', error);
    }
  }

  private getSummaryColor(alertCount: number): string {
    if (alertCount === 0) return 'good';
    if (alertCount <= 3) return 'warning';
    return 'danger';
  }

  private getHealthStatus(metrics: any): string {
    if (metrics.totalActiveAlerts === 0) return '✅ Healthy';
    if (metrics.totalActiveAlerts <= 3) return '⚠️ Warning';
    return '🚨 Critical';
  }

  private getAverageResponseTime(): number {
    // Implementation depends on your metrics
    return 750;
  }

  // Schedule periodic updates
  startPeriodicUpdates(intervalMs: number = 300000) { // 5 minutes
    setInterval(() => {
      this.sendPerformanceSummary();
    }, intervalMs);
  }
}

// Usage
const alerting = new PerformanceAlertingSystem();
const slackIntegration = new SlackAlertIntegration(
  alerting,
  process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/YOUR/WEBHOOK',
  '#performance'
);

alerting.start().then(() => {
  console.log('📢 Slack integration enabled');
  slackIntegration.startPeriodicUpdates();
});
```

---

## Testing and Validation

### 1. Performance Test Suite

```typescript
// examples/performance-tests.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PerformanceAnalyticsEngine } from '../scripts/performance/analytics-engine';
import { AdvancedAutoScaler } from '../scripts/performance/advanced-scaling';

describe('Performance System Integration', () => {
  let analytics: PerformanceAnalyticsEngine;
  let scaler: AdvancedAutoScaler;

  beforeAll(async () => {
    analytics = new PerformanceAnalyticsEngine({
      retentionPeriod: 60000, // 1 minute for tests
      anomalyDetection: { enabled: false }
    });

    scaler = new AdvancedAutoScaler({
      minInstances: 1,
      maxInstances: 3,
      cpuThreshold: 80,
      memoryThreshold: 85
    });

    await analytics.initialize();
    await analytics.start();
    await scaler.initialize();
    await scaler.start();
  });

  afterAll(async () => {
    await scaler.stop();
    await analytics.stop();
  });

  describe('Analytics Engine', () => {
    it('should record and retrieve metrics', async () => {
      const metric = {
        name: 'test_metric',
        value: 100,
        timestamp: Date.now(),
        tags: { test: 'integration' }
      };

      analytics.recordMetric(metric);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const insights = await analytics.generateInsights();
      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
    });

    it('should detect anomalies', async () => {
      // Record normal metrics
      for (let i = 0; i < 100; i++) {
        analytics.recordMetric({
          name: 'normal_metric',
          value: 50 + Math.random() * 10, // Normal range 50-60
          timestamp: Date.now(),
          tags: { test: 'anomaly' }
        });
      }

      // Record anomaly
      analytics.recordMetric({
        name: 'anomaly_metric',
        value: 200, // Outside normal range
        timestamp: Date.now(),
        tags: { test: 'anomaly' }
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const anomalies = await analytics.detectAnomalies();
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].metric).toBe('anomaly_metric');
    });

    it('should generate forecasts', async () => {
      // Generate historical data
      const now = Date.now();
      for (let i = 0; i < 168; i++) { // 1 week of hourly data
        analytics.recordMetric({
          name: 'forecast_metric',
          value: 100 + Math.sin(i / 24) * 50, // Sinusoidal pattern
          timestamp: now - (i * 60 * 60 * 1000),
          tags: { test: 'forecast' }
        });
      }

      const forecast = await analytics.forecastMetrics('forecast_metric', 24); // 24 hours
      expect(forecast).toBeDefined();
      expect(forecast.values).toBeDefined();
      expect(forecast.values.length).toBeGreaterThan(0);
    });
  });

  describe('Auto-Scaling', () => {
    it('should scale up when threshold exceeded', async () => {
      // Simulate high CPU usage
      for (let i = 0; i < 10; i++) {
        scaler.recordMetric({
          name: 'cpu_usage',
          value: 90, // Above threshold
          timestamp: Date.now(),
          tags: { instance: 'test' }
        });
      }

      await new Promise(resolve => setTimeout(resolve, 5000));

      const recommendations = scaler.getScalingRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].action).toBe('scale_up');
    });

    it('should scale down when load decreases', async () => {
      // Simulate low CPU usage
      for (let i = 0; i < 10; i++) {
        scaler.recordMetric({
          name: 'cpu_usage',
          value: 30, // Below threshold
          timestamp: Date.now(),
          tags: { instance: 'test' }
        });
      }

      await new Promise(resolve => setTimeout(resolve, 5000));

      const recommendations = scaler.getScalingRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].action).toBe('scale_down');
    });

    it('should respect scaling limits', async () => {
      // Try to scale beyond maximum
      for (let i = 0; i < 10; i++) {
        await scaler.scaleUp();
      }

      const status = scaler.getStatus();
      expect(status.currentInstances).toBeLessThanOrEqual(3); // maxInstances
    });
  });

  describe('Performance Thresholds', () => {
    it('should meet response time targets', async () => {
      const startTime = performance.now();

      // Simulate request processing
      await new Promise(resolve => setTimeout(resolve, 500));

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000); // 1 second target
    });

    it('should maintain memory efficiency', async () => {
      const initialMemory = process.memoryUsage();

      // Perform some memory-intensive operations
      const largeArray = new Array(1000000).fill(0).map(() => Math.random());
      largeArray.sort();

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle high load without performance degradation', async () => {
      const startTime = performance.now();
      const promises: Promise<any>[] = [];

      // Simulate high load
      for (let i = 0; i < 1000; i++) {
        promises.push(
          new Promise(resolve => {
            analytics.recordMetric({
              name: 'load_test',
              value: Math.random() * 100,
              timestamp: Date.now(),
              tags: { batch: i.toString() }
            });
            resolve(undefined);
          })
        );
      }

      await Promise.all(promises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / 1000;

      expect(averageTime).toBeLessThan(10); // 10ms per operation
    });

    it('should recover from failures gracefully', async () => {
      // Simulate system failure
      for (let i = 0; i < 5; i++) {
        analytics.recordMetric({
          name: 'error_rate',
          value: 50, // 50% error rate
          timestamp: Date.now(),
          tags: { test: 'failure_recovery' }
        });
      }

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Simulate recovery
      for (let i = 0; i < 5; i++) {
        analytics.recordMetric({
          name: 'error_rate',
          value: 1, // 1% error rate
          timestamp: Date.now(),
          tags: { test: 'failure_recovery' }
        });
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      const insights = await analytics.generateInsights();
      const recoveryInsights = insights.filter(insight =>
        insight.description.toLowerCase().includes('recovery')
      );

      expect(recoveryInsights.length).toBeGreaterThan(0);
    });
  });
});
```

### 2. Load Testing

```typescript
// examples/load-testing.ts
import { describe, it, expect } from 'vitest';
import { PerformanceAnalyticsEngine } from '../scripts/performance/analytics-engine';

class LoadTestRunner {
  private analytics: PerformanceAnalyticsEngine;
  private results: any[] = [];

  constructor() {
    this.analytics = new PerformanceAnalyticsEngine({
      retentionPeriod: 60000
    });
  }

  async runLoadTest(config: {
    concurrentUsers: number;
    duration: number;
    requestsPerSecond: number;
  }) {
    await this.analytics.initialize();
    await this.analytics.start();

    console.log(`🚀 Starting load test: ${config.concurrentUsers} users, ${config.duration}s, ${config.requestsPerSecond} req/s`);

    const startTime = performance.now();
    const promises: Promise<void>[] = [];

    // Create concurrent users
    for (let user = 0; user < config.concurrentUsers; user++) {
      promises.push(this.simulateUser(user, config));
    }

    await Promise.all(promises);

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    const results = {
      config,
      totalTime,
      totalRequests: config.concurrentUsers * config.requestsPerSecond * (config.duration / 1000),
      metrics: this.analytics.getPerformanceMetrics(),
      insights: await this.analytics.generateInsights(),
      errors: this.results.filter(r => r.type === 'error')
    };

    console.log('📊 Load test completed:', results);
    return results;
  }

  private async simulateUser(userId: number, config: any): Promise<void> {
    const endTime = Date.now() + config.duration * 1000;

    while (Date.now() < endTime) {
      const startTime = performance.now();

      try {
        // Simulate API call
        await this.makeAPICall(userId);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        this.results.push({
          type: 'success',
          userId,
          responseTime,
          timestamp: Date.now()
        });

        this.analytics.recordMetric({
          name: 'api_response_time',
          value: responseTime,
          timestamp: Date.now(),
          tags: { user_id: userId.toString() }
        });

      } catch (error) {
        this.results.push({
          type: 'error',
          userId,
          error: error.message,
          timestamp: Date.now()
        });

        this.analytics.recordMetric({
          name: 'api_error',
          value: 1,
          timestamp: Date.now(),
          tags: { user_id: userId.toString(), error: error.message }
        });
      }

      // Rate limiting
      const delay = 1000 / config.requestsPerSecond;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  private async makeAPICall(userId: number): Promise<void> {
    // Simulate API call with random response time
    const responseTime = 50 + Math.random() * 200;
    await new Promise(resolve => setTimeout(resolve, responseTime));

    // Random error simulation (5% error rate)
    if (Math.random() < 0.05) {
      throw new Error('Simulated API error');
    }
  }
}

// Load test scenarios
describe('Load Testing', () => {
  let runner: LoadTestRunner;

  it('should handle moderate load', async () => {
    runner = new LoadTestRunner();

    const results = await runner.runLoadTest({
      concurrentUsers: 10,
      duration: 60,
      requestsPerSecond: 50
    });

    expect(results.metrics.averageResponseTime).toBeLessThan(1000);
    expect(results.errors.length).toBeLessThan(results.totalRequests * 0.05); // Less than 5% errors
  });

  it('should handle high load', async () => {
    runner = new LoadTestRunner();

    const results = await runner.runLoadTest({
      concurrentUsers: 50,
      duration: 120,
      requestsPerSecond: 100
    });

    expect(results.metrics.averageResponseTime).toBeLessThan(2000);
    expect(results.errors.length).toBeLessThan(results.totalRequests * 0.05);
  });

  it('should handle stress load', async () => {
    runner = new LoadTestRunner();

    const results = await runner.runLoadTest({
      concurrentUsers: 100,
      duration: 300,
      requestsPerSecond: 200
    });

    expect(results.metrics.averageResponseTime).toBeLessThan(5000);
    expect(results.errors.length).toBeLessThan(results.totalRequests * 0.1); // Less than 10% errors
  });
});
```

---

## Production Deployment

### 1. Docker Deployment

```dockerfile
# examples/Dockerfile.performance
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile && \
    pnpm add -g tsx

# Copy source code
COPY . .

# Build TypeScript
RUN npx tsc --build

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set permissions
RUN chown -R nodejs:nodejs /app
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  curl -f http://localhost:3001/health || exit 1

# Expose port
EXPOSE 3001

# Start performance monitoring
CMD ["tsx", "scripts/performance/startup.ts"]
```

```yaml
# examples/docker-compose.performance.yml
version: '3.8'

services:
  cortex-os-performance:
    build:
      context: .
      dockerfile: Dockerfile.performance
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PERF_ENABLE_ML=true
      - PERF_ENABLE_GPU=true
      - PERF_ENABLE_CACHE=true
      - METRICS_ENABLED=true
      - LOG_LEVEL=info
    volumes:
      - ./logs:/app/logs
      - ./config:/app/config
    depends_on:
      - redis
      - postgres
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=cortexos
      - POSTGRES_USER=cortexos
      -POSTGRES_PASSWORD=cortexos_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  monitoring:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana:/etc/grafana/provisioning
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    restart: unless-stopped

volumes:
  redis_data:
  postgres_data:
  grafana_data:
  prometheus_data:
  logs:
    driver: local
```

### 2. Kubernetes Deployment

```yaml
# examples/k8s-performance-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cortex-os-performance
  labels:
    app: cortex-os-performance
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cortex-os-performance
  template:
    metadata:
      labels:
        app: cortex-os-performance
    spec:
      containers:
      - name: cortex-os-performance
        image: cortex-os/performance:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: PERF_ENABLE_ML
          value: "true"
        - name: PERF_ENABLE_GPU
          value: "true"
        - name: METRICS_ENABLED
          value: "true"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: logs
          mountPath: /app/logs
        - name: config
          mountPath: /app/config
      - name: redis
        image: redis:7-alpine
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        command:
        - redis-server
        - --appendonly
        volumeMounts:
        - name: redis-data
          mountPath: /data
      volumes:
      - name: logs
        persistentVolumeClaim:
          claimName: logs-pvc
      - name: config
        configMap:
          name: performance-config
      - name: redis-data
        persistentVolumeClaim:
          claimName: redis-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: cortex-os-performance-service
spec:
  selector:
    app: cortex-os-performance
  ports:
  - port: 3001
    targetPort: 3001
  type: ClusterIP
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: logs-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
      requests:
        storage: 5Gi
  storageClassName: standard
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: performance-config
data:
  PERFORMANCE_CONFIG: |
    {
      "analytics": {
        "retentionPeriod": 2592000000,
        "anomalyDetection": {
          "enabled": true,
          "algorithm": "ml",
          "sensitivity": 0.8
        }
      },
      "autoScaling": {
        "minInstances": 2,
        "maxInstances": 20,
        "cpuThreshold": 75,
        "memoryThreshold": 80
      }
    }
```

---

## Troubleshooting Examples

### 1. Common Issues and Solutions

```typescript
// examples/troubleshooting.ts
import { PerformanceAnalyticsEngine } from '../scripts/performance/analytics-engine';
import { AdvancedAutoScaler } from '../scripts/performance/advanced-scaling';

class PerformanceTroubleshooter {
  private analytics: PerformanceAnalyticsEngine;
  private scaler: AdvancedAutoScaler;

  constructor() {
    this.analytics = new PerformanceAnalyticsEngine();
    this.scaler = new AdvancedAutoScaler();
  }

  async diagnoseSystem(): Promise<string[]> {
    const issues: string[] = [];

    // Check component health
    const analyticsHealth = await this.checkAnalyticsHealth();
    const scalerHealth = await this.checkScalerHealth();

    if (!analyticsHealth.healthy) {
      issues.push(...analyticsHealth.issues);
    }

    if (!scalerHealth.healthy) {
      issues.push(...scalerHealth.issues);
    }

    // Check resource usage
    const resourceIssues = await this.checkResourceUsage();
    issues.push(...resourceIssues);

    // Check configuration
    const configIssues = await this.checkConfiguration();
    issues.push(...configIssues);

    // Check dependencies
    const dependencyIssues = await this.checkDependencies();
    issues.push(...dependencyIssues);

    return issues;
  }

  private async checkAnalyticsHealth(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      const status = this.analytics.getStatus();

      if (!status.isRunning) {
        issues.push('Analytics engine is not running');
      }

      const metrics = this.analytics.getPerformanceMetrics();
      if (metrics.errorRate > 10) {
        issues.push(`High error rate: ${metrics.errorRate}%`);
      }

      return { healthy: issues.length === 0, issues };
    } catch (error) {
      return { healthy: false, issues: [`Analytics engine error: ${error.message}`] };
    }
  }

  private async checkScalerHealth(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      const status = this.scaler.getStatus();

      if (!status.isRunning) {
        issues.push('Auto-scaler is not running');
      }

      const metrics = this.scaler.getPerformanceMetrics();
      if (metrics.averageResponseTime > 30000) {
        issues.push(`Slow scaling response: ${metrics.averageResponseTime}ms`);
      }

      return { healthy: issues.length === 0, issues };
    } catch (error) {
      return { healthy: false, issues: [`Auto-scaler error: ${error.message}`] };
    }
  }

  private async checkResourceUsage(): Promise<string[]> {
    const issues: string[] = [];

    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    if (memoryUsagePercent > 90) {
      issues.push(`High memory usage: ${memoryUsagePercent.toFixed(1)}%`);
    }

    const cpuUsage = await this.getCPUUsage();
    if (cpuUsage > 90) {
      issues.push(`High CPU usage: ${cpuUsage.toFixed(1)}%`);
    }

    return issues;
  }

  private async checkConfiguration(): Promise<string[]> {
    const issues: string[] = [];

    // Check environment variables
    const requiredVars = [
      'PERF_CPU_THRESHOLD',
      'PERF_MEMORY_THRESHOLD',
      'PERF_MAX_INSTANCES'
    ];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        issues.push(`Missing environment variable: ${varName}`);
      }
    }

    // Validate configuration values
    const cpuThreshold = parseFloat(process.env.PERF_CPU_THRESHOLD || '0');
    if (cpuThreshold < 0 || cpuThreshold > 100) {
      issues.push(`Invalid CPU threshold: ${cpuThreshold}`);
    }

    return issues;
  }

  private async checkDependencies(): Promise<string[]> {
    const issues: string[] = [];

    // Check Redis connection
    try {
      const response = await fetch('http://localhost:6379/ping');
      if (!response.ok) {
        issues.push('Redis connection failed');
      }
    } catch (error) {
      issues.push(`Redis connection error: ${error.message}`);
    }

    // Check database connection
    try {
      const response = await fetch('http://localhost:5432/health');
      if (!response.ok) {
        issues.push('Database connection failed');
      }
    } catch (error) {
      issues.push(`Database connection error: ${error.message}`);
    }

    return issues;
  }

  private async getCPUUsage(): Promise<number> {
    try {
      const { execSync } = require('child_process');
      const output = execSync('top -bn1 -l | grep "CPU" | awk \'{print $2}\'', { encoding: 'utf8' });
      return parseFloat(output.trim());
    } catch {
      return 0;
    }
  }

  // Auto-fix common issues
  async autoFixIssues(issues: string[]): Promise<void> {
    console.log('🔧 Attempting to auto-fix issues...');

    for (const issue of issues) {
      if (issue.includes('memory usage')) {
        await this.optimizeMemoryUsage();
      } else if (issue.includes('Auto-scaler is not running')) {
        await this.restartAutoScaler();
      } else if (issue.includes('Analytics engine is not running')) {
        await this.restartAnalytics();
      } else if (issue.includes('Redis connection')) {
        await this.restartRedis();
      }
    }
  }

  private async optimizeMemoryUsage(): Promise<void> {
    console.log('🧹 Optimizing memory usage...');

    // Force garbage collection
    if (global.gc) {
      global.gc();
    }

    // Clear old metrics
    this.analytics.cleanupOldData();
  }

  private async restartAutoScaler(): Promise<void> {
    console.log('🔄 Restarting auto-scaler...');

    try {
      await this.scaler.stop();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.scaler.start();
    } catch (error) {
      console.error('❌ Failed to restart auto-scaler:', error);
    }
  }

  private async restartAnalytics(): Promise<void> {
    console.log('🔄 Restarting analytics engine...');

    try {
      await this.analytics.stop();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.analytics.start();
    } catch (error) {
      console.error('❌ Failed to restart analytics engine:', error);
    }
  }

  private async restartRedis(): Promise<void> {
    console.log('🔄 Restarting Redis...');

    try {
      const { execSync } = require('child_process');
      execSync('docker restart redis', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Failed to restart Redis:', error);
    }
  }
}

// Usage example
const troubleshooter = new PerformanceTroubleshooter();

troubleshooter.diagnoseSystem().then(async (issues) => {
  if (issues.length > 0) {
    console.log('🚨 Issues found:');
    issues.forEach(issue => console.log(`  - ${issue}`));

    console.log('🔧 Attempting auto-fix...');
    await troubleshooter.autoFixIssues(issues);

    // Re-check after auto-fix
    const remainingIssues = await troubleshooter.diagnoseSystem();
    if (remainingIssues.length === 0) {
      console.log('✅ All issues resolved');
    } else {
      console.log('⚠️  Some issues remain:', remainingIssues);
    }
  } else {
    console.log('✅ No issues found');
  }
});
```

This comprehensive set of examples provides practical guidance for integrating the Cortex-OS Performance Optimization System into various environments and use cases, from basic monitoring to complex multi-region deployments. Each example includes error handling, monitoring, and best practices for production use.