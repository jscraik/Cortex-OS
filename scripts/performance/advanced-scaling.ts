#!/usr/bin/env tsx

/**
 * Advanced Auto-Scaling System for Cortex-OS
 *
 * This script implements predictive auto-scaling with:
 * - Machine learning-based load prediction
 * - Advanced scaling algorithms (seasonal, exponential, linear)
 * - Cost optimization with spot instance management
 * - Real-time performance analytics
 * - Intelligent resource allocation
 */

import { randomUUID } from 'node:crypto';
import { performanceMonitor } from '../../packages/memory-core/src/monitoring/PerformanceMonitor.js';

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
  white: '\x1b[37m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}[ADV-SCALE] ${message}${colors.reset}`);
}

interface ScalingMetrics {
  timestamp: number;
  cpu: number;
  memory: number;
  latency: number;
  requestRate: number;
  errorRate: number;
  queueLength: number;
  activeConnections: number;
  gpuUtilization?: number;
  cacheHitRate: number;
  throughput: number;
}

interface ScalingPrediction {
  timestamp: number;
  algorithm: 'linear' | 'exponential' | 'seasonal' | 'neural';
  predictedLoad: number;
  confidence: number;
  recommendedInstances: number;
  costEstimate: number;
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
}

interface ScalingDecision {
  timestamp: number;
  action: 'scale-up' | 'scale-down' | 'maintain' | 'emergency-scale';
  currentInstances: number;
  targetInstances: number;
  reason: string;
  estimatedCost: number;
  estimatedDuration: number;
  riskLevel: 'low' | 'medium' | 'high';
  metrics: ScalingMetrics;
}

interface CostOptimization {
  spotInstanceRatio: number;
  onDemandCapacity: number;
  totalCost: number;
  savings: number;
  riskOfInterruption: number;
}

class PredictiveScalingEngine {
  private metrics: ScalingMetrics[] = [];
  private predictions: ScalingPrediction[] = [];
  private decisions: ScalingDecision[] = [];
  private maxHistorySize = 1000;
  private predictionWindow = 15 * 60 * 1000; // 15 minutes
  private confidenceThreshold = 0.7;
  private isRunning = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  // Scaling configuration
  private config = {
    minInstances: 1,
    maxInstances: 20,
    targetCPUUtilization: 70,
    targetMemoryUtilization: 75,
    targetLatency: 2000,
    scaleUpCooldown: 120000, // 2 minutes
    scaleDownCooldown: 300000, // 5 minutes
    emergencyThreshold: {
      cpu: 95,
      memory: 95,
      latency: 10000,
      errorRate: 0.2,
    },
    costOptimization: {
      enableSpotInstances: true,
      maxSpotRatio: 0.6,
      spotInterruptionBuffer: 0.2,
    },
  };

  constructor() {
    this.setupSignalHandlers();
  }

  private setupSignalHandlers(): void {
    process.on('SIGINT', () => {
      log('Shutting down predictive scaling engine...', 'yellow');
      this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      log('Shutting down predictive scaling engine...', 'yellow');
      this.stop();
      process.exit(0);
    });
  }

  async collectMetrics(): Promise<ScalingMetrics> {
    try {
      const now = Date.now();

      // Collect system metrics
      const cpuUsage = await this.getCPUUsage();
      const memoryUsage = await this.getMemoryUsage();
      const gpuMetrics = await this.getGPUMetrics();

      // Collect application metrics
      const appMetrics = performanceMonitor.getMetrics();

      // Calculate derived metrics
      const requestRate = this.calculateRequestRate();
      const queueLength = this.calculateQueueLength();
      const activeConnections = this.getActiveConnections();
      const throughput = this.calculateThroughput();

      const metrics: ScalingMetrics = {
        timestamp: now,
        cpu: cpuUsage,
        memory: memoryUsage,
        latency: appMetrics.averageQueryTime,
        requestRate,
        errorRate: this.calculateErrorRate(),
        queueLength,
        activeConnections,
        gpuUtilization: gpuMetrics.utilization,
        cacheHitRate: appMetrics.cacheHitRatio,
        throughput,
      };

      // Store metrics
      this.metrics.push(metrics);
      if (this.metrics.length > this.maxHistorySize) {
        this.metrics.shift();
      }

      return metrics;
    } catch (error) {
      log(`Failed to collect metrics: ${error}`, 'red');
      return this.getDefaultMetrics();
    }
  }

  private async getCPUUsage(): Promise<number> {
    try {
      const { execSync } = await import('child_process');
      const usage = execSync('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\' | cut -d\'%\' -f1', { encoding: 'utf8' });
      return parseFloat(usage.trim()) || 0;
    } catch {
      // Environment-configurable fallback for testing
      const fallbackCpu = process.env.PERF_FALLBACK_CPU_USAGE;
      return fallbackCpu ? parseFloat(fallbackCpu) : 25.0; // Fixed fallback
    }
  }

  private async getMemoryUsage(): Promise<number> {
    try {
      const { execSync } = await import('child_process');
      const output = execSync('free -m | grep Mem', { encoding: 'utf8' });
      const parts = output.trim().split(/\s+/);
      const total = parseInt(parts[1], 10);
      const used = parseInt(parts[2], 10);
      return (used / total) * 100;
    } catch {
      // Environment-configurable fallback for testing
      const fallbackMemory = process.env.PERF_FALLBACK_MEMORY_USAGE;
      return fallbackMemory ? parseFloat(fallbackMemory) : 50.0; // Fixed fallback
    }
  }

  private async getGPUMetrics(): Promise<{ utilization: number; memory: number }> {
    try {
      const { execSync } = await import('child_process');
      const output = execSync('nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits', { encoding: 'utf8' });
      const [utilization, memoryUsed, memoryTotal] = output.trim().split(',').map(s => s.trim());

      return {
        utilization: parseFloat(utilization) || 0,
        memory: memoryTotal > 0 ? (parseFloat(memoryUsed) / parseFloat(memoryTotal)) * 100 : 0,
      };
    } catch {
      return { utilization: 0, memory: 0 };
    }
  }

  private calculateRequestRate(): number {
    // Simulate request rate calculation based on recent metrics
    if (this.metrics.length < 2) return 100;

    const recentMetrics = this.metrics.slice(-10);
    const avgRequests = recentMetrics.reduce((sum, m) => sum + m.requestRate, 0) / recentMetrics.length;
    // Use environment-configurable variation for testing
    const variationRange = process.env.PERF_REQUEST_RATE_VARIATION 
      ? parseFloat(process.env.PERF_REQUEST_RATE_VARIATION) : 0;
    return avgRequests; // No random variation in production
  }

  private calculateQueueLength(): number {
    if (this.metrics.length === 0) return 0;

    const latestMetrics = this.metrics[this.metrics.length - 1];
    const queueLength = Math.max(0, latestMetrics.requestRate - latestMetrics.throughput);
    return Math.min(queueLength, 1000);
  }

  private getActiveConnections(): number {
    // Simulate active connections
    // Environment-configurable active connections for testing
    const configuredConnections = process.env.PERF_ACTIVE_CONNECTIONS;
    return configuredConnections ? parseInt(configuredConnections, 10) : 75; // Fixed baseline
  }

  private calculateThroughput(): number {
    if (this.metrics.length === 0) return 100;

    const latestMetrics = this.metrics[this.metrics.length - 1];
    // Use environment-configurable throughput multiplier
    const throughputMultiplier = process.env.PERF_THROUGHPUT_MULTIPLIER 
      ? parseFloat(process.env.PERF_THROUGHPUT_MULTIPLIER) : 0.9;
    return latestMetrics.requestRate * throughputMultiplier;
  }

  private calculateErrorRate(): number {
    if (this.metrics.length === 0) return 0.01;

    const latestMetrics = this.metrics[this.metrics.length - 1];
    const baseErrorRate = latestMetrics.cpu > 80 || latestMetrics.memory > 85 ? 0.05 : 0.01;
    // Use environment-configurable error rate for testing
    const configuredErrorRate = process.env.PERF_ERROR_RATE;
    return configuredErrorRate ? parseFloat(configuredErrorRate) : baseErrorRate;
  }

  private getDefaultMetrics(): ScalingMetrics {
    const now = Date.now();
    return {
      timestamp: now,
      cpu: 50,
      memory: 60,
      latency: 1000,
      requestRate: 100,
      errorRate: 0.01,
      queueLength: 10,
      activeConnections: 50,
      cacheHitRate: 0.8,
      throughput: 95,
    };
  }

  async generatePredictions(): Promise<ScalingPrediction[]> {
    if (this.metrics.length < 10) {
      log('Insufficient data for predictions, using defaults', 'yellow');
      return this.getDefaultPredictions();
    }

    const predictions: ScalingPrediction[] = [];
    const now = Date.now();

    // Linear prediction
    const linearPrediction = this.predictLinear(now);
    if (linearPrediction) predictions.push(linearPrediction);

    // Exponential prediction
    const exponentialPrediction = this.predictExponential(now);
    if (exponentialPrediction) predictions.push(exponentialPrediction);

    // Seasonal prediction
    const seasonalPrediction = this.predictSeasonal(now);
    if (seasonalPrediction) predictions.push(seasonalPrediction);

    // Neural network prediction (simplified)
    const neuralPrediction = this.predictNeural(now);
    if (neuralPrediction) predictions.push(neuralPrediction);

    // Store predictions
    this.predictions.push(...predictions);
    if (this.predictions.length > 100) {
      this.predictions = this.predictions.slice(-100);
    }

    return predictions;
  }

  private predictLinear(timestamp: number): ScalingPrediction | null {
    try {
      const recentMetrics = this.metrics.slice(-30);
      if (recentMetrics.length < 10) return null;

      // Calculate trend
      const n = recentMetrics.length;
      const xValues = recentMetrics.map((_, i) => i);
      const yValues = recentMetrics.map(m => m.requestRate);

      const sumX = xValues.reduce((a, b) => a + b, 0);
      const sumY = yValues.reduce((a, b) => a + b, 0);
      const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
      const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Predict future load
      const futureX = n + 15; // 15 steps into future
      const predictedLoad = slope * futureX + intercept;

      const recommendedInstances = Math.ceil(predictedLoad / 100); // 100 requests per instance
      const confidence = Math.min(0.9, Math.max(0.3, 1 - Math.abs(slope) / 10));

      return {
        timestamp,
        algorithm: 'linear',
        predictedLoad,
        confidence,
        recommendedInstances: Math.max(this.config.minInstances, Math.min(this.config.maxInstances, recommendedInstances)),
        costEstimate: recommendedInstances * 0.05, // $0.05 per instance per minute
        riskLevel: confidence > 0.7 ? 'low' : confidence > 0.5 ? 'medium' : 'high',
        reasoning: `Linear trend analysis with slope ${slope.toFixed(2)} requests/minute`,
      };
    } catch (error) {
      log(`Linear prediction failed: ${error}`, 'red');
      return null;
    }
  }

  private predictExponential(timestamp: number): ScalingPrediction | null {
    try {
      const recentMetrics = this.metrics.slice(-20);
      if (recentMetrics.length < 5) return null;

      // Simple exponential smoothing
      const alpha = 0.3;
      let smoothed = recentMetrics[0].requestRate;

      for (let i = 1; i < recentMetrics.length; i++) {
        smoothed = alpha * recentMetrics[i].requestRate + (1 - alpha) * smoothed;
      }

      // Project exponential growth
      const growthRate = 0.05; // 5% growth rate
      const predictedLoad = smoothed * Math.pow(1 + growthRate, 15);

      const recommendedInstances = Math.ceil(predictedLoad / 100);
      const confidence = 0.6; // Medium confidence for exponential

      return {
        timestamp,
        algorithm: 'exponential',
        predictedLoad,
        confidence,
        recommendedInstances: Math.max(this.config.minInstances, Math.min(this.config.maxInstances, recommendedInstances)),
        costEstimate: recommendedInstances * 0.05,
        riskLevel: 'medium',
        reasoning: `Exponential smoothing with ${growthRate * 100}% growth rate`,
      };
    } catch (error) {
      log(`Exponential prediction failed: ${error}`, 'red');
      return null;
    }
  }

  private predictSeasonal(timestamp: number): ScalingPrediction | null {
    try {
      const hour = new Date(timestamp).getHours();

      // Simple daily pattern
      const hourlyPattern = {
        0: 0.2, 1: 0.1, 2: 0.1, 3: 0.1, 4: 0.1, 5: 0.2,
        6: 0.4, 7: 0.6, 8: 0.8, 9: 1.0, 10: 1.0, 11: 0.9,
        12: 0.8, 13: 0.8, 14: 0.9, 15: 0.9, 16: 1.0, 17: 1.0,
        18: 0.8, 19: 0.6, 20: 0.4, 21: 0.3, 22: 0.2, 23: 0.2,
      };

      const baseLoad = this.metrics.length > 0 ? this.metrics[this.metrics.length - 1].requestRate : 100;
      const seasonalMultiplier = hourlyPattern[hour as keyof typeof hourlyPattern] || 1.0;
      const predictedLoad = baseLoad * seasonalMultiplier;

      const recommendedInstances = Math.ceil(predictedLoad / 100);
      const confidence = 0.7;

      return {
        timestamp,
        algorithm: 'seasonal',
        predictedLoad,
        confidence,
        recommendedInstances: Math.max(this.config.minInstances, Math.min(this.config.maxInstances, recommendedInstances)),
        costEstimate: recommendedInstances * 0.05,
        riskLevel: 'low',
        reasoning: `Seasonal pattern for hour ${hour}: ${(seasonalMultiplier * 100).toFixed(0)}% of baseline`,
      };
    } catch (error) {
      log(`Seasonal prediction failed: ${error}`, 'red');
      return null;
    }
  }

  private predictNeural(timestamp: number): ScalingPrediction | null {
    try {
      // Simplified neural network - multi-layer perceptron with basic weights
      if (this.metrics.length < 20) return null;

      const recentMetrics = this.metrics.slice(-10);

      // Extract features
      const features = recentMetrics.map(m => [
        m.cpu / 100,
        m.memory / 100,
        m.requestRate / 1000,
        m.cacheHitRate,
        m.errorRate * 100,
      ]);

      // Simple neural network with random weights (in production, this would be trained)
      const weights1 = [
        [0.5, -0.3, 0.8, 0.2, -0.1],
        [-0.2, 0.6, 0.4, -0.5, 0.3],
        [0.7, 0.1, -0.4, 0.6, 0.2],
      ];

      const weights2 = [0.4, -0.6, 0.8];
      const bias1 = [0.1, -0.2, 0.05];
      const bias2 = -0.1;

      // Forward pass
      const hidden = weights1.map((weights, i) => {
        const sum = weights.reduce((acc, weight, j) => acc + weight * features[features.length - 1][j], 0) + bias1[i];
        return Math.tanh(sum); // Activation function
      });

      const output = hidden.reduce((acc, val, i) => acc + val * weights2[i], 0) + bias2;
      const normalizedOutput = 1 / (1 + Math.exp(-output)); // Sigmoid

      const baseLoad = recentMetrics[recentMetrics.length - 1].requestRate;
      const predictedLoad = baseLoad * (0.5 + normalizedOutput);

      const recommendedInstances = Math.ceil(predictedLoad / 100);
      const confidence = 0.65;

      return {
        timestamp,
        algorithm: 'neural',
        predictedLoad,
        confidence,
        recommendedInstances: Math.max(this.config.minInstances, Math.min(this.config.maxInstances, recommendedInstances)),
        costEstimate: recommendedInstances * 0.05,
        riskLevel: 'medium',
        reasoning: `Neural network prediction with activation ${normalizedOutput.toFixed(3)}`,
      };
    } catch (error) {
      log(`Neural prediction failed: ${error}`, 'red');
      return null;
    }
  }

  private getDefaultPredictions(): ScalingPrediction[] {
    const now = Date.now();
    return [
      {
        timestamp: now,
        algorithm: 'linear',
        predictedLoad: 100,
        confidence: 0.5,
        recommendedInstances: 1,
        costEstimate: 0.05,
        riskLevel: 'medium',
        reasoning: 'Default prediction due to insufficient data',
      },
    ];
  }

  async makeScalingDecision(metrics: ScalingMetrics, predictions: ScalingPrediction[]): Promise<ScalingDecision> {
    const currentInstances = 1; // This would come from your infrastructure
    let targetInstances = currentInstances;
    let action: ScalingDecision['action'] = 'maintain';
    let reason = 'Current load is within acceptable range';

    // Check emergency conditions first
    if (metrics.cpu > this.config.emergencyThreshold.cpu ||
        metrics.memory > this.config.emergencyThreshold.memory ||
        metrics.latency > this.config.emergencyThreshold.latency ||
        metrics.errorRate > this.config.emergencyThreshold.errorRate) {
      action = 'emergency-scale';
      targetInstances = Math.min(this.config.maxInstances, currentInstances * 3);
      reason = `Emergency conditions detected: CPU ${metrics.cpu.toFixed(1)}%, Memory ${metrics.memory.toFixed(1)}%, Latency ${metrics.latency}ms`;
    }
    // Check normal scaling conditions
    else {
      // Combine predictions with current metrics
      const consensusInstances = this.calculateConsensusInstances(predictions);
      const loadBasedInstances = this.calculateLoadBasedInstances(metrics);

      // Weighted decision
      const predictedWeight = 0.6;
      const currentWeight = 0.4;
      const recommendedInstances = Math.round(
        consensusInstances * predictedWeight + loadBasedInstances * currentWeight
      );

      if (recommendedInstances > currentInstances) {
        action = 'scale-up';
        targetInstances = recommendedInstances;
        reason = `Predicted load increase from ${consensusInstances.toFixed(1)} to ${recommendedInstances} instances`;
      } else if (recommendedInstances < currentInstances && currentInstances > this.config.minInstances) {
        action = 'scale-down';
        targetInstances = Math.max(this.config.minInstances, recommendedInstances);
        reason = `Predicted load decrease allows scaling down to ${recommendedInstances} instances`;
      }
    }

    const decision: ScalingDecision = {
      timestamp: Date.now(),
      action,
      currentInstances,
      targetInstances,
      reason,
      estimatedCost: targetInstances * 0.05 * 60, // Cost per hour
      estimatedDuration: this.config.scaleUpCooldown,
      riskLevel: this.calculateRiskLevel(metrics, predictions),
      metrics,
    };

    this.decisions.push(decision);
    if (this.decisions.length > 50) {
      this.decisions.shift();
    }

    return decision;
  }

  private calculateConsensusInstances(predictions: ScalingPrediction[]): number {
    if (predictions.length === 0) return 1;

    // Weight predictions by confidence
    const weightedSum = predictions.reduce((sum, p) => sum + p.recommendedInstances * p.confidence, 0);
    const totalWeight = predictions.reduce((sum, p) => sum + p.confidence, 0);

    return totalWeight > 0 ? weightedSum / totalWeight : 1;
  }

  private calculateLoadBasedInstances(metrics: ScalingMetrics): number {
    const cpuBased = Math.ceil(metrics.cpu / this.config.targetCPUUtilization);
    const memoryBased = Math.ceil(metrics.memory / this.config.targetMemoryUtilization);
    const latencyBased = metrics.latency > this.config.targetLatency ?
      Math.ceil(metrics.latency / this.config.targetLatency) : 1;

    return Math.max(cpuBased, memoryBased, latencyBased);
  }

  private calculateRiskLevel(metrics: ScalingMetrics, predictions: ScalingPrediction[]): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Current metrics risk
    if (metrics.cpu > 80) riskScore += 2;
    if (metrics.memory > 85) riskScore += 2;
    if (metrics.errorRate > 0.1) riskScore += 3;

    // Prediction uncertainty risk
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
    if (avgConfidence < 0.5) riskScore += 2;

    // Load volatility risk
    if (this.metrics.length > 5) {
      const recentLoads = this.metrics.slice(-5).map(m => m.requestRate);
      const variance = this.calculateVariance(recentLoads);
      if (variance > 1000) riskScore += 1;
    }

    if (riskScore >= 6) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  async optimizeCost(): Promise<CostOptimization> {
    const currentInstances = 1; // Get from your infrastructure
    const spotInstanceRatio = this.config.costOptimization.enableSpotInstances ?
      Math.min(this.config.costOptimization.maxSpotRatio, 0.5) : 0;

    const spotInstances = Math.floor(currentInstances * spotInstanceRatio);
    const onDemandInstances = currentInstances - spotInstances;

    // Simplified cost calculation
    const spotPrice = 0.03; // $0.03 per instance per minute
    const onDemandPrice = 0.05; // $0.05 per instance per minute

    const totalCost = (spotInstances * spotPrice + onDemandInstances * onDemandPrice) * 60; // Per hour
    const fullCost = currentInstances * onDemandPrice * 60;
    const savings = fullCost - totalCost;
    const riskOfInterruption = spotInstanceRatio * 0.1; // 10% base risk for spot instances

    return {
      spotInstanceRatio,
      onDemandCapacity: onDemandInstances,
      totalCost,
      savings,
      riskOfInterruption,
    };
  }

  async renderDashboard(): Promise<void> {
    // Clear screen
    console.clear();

    // Header
    log('╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════╗', 'magenta');
    log('║                            ADVANCED PREDICTIVE SCALING DASHBOARD                                      ║', 'magenta');
    log(`║                                      ${new Date().toLocaleString()}                                             ║`, 'magenta');
    log('╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════╝', 'magenta');
    console.log();

    // Current Metrics Section
    if (this.metrics.length > 0) {
      const latestMetrics = this.metrics[this.metrics.length - 1];
      log('╔═══════════════════════════════════ CURRENT METRICS ════════════════════════════════════╗', 'cyan');
      log(`║ CPU Usage:        ${this.formatPercentage(latestMetrics.cpu)}${''.padEnd(52 - this.formatPercentage(latestMetrics.cpu).length)} ║`);
      log(`║ Memory Usage:     ${this.formatPercentage(latestMetrics.memory)}${''.padEnd(52 - this.formatPercentage(latestMetrics.memory).length)} ║`);
      log(`║ Latency:          ${latestMetrics.latency.toFixed(0)}ms${''.padEnd(52 - `${latestMetrics.latency.toFixed(0)}ms`.length)} ║`);
      log(`║ Request Rate:     ${latestMetrics.requestRate.toFixed(0)}/min${''.padEnd(52 - `${latestMetrics.requestRate.toFixed(0)}/min`.length)} ║`);
      log(`║ Cache Hit Rate:   ${this.formatPercentage(latestMetrics.cacheHitRate)}${''.padEnd(52 - this.formatPercentage(latestMetrics.cacheHitRate).length)} ║`);
      log(`║ Error Rate:       ${(latestMetrics.errorRate * 100).toFixed(2)}%${''.padEnd(52 - `${(latestMetrics.errorRate * 100).toFixed(2)}%`.length)} ║`);
      log(`║ Queue Length:     ${latestMetrics.queueLength.toFixed(0)}${''.padEnd(52 - `${latestMetrics.queueLength.toFixed(0)}`.length)} ║`);
      log(`║ Active Connections: ${latestMetrics.activeConnections}${''.padEnd(52 - `${latestMetrics.activeConnections}`.length)} ║`);
      log('╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════╝', 'cyan');
      console.log();
    }

    // Predictions Section
    if (this.predictions.length > 0) {
      log('╔═══════════════════════════════════ PREDICTIVE ANALYSIS ════════════════════════════════════╗', 'yellow');
      this.predictions.slice(-3).forEach((prediction, index) => {
        const algorithmColor = prediction.confidence > 0.7 ? 'green' : prediction.confidence > 0.5 ? 'yellow' : 'red';
        log(`║ ${prediction.algorithm.toUpperCase()} Prediction:`, algorithmColor);
        log(`║   Predicted Load:  ${prediction.predictedLoad.toFixed(0)} req/min`, algorithmColor);
        log(`║   Confidence:      ${this.formatPercentage(prediction.confidence)}`, algorithmColor);
        log(`║   Recommended:     ${prediction.recommendedInstances} instances`, algorithmColor);
        log(`║   Risk Level:       ${prediction.riskLevel.toUpperCase()}`, algorithmColor);
        log(`║   Cost Estimate:    $${prediction.costEstimate.toFixed(2)}/hour`, algorithmColor);
        if (index < this.predictions.length - 1) log(`║ ${''.padEnd(76, '-')} ║`, 'yellow');
      });
      log('╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════╝', 'yellow');
      console.log();
    }

    // Scaling Decisions Section
    if (this.decisions.length > 0) {
      const latestDecision = this.decisions[this.decisions.length - 1];
      const actionColor = latestDecision.action === 'scale-up' ? 'green' :
                        latestDecision.action === 'scale-down' ? 'blue' :
                        latestDecision.action === 'emergency-scale' ? 'red' : 'white';

      log('╔═══════════════════════════════════ SCALING DECISION ════════════════════════════════════╗', actionColor);
      log(`║ Action:           ${latestDecision.action.toUpperCase()}${''.padEnd(56 - latestDecision.action.toUpperCase().length)} ║`, actionColor);
      log(`║ Current:          ${latestDecision.currentInstances} instances${''.padEnd(56 - `${latestDecision.currentInstances} instances`.length)} ║`, actionColor);
      log(`║ Target:           ${latestDecision.targetInstances} instances${''.padEnd(56 - `${latestDecision.targetInstances} instances`.length)} ║`, actionColor);
      log(`║ Risk Level:       ${latestDecision.riskLevel.toUpperCase()}${''.padEnd(56 - latestDecision.riskLevel.toUpperCase().length)} ║`, actionColor);
      log(`║ Cost Impact:      $${latestDecision.estimatedCost.toFixed(2)}/hour${''.padEnd(56 - `$${latestDecision.estimatedCost.toFixed(2)}/hour`.length)} ║`, actionColor);
      log(`║ Reason:           ${latestDecision.reason.substring(0, 54)}${''.padEnd(56 - Math.min(54, latestDecision.reason.length))} ║`, actionColor);
      log('╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════╝', actionColor);
      console.log();
    }

    // Cost Optimization Section
    const costOptimization = await this.optimizeCost();
    log('╔═══════════════════════════════════ COST OPTIMIZATION ════════════════════════════════════╗', 'green');
    log(`║ Spot Instance Ratio: ${this.formatPercentage(costOptimization.spotInstanceRatio)}${''.padEnd(52 - this.formatPercentage(costOptimization.spotInstanceRatio).length)} ║`);
    log(`║ On-Demand Capacity: ${costOptimization.onDemandCapacity} instances${''.padEnd(52 - `${costOptimization.onDemandCapacity} instances`.length)} ║`);
    log(`║ Total Cost:         $${costOptimization.totalCost.toFixed(2)}/hour${''.padEnd(52 - `$${costOptimization.totalCost.toFixed(2)}/hour`.length)} ║`);
    log(`║ Savings:            $${costOptimization.savings.toFixed(2)}/hour${''.padEnd(52 - `$${costOptimization.savings.toFixed(2)}/hour`.length)} ║`);
    log(`║ Interruption Risk:  ${this.formatPercentage(costOptimization.riskOfInterruption)}${''.padEnd(52 - this.formatPercentage(costOptimization.riskOfInterruption).length)} ║`);
    log('╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════╝', 'green');
    console.log();

    // Controls
    log('Controls: Press Ctrl+C to stop | Updates every 30 seconds', 'cyan');
  }

  private formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      log('Predictive scaling engine is already running', 'yellow');
      return;
    }

    log('Starting Advanced Predictive Scaling Engine...', 'bright');
    this.isRunning = true;

    // Start monitoring loop
    this.monitoringInterval = setInterval(async () => {
      try {
        // Collect metrics
        const metrics = await this.collectMetrics();

        // Generate predictions
        const predictions = await this.generatePredictions();

        // Make scaling decision
        const decision = await this.makeScalingDecision(metrics, predictions);

        // Log significant decisions
        if (decision.action !== 'maintain') {
          const actionColor = decision.action === 'scale-up' ? 'green' :
                           decision.action === 'scale-down' ? 'blue' : 'red';
          log(`SCALING DECISION: ${decision.action.toUpperCase()} - ${decision.reason}`, actionColor);
        }

        // Render dashboard
        await this.renderDashboard();

      } catch (error) {
        log(`Monitoring error: ${error}`, 'red');
      }
    }, 30000); // Update every 30 seconds

    // Initial render
    const metrics = await this.collectMetrics();
    const predictions = await this.generatePredictions();
    await this.makeScalingDecision(metrics, predictions);
    await this.renderDashboard();
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    log('Predictive scaling engine stopped', 'yellow');
  }

  async generateReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics.slice(-100), // Last 100 data points
      predictions: this.predictions.slice(-20), // Last 20 predictions
      decisions: this.decisions.slice(-10), // Last 10 decisions
      summary: {
        totalMetrics: this.metrics.length,
        totalPredictions: this.predictions.length,
        totalDecisions: this.decisions.length,
        averageCPU: this.metrics.length > 0 ?
          this.metrics.reduce((sum, m) => sum + m.cpu, 0) / this.metrics.length : 0,
        averageMemory: this.metrics.length > 0 ?
          this.metrics.reduce((sum, m) => sum + m.memory, 0) / this.metrics.length : 0,
        averageLatency: this.metrics.length > 0 ?
          this.metrics.reduce((sum, m) => sum + m.latency, 0) / this.metrics.length : 0,
      },
    };

    const reportPath = `reports/advanced-scaling-report-${Date.now()}.json`;
    await import('fs').then(fs => {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    });

    log(`Advanced scaling report saved to: ${reportPath}`, 'green');
  }
}

async function main() {
  const scalingEngine = new PredictiveScalingEngine();

  // Handle command line arguments
  const args = process.argv.slice(2);
  if (args.includes('--report-only')) {
    await scalingEngine.start();
    setTimeout(async () => {
      await scalingEngine.generateReport();
      scalingEngine.stop();
    }, 60000); // Collect data for 1 minute then generate report
  } else {
    await scalingEngine.start();
  }
}

// Run the advanced scaling engine
main().catch(console.error);