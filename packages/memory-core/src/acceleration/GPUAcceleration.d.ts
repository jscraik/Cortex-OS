/**
 * GPU Acceleration for Embedding Generation in brAInwav GraphRAG
 *
 * Advanced GPU acceleration system that:
 * - Provides CUDA-based embedding generation for massive throughput
 * - Implements batch processing for optimal GPU utilization
 * - Supports multiple GPU architectures and fallback strategies
 * - Includes memory management and performance monitoring
 * - Provides intelligent CPU/GPU workload distribution
 */
export interface GPUDeviceInfo {
    id: number;
    name: string;
    memoryTotal: number;
    memoryUsed: number;
    memoryFree: number;
    computeCapability: string;
    isAvailable: boolean;
    utilization: number;
}
export interface EmbeddingRequest {
    text: string;
    priority: 'high' | 'normal' | 'low';
    batchId?: string;
    requestedAt: number;
}
export interface EmbeddingResult {
    embedding: number[];
    device: 'cpu' | 'gpu';
    deviceId?: number;
    processingTime: number;
    batchId?: string;
}
export interface GPUAccelerationConfig {
    enabled: boolean;
    cuda: {
        enabled: boolean;
        deviceIds: number[];
        maxMemoryUsage: number;
        batchSize: number;
        maxConcurrentBatches: number;
        timeout: number;
    };
    fallback: {
        toCPU: boolean;
        cpuBatchSize: number;
        maxQueueSize: number;
    };
    monitoring: {
        enabled: boolean;
        metricsInterval: number;
        performanceThreshold: number;
        memoryThreshold: number;
    };
    optimization: {
        autoBatching: boolean;
        batchTimeout: number;
        memoryOptimization: boolean;
        preferGPUForBatches: boolean;
    };
}
export interface GPUMetrics {
    totalRequests: number;
    gpuRequests: number;
    cpuRequests: number;
    averageLatency: number;
    gpuUtilization: number;
    memoryUsage: number;
    batchEfficiency: number;
    fallbackRate: number;
    errors: number;
}
/**
 * Memory reservation tracking for deterministic GPU memory management
 */
export interface MemoryReservation {
    device: GPUDeviceInfo;
    bytes: number;
    batchId: string;
    timestamp: number;
}
/**
 * GPU Acceleration Manager for brAInwav GraphRAG Embeddings
 */
export declare class GPUAccelerationManager {
    private config;
    private gpuDevices;
    private isInitialized;
    private requestQueue;
    private processingBatches;
    private activeReservations;
    private metrics;
    private metricsTimer;
    private batchTimer;
    private denseEmbedder;
    private sparseEmbedder;
    constructor(config: GPUAccelerationConfig);
    initialize(denseEmbedder: (texts: string[]) => Promise<number[][]>, sparseEmbedder: (texts: string[]) => Promise<any[]>): Promise<void>;
    private initializeGPUDevices;
    /**
     * Detect real GPU devices using standard hardware detection approaches
     */
    private detectRealGPUDevices;
    /**
     * Detect NVIDIA GPUs using nvidia-smi or CUDA APIs
     */
    private detectNvidiaGPUs;
    /**
     * Detect WebGPU compatible devices
     */
    private detectWebGPUs;
    /**
     * Generate embeddings with automatic GPU/CPU selection
     */
    generateEmbeddings(texts: string[], options?: {
        priority?: 'high' | 'normal' | 'low';
        preferGPU?: boolean;
        batchId?: string;
    }): Promise<EmbeddingResult[]>;
    /**
     * Generate sparse embeddings with CPU fallback
     */
    generateSparseEmbeddings(texts: string[]): Promise<any[]>;
    private shouldUseGPU;
    private getAvailableGPUDevice;
    /**
     * Reserves GPU device memory for a batch operation with automatic cleanup
     *
     * @param device - Target GPU device to reserve memory on
     * @param bytes - Memory amount to reserve in megabytes
     * @param batchId - Unique identifier for tracking this reservation
     * @returns Release function that must be called to free memory
     * @throws Error if insufficient memory available
     *
     * @example
     * const reservation = this.reserveDeviceMemory(device, 256, 'batch-123');
     * try {
     *   await processEmbeddings();
     *   reservation.release(true);
     * } catch (error) {
     *   reservation.release(false);
     *   throw error;
     * }
     */
    private reserveDeviceMemory;
    private processWithGPU;
    private processWithCPU;
    private startBatchProcessor;
    private processBatchQueue;
    private startMetricsCollection;
    private collectMetrics;
    private updateMetrics;
    /**
     * Get current metrics and device information
     */
    getMetrics(): {
        metrics: GPUMetrics;
        gpuDevices: GPUDeviceInfo[];
        config: GPUAccelerationConfig;
    };
    /**
     * Health check for GPU acceleration
     */
    healthCheck(): Promise<{
        healthy: boolean;
        gpuAvailable: boolean;
        deviceCount: number;
        lastMetrics: GPUMetrics;
    }>;
    /**
     * Stop GPU acceleration manager with comprehensive cleanup
     */
    stop(): Promise<void>;
}
export declare function getGPUAccelerationManager(config?: GPUAccelerationConfig): GPUAccelerationManager;
export declare function stopGPUAccelerationManager(): Promise<void>;
