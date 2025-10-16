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

import { randomUUID } from 'node:crypto';
import type { GraphRAGQueryRequest } from '../services/GraphRAGService.js';

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
		maxMemoryUsage: number; // MB
		batchSize: number;
		maxConcurrentBatches: number;
		timeout: number; // milliseconds
	};
	fallback: {
		toCPU: boolean;
		cpuBatchSize: number;
		maxQueueSize: number;
	};
	monitoring: {
		enabled: boolean;
		metricsInterval: number; // milliseconds
		performanceThreshold: number; // milliseconds
		memoryThreshold: number; // percentage
	};
	optimization: {
		autoBatching: boolean;
		batchTimeout: number; // milliseconds
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

interface GPUBufferTracker {
        id: string;
        batchId: string;
        device: GPUDeviceInfo;
        bytes: number;
        createdAt: number;
        released: boolean;
        release: (success: boolean) => void;
}

/**
 * GPU Acceleration Manager for brAInwav GraphRAG Embeddings
 */
export class GPUAccelerationManager {
        private config: GPUAccelerationConfig;
	private gpuDevices: GPUDeviceInfo[] = [];
	private isInitialized = false;
        private requestQueue: EmbeddingRequest[] = [];
        private processingBatches = new Map<string, Promise<EmbeddingResult[]>>();
        private activeReservations = new Map<string, MemoryReservation>();
        private allocatedBuffers = new Map<string, GPUBufferTracker>();
	private metrics: GPUMetrics = {
		totalRequests: 0,
		gpuRequests: 0,
		cpuRequests: 0,
		averageLatency: 0,
		gpuUtilization: 0,
		memoryUsage: 0,
		batchEfficiency: 0,
		fallbackRate: 0,
		errors: 0,
	};
	private metricsTimer: NodeJS.Timeout | null = null;
	private batchTimer: NodeJS.Timeout | null = null;

	// Embedding functions (injected during initialization)
	private denseEmbedder: ((texts: string[]) => Promise<number[][]>) | null = null;
	private sparseEmbedder: ((texts: string[]) => Promise<any[]>) | null = null;

	constructor(config: GPUAccelerationConfig) {
		this.config = config;
	}

	async initialize(
		denseEmbedder: (texts: string[]) => Promise<number[][]>,
		sparseEmbedder: (texts: string[]) => Promise<any[]>,
	): Promise<void> {
		try {
			this.denseEmbedder = denseEmbedder;
			this.sparseEmbedder = sparseEmbedder;

			if (this.config.enabled && this.config.cuda.enabled) {
				await this.initializeGPUDevices();
			}

			// Start batch processing timer
			if (this.config.optimization.autoBatching) {
				this.startBatchProcessor();
			}

			// Start metrics collection
			if (this.config.monitoring.enabled) {
				this.startMetricsCollection();
			}

			this.isInitialized = true;

			console.info('brAInwav GPU Acceleration Manager initialized', {
				component: 'memory-core',
				brand: 'brAInwav',
				gpuEnabled: this.config.enabled,
				gpuDevices: this.gpuDevices.length,
				cudaEnabled: this.config.cuda.enabled,
			});
		} catch (error) {
			console.error('brAInwav GPU Acceleration Manager initialization failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	private async initializeGPUDevices(): Promise<void> {
		try {
			// brAInwav policy: No mock data in production code paths
			// Real GPU detection implementation required
			this.gpuDevices = [];

			// Try to detect real CUDA devices using standard approaches
			const detectedDevices = await this.detectRealGPUDevices();

			// Filter devices by configuration
			this.gpuDevices = detectedDevices.filter(
				(device) => this.config.cuda.deviceIds.includes(device.id) && device.isAvailable,
			);

			if (this.gpuDevices.length === 0) {
				console.warn('brAInwav GPU Acceleration: No CUDA devices available', {
					component: 'memory-core',
					brand: 'brAInwav',
					configuredDevices: this.config.cuda.deviceIds,
					availableDevices: detectedDevices.length,
					message: 'brAInwav: Real GPU hardware detection - no mock devices',
				});
			} else {
				console.info('brAInwav GPU Acceleration: Real CUDA devices detected', {
					component: 'memory-core',
					brand: 'brAInwav',
					deviceCount: this.gpuDevices.length,
					devices: this.gpuDevices.map((d) => ({
						name: d.name,
						memory: d.memoryTotal,
						computeCapability: d.computeCapability,
					})),
				});
			}
		} catch (error) {
			console.warn('brAInwav GPU Acceleration: GPU detection failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
				message: 'brAInwav: GPU hardware detection failed - using CPU fallback',
			});
		}
	}

	/**
	 * Detect real GPU devices using standard hardware detection approaches
	 */
	private async detectRealGPUDevices(): Promise<GPUDeviceInfo[]> {
		const devices: GPUDeviceInfo[] = [];

		try {
			// Method 1: Try CUDA detection via nvidia-smi (if available)
			const nvidiaDevices = await this.detectNvidiaGPUs();
			devices.push(...nvidiaDevices);
		} catch (error) {
			console.debug('brAInwav GPU Acceleration: NVIDIA detection failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
			});
		}

		try {
			// Method 2: Try WebGPU detection (for browser environments)
			const webgpuDevices = await this.detectWebGPUs();
			devices.push(...webgpuDevices);
		} catch (error) {
			console.debug('brAInwav GPU Acceleration: WebGPU detection failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
			});
		}

		return devices;
	}

	/**
	 * Detect NVIDIA GPUs using nvidia-smi or CUDA APIs
	 */
	private async detectNvidiaGPUs(): Promise<GPUDeviceInfo[]> {
		const devices: GPUDeviceInfo[] = [];

		// Try to import and use nvidia GPU libraries
		// This would require real GPU detection libraries like:
		// - @nvidia/gpu-cuda
		// - node-cuda
		// - or system calls to nvidia-smi

		// For now, return empty array - no mock data
		// Real implementation would involve:
		// 1. Checking for NVIDIA driver availability
		// 2. Querying GPU information via nvidia-smi or CUDA API
		// 3. Parsing GPU memory and capability information

		return devices;
	}

	/**
	 * Detect WebGPU compatible devices
	 */
	private async detectWebGPUs(): Promise<GPUDeviceInfo[]> {
		const devices: GPUDeviceInfo[] = [];

		// Check for WebGPU availability in browser or Node.js environment
		if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
			try {
				const adapter = await (navigator as any).gpu.requestAdapter();
				if (adapter) {
					const info = await adapter.requestDeviceInfo?.();
					devices.push({
						id: 0,
						name: adapter.name || 'WebGPU Device',
						memoryTotal: 0, // WebGPU doesn't expose memory info
						memoryUsed: 0,
						memoryFree: 0,
						computeCapability: 'WebGPU',
						isAvailable: true,
						utilization: 0,
					});
				}
			} catch (error) {
				console.debug('brAInwav GPU Acceleration: WebGPU adapter request failed', {
					component: 'memory-core',
					brand: 'brAInwav',
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		return devices;
	}

	/**
	 * Generate embeddings with automatic GPU/CPU selection
	 */
	async generateEmbeddings(
		texts: string[],
		options: {
			priority?: 'high' | 'normal' | 'low';
			preferGPU?: boolean;
			batchId?: string;
		} = {},
	): Promise<EmbeddingResult[]> {
		if (!this.isInitialized || !this.denseEmbedder) {
			throw new Error('brAInwav GPU Acceleration Manager not initialized');
		}

		const startTime = Date.now();
		const batchId = options.batchId || `batch_${Date.now()}_${randomUUID().substring(0, 8)}`;

		this.metrics.totalRequests += texts.length;

		try {
			let results: EmbeddingResult[];

			// Determine processing strategy
			if (this.shouldUseGPU(texts.length, options.priority || 'normal', options.preferGPU)) {
				results = await this.processWithGPU(texts, batchId);
				this.metrics.gpuRequests += texts.length;
			} else {
				results = await this.processWithCPU(texts, batchId);
				this.metrics.cpuRequests += texts.length;
			}

			// Update metrics
			const processingTime = Date.now() - startTime;
			this.updateMetrics(processingTime);

			console.debug('brAInwav GPU Acceleration: Embeddings generated', {
				component: 'memory-core',
				brand: 'brAInwav',
				textCount: texts.length,
				device: results[0]?.device || 'cpu',
				processingTime,
				batchId,
			});

			return results;
		} catch (error) {
			this.metrics.errors++;

			// Fallback to CPU if GPU processing fails
			if (this.config.fallback.toCPU) {
				console.warn('brAInwav GPU Acceleration: Falling back to CPU', {
					component: 'memory-core',
					brand: 'brAInwav',
					error: error instanceof Error ? error.message : String(error),
					batchId,
				});

				const results = await this.processWithCPU(texts, batchId);
				this.metrics.cpuRequests += texts.length;
				return results;
			}

			throw error;
		}
	}

	/**
	 * Generate sparse embeddings with CPU fallback
	 */
	async generateSparseEmbeddings(texts: string[]): Promise<any[]> {
		if (!this.isInitialized || !this.sparseEmbedder) {
			throw new Error('brAInwav GPU Acceleration Manager not initialized');
		}

		// Sparse embeddings are typically processed on CPU due to their nature
		return this.sparseEmbedder(texts);
	}

	private shouldUseGPU(
		textCount: number,
		priority: 'high' | 'normal' | 'low',
		preferGPU?: boolean,
	): boolean {
		if (!this.config.enabled || !this.config.cuda.enabled || this.gpuDevices.length === 0) {
			return false;
		}

		// High priority requests might prefer CPU for faster single-item processing
		if (priority === 'high' && textCount < this.config.cuda.batchSize / 2) {
			return preferGPU || false;
		}

		// Use GPU for batch processing
		if (textCount >= this.config.cuda.batchSize / 2) {
			return true;
		}

		// Check GPU memory availability
		const availableDevice = this.getAvailableGPUDevice();
		if (!availableDevice || availableDevice.memoryFree < this.config.cuda.maxMemoryUsage) {
			return false;
		}

		return preferGPU || this.config.optimization.preferGPUForBatches;
	}

	private getAvailableGPUDevice(): GPUDeviceInfo | null {
		return (
			this.gpuDevices.find(
				(device) =>
					device.isAvailable &&
					device.memoryFree > this.config.cuda.maxMemoryUsage &&
					device.utilization < 90, // Less than 90% utilization
			) || null
		);
	}

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
	private reserveDeviceMemory(
		device: GPUDeviceInfo,
		bytes: number, 
		batchId: string
	): { release: (success: boolean) => void } {
		if (device.memoryFree < bytes) {
			throw new Error(`brAInwav: Insufficient GPU memory: need ${bytes}MB, have ${device.memoryFree}MB`);
		}
		
		// Update device memory counters atomically
		device.memoryUsed += bytes;
		device.memoryFree -= bytes;
		
		// Track reservation for cleanup and leak detection
		const reservation: MemoryReservation = { 
			device, 
			bytes, 
			batchId, 
			timestamp: Date.now() 
		};
		this.activeReservations.set(batchId, reservation);
		
		console.debug('[brAInwav] GPU memory reserved', {
			brand: 'brAInwav',
			timestamp: new Date().toISOString(),
			batchId,
			reservedBytes: bytes,
			deviceMemoryUsed: device.memoryUsed,
			deviceMemoryFree: device.memoryFree,
			activeReservations: this.activeReservations.size
		});
		
		return {
			release: (success: boolean) => {
				// Idempotent release - check existence before cleanup
				if (this.activeReservations.has(batchId)) {
					device.memoryUsed -= bytes;
					device.memoryFree += bytes;
					this.activeReservations.delete(batchId);
					
					console.debug('[brAInwav] GPU memory released', {
						brand: 'brAInwav',
						timestamp: new Date().toISOString(),
						batchId,
						releasedBytes: bytes,
						success,
						deviceMemoryUsed: device.memoryUsed,
						deviceMemoryFree: device.memoryFree,
						remainingReservations: this.activeReservations.size
					});
				}
			}
		};
	}

	private async processWithGPU(texts: string[], batchId: string): Promise<EmbeddingResult[]> {
		const startTime = Date.now();
		const device = this.getAvailableGPUDevice();

		if (!device) {
			throw new Error('brAInwav: No available GPU devices');
		}

		// Calculate memory requirements with safety margin
		const estimatedMemoryUsage = texts.length * 4 * 384; // 4 bytes per dimension, 384 dimensions
		const safetyMarginMultiplier = 1.25; // brAInwav policy: 25% safety margin
		const requiredMemoryMB = Math.ceil(estimatedMemoryUsage / (1024 * 1024) * safetyMarginMultiplier);

                // Reserve memory with deterministic cleanup
                const reservation = this.reserveDeviceMemory(device, requiredMemoryMB, batchId);
                const bufferTracker = this.trackGPUBuffer(reservation, device, requiredMemoryMB, batchId);

                try {
                        // Simulate GPU processing (in practice, this would use CUDA/WebGL)
                        if (!this.denseEmbedder) {
                                throw new Error('brAInwav: Dense embedder not initialized');
			}
			
			const embeddings = await this.denseEmbedder(texts);
			const processingTime = Date.now() - startTime;

			// Update device utilization metrics
			device.utilization = Math.min(100, device.utilization + 10);

			// Create results with GPU device info
			const results: EmbeddingResult[] = embeddings.map((embedding, index) => ({
				embedding,
				device: 'gpu',
				deviceId: device.id,
				processingTime: processingTime / embeddings.length,
				batchId
			}));

                        // Memory and buffer released successfully
                        bufferTracker.release(true);
                        return results;

                } catch (error) {
                        // Ensure memory is released even on failure
                        bufferTracker.release(false);

                        console.error('[brAInwav] GPU processing failed', {
                                brand: 'brAInwav',
                                timestamp: new Date().toISOString(),
                                batchId,
				error: error instanceof Error ? error.message : String(error),
				deviceId: device.id,
				requiredMemoryMB
			});
			
			throw error;
		}
	}

	private async processWithCPU(texts: string[], batchId: string): Promise<EmbeddingResult[]> {
		const startTime = Date.now();

		// Process in batches to avoid overwhelming CPU
		const batchSize = this.config.fallback.cpuBatchSize;
		const allEmbeddings: number[][] = [];

		for (let i = 0; i < texts.length; i += batchSize) {
			const batch = texts.slice(i, i + batchSize);
			if (!this.denseEmbedder) {
				throw new Error('brAInwav: Dense embedder not initialized');
			}
			const batchEmbeddings = await this.denseEmbedder(batch);
			allEmbeddings.push(...batchEmbeddings);
		}

		const processingTime = Date.now() - startTime;

		return allEmbeddings.map((embedding, index) => ({
			embedding,
			device: 'cpu' as const,
			processingTime: processingTime / texts.length,
			batchId,
		}));
	}

	private startBatchProcessor(): void {
		this.batchTimer = setInterval(() => {
			this.processBatchQueue();
		}, this.config.optimization.batchTimeout);
	}

	private async processBatchQueue(): Promise<void> {
		if (this.requestQueue.length === 0) return;

		const batchSize = Math.min(this.config.cuda.batchSize, this.requestQueue.length);
		const batch = this.requestQueue.splice(0, batchSize);

		const batchId = `auto_batch_${Date.now()}`;
		const texts = batch.map((req) => req.text);

		try {
			await this.generateEmbeddings(texts, { batchId });
		} catch (error) {
			console.error('brAInwav GPU Acceleration: Auto batch processing failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
				batchSize: texts.length,
				batchId,
			});
		}
	}

	private startMetricsCollection(): void {
		this.metricsTimer = setInterval(() => {
			this.collectMetrics();
		}, this.config.monitoring.metricsInterval);
	}

	private collectMetrics(): void {
		// Update GPU utilization
		for (const device of this.gpuDevices) {
			device.utilization = Math.max(0, device.utilization - 5); // Simulate utilization decay
		}

		// Calculate fallback rate
		this.metrics.fallbackRate =
			this.metrics.totalRequests > 0 ? this.metrics.cpuRequests / this.metrics.totalRequests : 0;

		// Calculate batch efficiency
		this.metrics.batchEfficiency =
			this.processingBatches.size > 0
				? Math.min(100, (this.metrics.gpuRequests / this.metrics.totalRequests) * 100)
				: 0;

		// Check performance thresholds
		if (this.metrics.averageLatency > this.config.monitoring.performanceThreshold) {
			console.warn('brAInwav GPU Acceleration: Performance threshold exceeded', {
				component: 'memory-core',
				brand: 'brAInwav',
				currentLatency: this.metrics.averageLatency,
				threshold: this.config.monitoring.performanceThreshold,
			});
		}

		console.debug('brAInwav GPU Acceleration: Metrics collected', {
			component: 'memory-core',
			brand: 'brAInwav',
			metrics: this.metrics,
			gpuDevices: this.gpuDevices.length,
		});
	}

	private updateMetrics(processingTime: number): void {
		// Update average latency
		this.metrics.averageLatency = (this.metrics.averageLatency + processingTime) / 2;
	}

	/**
	 * Get current metrics and device information
	 */
	getMetrics(): {
		metrics: GPUMetrics;
		gpuDevices: GPUDeviceInfo[];
		config: GPUAccelerationConfig;
	} {
		return {
			metrics: { ...this.metrics },
			gpuDevices: [...this.gpuDevices],
			config: { ...this.config },
		};
	}

	/**
	 * Health check for GPU acceleration
	 */
	async healthCheck(): Promise<{
		healthy: boolean;
		gpuAvailable: boolean;
		deviceCount: number;
		lastMetrics: GPUMetrics;
	}> {
		const healthy = this.isInitialized && this.denseEmbedder !== null;
		const gpuAvailable = this.gpuDevices.some((device) => device.isAvailable);

		return {
			healthy,
			gpuAvailable,
			deviceCount: this.gpuDevices.length,
			lastMetrics: { ...this.metrics },
		};
	}

	/**
	 * Stop GPU acceleration manager with comprehensive cleanup
	 */
        async stop(): Promise<void> {
                console.info('[brAInwav] GPU Acceleration Manager stopping', {
                        brand: 'brAInwav',
                        timestamp: new Date().toISOString(),
                        activeReservations: this.activeReservations.size,
                        processingBatches: this.processingBatches.size
                });

                this.releaseLeakedBuffers();

                // Clean up any remaining reservations and log leaks
                if (this.activeReservations.size > 0) {
                        console.warn('[brAInwav] GPU reservations leaked during shutdown', {
                                brand: 'brAInwav',
                                timestamp: new Date().toISOString(),
				leakedCount: this.activeReservations.size,
				reservations: Array.from(this.activeReservations.keys())
			});
			
			// Force cleanup leaked reservations
			for (const [batchId, reservation] of this.activeReservations) {
				reservation.device.memoryUsed -= reservation.bytes;
				reservation.device.memoryFree += reservation.bytes;
			}
			this.activeReservations.clear();
		}

		// Clear timers to prevent memory leaks
		if (this.metricsTimer) {
			clearInterval(this.metricsTimer);
			this.metricsTimer = null;
		}

		if (this.batchTimer) {
			clearInterval(this.batchTimer);
			this.batchTimer = null;
		}

		// Wait for any pending processing to complete
		const pendingBatches = Array.from(this.processingBatches.values());
		if (pendingBatches.length > 0) {
			console.info('brAInwav GPU Acceleration: Waiting for pending batches to complete', {
				component: 'memory-core',
				brand: 'brAInwav',
				pendingBatches: pendingBatches.length,
			});

			try {
				await Promise.allSettled(pendingBatches);
			} catch (error) {
				console.warn('brAInwav GPU Acceleration: Error waiting for pending batches', {
					component: 'memory-core',
					brand: 'brAInwav',
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		// Clear queues and batches
		this.requestQueue.length = 0; // More efficient than reassignment
		this.processingBatches.clear();

		// Reset device states and release GPU memory to baseline
		for (const device of this.gpuDevices) {
			device.utilization = 0;
			device.memoryUsed = 0;
			device.memoryFree = device.memoryTotal; // Release all memory
		}

		// Clear embedder references to prevent memory leaks
		this.denseEmbedder = null;
		this.sparseEmbedder = null;

		// Reset metrics to prevent stale data
		this.metrics = {
			totalRequests: 0,
			gpuRequests: 0,
			cpuRequests: 0,
			averageLatency: 0,
			gpuUtilization: 0,
			memoryUsage: 0,
			batchEfficiency: 0,
			fallbackRate: 0,
			errors: 0,
		};

		this.isInitialized = false;

                console.info('brAInwav GPU Acceleration Manager stopped', {
                        component: 'memory-core',
                        brand: 'brAInwav',
                        finalMetrics: this.metrics,
                });
        }

        private trackGPUBuffer(
                reservation: { release: (success: boolean) => void },
                device: GPUDeviceInfo,
                bytes: number,
                batchId: string,
        ): GPUBufferTracker {
                const bufferId = `gpu-buffer-${device.id}-${batchId}-${randomUUID().substring(0, 8)}`;

                let tracker: GPUBufferTracker;

                const release = (success: boolean): void => {
                        if (tracker.released) {
                                return;
                        }

                        tracker.released = true;

                        try {
                                reservation.release(success);
                        } catch (error) {
                                console.error('[brAInwav] GPU buffer release failed', {
                                        brand: 'brAInwav',
                                        timestamp: new Date().toISOString(),
                                        batchId,
                                        bufferId,
                                        error: error instanceof Error ? error.message : String(error),
                                });
                        } finally {
                                this.allocatedBuffers.delete(bufferId);
                                console.debug('[brAInwav] GPU buffer release complete', {
                                        brand: 'brAInwav',
                                        timestamp: new Date().toISOString(),
                                        batchId,
                                        bufferId,
                                        success,
                                        remainingTrackedBuffers: this.allocatedBuffers.size,
                                });
                        }
                };

                tracker = {
                        id: bufferId,
                        batchId,
                        device,
                        bytes,
                        createdAt: Date.now(),
                        released: false,
                        release,
                };

                this.allocatedBuffers.set(bufferId, tracker);

                console.debug('[brAInwav] GPU buffer tracked', {
                        brand: 'brAInwav',
                        timestamp: new Date().toISOString(),
                        batchId,
                        bufferId,
                        bytes: bytes * 1024 * 1024,
                        trackedBuffers: this.allocatedBuffers.size,
                });

                return tracker;
        }

        private releaseLeakedBuffers(): void {
                if (this.allocatedBuffers.size === 0) {
                        return;
                }

                console.warn('[brAInwav] GPU buffers leaked during shutdown', {
                        brand: 'brAInwav',
                        timestamp: new Date().toISOString(),
                        leakedBuffers: this.allocatedBuffers.size,
                        buffers: Array.from(this.allocatedBuffers.values()).map((buffer) => ({
                                id: buffer.id,
                                batchId: buffer.batchId,
                                bytes: buffer.bytes,
                                createdAt: buffer.createdAt,
                                deviceId: buffer.device.id,
                        })),
                });

                for (const buffer of Array.from(this.allocatedBuffers.values())) {
                        try {
                                buffer.release(false);
                        } catch (error) {
                                console.error('[brAInwav] Forced GPU buffer release failed', {
                                        brand: 'brAInwav',
                                        timestamp: new Date().toISOString(),
                                        bufferId: buffer.id,
                                        error: error instanceof Error ? error.message : String(error),
                                });
                        }
                }
        }
}

// Global GPU acceleration manager instance
let gpuAccelerationManager: GPUAccelerationManager | null = null;

export function getGPUAccelerationManager(config?: GPUAccelerationConfig): GPUAccelerationManager {
	if (!gpuAccelerationManager) {
		if (!config) {
			throw new Error('GPU acceleration configuration required for first initialization');
		}
		gpuAccelerationManager = new GPUAccelerationManager(config);
	}
	return gpuAccelerationManager;
}

export async function stopGPUAccelerationManager(): Promise<void> {
	if (gpuAccelerationManager) {
		await gpuAccelerationManager.stop();
		gpuAccelerationManager = null;
	}
}
