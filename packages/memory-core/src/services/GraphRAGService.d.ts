/**
 * GraphRAG Service for brAInwav Cortex-OS
 *
 * Implements the hybrid retrieval pipeline:
 * 1. Qdrant hybrid search (dense + sparse)
 * 2. Lift Qdrant points to graph nodes stored in Prisma/SQLite
 * 3. One-hop graph expansion with edge whitelisting
 * 4. Context assembly with prioritized chunk selection
 * 5. brAInwav-branded response with optional citations
 */
import { z } from 'zod';
export declare const GraphRAGServiceConfigSchema: z.ZodObject<{
    qdrant: z.ZodDefault<z.ZodObject<{
        url: z.ZodDefault<z.ZodString>;
        apiKey: z.ZodOptional<z.ZodString>;
        collection: z.ZodDefault<z.ZodString>;
        timeout: z.ZodDefault<z.ZodNumber>;
        maxRetries: z.ZodDefault<z.ZodNumber>;
        brainwavBranding: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        timeout?: number;
        url?: string;
        apiKey?: string;
        collection?: string;
        maxRetries?: number;
        brainwavBranding?: boolean;
    }, {
        timeout?: number;
        url?: string;
        apiKey?: string;
        collection?: string;
        maxRetries?: number;
        brainwavBranding?: boolean;
    }>>;
    expansion: z.ZodObject<{
        allowedEdges: z.ZodDefault<z.ZodArray<z.ZodNativeEnum<any>, "many">>;
        maxHops: z.ZodDefault<z.ZodNumber>;
        maxNeighborsPerNode: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        allowedEdges?: any[];
        maxHops?: number;
        maxNeighborsPerNode?: number;
    }, {
        allowedEdges?: any[];
        maxHops?: number;
        maxNeighborsPerNode?: number;
    }>;
    limits: z.ZodObject<{
        maxContextChunks: z.ZodDefault<z.ZodNumber>;
        queryTimeoutMs: z.ZodDefault<z.ZodNumber>;
        maxConcurrentQueries: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxContextChunks?: number;
        queryTimeoutMs?: number;
        maxConcurrentQueries?: number;
    }, {
        maxContextChunks?: number;
        queryTimeoutMs?: number;
        maxConcurrentQueries?: number;
    }>;
    branding: z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        sourceAttribution: z.ZodDefault<z.ZodString>;
        emitBrandedEvents: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enabled?: boolean;
        sourceAttribution?: string;
        emitBrandedEvents?: boolean;
    }, {
        enabled?: boolean;
        sourceAttribution?: string;
        emitBrandedEvents?: boolean;
    }>;
    streaming: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        defaultOptions: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            strategy: z.ZodDefault<z.ZodEnum<["progressive", "batch", "hybrid"]>>;
            chunkSize: z.ZodDefault<z.ZodNumber>;
            bufferTime: z.ZodDefault<z.ZodNumber>;
            prioritizeCritical: z.ZodDefault<z.ZodBoolean>;
            includeMetadata: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            includeMetadata?: boolean;
            strategy?: "progressive" | "batch" | "hybrid";
            enabled?: boolean;
            chunkSize?: number;
            bufferTime?: number;
            prioritizeCritical?: boolean;
        }, {
            includeMetadata?: boolean;
            strategy?: "progressive" | "batch" | "hybrid";
            enabled?: boolean;
            chunkSize?: number;
            bufferTime?: number;
            prioritizeCritical?: boolean;
        }>;
        config: z.ZodObject<{
            maxConcurrentStreams: z.ZodDefault<z.ZodNumber>;
            bufferSize: z.ZodDefault<z.ZodNumber>;
            timeoutMs: z.ZodDefault<z.ZodNumber>;
            compressionEnabled: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            timeoutMs?: number;
            maxConcurrentStreams?: number;
            bufferSize?: number;
            compressionEnabled?: boolean;
        }, {
            timeoutMs?: number;
            maxConcurrentStreams?: number;
            bufferSize?: number;
            compressionEnabled?: boolean;
        }>;
    }, "strip", z.ZodTypeAny, {
        enabled?: boolean;
        defaultOptions?: {
            includeMetadata?: boolean;
            strategy?: "progressive" | "batch" | "hybrid";
            enabled?: boolean;
            chunkSize?: number;
            bufferTime?: number;
            prioritizeCritical?: boolean;
        };
        config?: {
            timeoutMs?: number;
            maxConcurrentStreams?: number;
            bufferSize?: number;
            compressionEnabled?: boolean;
        };
    }, {
        enabled?: boolean;
        defaultOptions?: {
            includeMetadata?: boolean;
            strategy?: "progressive" | "batch" | "hybrid";
            enabled?: boolean;
            chunkSize?: number;
            bufferTime?: number;
            prioritizeCritical?: boolean;
        };
        config?: {
            timeoutMs?: number;
            maxConcurrentStreams?: number;
            bufferSize?: number;
            compressionEnabled?: boolean;
        };
    }>>;
    externalKg: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        provider: z.ZodDefault<z.ZodEnum<["none", "neo4j", "mcp"]>>;
        uri: z.ZodOptional<z.ZodString>;
        user: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
        slug: z.ZodOptional<z.ZodString>;
        tool: z.ZodOptional<z.ZodString>;
        maxResults: z.ZodDefault<z.ZodNumber>;
        requestTimeoutMs: z.ZodDefault<z.ZodNumber>;
        maxDepth: z.ZodDefault<z.ZodNumber>;
        citationPrefix: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        maxResults?: number;
        uri?: string;
        maxDepth?: number;
        enabled?: boolean;
        provider?: "none" | "neo4j" | "mcp";
        user?: string;
        password?: string;
        slug?: string;
        tool?: string;
        requestTimeoutMs?: number;
        citationPrefix?: string;
    }, {
        maxResults?: number;
        uri?: string;
        maxDepth?: number;
        enabled?: boolean;
        provider?: "none" | "neo4j" | "mcp";
        user?: string;
        password?: string;
        slug?: string;
        tool?: string;
        requestTimeoutMs?: number;
        citationPrefix?: string;
    }>>;
    precomputation: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        maxPrecomputedQueries: z.ZodDefault<z.ZodNumber>;
        patternAnalysis: z.ZodObject<{
            minFrequency: z.ZodDefault<z.ZodNumber>;
            confidenceThreshold: z.ZodDefault<z.ZodNumber>;
            analysisWindow: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            minFrequency?: number;
            confidenceThreshold?: number;
            analysisWindow?: number;
        }, {
            minFrequency?: number;
            confidenceThreshold?: number;
            analysisWindow?: number;
        }>;
        scheduling: z.ZodObject<{
            interval: z.ZodDefault<z.ZodNumber>;
            maxConcurrentJobs: z.ZodDefault<z.ZodNumber>;
            offPeakHours: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        }, "strip", z.ZodTypeAny, {
            interval?: number;
            maxConcurrentJobs?: number;
            offPeakHours?: number[];
        }, {
            interval?: number;
            maxConcurrentJobs?: number;
            offPeakHours?: number[];
        }>;
        freshness: z.ZodObject<{
            defaultTTL: z.ZodDefault<z.ZodNumber>;
            maxTTL: z.ZodDefault<z.ZodNumber>;
            refreshThreshold: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            defaultTTL?: number;
            maxTTL?: number;
            refreshThreshold?: number;
        }, {
            defaultTTL?: number;
            maxTTL?: number;
            refreshThreshold?: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        enabled?: boolean;
        maxPrecomputedQueries?: number;
        patternAnalysis?: {
            minFrequency?: number;
            confidenceThreshold?: number;
            analysisWindow?: number;
        };
        scheduling?: {
            interval?: number;
            maxConcurrentJobs?: number;
            offPeakHours?: number[];
        };
        freshness?: {
            defaultTTL?: number;
            maxTTL?: number;
            refreshThreshold?: number;
        };
    }, {
        enabled?: boolean;
        maxPrecomputedQueries?: number;
        patternAnalysis?: {
            minFrequency?: number;
            confidenceThreshold?: number;
            analysisWindow?: number;
        };
        scheduling?: {
            interval?: number;
            maxConcurrentJobs?: number;
            offPeakHours?: number[];
        };
        freshness?: {
            defaultTTL?: number;
            maxTTL?: number;
            refreshThreshold?: number;
        };
    }>>;
    gpuAcceleration: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        cuda: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            deviceIds: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
            maxMemoryUsage: z.ZodDefault<z.ZodNumber>;
            batchSize: z.ZodDefault<z.ZodNumber>;
            maxConcurrentBatches: z.ZodDefault<z.ZodNumber>;
            timeout: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            timeout?: number;
            enabled?: boolean;
            deviceIds?: number[];
            maxMemoryUsage?: number;
            batchSize?: number;
            maxConcurrentBatches?: number;
        }, {
            timeout?: number;
            enabled?: boolean;
            deviceIds?: number[];
            maxMemoryUsage?: number;
            batchSize?: number;
            maxConcurrentBatches?: number;
        }>;
        fallback: z.ZodObject<{
            toCPU: z.ZodDefault<z.ZodBoolean>;
            cpuBatchSize: z.ZodDefault<z.ZodNumber>;
            maxQueueSize: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            toCPU?: boolean;
            cpuBatchSize?: number;
            maxQueueSize?: number;
        }, {
            toCPU?: boolean;
            cpuBatchSize?: number;
            maxQueueSize?: number;
        }>;
        monitoring: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            metricsInterval: z.ZodDefault<z.ZodNumber>;
            performanceThreshold: z.ZodDefault<z.ZodNumber>;
            memoryThreshold: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled?: boolean;
            metricsInterval?: number;
            performanceThreshold?: number;
            memoryThreshold?: number;
        }, {
            enabled?: boolean;
            metricsInterval?: number;
            performanceThreshold?: number;
            memoryThreshold?: number;
        }>;
        optimization: z.ZodObject<{
            autoBatching: z.ZodDefault<z.ZodBoolean>;
            batchTimeout: z.ZodDefault<z.ZodNumber>;
            memoryOptimization: z.ZodDefault<z.ZodBoolean>;
            preferGPUForBatches: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            autoBatching?: boolean;
            batchTimeout?: number;
            memoryOptimization?: boolean;
            preferGPUForBatches?: boolean;
        }, {
            autoBatching?: boolean;
            batchTimeout?: number;
            memoryOptimization?: boolean;
            preferGPUForBatches?: boolean;
        }>;
    }, "strip", z.ZodTypeAny, {
        enabled?: boolean;
        cuda?: {
            timeout?: number;
            enabled?: boolean;
            deviceIds?: number[];
            maxMemoryUsage?: number;
            batchSize?: number;
            maxConcurrentBatches?: number;
        };
        fallback?: {
            toCPU?: boolean;
            cpuBatchSize?: number;
            maxQueueSize?: number;
        };
        monitoring?: {
            enabled?: boolean;
            metricsInterval?: number;
            performanceThreshold?: number;
            memoryThreshold?: number;
        };
        optimization?: {
            autoBatching?: boolean;
            batchTimeout?: number;
            memoryOptimization?: boolean;
            preferGPUForBatches?: boolean;
        };
    }, {
        enabled?: boolean;
        cuda?: {
            timeout?: number;
            enabled?: boolean;
            deviceIds?: number[];
            maxMemoryUsage?: number;
            batchSize?: number;
            maxConcurrentBatches?: number;
        };
        fallback?: {
            toCPU?: boolean;
            cpuBatchSize?: number;
            maxQueueSize?: number;
        };
        monitoring?: {
            enabled?: boolean;
            metricsInterval?: number;
            performanceThreshold?: number;
            memoryThreshold?: number;
        };
        optimization?: {
            autoBatching?: boolean;
            batchTimeout?: number;
            memoryOptimization?: boolean;
            preferGPUForBatches?: boolean;
        };
    }>>;
    autoScaling: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        metrics: z.ZodObject<{
            cpuThreshold: z.ZodDefault<z.ZodNumber>;
            memoryThreshold: z.ZodDefault<z.ZodNumber>;
            latencyThreshold: z.ZodDefault<z.ZodNumber>;
            errorRateThreshold: z.ZodDefault<z.ZodNumber>;
            queueLengthThreshold: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            memoryThreshold?: number;
            cpuThreshold?: number;
            latencyThreshold?: number;
            errorRateThreshold?: number;
            queueLengthThreshold?: number;
        }, {
            memoryThreshold?: number;
            cpuThreshold?: number;
            latencyThreshold?: number;
            errorRateThreshold?: number;
            queueLengthThreshold?: number;
        }>;
        scaling: z.ZodObject<{
            minInstances: z.ZodDefault<z.ZodNumber>;
            maxInstances: z.ZodDefault<z.ZodNumber>;
            scaleUpCooldown: z.ZodDefault<z.ZodNumber>;
            scaleDownCooldown: z.ZodDefault<z.ZodNumber>;
            scaleUpFactor: z.ZodDefault<z.ZodNumber>;
            scaleDownFactor: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            minInstances?: number;
            maxInstances?: number;
            scaleUpCooldown?: number;
            scaleDownCooldown?: number;
            scaleUpFactor?: number;
            scaleDownFactor?: number;
        }, {
            minInstances?: number;
            maxInstances?: number;
            scaleUpCooldown?: number;
            scaleDownCooldown?: number;
            scaleUpFactor?: number;
            scaleDownFactor?: number;
        }>;
        prediction: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            algorithm: z.ZodDefault<z.ZodEnum<["linear", "exponential", "seasonal"]>>;
            predictionWindow: z.ZodDefault<z.ZodNumber>;
            accuracyThreshold: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled?: boolean;
            algorithm?: "linear" | "exponential" | "seasonal";
            predictionWindow?: number;
            accuracyThreshold?: number;
        }, {
            enabled?: boolean;
            algorithm?: "linear" | "exponential" | "seasonal";
            predictionWindow?: number;
            accuracyThreshold?: number;
        }>;
        emergency: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            cpuThreshold: z.ZodDefault<z.ZodNumber>;
            memoryThreshold: z.ZodDefault<z.ZodNumber>;
            latencyThreshold: z.ZodDefault<z.ZodNumber>;
            autoScale: z.ZodDefault<z.ZodBoolean>;
            maxEmergencyInstances: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled?: boolean;
            memoryThreshold?: number;
            cpuThreshold?: number;
            latencyThreshold?: number;
            autoScale?: boolean;
            maxEmergencyInstances?: number;
        }, {
            enabled?: boolean;
            memoryThreshold?: number;
            cpuThreshold?: number;
            latencyThreshold?: number;
            autoScale?: boolean;
            maxEmergencyInstances?: number;
        }>;
        monitoring: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            metricsInterval: z.ZodDefault<z.ZodNumber>;
            alertingEnabled: z.ZodDefault<z.ZodBoolean>;
            logLevel: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
        }, "strip", z.ZodTypeAny, {
            enabled?: boolean;
            metricsInterval?: number;
            alertingEnabled?: boolean;
            logLevel?: "error" | "debug" | "info" | "warn";
        }, {
            enabled?: boolean;
            metricsInterval?: number;
            alertingEnabled?: boolean;
            logLevel?: "error" | "debug" | "info" | "warn";
        }>;
    }, "strip", z.ZodTypeAny, {
        enabled?: boolean;
        monitoring?: {
            enabled?: boolean;
            metricsInterval?: number;
            alertingEnabled?: boolean;
            logLevel?: "error" | "debug" | "info" | "warn";
        };
        metrics?: {
            memoryThreshold?: number;
            cpuThreshold?: number;
            latencyThreshold?: number;
            errorRateThreshold?: number;
            queueLengthThreshold?: number;
        };
        scaling?: {
            minInstances?: number;
            maxInstances?: number;
            scaleUpCooldown?: number;
            scaleDownCooldown?: number;
            scaleUpFactor?: number;
            scaleDownFactor?: number;
        };
        prediction?: {
            enabled?: boolean;
            algorithm?: "linear" | "exponential" | "seasonal";
            predictionWindow?: number;
            accuracyThreshold?: number;
        };
        emergency?: {
            enabled?: boolean;
            memoryThreshold?: number;
            cpuThreshold?: number;
            latencyThreshold?: number;
            autoScale?: boolean;
            maxEmergencyInstances?: number;
        };
    }, {
        enabled?: boolean;
        monitoring?: {
            enabled?: boolean;
            metricsInterval?: number;
            alertingEnabled?: boolean;
            logLevel?: "error" | "debug" | "info" | "warn";
        };
        metrics?: {
            memoryThreshold?: number;
            cpuThreshold?: number;
            latencyThreshold?: number;
            errorRateThreshold?: number;
            queueLengthThreshold?: number;
        };
        scaling?: {
            minInstances?: number;
            maxInstances?: number;
            scaleUpCooldown?: number;
            scaleDownCooldown?: number;
            scaleUpFactor?: number;
            scaleDownFactor?: number;
        };
        prediction?: {
            enabled?: boolean;
            algorithm?: "linear" | "exponential" | "seasonal";
            predictionWindow?: number;
            accuracyThreshold?: number;
        };
        emergency?: {
            enabled?: boolean;
            memoryThreshold?: number;
            cpuThreshold?: number;
            latencyThreshold?: number;
            autoScale?: boolean;
            maxEmergencyInstances?: number;
        };
    }>>;
    mlOptimization: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        patternAnalysis: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            minSamples: z.ZodDefault<z.ZodNumber>;
            clusterThreshold: z.ZodDefault<z.ZodNumber>;
            maxPatterns: z.ZodDefault<z.ZodNumber>;
            updateInterval: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled?: boolean;
            minSamples?: number;
            clusterThreshold?: number;
            maxPatterns?: number;
            updateInterval?: number;
        }, {
            enabled?: boolean;
            minSamples?: number;
            clusterThreshold?: number;
            maxPatterns?: number;
            updateInterval?: number;
        }>;
        mlModels: z.ZodObject<{
            latencyPrediction: z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                modelType: z.ZodDefault<z.ZodEnum<["linear", "tree", "neural"]>>;
                trainInterval: z.ZodDefault<z.ZodNumber>;
                minTrainingSamples: z.ZodDefault<z.ZodNumber>;
                maxTrainingSamples: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                enabled?: boolean;
                modelType?: "linear" | "tree" | "neural";
                trainInterval?: number;
                minTrainingSamples?: number;
                maxTrainingSamples?: number;
            }, {
                enabled?: boolean;
                modelType?: "linear" | "tree" | "neural";
                trainInterval?: number;
                minTrainingSamples?: number;
                maxTrainingSamples?: number;
            }>;
            cacheOptimization: z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                predictionHorizon: z.ZodDefault<z.ZodNumber>;
                optimizationThreshold: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                enabled?: boolean;
                predictionHorizon?: number;
                optimizationThreshold?: number;
            }, {
                enabled?: boolean;
                predictionHorizon?: number;
                optimizationThreshold?: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            latencyPrediction?: {
                enabled?: boolean;
                modelType?: "linear" | "tree" | "neural";
                trainInterval?: number;
                minTrainingSamples?: number;
                maxTrainingSamples?: number;
            };
            cacheOptimization?: {
                enabled?: boolean;
                predictionHorizon?: number;
                optimizationThreshold?: number;
            };
        }, {
            latencyPrediction?: {
                enabled?: boolean;
                modelType?: "linear" | "tree" | "neural";
                trainInterval?: number;
                minTrainingSamples?: number;
                maxTrainingSamples?: number;
            };
            cacheOptimization?: {
                enabled?: boolean;
                predictionHorizon?: number;
                optimizationThreshold?: number;
            };
        }>;
        optimization: z.ZodObject<{
            autoApply: z.ZodDefault<z.ZodBoolean>;
            manualReviewRequired: z.ZodDefault<z.ZodBoolean>;
            maxConcurrentOptimizations: z.ZodDefault<z.ZodNumber>;
            optimizationCooldown: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            autoApply?: boolean;
            manualReviewRequired?: boolean;
            maxConcurrentOptimizations?: number;
            optimizationCooldown?: number;
        }, {
            autoApply?: boolean;
            manualReviewRequired?: boolean;
            maxConcurrentOptimizations?: number;
            optimizationCooldown?: number;
        }>;
        monitoring: z.ZodObject<{
            anomalyDetection: z.ZodDefault<z.ZodBoolean>;
            performanceDegradationThreshold: z.ZodDefault<z.ZodNumber>;
            alertThreshold: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            anomalyDetection?: boolean;
            performanceDegradationThreshold?: number;
            alertThreshold?: number;
        }, {
            anomalyDetection?: boolean;
            performanceDegradationThreshold?: number;
            alertThreshold?: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        enabled?: boolean;
        patternAnalysis?: {
            enabled?: boolean;
            minSamples?: number;
            clusterThreshold?: number;
            maxPatterns?: number;
            updateInterval?: number;
        };
        monitoring?: {
            anomalyDetection?: boolean;
            performanceDegradationThreshold?: number;
            alertThreshold?: number;
        };
        optimization?: {
            autoApply?: boolean;
            manualReviewRequired?: boolean;
            maxConcurrentOptimizations?: number;
            optimizationCooldown?: number;
        };
        mlModels?: {
            latencyPrediction?: {
                enabled?: boolean;
                modelType?: "linear" | "tree" | "neural";
                trainInterval?: number;
                minTrainingSamples?: number;
                maxTrainingSamples?: number;
            };
            cacheOptimization?: {
                enabled?: boolean;
                predictionHorizon?: number;
                optimizationThreshold?: number;
            };
        };
    }, {
        enabled?: boolean;
        patternAnalysis?: {
            enabled?: boolean;
            minSamples?: number;
            clusterThreshold?: number;
            maxPatterns?: number;
            updateInterval?: number;
        };
        monitoring?: {
            anomalyDetection?: boolean;
            performanceDegradationThreshold?: number;
            alertThreshold?: number;
        };
        optimization?: {
            autoApply?: boolean;
            manualReviewRequired?: boolean;
            maxConcurrentOptimizations?: number;
            optimizationCooldown?: number;
        };
        mlModels?: {
            latencyPrediction?: {
                enabled?: boolean;
                modelType?: "linear" | "tree" | "neural";
                trainInterval?: number;
                minTrainingSamples?: number;
                maxTrainingSamples?: number;
            };
            cacheOptimization?: {
                enabled?: boolean;
                predictionHorizon?: number;
                optimizationThreshold?: number;
            };
        };
    }>>;
    cdnCaching: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        provider: z.ZodDefault<z.ZodEnum<["cloudflare", "aws-cloudfront", "fastly", "akamai", "custom"]>>;
        zoneId: z.ZodOptional<z.ZodString>;
        apiToken: z.ZodOptional<z.ZodString>;
        distributionId: z.ZodOptional<z.ZodString>;
        customEndpoint: z.ZodOptional<z.ZodString>;
        cacheKeyPrefix: z.ZodDefault<z.ZodString>;
        defaultTTL: z.ZodDefault<z.ZodNumber>;
        maxTTL: z.ZodDefault<z.ZodNumber>;
        staleWhileRevalidate: z.ZodDefault<z.ZodNumber>;
        staleIfError: z.ZodDefault<z.ZodNumber>;
        compression: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            level: z.ZodDefault<z.ZodNumber>;
            types: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            enabled?: boolean;
            level?: number;
            types?: string[];
        }, {
            enabled?: boolean;
            level?: number;
            types?: string[];
        }>;
        optimization: z.ZodObject<{
            autoMinify: z.ZodDefault<z.ZodBoolean>;
            imageOptimization: z.ZodDefault<z.ZodBoolean>;
            brotliCompression: z.ZodDefault<z.ZodBoolean>;
            http2Push: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            autoMinify?: boolean;
            imageOptimization?: boolean;
            brotliCompression?: boolean;
            http2Push?: boolean;
        }, {
            autoMinify?: boolean;
            imageOptimization?: boolean;
            brotliCompression?: boolean;
            http2Push?: boolean;
        }>;
        monitoring: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            realTimeMetrics: z.ZodDefault<z.ZodBoolean>;
            alertingEnabled: z.ZodDefault<z.ZodBoolean>;
            logLevel: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
        }, "strip", z.ZodTypeAny, {
            enabled?: boolean;
            alertingEnabled?: boolean;
            logLevel?: "error" | "debug" | "info" | "warn";
            realTimeMetrics?: boolean;
        }, {
            enabled?: boolean;
            alertingEnabled?: boolean;
            logLevel?: "error" | "debug" | "info" | "warn";
            realTimeMetrics?: boolean;
        }>;
        geographic: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            regions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            defaultRegion: z.ZodDefault<z.ZodString>;
            fallbackRegion: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            enabled?: boolean;
            regions?: string[];
            defaultRegion?: string;
            fallbackRegion?: string;
        }, {
            enabled?: boolean;
            regions?: string[];
            defaultRegion?: string;
            fallbackRegion?: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        enabled?: boolean;
        provider?: "custom" | "cloudflare" | "aws-cloudfront" | "fastly" | "akamai";
        defaultTTL?: number;
        maxTTL?: number;
        monitoring?: {
            enabled?: boolean;
            alertingEnabled?: boolean;
            logLevel?: "error" | "debug" | "info" | "warn";
            realTimeMetrics?: boolean;
        };
        optimization?: {
            autoMinify?: boolean;
            imageOptimization?: boolean;
            brotliCompression?: boolean;
            http2Push?: boolean;
        };
        zoneId?: string;
        apiToken?: string;
        distributionId?: string;
        customEndpoint?: string;
        cacheKeyPrefix?: string;
        staleWhileRevalidate?: number;
        staleIfError?: number;
        compression?: {
            enabled?: boolean;
            level?: number;
            types?: string[];
        };
        geographic?: {
            enabled?: boolean;
            regions?: string[];
            defaultRegion?: string;
            fallbackRegion?: string;
        };
    }, {
        enabled?: boolean;
        provider?: "custom" | "cloudflare" | "aws-cloudfront" | "fastly" | "akamai";
        defaultTTL?: number;
        maxTTL?: number;
        monitoring?: {
            enabled?: boolean;
            alertingEnabled?: boolean;
            logLevel?: "error" | "debug" | "info" | "warn";
            realTimeMetrics?: boolean;
        };
        optimization?: {
            autoMinify?: boolean;
            imageOptimization?: boolean;
            brotliCompression?: boolean;
            http2Push?: boolean;
        };
        zoneId?: string;
        apiToken?: string;
        distributionId?: string;
        customEndpoint?: string;
        cacheKeyPrefix?: string;
        staleWhileRevalidate?: number;
        staleIfError?: number;
        compression?: {
            enabled?: boolean;
            level?: number;
            types?: string[];
        };
        geographic?: {
            enabled?: boolean;
            regions?: string[];
            defaultRegion?: string;
            fallbackRegion?: string;
        };
    }>>;
}, "strip", z.ZodTypeAny, {
    qdrant?: {
        timeout?: number;
        url?: string;
        apiKey?: string;
        collection?: string;
        maxRetries?: number;
        brainwavBranding?: boolean;
    };
    expansion?: {
        allowedEdges?: any[];
        maxHops?: number;
        maxNeighborsPerNode?: number;
    };
    limits?: {
        maxContextChunks?: number;
        queryTimeoutMs?: number;
        maxConcurrentQueries?: number;
    };
    branding?: {
        enabled?: boolean;
        sourceAttribution?: string;
        emitBrandedEvents?: boolean;
    };
    streaming?: {
        enabled?: boolean;
        defaultOptions?: {
            includeMetadata?: boolean;
            strategy?: "progressive" | "batch" | "hybrid";
            enabled?: boolean;
            chunkSize?: number;
            bufferTime?: number;
            prioritizeCritical?: boolean;
        };
        config?: {
            timeoutMs?: number;
            maxConcurrentStreams?: number;
            bufferSize?: number;
            compressionEnabled?: boolean;
        };
    };
    externalKg?: {
        maxResults?: number;
        uri?: string;
        maxDepth?: number;
        enabled?: boolean;
        provider?: "none" | "neo4j" | "mcp";
        user?: string;
        password?: string;
        slug?: string;
        tool?: string;
        requestTimeoutMs?: number;
        citationPrefix?: string;
    };
    precomputation?: {
        enabled?: boolean;
        maxPrecomputedQueries?: number;
        patternAnalysis?: {
            minFrequency?: number;
            confidenceThreshold?: number;
            analysisWindow?: number;
        };
        scheduling?: {
            interval?: number;
            maxConcurrentJobs?: number;
            offPeakHours?: number[];
        };
        freshness?: {
            defaultTTL?: number;
            maxTTL?: number;
            refreshThreshold?: number;
        };
    };
    gpuAcceleration?: {
        enabled?: boolean;
        cuda?: {
            timeout?: number;
            enabled?: boolean;
            deviceIds?: number[];
            maxMemoryUsage?: number;
            batchSize?: number;
            maxConcurrentBatches?: number;
        };
        fallback?: {
            toCPU?: boolean;
            cpuBatchSize?: number;
            maxQueueSize?: number;
        };
        monitoring?: {
            enabled?: boolean;
            metricsInterval?: number;
            performanceThreshold?: number;
            memoryThreshold?: number;
        };
        optimization?: {
            autoBatching?: boolean;
            batchTimeout?: number;
            memoryOptimization?: boolean;
            preferGPUForBatches?: boolean;
        };
    };
    autoScaling?: {
        enabled?: boolean;
        monitoring?: {
            enabled?: boolean;
            metricsInterval?: number;
            alertingEnabled?: boolean;
            logLevel?: "error" | "debug" | "info" | "warn";
        };
        metrics?: {
            memoryThreshold?: number;
            cpuThreshold?: number;
            latencyThreshold?: number;
            errorRateThreshold?: number;
            queueLengthThreshold?: number;
        };
        scaling?: {
            minInstances?: number;
            maxInstances?: number;
            scaleUpCooldown?: number;
            scaleDownCooldown?: number;
            scaleUpFactor?: number;
            scaleDownFactor?: number;
        };
        prediction?: {
            enabled?: boolean;
            algorithm?: "linear" | "exponential" | "seasonal";
            predictionWindow?: number;
            accuracyThreshold?: number;
        };
        emergency?: {
            enabled?: boolean;
            memoryThreshold?: number;
            cpuThreshold?: number;
            latencyThreshold?: number;
            autoScale?: boolean;
            maxEmergencyInstances?: number;
        };
    };
    mlOptimization?: {
        enabled?: boolean;
        patternAnalysis?: {
            enabled?: boolean;
            minSamples?: number;
            clusterThreshold?: number;
            maxPatterns?: number;
            updateInterval?: number;
        };
        monitoring?: {
            anomalyDetection?: boolean;
            performanceDegradationThreshold?: number;
            alertThreshold?: number;
        };
        optimization?: {
            autoApply?: boolean;
            manualReviewRequired?: boolean;
            maxConcurrentOptimizations?: number;
            optimizationCooldown?: number;
        };
        mlModels?: {
            latencyPrediction?: {
                enabled?: boolean;
                modelType?: "linear" | "tree" | "neural";
                trainInterval?: number;
                minTrainingSamples?: number;
                maxTrainingSamples?: number;
            };
            cacheOptimization?: {
                enabled?: boolean;
                predictionHorizon?: number;
                optimizationThreshold?: number;
            };
        };
    };
    cdnCaching?: {
        enabled?: boolean;
        provider?: "custom" | "cloudflare" | "aws-cloudfront" | "fastly" | "akamai";
        defaultTTL?: number;
        maxTTL?: number;
        monitoring?: {
            enabled?: boolean;
            alertingEnabled?: boolean;
            logLevel?: "error" | "debug" | "info" | "warn";
            realTimeMetrics?: boolean;
        };
        optimization?: {
            autoMinify?: boolean;
            imageOptimization?: boolean;
            brotliCompression?: boolean;
            http2Push?: boolean;
        };
        zoneId?: string;
        apiToken?: string;
        distributionId?: string;
        customEndpoint?: string;
        cacheKeyPrefix?: string;
        staleWhileRevalidate?: number;
        staleIfError?: number;
        compression?: {
            enabled?: boolean;
            level?: number;
            types?: string[];
        };
        geographic?: {
            enabled?: boolean;
            regions?: string[];
            defaultRegion?: string;
            fallbackRegion?: string;
        };
    };
}, {
    qdrant?: {
        timeout?: number;
        url?: string;
        apiKey?: string;
        collection?: string;
        maxRetries?: number;
        brainwavBranding?: boolean;
    };
    expansion?: {
        allowedEdges?: any[];
        maxHops?: number;
        maxNeighborsPerNode?: number;
    };
    limits?: {
        maxContextChunks?: number;
        queryTimeoutMs?: number;
        maxConcurrentQueries?: number;
    };
    branding?: {
        enabled?: boolean;
        sourceAttribution?: string;
        emitBrandedEvents?: boolean;
    };
    streaming?: {
        enabled?: boolean;
        defaultOptions?: {
            includeMetadata?: boolean;
            strategy?: "progressive" | "batch" | "hybrid";
            enabled?: boolean;
            chunkSize?: number;
            bufferTime?: number;
            prioritizeCritical?: boolean;
        };
        config?: {
            timeoutMs?: number;
            maxConcurrentStreams?: number;
            bufferSize?: number;
            compressionEnabled?: boolean;
        };
    };
    externalKg?: {
        maxResults?: number;
        uri?: string;
        maxDepth?: number;
        enabled?: boolean;
        provider?: "none" | "neo4j" | "mcp";
        user?: string;
        password?: string;
        slug?: string;
        tool?: string;
        requestTimeoutMs?: number;
        citationPrefix?: string;
    };
    precomputation?: {
        enabled?: boolean;
        maxPrecomputedQueries?: number;
        patternAnalysis?: {
            minFrequency?: number;
            confidenceThreshold?: number;
            analysisWindow?: number;
        };
        scheduling?: {
            interval?: number;
            maxConcurrentJobs?: number;
            offPeakHours?: number[];
        };
        freshness?: {
            defaultTTL?: number;
            maxTTL?: number;
            refreshThreshold?: number;
        };
    };
    gpuAcceleration?: {
        enabled?: boolean;
        cuda?: {
            timeout?: number;
            enabled?: boolean;
            deviceIds?: number[];
            maxMemoryUsage?: number;
            batchSize?: number;
            maxConcurrentBatches?: number;
        };
        fallback?: {
            toCPU?: boolean;
            cpuBatchSize?: number;
            maxQueueSize?: number;
        };
        monitoring?: {
            enabled?: boolean;
            metricsInterval?: number;
            performanceThreshold?: number;
            memoryThreshold?: number;
        };
        optimization?: {
            autoBatching?: boolean;
            batchTimeout?: number;
            memoryOptimization?: boolean;
            preferGPUForBatches?: boolean;
        };
    };
    autoScaling?: {
        enabled?: boolean;
        monitoring?: {
            enabled?: boolean;
            metricsInterval?: number;
            alertingEnabled?: boolean;
            logLevel?: "error" | "debug" | "info" | "warn";
        };
        metrics?: {
            memoryThreshold?: number;
            cpuThreshold?: number;
            latencyThreshold?: number;
            errorRateThreshold?: number;
            queueLengthThreshold?: number;
        };
        scaling?: {
            minInstances?: number;
            maxInstances?: number;
            scaleUpCooldown?: number;
            scaleDownCooldown?: number;
            scaleUpFactor?: number;
            scaleDownFactor?: number;
        };
        prediction?: {
            enabled?: boolean;
            algorithm?: "linear" | "exponential" | "seasonal";
            predictionWindow?: number;
            accuracyThreshold?: number;
        };
        emergency?: {
            enabled?: boolean;
            memoryThreshold?: number;
            cpuThreshold?: number;
            latencyThreshold?: number;
            autoScale?: boolean;
            maxEmergencyInstances?: number;
        };
    };
    mlOptimization?: {
        enabled?: boolean;
        patternAnalysis?: {
            enabled?: boolean;
            minSamples?: number;
            clusterThreshold?: number;
            maxPatterns?: number;
            updateInterval?: number;
        };
        monitoring?: {
            anomalyDetection?: boolean;
            performanceDegradationThreshold?: number;
            alertThreshold?: number;
        };
        optimization?: {
            autoApply?: boolean;
            manualReviewRequired?: boolean;
            maxConcurrentOptimizations?: number;
            optimizationCooldown?: number;
        };
        mlModels?: {
            latencyPrediction?: {
                enabled?: boolean;
                modelType?: "linear" | "tree" | "neural";
                trainInterval?: number;
                minTrainingSamples?: number;
                maxTrainingSamples?: number;
            };
            cacheOptimization?: {
                enabled?: boolean;
                predictionHorizon?: number;
                optimizationThreshold?: number;
            };
        };
    };
    cdnCaching?: {
        enabled?: boolean;
        provider?: "custom" | "cloudflare" | "aws-cloudfront" | "fastly" | "akamai";
        defaultTTL?: number;
        maxTTL?: number;
        monitoring?: {
            enabled?: boolean;
            alertingEnabled?: boolean;
            logLevel?: "error" | "debug" | "info" | "warn";
            realTimeMetrics?: boolean;
        };
        optimization?: {
            autoMinify?: boolean;
            imageOptimization?: boolean;
            brotliCompression?: boolean;
            http2Push?: boolean;
        };
        zoneId?: string;
        apiToken?: string;
        distributionId?: string;
        customEndpoint?: string;
        cacheKeyPrefix?: string;
        staleWhileRevalidate?: number;
        staleIfError?: number;
        compression?: {
            enabled?: boolean;
            level?: number;
            types?: string[];
        };
        geographic?: {
            enabled?: boolean;
            regions?: string[];
            defaultRegion?: string;
            fallbackRegion?: string;
        };
    };
}>;
export type GraphRAGServiceConfig = z.infer<typeof GraphRAGServiceConfigSchema>;
export declare const GraphRAGQueryRequestSchema: z.ZodObject<{
    question: z.ZodString;
    k: z.ZodDefault<z.ZodNumber>;
    maxHops: z.ZodDefault<z.ZodNumber>;
    maxChunks: z.ZodDefault<z.ZodNumber>;
    threshold: z.ZodOptional<z.ZodNumber>;
    includeVectors: z.ZodDefault<z.ZodBoolean>;
    includeCitations: z.ZodDefault<z.ZodBoolean>;
    namespace: z.ZodOptional<z.ZodString>;
    filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    maxHops?: number;
    question?: string;
    k?: number;
    maxChunks?: number;
    threshold?: number;
    includeVectors?: boolean;
    includeCitations?: boolean;
    namespace?: string;
    filters?: Record<string, any>;
}, {
    maxHops?: number;
    question?: string;
    k?: number;
    maxChunks?: number;
    threshold?: number;
    includeVectors?: boolean;
    includeCitations?: boolean;
    namespace?: string;
    filters?: Record<string, any>;
}>;
export type GraphRAGQueryRequest = z.infer<typeof GraphRAGQueryRequestSchema>;
export interface GraphRAGContext {
    chunks: Array<{
        id: string;
        nodeId: string;
        path: string;
        content: string;
        lineStart?: number;
        lineEnd?: number;
        score: number;
        nodeType: GraphNodeType;
        nodeKey: string;
    }>;
    nodes: Array<{
        id: string;
        type: GraphNodeType;
        key: string;
        label: string;
        meta: unknown;
    }>;
}
export interface GraphRAGResult {
    answer?: string;
    sources: GraphRAGContext['chunks'];
    graphContext: {
        focusNodes: number;
        expandedNodes: number;
        totalChunks: number;
        edgesTraversed: number;
    };
    metadata: {
        brainwavPowered: boolean;
        retrievalDurationMs: number;
        queryTimestamp: string;
        brainwavSource: string;
        externalKgEnriched?: boolean;
    };
    citations?: Array<{
        path: string;
        lines?: string;
        nodeType: GraphNodeType;
        relevanceScore: number;
        brainwavIndexed: boolean;
    }>;
}
export declare class GraphRAGService {
    private readonly qdrant;
    private readonly config;
    private readonly activeQueries;
    private readonly externalKg?;
    private readonly externalProvider?;
    private readonly queryPrecomputer;
    private readonly gpuAccelerationManager;
    private readonly autoScalingManager;
    private readonly mlOptimizationManager;
    private readonly cdnCacheManager;
    constructor(config: GraphRAGServiceConfig);
    initialize(embedDenseFunc: (text: string) => Promise<number[]>, embedSparseFunc: (text: string) => Promise<{
        indices: number[];
        values: number[];
    }>): Promise<void>;
    query(params: GraphRAGQueryRequest): Promise<GraphRAGResult>;
    healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy' | 'degraded';
        components: {
            qdrant: boolean;
            prisma: boolean;
            gpu?: boolean;
            autoScaling?: boolean;
            mlOptimization?: boolean;
        };
        brainwavSource: string;
        performance?: {
            averageLatency: number;
            cacheHitRatio: number;
            memoryUsageMB: number;
            issues: string[];
        };
        gpu?: {
            enabled: boolean;
            healthy: boolean;
            deviceCount: number;
            metrics: any;
        };
        autoScaling?: {
            enabled: boolean;
            healthy: boolean;
            currentInstances: number;
            recommendations: number;
        };
        mlOptimization?: {
            enabled: boolean;
            healthy: boolean;
            patterns: number;
            models: number;
            anomalies: number;
        };
    }>;
    getStats(): Promise<{
        totalNodes: number;
        totalEdges: number;
        totalChunks: number;
        nodeTypeDistribution: Record<string, number>;
        edgeTypeDistribution: Record<string, number>;
        brainwavSource: string;
    }>;
    close(): Promise<void>;
    private reserveQuerySlot;
    private hybridSeedSearch;
    private liftToGraphNodes;
    private buildResult;
    private formatCitations;
    private fetchExternalCitations;
    private fetchMcpCitations;
    private emitQueryEvent;
}
export declare function createGraphRAGService(config?: Partial<GraphRAGServiceConfig>): GraphRAGService;
