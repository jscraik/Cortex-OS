#!/usr/bin/env tsx

/**
 * Advanced GPU Memory Management and Scheduling System
 *
 * Features:
 * - GPU memory pool management with intelligent allocation
 * - Task scheduling and priority queuing
 * - Memory fragmentation optimization
 * - Multi-GPU support with load balancing
 * - Real-time memory monitoring and alerting
 * - Automatic memory cleanup and garbage collection
 * - Performance analytics and optimization recommendations
 */

import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

interface GPUInfo {
  id: number;
  name: string;
  memoryTotal: number;
  memoryUsed: number;
  memoryFree: number;
  utilization: number;
  temperature: number;
  powerUsage: number;
  driverVersion: string;
  cudaVersion: string;
  isAvailable: boolean;
}

interface GPUTask {
  id: string;
  type: 'inference' | 'training' | 'embedding' | 'processing';
  priority: 'low' | 'medium' | 'high' | 'critical';
  memoryRequired: number;
  estimatedDuration: number;
  actualDuration?: number;
  gpuId?: number;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: number;
  endTime?: number;
  metadata: Record<string, any>;
}

interface MemoryPool {
  totalSize: number;
  allocatedSize: number;
  freeSize: number;
  fragments: MemoryFragment[];
  allocationStrategy: 'first-fit' | 'best-fit' | 'worst-fit' | 'buddy';
}

interface MemoryFragment {
  offset: number;
  size: number;
  isFree: boolean;
  taskId?: string;
  lastAccessed: number;
}

interface GPUSchedulingPolicy {
  maxConcurrentTasks: number;
  priorityWeights: Record<string, number>;
  memoryThresholds: {
    warning: number;
    critical: number;
    emergency: number;
  };
  loadBalancingStrategy: 'round-robin' | 'least-loaded' | 'best-fit' | 'predictive';
}

class GPUMemoryManager {
  private gpus: Map<number, GPUInfo> = new Map();
  private memoryPools: Map<number, MemoryPool> = new Map();
  private taskQueue: GPUTask[] = [];
  private runningTasks: Map<string, GPUTask> = new Map();
  private schedulingPolicy: GPUSchedulingPolicy;
  private metrics: Map<string, number> = new Map();
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    this.schedulingPolicy = {
      maxConcurrentTasks: 4,
      priorityWeights: {
        critical: 1000,
        high: 100,
        medium: 10,
        low: 1
      },
      memoryThresholds: {
        warning: 0.8,
        critical: 0.9,
        emergency: 0.95
      },
      loadBalancingStrategy: 'least-loaded'
    };
  }

  /**
   * Initialize GPU manager and detect available GPUs
   */
  async initialize(): Promise<void> {
    console.log('🎮 Initializing GPU Memory Manager...');

    try {
      await this.detectGPUs();
      await this.initializeMemoryPools();
      this.startMonitoring();

      console.log(`✅ GPU Manager initialized with ${this.gpus.size} GPU(s)`);
      this.printGPUStatus();
    } catch (error) {
      console.warn('⚠️  GPU initialization failed, falling back to CPU mode:', error);
    }
  }

  /**
   * Detect available GPUs and their capabilities
   */
  private async detectGPUs(): Promise<void> {
    try {
      // Try nvidia-smi for NVIDIA GPUs
      const nvidiaOutput = execSync('nvidia-smi --query-gpu=index,name,memory.total,memory.used,utilization.gpu,temperature.gpu,power.draw,driver_version --format=csv,noheader,nounits',
        { encoding: 'utf8' });

      const lines = nvidiaOutput.trim().split('\n');
      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 8) {
          const gpu: GPUInfo = {
            id: parseInt(parts[0]),
            name: parts[1],
            memoryTotal: parseInt(parts[2]) * 1024 * 1024, // Convert MB to bytes
            memoryUsed: parseInt(parts[3]) * 1024 * 1024,
            memoryFree: (parseInt(parts[2]) - parseInt(parts[3])) * 1024 * 1024,
            utilization: parseFloat(parts[4]),
            temperature: parseFloat(parts[5]),
            powerUsage: parseFloat(parts[6]),
            driverVersion: parts[7],
            cudaVersion: this.getCudaVersion(),
            isAvailable: true
          };
          this.gpus.set(gpu.id, gpu);
        }
      }
    } catch (error) {
      // Fallback detection for other GPU types or simulation
      console.log('NVIDIA GPU not detected, using simulation mode');
      this.createSimulatedGPU();
    }
  }

  /**
   * Create a simulated GPU for testing purposes
   */
  private createSimulatedGPU(): void {
    const simulatedGPU: GPUInfo = {
      id: 0,
      name: 'Simulated GPU',
      memoryTotal: 8 * 1024 * 1024 * 1024, // 8GB
      memoryUsed: 0,
      memoryFree: 8 * 1024 * 1024 * 1024,
      utilization: 0,
      temperature: 45,
      powerUsage: 0,
      driverVersion: 'simulated',
      cudaVersion: 'simulated',
      isAvailable: true
    };
    this.gpus.set(0, simulatedGPU);
  }

  /**
   * Get CUDA version
   */
  private getCudaVersion(): string {
    try {
      const output = execSync('nvcc --version', { encoding: 'utf8' });
      const match = output.match(/release (\d+\.\d+)/);
      return match ? match[1] : 'unknown';
    } catch {
      return 'not available';
    }
  }

  /**
   * Initialize memory pools for each GPU
   */
  private async initializeMemoryPools(): Promise<void> {
    for (const [gpuId, gpu] of this.gpus) {
      const pool: MemoryPool = {
        totalSize: gpu.memoryFree * 0.9, // Use 90% of free memory
        allocatedSize: 0,
        freeSize: gpu.memoryFree * 0.9,
        fragments: [{
          offset: 0,
          size: gpu.memoryFree * 0.9,
          isFree: true,
          lastAccessed: Date.now()
        }],
        allocationStrategy: 'best-fit'
      };
      this.memoryPools.set(gpuId, pool);
    }
  }

  /**
   * Submit a task for GPU execution
   */
  async submitTask(task: Omit<GPUTask, 'id' | 'status'>): Promise<string> {
    const taskId = `task_${Date.now()}_${randomUUID().substring(0, 9)}`;
    const fullTask: GPUTask = {
      ...task,
      id: taskId,
      status: 'queued'
    };

    this.taskQueue.push(fullTask);
    this.sortTaskQueue();

    console.log(`📝 Task submitted: ${taskId} (${task.type}, priority: ${task.priority})`);

    // Try to schedule immediately
    await this.scheduleTasks();

    return taskId;
  }

  /**
   * Sort task queue by priority and estimated duration
   */
  private sortTaskQueue(): void {
    this.taskQueue.sort((a, b) => {
      const priorityWeightA = this.schedulingPolicy.priorityWeights[a.priority];
      const priorityWeightB = this.schedulingPolicy.priorityWeights[b.priority];

      if (priorityWeightA !== priorityWeightB) {
        return priorityWeightB - priorityWeightA;
      }

      // If same priority, prefer shorter tasks for better throughput
      return a.estimatedDuration - b.estimatedDuration;
    });
  }

  /**
   * Schedule queued tasks to available GPUs
   */
  private async scheduleTasks(): Promise<void> {
    while (this.taskQueue.length > 0 && this.canScheduleMoreTasks()) {
      const task = this.taskQueue.shift()!;
      const gpuId = this.selectBestGPU(task);

      if (gpuId !== null && this.canAllocateMemory(gpuId, task.memoryRequired)) {
        await this.executeTask(task, gpuId);
      } else {
        // Can't schedule now, put back at front of queue
        this.taskQueue.unshift(task);
        break;
      }
    }
  }

  /**
   * Check if more tasks can be scheduled
   */
  private canScheduleMoreTasks(): boolean {
    return this.runningTasks.size < this.schedulingPolicy.maxConcurrentTasks;
  }

  /**
   * Select the best GPU for a task based on load balancing strategy
   */
  private selectBestGPU(task: GPUTask): number | null {
    const availableGPUs = Array.from(this.gpus.entries())
      .filter(([_, gpu]) => gpu.isAvailable && this.canAllocateMemory(gpu.id, task.memoryRequired));

    if (availableGPUs.length === 0) {
      return null;
    }

    switch (this.schedulingPolicy.loadBalancingStrategy) {
      case 'round-robin':
        return availableGPUs[Math.floor(Date.now() / 1000) % availableGPUs.length][0];

      case 'least-loaded':
        return availableGPUs.reduce((best, [gpuId, gpu]) => {
          const bestGPU = this.gpus.get(best)!;
          return gpu.utilization < bestGPU.utilization ? gpuId : best;
        }, availableGPUs[0][0]);

      case 'best-fit':
        return availableGPUs.reduce((best, [gpuId, _]) => {
          const bestPool = this.memoryPools.get(best)!;
          const currentPool = this.memoryPools.get(gpuId)!;
          return currentPool.freeSize > bestPool.freeSize ? gpuId : best;
        }, availableGPUs[0][0]);

      case 'predictive':
        return this.selectPredictiveGPU(availableGPUs, task);

      default:
        return availableGPUs[0][0];
    }
  }

  /**
   * Predictive GPU selection based on historical performance
   */
  private selectPredictiveGPU(availableGPUs: [number, GPUInfo][], task: GPUTask): number {
    // For now, use a simple heuristic combining utilization and available memory
    // In a full implementation, this would use ML models trained on historical data
    return availableGPUs.reduce((best, [gpuId, gpu]) => {
      const bestGPU = this.gpus.get(best)!;
      const bestScore = (100 - bestGPU.utilization) + (bestGPU.memoryFree / bestGPU.memoryTotal) * 50;
      const currentScore = (100 - gpu.utilization) + (gpu.memoryFree / gpu.memoryTotal) * 50;
      return currentScore > bestScore ? gpuId : best;
    }, availableGPUs[0][0]);
  }

  /**
   * Check if memory can be allocated on a GPU
   */
  private canAllocateMemory(gpuId: number, size: number): boolean {
    const pool = this.memoryPools.get(gpuId);
    if (!pool) return false;

    return pool.freeSize >= size && this.findBestFragment(pool, size) !== null;
  }

  /**
   * Find the best memory fragment for allocation
   */
  private findBestFragment(pool: MemoryPool, size: number): MemoryFragment | null {
    const freeFragments = pool.fragments.filter(f => f.isFree && f.size >= size);

    if (freeFragments.length === 0) return null;

    switch (pool.allocationStrategy) {
      case 'first-fit':
        return freeFragments.find(f => f.size >= size) || null;

      case 'best-fit':
        return freeFragments.reduce((best, current) =>
          current.size < best.size ? current : best
        );

      case 'worst-fit':
        return freeFragments.reduce((best, current) =>
          current.size > best.size ? current : best
        );

      default:
        return freeFragments[0];
    }
  }

  /**
   * Execute a task on a specific GPU
   */
  private async executeTask(task: GPUTask, gpuId: number): Promise<void> {
    task.status = 'running';
    task.startTime = Date.now();
    task.gpuId = gpuId;
    this.runningTasks.set(task.id, task);

    // Allocate memory
    const allocated = this.allocateMemory(gpuId, task.memoryRequired, task.id);
    if (!allocated) {
      task.status = 'failed';
      this.runningTasks.delete(task.id);
      return;
    }

    // Update GPU status
    const gpu = this.gpus.get(gpuId)!;
    gpu.memoryUsed += task.memoryRequired;
    gpu.memoryFree -= task.memoryRequired;

    console.log(`🚀 Task ${task.id} started on GPU ${gpuId}`);

    // Simulate task execution (in real implementation, this would interface with CUDA/OpenCL)
    this.simulateTaskExecution(task);
  }

  /**
   * Allocate memory from pool
   */
  private allocateMemory(gpuId: number, size: number, taskId: string): boolean {
    const pool = this.memoryPools.get(gpuId);
    if (!pool) return false;

    const fragment = this.findBestFragment(pool, size);
    if (!fragment) return false;

    // Allocate the fragment
    fragment.isFree = false;
    fragment.taskId = taskId;
    fragment.lastAccessed = Date.now();

    // If fragment is larger than needed, split it
    if (fragment.size > size) {
      const newFragment: MemoryFragment = {
        offset: fragment.offset + size,
        size: fragment.size - size,
        isFree: true,
        lastAccessed: Date.now()
      };

      fragment.size = size;
      pool.fragments.push(newFragment);
    }

    pool.allocatedSize += size;
    pool.freeSize -= size;

    return true;
  }

  /**
   * Simulate task execution
   */
  private simulateTaskExecution(task: GPUTask): void {
    // Use environment-configurable duration variation for testing
    const durationVariation = process.env.PERF_TASK_DURATION_VARIATION 
      ? parseFloat(process.env.PERF_TASK_DURATION_VARIATION) : 0.1;
    const actualDuration = task.estimatedDuration * (1.0 + durationVariation); // Fixed variation

    setTimeout(() => {
      this.completeTask(task, actualDuration);
    }, actualDuration);
  }

  /**
   * Complete a task and free resources
   */
  private completeTask(task: GPUTask, actualDuration: number): void {
    task.status = 'completed';
    task.endTime = Date.now();
    task.actualDuration = actualDuration;

    // Free memory
    if (task.gpuId !== undefined) {
      this.freeMemory(task.gpuId, task.id);

      const gpu = this.gpus.get(task.gpuId)!;
      gpu.memoryUsed -= task.memoryRequired;
      gpu.memoryFree += task.memoryRequired;
    }

    this.runningTasks.delete(task.id);
    this.metrics.set(`task_${task.type}_duration`, actualDuration);
    this.metrics.set(`task_${task.type}_success_rate`,
      (this.metrics.get(`task_${task.type}_success_rate`) || 0) + 1);

    console.log(`✅ Task ${task.id} completed in ${actualDuration}ms`);

    // Schedule next tasks
    this.scheduleTasks();
  }

  /**
   * Free memory allocated to a task
   */
  private freeMemory(gpuId: number, taskId: string): void {
    const pool = this.memoryPools.get(gpuId);
    if (!pool) return;

    const fragment = pool.fragments.find(f => f.taskId === taskId && !f.isFree);
    if (fragment) {
      fragment.isFree = true;
      fragment.taskId = undefined;
      fragment.lastAccessed = Date.now();

      pool.allocatedSize -= fragment.size;
      pool.freeSize += fragment.size;

      // Try to merge adjacent free fragments
      this.mergeFragments(pool);
    }
  }

  /**
   * Merge adjacent free fragments to reduce fragmentation
   */
  private mergeFragments(pool: MemoryPool): void {
    const sortedFragments = [...pool.fragments].sort((a, b) => a.offset - b.offset);

    for (let i = 0; i < sortedFragments.length - 1; i++) {
      const current = sortedFragments[i];
      const next = sortedFragments[i + 1];

      if (current.isFree && next.isFree && current.offset + current.size === next.offset) {
        // Merge fragments
        current.size += next.size;
        const nextIndex = pool.fragments.indexOf(next);
        if (nextIndex !== -1) {
          pool.fragments.splice(nextIndex, 1);
        }
      }
    }
  }

  /**
   * Start GPU monitoring
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.updateGPUStatus();
      this.checkMemoryThresholds();
      this.optimizeMemoryUsage();
    }, 5000); // Monitor every 5 seconds
  }

  /**
   * Update GPU status information
   */
  private async updateGPUStatus(): Promise<void> {
    try {
      const nvidiaOutput = execSync('nvidia-smi --query-gpu=index,memory.used,memory.free,utilization.gpu,temperature.gpu,power.draw --format=csv,noheader,nounits',
        { encoding: 'utf8' });

      const lines = nvidiaOutput.trim().split('\n');
      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 6) {
          const gpuId = parseInt(parts[0]);
          const gpu = this.gpus.get(gpuId);
          if (gpu) {
            gpu.memoryUsed = parseInt(parts[1]) * 1024 * 1024;
            gpu.memoryFree = parseInt(parts[2]) * 1024 * 1024;
            gpu.utilization = parseFloat(parts[3]);
            gpu.temperature = parseFloat(parts[4]);
            gpu.powerUsage = parseFloat(parts[5]);
          }
        }
      }
    } catch (error) {
      // Update simulated GPU
      for (const gpu of this.gpus.values()) {
        if (gpu.name === 'Simulated GPU') {
          // Environment-configurable GPU metrics for testing
          gpu.utilization = parseFloat(process.env.PERF_GPU_UTILIZATION || '75');
          gpu.temperature = parseFloat(process.env.PERF_GPU_TEMPERATURE || '55');
        }
      }
    }
  }

  /**
   * Check memory thresholds and trigger alerts
   */
  private checkMemoryThresholds(): void {
    for (const [gpuId, gpu] of this.gpus) {
      const memoryUsage = gpu.memoryUsed / gpu.memoryTotal;

      if (memoryUsage >= this.schedulingPolicy.memoryThresholds.emergency) {
        console.warn(`🚨 EMERGENCY: GPU ${gpuId} memory usage at ${(memoryUsage * 100).toFixed(1)}%`);
        this.triggerEmergencyCleanup(gpuId);
      } else if (memoryUsage >= this.schedulingPolicy.memoryThresholds.critical) {
        console.warn(`⚠️  CRITICAL: GPU ${gpuId} memory usage at ${(memoryUsage * 100).toFixed(1)}%`);
      } else if (memoryUsage >= this.schedulingPolicy.memoryThresholds.warning) {
        console.log(`⚠️  WARNING: GPU ${gpuId} memory usage at ${(memoryUsage * 100).toFixed(1)}%`);
      }
    }
  }

  /**
   * Trigger emergency memory cleanup
   */
  private triggerEmergencyCleanup(gpuId: number): void {
    // Cancel low priority tasks
    const lowPriorityTasks = Array.from(this.runningTasks.values())
      .filter(task => task.gpuId === gpuId && task.priority === 'low');

    for (const task of lowPriorityTasks) {
      task.status = 'cancelled';
      this.runningTasks.delete(task.id);
      this.freeMemory(gpuId, task.id);
      console.log(`🚫 Cancelled low priority task ${task.id} for emergency cleanup`);
    }
  }

  /**
   * Optimize memory usage and reduce fragmentation
   */
  private optimizeMemoryUsage(): void {
    for (const [gpuId, pool] of this.memoryPools) {
      // Compact memory if fragmentation is high
      const fragmentation = this.calculateFragmentation(pool);
      if (fragmentation > 0.3) { // 30% fragmentation threshold
        console.log(`🔧 Compacting GPU ${gpuId} memory (fragmentation: ${(fragmentation * 100).toFixed(1)}%)`);
        this.compactMemory(pool);
      }
    }
  }

  /**
   * Calculate memory fragmentation ratio
   */
  private calculateFragmentation(pool: MemoryPool): number {
    const freeFragments = pool.fragments.filter(f => f.isFree);
    if (freeFragments.length <= 1) return 0;

    const totalFree = freeFragments.reduce((sum, f) => sum + f.size, 0);
    const largestFree = Math.max(...freeFragments.map(f => f.size));

    return 1 - (largestFree / totalFree);
  }

  /**
   * Compact memory to reduce fragmentation
   */
  private compactMemory(pool: MemoryPool): void {
    // In a real implementation, this would move allocated blocks to eliminate gaps
    // For simulation, we'll just merge all free fragments
    this.mergeFragments(pool);
  }

  /**
   * Get comprehensive GPU status report
   */
  getStatusReport(): Record<string, any> {
    const report: Record<string, any> = {
      timestamp: new Date().toISOString(),
      gpus: {},
      tasks: {
        queued: this.taskQueue.length,
        running: this.runningTasks.size,
        total: this.taskQueue.length + this.runningTasks.size
      },
      memory: {},
      metrics: Object.fromEntries(this.metrics)
    };

    // GPU information
    for (const [gpuId, gpu] of this.gpus) {
      report.gpus[gpuId] = {
        name: gpu.name,
        memory: {
          total: this.formatBytes(gpu.memoryTotal),
          used: this.formatBytes(gpu.memoryUsed),
          free: this.formatBytes(gpu.memoryFree),
          usagePercent: ((gpu.memoryUsed / gpu.memoryTotal) * 100).toFixed(1)
        },
        utilization: gpu.utilization.toFixed(1),
        temperature: gpu.temperature,
        powerUsage: gpu.powerUsage
      };
    }

    // Memory pool information
    for (const [gpuId, pool] of this.memoryPools) {
      report.memory[gpuId] = {
        allocated: this.formatBytes(pool.allocatedSize),
        free: this.formatBytes(pool.freeSize),
        fragments: pool.fragments.length,
        fragmentation: `${(this.calculateFragmentation(pool) * 100).toFixed(1)}%`
      };
    }

    return report;
  }

  /**
   * Print GPU status to console
   */
  private printGPUStatus(): void {
    console.log('\n🎮 GPU Status:');
    for (const [gpuId, gpu] of this.gpus) {
      console.log(`  GPU ${gpuId}: ${gpu.name}`);
      console.log(`    Memory: ${this.formatBytes(gpu.memoryUsed)}/${this.formatBytes(gpu.memoryTotal)} (${((gpu.memoryUsed/gpu.memoryTotal)*100).toFixed(1)}%)`);
      console.log(`    Utilization: ${gpu.utilization.toFixed(1)}%`);
      console.log(`    Temperature: ${gpu.temperature}°C`);
    }
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];

    // Check GPU utilization
    for (const [gpuId, gpu] of this.gpus) {
      if (gpu.utilization < 50) {
        recommendations.push(`GPU ${gpuId} utilization is low (${gpu.utilization.toFixed(1)}%). Consider batching tasks.`);
      }

      if (gpu.temperature > 80) {
        recommendations.push(`GPU ${gpuId} temperature is high (${gpu.temperature}°C). Check cooling.`);
      }
    }

    // Check memory fragmentation
    for (const [gpuId, pool] of this.memoryPools) {
      const fragmentation = this.calculateFragmentation(pool);
      if (fragmentation > 0.2) {
        recommendations.push(`GPU ${gpuId} has high memory fragmentation (${(fragmentation * 100).toFixed(1)}%). Consider memory compaction.`);
      }
    }

    // Check task queue length
    if (this.taskQueue.length > 10) {
      recommendations.push('Task queue is getting long. Consider adding more GPUs or reducing task complexity.');
    }

    return recommendations;
  }

  /**
   * Shutdown GPU manager
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down GPU Manager...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Cancel all running tasks
    for (const task of this.runningTasks.values()) {
      task.status = 'cancelled';
      if (task.gpuId !== undefined) {
        this.freeMemory(task.gpuId, task.id);
      }
    }

    this.runningTasks.clear();
    this.taskQueue.length = 0;
    this.isMonitoring = false;

    console.log('✅ GPU Manager shutdown complete');
  }
}

/**
 * Main execution function
 */
async function main() {
  const gpuManager = new GPUMemoryManager();

  try {
    await gpuManager.initialize();

    // Example usage
    const taskId1 = await gpuManager.submitTask({
      type: 'inference',
      priority: 'high',
      memoryRequired: 1024 * 1024 * 1024, // 1GB
      estimatedDuration: 5000,
      metadata: { model: 'gpt-3.5-turbo' }
    });

    const taskId2 = await gpuManager.submitTask({
      type: 'embedding',
      priority: 'medium',
      memoryRequired: 512 * 1024 * 1024, // 512MB
      estimatedDuration: 2000,
      metadata: { batchSize: 100 }
    });

    // Wait for some tasks to complete
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Generate status report
    const report = gpuManager.getStatusReport();
    console.log('\n📊 GPU Manager Status Report:');
    console.log(JSON.stringify(report, null, 2));

    // Show recommendations
    const recommendations = gpuManager.getRecommendations();
    if (recommendations.length > 0) {
      console.log('\n💡 Performance Recommendations:');
      recommendations.forEach(rec => console.log(`  - ${rec}`));
    }

  } catch (error) {
    console.error('❌ GPU Manager error:', error);
  } finally {
    await gpuManager.shutdown();
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

export { GPUMemoryManager, GPUInfo, GPUTask, MemoryPool, GPUSchedulingPolicy };