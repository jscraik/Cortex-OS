# Performance Optimization API Reference

This document provides comprehensive API documentation for all Cortex-OS performance optimization components.

## Table of Contents

- [Advanced Auto-Scaling System](#advanced-auto-scaling-system)
- [Distributed Redis Clustering](#distributed-redis-clustering)
- [Performance Analytics Engine](#performance-analytics-engine)
- [Intelligent Query Router](#intelligent-query-router)
- [Advanced GPU Management](#advanced-gpu-management)
- [Real-Time Alerting System](#real-time-alerting-system)

---

## Advanced Auto-Scaling System

**File**: `scripts/performance/advanced-scaling.ts`

### Classes

#### `AdvancedAutoScaler`

Main class for managing predictive auto-scaling with ML-based algorithms.

```typescript
class AdvancedAutoScaler {
  constructor(config?: AutoScalerConfig)

  // Core Methods
  async initialize(): Promise<void>
  async start(): Promise<void>
  async stop(): Promise<void>

  // Scaling Operations
  async scaleUp(targetInstances?: number): Promise<void>
  async scaleDown(targetInstances?: number): Promise<void>
  async emergencyScale(): Promise<void>

  // Analytics
  getScalingRecommendations(): ScalingRecommendation[]
  getPerformanceMetrics(): PerformanceMetrics
  getCostOptimizationInsights(): CostInsight[]

  // Configuration
  updateConfig(config: Partial<AutoScalerConfig>): void
  setScalingPolicy(policy: ScalingPolicy): void
}
```

#### Configuration Types

```typescript
interface AutoScalerConfig {
  // Scaling thresholds
  cpuThreshold: number          // Default: 80
  memoryThreshold: number       // Default: 85
  latencyThreshold: number      // Default: 5000 (ms)

  // Instance limits
  minInstances: number          // Default: 1
  maxInstances: number          // Default: 20
  emergencyMaxInstances: number // Default: 50

  // ML Configuration
  predictionModel: 'linear' | 'exponential' | 'seasonal' | 'neural'
  trainingDataSize: number      // Default: 1000 samples
  retrainInterval: number       // Default: 3600000 (1 hour)

  // Cost optimization
  costThreshold: number         // Default: 0.8 (80% of budget)
  budgetLimit: number           // Default: 1000 ($)
}

interface ScalingPolicy {
  name: string
  rules: ScalingRule[]
  cooldownPeriod: number        // milliseconds
  maxScaleRate: number          // instances per minute
}

interface ScalingRule {
  metric: 'cpu' | 'memory' | 'latency' | 'custom'
  operator: '>' | '<' | '=' | '>=' | '<='
  threshold: number
  duration: number              // milliseconds
  action: 'scale_up' | 'scale_down' | 'emergency_scale'
  instances: number
}
```

### Usage Examples

```typescript
import { AdvancedAutoScaler } from './scripts/performance/advanced-scaling.ts';

// Basic setup
const scaler = new AdvancedAutoScaler({
  minInstances: 2,
  maxInstances: 10,
  cpuThreshold: 75,
  predictionModel: 'neural'
});

await scaler.initialize();
await scaler.start();

// Manual scaling
await scaler.scaleUp(3);
await scaler.scaleDown(1);

// Get recommendations
const recommendations = scaler.getScalingRecommendations();
console.log('Recommended actions:', recommendations);

// Emergency scaling
await scaler.emergencyScale();

// Stop the scaler
await scaler.stop();
```

---

## Distributed Redis Clustering

**File**: `scripts/performance/redis-cluster.ts`

### Classes

#### `RedisClusterManager`

Manages distributed Redis cluster with automatic sharding and high availability.

```typescript
class RedisClusterManager {
  constructor(config?: RedisClusterConfig)

  // Lifecycle
  async initialize(): Promise<void>
  async start(): Promise<void>
  async stop(): Promise<void>
  async shutdown(): Promise<void>

  // Cluster Operations
  async addNode(node: RedisNode): Promise<void>
  async removeNode(nodeId: string): Promise<void>
  async rebalanceCluster(): Promise<void>

  // Cache Operations
  async get(key: string): Promise<any>
  async set(key: string, value: any, ttl?: number): Promise<void>
  async del(key: string): Promise<void>
  async exists(key: string): Promise<boolean>

  // Advanced Operations
  async warmCache(patterns: string[]): Promise<void>
  async invalidatePattern(pattern: string): Promise<void>
  async getClusterStats(): ClusterStats
  async getPerformanceMetrics(): RedisMetrics[]
}
```

#### Configuration Types

```typescript
interface RedisClusterConfig {
  // Cluster settings
  clusterName: string
  nodes: RedisNode[]
  replicationFactor: number     // Default: 2

  // Sharding
  shardingStrategy: 'consistent_hash' | 'range' | 'hash_slots'
  hashSlots: number             // Default: 16384

  // High availability
  autoFailover: boolean         // Default: true
  failoverTimeout: number       // Default: 30000 (ms)

  // Performance
  maxConnections: number        // Default: 100
  connectionTimeout: number     // Default: 5000 (ms)

  // Multi-region
  enableMultiRegion: boolean    // Default: false
  regions: RegionConfig[]
}

interface RedisNode {
  id: string
  host: string
  port: number
  role: 'master' | 'slave'
  region?: string
  weight?: number               // For load balancing
}

interface RegionConfig {
  name: string
  nodes: RedisNode[]
  latency: number               // Target latency (ms)
  priority: number              // Priority for reads
}
```

### Usage Examples

```typescript
import { RedisClusterManager } from './scripts/performance/redis-cluster.ts';

// Initialize cluster
const cluster = new RedisClusterManager({
  clusterName: 'cortex-os-cache',
  nodes: [
    { id: 'node-1', host: 'redis-1.example.com', port: 6379, role: 'master' },
    { id: 'node-2', host: 'redis-2.example.com', port: 6379, role: 'slave' }
  ],
  replicationFactor: 2,
  shardingStrategy: 'consistent_hash'
});

await cluster.initialize();
await cluster.start();

// Basic cache operations
await cluster.set('user:123', { name: 'John', age: 30 }, 3600);
const user = await cluster.get('user:123');
console.log('User:', user);

// Cache warming
await cluster.warmCache(['user:*', 'session:*']);

// Cluster statistics
const stats = await cluster.getClusterStats();
console.log('Cluster health:', stats);

// Performance metrics
const metrics = await cluster.getPerformanceMetrics();
console.log('Performance:', metrics);
```

---

## Performance Analytics Engine

**File**: `scripts/performance/analytics-engine.ts`

### Classes

#### `PerformanceAnalyticsEngine`

Comprehensive performance analytics with anomaly detection and forecasting.

```typescript
class PerformanceAnalyticsEngine {
  constructor(config?: AnalyticsConfig)

  // Lifecycle
  async initialize(): Promise<void>
  async start(): Promise<void>
  async stop(): Promise<void>

  // Data Collection
  recordMetric(metric: MetricData): void
  recordBatch(metrics: MetricData[]): void

  // Analytics
  generateInsights(timeRange?: TimeRange): Promise<Insight[]>
  detectAnomalies(timeRange?: TimeRange): Promise<Anomaly[]>
  forecastMetrics(metric: string, horizon: number): Promise<Forecast>

  // Performance Analysis
  analyzePerformanceTrends(timeRange?: TimeRange): Promise<TrendAnalysis>
  identifyBottlenecks(): Promise<Bottleneck[]>
  generateOptimizationRecommendations(): Promise<Recommendation[]>

  // Reporting
  generatePerformanceReport(timeRange?: TimeRange): Promise<PerformanceReport>
  exportAnalytics(format: 'json' | 'csv' | 'pdf'): Promise<Buffer>
}
```

#### Configuration Types

```typescript
interface AnalyticsConfig {
  // Data retention
  retentionPeriod: number        // Default: 30 days
  maxDataPoints: number          // Default: 100000

  // Anomaly detection
  anomalyAlgorithm: 'statistical' | 'ml' | 'hybrid'
  sensitivity: number            // Default: 0.8 (0-1)
  minDataPoints: number          // Default: 100

  // Forecasting
  forecastModel: 'arima' | 'prophet' | 'neural'
  forecastHorizon: number        // Default: 24 hours

  // Performance thresholds
  performanceThresholds: PerformanceThresholds
}

interface MetricData {
  name: string
  value: number
  timestamp: number
  tags?: Record<string, string>
  metadata?: Record<string, any>
}

interface Insight {
  id: string
  type: 'trend' | 'anomaly' | 'bottleneck' | 'recommendation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  metrics: string[]
  timeRange: TimeRange
  recommendations: string[]
}

interface Anomaly {
  id: string
  metric: string
  detectedAt: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  expectedValue: number
  actualValue: number
  deviation: number
  confidence: number             // 0-1
}
```

### Usage Examples

```typescript
import { PerformanceAnalyticsEngine } from './scripts/performance/analytics-engine.ts';

// Initialize analytics
const analytics = new PerformanceAnalyticsEngine({
  retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
  anomalyAlgorithm: 'hybrid',
  sensitivity: 0.85
});

await analytics.initialize();
await analytics.start();

// Record metrics
analytics.recordMetric({
  name: 'cpu_usage',
  value: 75.5,
  timestamp: Date.now(),
  tags: { instance: 'web-server-1' }
});

// Batch recording
analytics.recordBatch([
  { name: 'memory_usage', value: 68.2, timestamp: Date.now() },
  { name: 'response_time', value: 250, timestamp: Date.now() }
]);

// Generate insights
const insights = await analytics.generateInsights();
console.log('Performance insights:', insights);

// Detect anomalies
const anomalies = await analytics.detectAnomalies();
anomalies.forEach(anomaly => {
  console.log(`Anomaly detected: ${anomaly.metric} = ${anomaly.actualValue} (expected: ${anomaly.expectedValue})`);
});

// Generate forecast
const forecast = await analytics.forecastMetrics('cpu_usage', 24); // 24 hours
console.log('CPU usage forecast:', forecast);

// Performance analysis
const trends = await analytics.analyzePerformanceTrends();
const bottlenecks = await analytics.identifyBottlenecks();
const recommendations = await analytics.generateOptimizationRecommendations();

// Generate comprehensive report
const report = await analytics.generatePerformanceReport();
console.log('Performance report:', report.summary);
```

---

## Intelligent Query Router

**File**: `scripts/performance/intelligent-router.ts`

### Classes

#### `IntelligentQueryRouter`

ML-powered query routing with adaptive load balancing.

```typescript
class IntelligentQueryRouter {
  constructor(config?: RouterConfig)

  // Lifecycle
  async initialize(): Promise<void>
  async start(): Promise<void>
  async stop(): Promise<void>

  // Query Routing
  async routeQuery(query: Query): Promise<QueryResult>
  async routeBatch(queries: Query[]): Promise<QueryResult[]>

  // Learning & Adaptation
  recordQueryResult(query: Query, result: QueryResult): void
  trainModel(): Promise<ModelTrainingResult>
  updateRoutingStrategy(strategy: RoutingStrategy): void

  // Circuit Breaker
  enableCircuitBreaker(target: string): void
  disableCircuitBreaker(target: string): void
  getCircuitBreakerStatus(): CircuitBreakerStatus[]

  // Analytics
  getRoutingMetrics(): RoutingMetrics
  getPerformanceStats(): PerformanceStats
  getLoadBalancingStatus(): LoadBalancingStatus
}
```

#### Configuration Types

```typescript
interface RouterConfig {
  // Routing strategy
  defaultStrategy: 'round_robin' | 'least_loaded' | 'weighted' | 'predictive'
  enableMLRouting: boolean       // Default: true

  // Targets
  targets: RoutingTarget[]
  healthCheckInterval: number    // Default: 30000 (ms)

  // Circuit breaker
  circuitBreakerThreshold: number // Default: 5 failures
  circuitBreakerTimeout: number   // Default: 60000 (ms)

  // Load balancing
  loadBalancingAlgorithm: 'weighted' | 'consistent_hash' | 'adaptive'
  rebalanceInterval: number       // Default: 300000 (5 minutes)

  // Performance optimization
  enableQueryCaching: boolean    // Default: true
  cacheSize: number              // Default: 1000
  cacheTTL: number               // Default: 300000 (5 minutes)
}

interface Query {
  id: string
  type: 'read' | 'write' | 'compute'
  priority: 'low' | 'medium' | 'high' | 'critical'
  complexity: 'simple' | 'moderate' | 'complex'
  estimatedCost: number
  metadata: Record<string, any>
  payload: any
}

interface RoutingTarget {
  id: string
  endpoint: string
  weight: number
  maxConcurrency: number
  currentLoad: number
  healthStatus: 'healthy' | 'degraded' | 'unhealthy'
  capabilities: string[]
  region?: string
}
```

### Usage Examples

```typescript
import { IntelligentQueryRouter } from './scripts/performance/intelligent-router.ts';

// Initialize router
const router = new IntelligentQueryRouter({
  defaultStrategy: 'predictive',
  enableMLRouting: true,
  targets: [
    {
      id: 'database-primary',
      endpoint: 'postgres://primary.db.example.com',
      weight: 2,
      maxConcurrency: 100,
      capabilities: ['read', 'write']
    },
    {
      id: 'database-replica-1',
      endpoint: 'postgres://replica1.db.example.com',
      weight: 1,
      maxConcurrency: 50,
      capabilities: ['read']
    }
  ],
  circuitBreakerThreshold: 3,
  enableQueryCaching: true
});

await router.initialize();
await router.start();

// Route a single query
const query = {
  id: 'query-123',
  type: 'read',
  priority: 'high',
  complexity: 'moderate',
  estimatedCost: 10,
  metadata: { table: 'users' },
  payload: 'SELECT * FROM users WHERE id = $1'
};

const result = await router.routeQuery(query);
console.log('Query result:', result);

// Route batch queries
const batchResults = await router.routeBatch([query1, query2, query3]);

// Record query results for learning
router.recordQueryResult(query, result);

// Train the ML model
const trainingResult = await router.trainModel();
console.log('Model training completed:', trainingResult);

// Get routing metrics
const metrics = router.getRoutingMetrics();
console.log('Routing performance:', metrics);

// Circuit breaker management
router.enableCircuitBreaker('database-primary');
const circuitStatus = router.getCircuitBreakerStatus();
console.log('Circuit breaker status:', circuitStatus);
```

---

## Advanced GPU Management

**File**: `scripts/performance/gpu-manager.ts`

### Classes

#### `GPUMemoryManager`

Advanced GPU memory management with intelligent task scheduling.

```typescript
class GPUMemoryManager {
  constructor(config?: GPUManagerConfig)

  // Lifecycle
  async initialize(): Promise<void>
  async start(): Promise<void>
  async stop(): Promise<void>
  async shutdown(): Promise<void>

  // Task Management
  async submitTask(task: GPUTask): Promise<string>
  async cancelTask(taskId: string): Promise<boolean>
  async getTaskStatus(taskId: string): Promise<GPUTask | null>

  // GPU Management
  detectGPUs(): Promise<GPUInfo[]>
  getGPUStatus(): GPUStatusReport
  optimizeMemoryAllocation(): Promise<OptimizationResult>

  // Monitoring
  startRealTimeMonitoring(): void
  stopRealTimeMonitoring(): void
  getPerformanceMetrics(): GPUMetrics

  // Advanced Features
  enableMemoryCompaction(): void
  setLoadBalancingStrategy(strategy: LoadBalancingStrategy): void
  getRecommendations(): GPURecommendation[]
}
```

#### Configuration Types

```typescript
interface GPUManagerConfig {
  // Task scheduling
  maxConcurrentTasks: number     // Default: 4
  schedulingPolicy: SchedulingPolicy

  // Memory management
  memoryPoolSize: number         // Default: 0.9 (90% of available)
  allocationStrategy: 'first_fit' | 'best_fit' | 'worst_fit' | 'buddy'
  enableCompaction: boolean      // Default: true

  // Performance thresholds
  memoryThresholds: {
    warning: number              // Default: 0.8
    critical: number             // Default: 0.9
    emergency: number            // Default: 0.95
  }

  // Load balancing
  loadBalancingStrategy: 'round_robin' | 'least_loaded' | 'best_fit' | 'predictive'
  enableMultiGPU: boolean        // Default: true
}

interface GPUTask {
  id?: string
  type: 'inference' | 'training' | 'embedding' | 'processing'
  priority: 'low' | 'medium' | 'high' | 'critical'
  memoryRequired: number
  estimatedDuration: number
  metadata: Record<string, any>
}

interface GPUInfo {
  id: number
  name: string
  memoryTotal: number
  memoryUsed: number
  memoryFree: number
  utilization: number
  temperature: number
  powerUsage: number
  isAvailable: boolean
}
```

### Usage Examples

```typescript
import { GPUMemoryManager } from './scripts/performance/gpu-manager.ts';

// Initialize GPU manager
const gpuManager = new GPUMemoryManager({
  maxConcurrentTasks: 6,
  memoryPoolSize: 0.85,
  allocationStrategy: 'best_fit',
  loadBalancingStrategy: 'predictive',
  enableCompaction: true
});

await gpuManager.initialize();
await gpuManager.start();

// Submit tasks
const inferenceTask = await gpuManager.submitTask({
  type: 'inference',
  priority: 'high',
  memoryRequired: 2 * 1024 * 1024 * 1024, // 2GB
  estimatedDuration: 5000,
  metadata: { model: 'gpt-3.5-turbo' }
});

const embeddingTask = await gpuManager.submitTask({
  type: 'embedding',
  priority: 'medium',
  memoryRequired: 1 * 1024 * 1024 * 1024, // 1GB
  estimatedDuration: 2000,
  metadata: { batchSize: 100 }
});

// Monitor task status
const status = await gpuManager.getTaskStatus(inferenceTask);
console.log('Task status:', status);

// Cancel a task if needed
await gpuManager.cancelTask(embeddingTask);

// Get GPU status
const gpuStatus = gpuManager.getGPUStatus();
console.log('GPU status:', gpuStatus);

// Optimize memory allocation
const optimizationResult = await gpuManager.optimizeMemoryAllocation();
console.log('Memory optimization result:', optimizationResult);

// Get performance metrics
const metrics = gpuManager.getPerformanceMetrics();
console.log('GPU performance:', metrics);

// Get recommendations
const recommendations = gpuManager.getRecommendations();
recommendations.forEach(rec => {
  console.log(`GPU Recommendation: ${rec.description}`);
});
```

---

## Real-Time Alerting System

**File**: `scripts/performance/alerting-system.ts`

### Classes

#### `PerformanceAlertingSystem`

Real-time performance alerting with intelligent correlation and escalation.

```typescript
class PerformanceAlertingSystem extends EventEmitter {
  constructor(config?: AlertingConfig)

  // Lifecycle
  async start(): Promise<void>
  async stop(): Promise<void>

  // Alert Rules
  addRule(rule: Omit<AlertRule, 'id'>): string
  updateRule(id: string, updates: Partial<AlertRule>): boolean
  removeRule(id: string): boolean
  getRules(): AlertRule[]

  // Alert Channels
  addChannel(id: string, channel: AlertChannel): void
  removeChannel(id: string): void
  getChannels(): AlertChannel[]

  // Alert Management
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean
  resolveAlert(alertId: string, reason?: string): boolean
  getActiveAlerts(): Alert[]
  getAlertHistory(timeRange?: TimeRange): Alert[]

  // Metrics & Monitoring
  submitMetric(data: MetricData): void
  getStatus(): AlertingSystemStatus
  getStatistics(): AlertStatistics
  getRecommendations(): string[]
}
```

#### Configuration Types

```typescript
interface AlertingConfig {
  // Anomaly detection
  anomalyDetection: {
    enabled: boolean              // Default: true
    algorithm: 'statistical' | 'ml' | 'hybrid'
    sensitivity: number           // Default: 0.8
    minDataPoints: number         // Default: 100
  }

  // Alert management
  defaultCooldown: number        // Default: 900 (15 minutes)
  maxActiveAlerts: number        // Default: 1000
  enableCorrelation: boolean     // Default: true

  // Escalation
  defaultEscalationPolicy: EscalationPolicy
  enableAutoResolution: boolean  // Default: true

  // Alert fatigue prevention
  enableRateLimiting: boolean    // Default: true
  maxAlertsPerMinute: number     // Default: 10
  enableGrouping: boolean        // Default: true
}

interface AlertRule {
  id: string
  name: string
  description: string
  metric: string
  condition: AlertCondition
  threshold: number
  duration: number               // seconds
  severity: AlertSeverity
  enabled: boolean
  tags: string[]
  cooldown: number               // seconds
  escalationPolicy?: EscalationPolicy
}

interface AlertChannel {
  type: 'console' | 'email' | 'slack' | 'webhook' | 'pagerduty' | 'teams'
  config: Record<string, any>
  enabled: boolean
}

type AlertCondition =
  | 'greater_than'
  | 'less_than'
  | 'equals'
  | 'not_equals'
  | 'rate_increase'
  | 'rate_decrease';

type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
```

### Usage Examples

```typescript
import { PerformanceAlertingSystem } from './scripts/performance/alerting-system.ts';

// Initialize alerting system
const alerting = new PerformanceAlertingSystem({
  anomalyDetection: {
    enabled: true,
    algorithm: 'hybrid',
    sensitivity: 0.85,
    minDataPoints: 50
  },
  defaultCooldown: 600, // 10 minutes
  enableCorrelation: true,
  enableRateLimiting: true
});

await alerting.start();

// Add alert rules
const cpuAlertId = alerting.addRule({
  name: 'High CPU Usage',
  description: 'Alert when CPU usage exceeds threshold',
  metric: 'cpu_usage',
  condition: 'greater_than',
  threshold: 80,
  duration: 300, // 5 minutes
  severity: 'warning',
  enabled: true,
  tags: ['system', 'performance'],
  cooldown: 900 // 15 minutes
});

const errorRateId = alerting.addRule({
  name: 'High Error Rate',
  description: 'Alert when error rate is critical',
  metric: 'error_rate',
  condition: 'greater_than',
  threshold: 10,
  duration: 60, // 1 minute
  severity: 'critical',
  enabled: true,
  tags: ['reliability', 'errors'],
  cooldown: 300 // 5 minutes
});

// Add alert channels
alerting.addChannel('console', {
  type: 'console',
  config: { colorize: true },
  enabled: true
});

alerting.addChannel('slack', {
  type: 'slack',
  config: {
    webhook: process.env.SLACK_WEBHOOK_URL,
    channel: '#alerts'
  },
  enabled: true
});

alerting.addChannel('webhook', {
  type: 'webhook',
  config: {
    url: 'https://api.example.com/webhooks/alerts',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.ALERT_API_KEY}` }
  },
  enabled: true
});

// Submit metrics for monitoring
setInterval(() => {
  alerting.submitMetric({
    name: 'cpu_usage',
    value: Math.random() * 100,
    timestamp: Date.now(),
    tags: { instance: 'web-server-1' }
  });

  alerting.submitMetric({
    name: 'error_rate',
    value: Math.random() * 15,
    timestamp: Date.now(),
    tags: { service: 'api-gateway' }
  });
}, 5000);

// Listen for alert events
alerting.on('alert', (alert) => {
  console.log(`🚨 Alert triggered: ${alert.message}`);
});

alerting.on('alert:resolved', (alert) => {
  console.log(`✅ Alert resolved: ${alert.id}`);
});

alerting.on('alert:escalated', (alert) => {
  console.log(`📈 Alert escalated: ${alert.message}`);
});

// Alert management
const activeAlerts = alerting.getActiveAlerts();
console.log('Active alerts:', activeAlerts.length);

// Acknowledge an alert
alerting.acknowledgeAlert(cpuAlertId, 'ops-team');

// Resolve an alert
alerting.resolveAlert(errorRateId, 'Fixed the underlying issue');

// Get system status
const status = alerting.getStatus();
console.log('Alerting system status:', status);

// Get statistics
const stats = alerting.getStatistics();
console.log('Alert statistics:', stats);

// Get recommendations
const recommendations = alerting.getRecommendations();
recommendations.forEach(rec => {
  console.log(`Recommendation: ${rec}`);
});

// Stop the alerting system
await alerting.stop();
```

---

## Common Patterns and Utilities

### Error Handling

All performance components include comprehensive error handling:

```typescript
try {
  await component.initialize();
  await component.start();
  // Use component...
} catch (error) {
  console.error(`Performance component error: ${error.message}`);
  // Handle error appropriately
} finally {
  await component.stop();
}
```

### Configuration Management

Most components support environment variable configuration:

```typescript
// Example: Loading configuration from environment
const config = {
  maxInstances: parseInt(process.env.PERF_MAX_INSTANCES || '10'),
  cpuThreshold: parseFloat(process.env.PERF_CPU_THRESHOLD || '80'),
  enableML: process.env.PERF_ENABLE_ML === 'true'
};
```

### Monitoring and Observability

All components provide metrics and status reporting:

```typescript
// Get component status
const status = component.getStatus();

// Get performance metrics
const metrics = component.getPerformanceMetrics();

// Get health information
const health = await component.healthCheck();
```

### Integration Examples

See the following files for complete integration examples:
- `examples/performance-integration.ts` - Full system integration
- `examples/performance-monitoring.ts` - Monitoring setup
- `examples/performance-automation.ts` - Automated workflows

---

## Troubleshooting

For common issues and troubleshooting guidance, see [Performance Troubleshooting Guide](./performance-troubleshooting.md).

## Additional Resources

- [Performance Optimization Guide](../PERFORMANCE_OPTIMIZATION_GUIDE.md)
- [Performance Implementation Summary](../PERFORMANCE_IMPLEMENTATION_SUMMARY.md)
- [Phase 2 Implementation Complete](../PHASE_2_IMPLEMENTATION_COMPLETE.md)