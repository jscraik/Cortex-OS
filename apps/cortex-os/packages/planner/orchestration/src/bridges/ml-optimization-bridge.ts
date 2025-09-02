/**
 * TypeScript orchestration bridge for Python ML optimization engine.
 *
 * Provides seamless integration between TypeScript orchestration layer
 * and Python ML optimization components with intelligent caching,
 * error handling, and performance monitoring.
 */

import { type ChildProcess, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import * as fsSync from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Schema definitions for type safety
const TaskTypeSchema = z.enum([
	"CODE_GENERATION",
	"CODE_REVIEW",
	"INSTRUCTION_FOLLOWING",
	"REASONING",
	"SUMMARIZATION",
	"CONVERSATION",
	"TRANSLATION",
	"ANALYSIS",
	"PLANNING",
	"DEBUGGING",
]);

const SecurityLevelSchema = z.enum([
	"MINIMAL",
	"STANDARD",
	"STRICT",
	"COMPLIANCE",
]);

const ModelBackendSchema = z.enum(["MLX", "OLLAMA", "LLAMA_CPP"]);

const OptimizationContextSchema = z.object({
	task_type: TaskTypeSchema,
	priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
	max_latency_ms: z.number().optional(),
	min_quality_score: z.number().min(0).max(1).default(0.5),
	memory_limit_gb: z.number().positive().optional(),
	security_level: SecurityLevelSchema.default("STANDARD"),
	user_preferences: z.record(z.string(), z.any()).default({}),
	session_id: z.string().optional(),
});

const ModelSelectionSchema = z.object({
	model_config: z.object({
		name: z.string(),
		backend: ModelBackendSchema,
		model_path: z.string(),
		memory_gb: z.number(),
		context_length: z.number(),
		quality_score: z.number(),
		specialized_tasks: z.array(TaskTypeSchema),
		sandboxed: z.boolean(),
		pii_redaction: z.boolean(),
	}),
	confidence: z.number().min(0).max(1),
	reasoning: z.string(),
	fallback_chain: z.array(z.any()),
	estimated_memory_gb: z.number(),
	estimated_latency_ms: z.number(),
	switch_reason: z.string().optional(),
});

const SecurityContextSchema = z.object({
	user_id: z.string().optional(),
	session_id: z.string().optional(),
	security_level: SecurityLevelSchema.default("STANDARD"),
	source_ip: z.string().optional(),
	user_agent: z.string().optional(),
	content_sensitivity: z
		.enum(["public", "internal", "confidential", "restricted"])
		.default("public"),
	data_classification: z
		.enum(["general", "personal", "sensitive", "critical"])
		.default("general"),
	gdpr_applicable: z.boolean().default(false),
	hipaa_applicable: z.boolean().default(false),
	sox_applicable: z.boolean().default(false),
	metadata: z.record(z.string(), z.any()).default({}),
});

const ValidationResultSchema = z.object({
	is_valid: z.boolean(),
	security_score: z.number().min(0).max(1),
	violations: z
		.array(
			z.object({
				violation_type: z.string(),
				severity: z.enum(["low", "medium", "high", "critical"]),
				description: z.string(),
				blocked: z.boolean().default(true),
				sanitized: z.boolean().default(false),
			}),
		)
		.default([]),
	sanitized_input: z.string().optional(),
	sanitized_output: z.string().optional(),
	recommendations: z.array(z.string()).default([]),
	validation_time_ms: z.number().default(0),
	rules_applied: z.array(z.string()).default([]),
});

const PerformanceMetricsSchema = z.object({
	average_latency_ms: z.number().default(0),
	p95_latency_ms: z.number().default(0),
	tokens_per_second: z.number().default(0),
	error_rate: z.number().min(0).max(1).default(0),
	memory_usage_gb: z.number().default(0),
	carbon_emission_g: z.number().default(0),
	slo_compliance: z.record(z.string(), z.any()).default({}),
});

// Type exports
export type TaskType = z.infer<typeof TaskTypeSchema>;
export type SecurityLevel = z.infer<typeof SecurityLevelSchema>;
export type ModelBackend = z.infer<typeof ModelBackendSchema>;
export type OptimizationContext = z.infer<typeof OptimizationContextSchema>;
export type ModelSelection = z.infer<typeof ModelSelectionSchema>;
export type SecurityContext = z.infer<typeof SecurityContextSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;

// Parsed response schemas for Python bridge methods
const MemoryStateSchema = z.object({
	current: z.object({
		total_gb: z.number(),
		available_gb: z.number(),
		used_gb: z.number(),
		usage_percent: z.number(),
	}),
	predictions: z.object({
		predicted_memory_gb: z.number(),
		confidence: z.number(),
		reasoning: z.string(),
	}),
});

const FallbackStatusSchema = z.object({
	chains: z.record(z.string(), z.unknown()),
	models: z.record(z.string(), z.unknown()),
	global: z.object({
		total_fallbacks: z.number(),
		successful_recoveries: z.number(),
	}),
});

const OptimizationStatsSchema = z.object({
	current_model: z.string().nullable(),
	total_optimizations: z.number(),
	model_switches: z.number(),
	memory_usage_gb: z.number(),
	average_latency_ms: z.number(),
});

interface MLOptimizationConfig {
	pythonPath?: string;
	scriptPath?: string;
	timeout?: number;
	retryAttempts?: number;
	cacheEnabled?: boolean;
	cacheTtlMs?: number;
	monitoringEnabled?: boolean;
	logLevel?: "debug" | "info" | "warn" | "error";
}

interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number;
}

interface BridgeMetrics {
	totalRequests: number;
	successfulRequests: number;
	failedRequests: number;
	averageLatencyMs: number;
	cacheHitRate: number;
	lastProcessTime: number;
}

export class MLOptimizationBridge extends EventEmitter {
	private pythonProcess: ChildProcess | null = null;
	private isInitialized = false;
	private requestQueue: Array<{
		id: string;
		method: string;
		params: unknown;
		resolve: (value: unknown) => void;
		reject: (error: Error) => void;
		timestamp: number;
	}> = [];

	private cache = new Map<string, CacheEntry<unknown>>();
	private metrics: BridgeMetrics = {
		totalRequests: 0,
		successfulRequests: 0,
		failedRequests: 0,
		averageLatencyMs: 0,
		cacheHitRate: 0,
		lastProcessTime: 0,
	};

	private readonly config: Required<MLOptimizationConfig>;

	constructor(config: MLOptimizationConfig = {}) {
		super();

		this.config = {
			pythonPath: config.pythonPath || "python3",
			scriptPath:
				config.scriptPath ||
				path.join(
					__dirname,
					"../../../apps/cortex-py/src/mlx/bridge_server.py",
				),
			timeout: config.timeout || 30000,
			retryAttempts: config.retryAttempts || 3,
			cacheEnabled: config.cacheEnabled ?? true,
			cacheTtlMs: config.cacheTtlMs || 60000, // 1 minute default cache
			monitoringEnabled: config.monitoringEnabled ?? true,
			logLevel: config.logLevel || "info",
		};

		// Clean up cache periodically
		setInterval(() => this.cleanupCache(), 60000); // Every minute
	}

	/**
	 * Initialize the ML optimization bridge
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) return;

		try {
			await this.startPythonProcess();
			await this.healthCheck();
			this.isInitialized = true;
			this.emit("initialized");
			this.log("info", "ML Optimization Bridge initialized successfully");
		} catch (error) {
			this.emit("error", error);
			throw new Error(`Failed to initialize ML Optimization Bridge: ${error}`);
		}
	}

	/**
	 * Select optimal model for given context
	 */
	async selectOptimalModel(
		context: OptimizationContext,
		forceReevaluation = false,
	): Promise<ModelSelection> {
		const validatedContext = OptimizationContextSchema.parse(context);
		const cacheKey = `select_model_${JSON.stringify(validatedContext)}_${forceReevaluation}`;

		// Check cache first
		if (this.config.cacheEnabled && !forceReevaluation) {
			const cached = this.getFromCache<ModelSelection>(cacheKey);
			if (cached) {
				this.log("debug", `Cache hit for model selection: ${cacheKey}`);
				return cached;
			}
		}

		const result = await this.callPythonMethod("select_optimal_model", {
			context: validatedContext,
			force_reevaluation: forceReevaluation,
		});

		const modelSelection = ModelSelectionSchema.parse(result);

		// Cache the result
		if (this.config.cacheEnabled) {
			this.setCache(cacheKey, modelSelection);
		}

		this.emit("modelSelected", modelSelection);
		return modelSelection;
	}

	/**
	 * Validate input for security violations
	 */
	async validateInput(
		inputText: string,
		context: SecurityContext,
		modelName?: string,
	): Promise<ValidationResult> {
		const validatedContext = SecurityContextSchema.parse(context);

		const result = await this.callPythonMethod("validate_input", {
			input_text: inputText,
			context: validatedContext,
			model_name: modelName,
		});

		const validationResult = ValidationResultSchema.parse(result);

		if (!validationResult.is_valid) {
			this.emit("securityViolation", {
				inputText: inputText.substring(0, 100),
				violations: validationResult.violations,
				context: validatedContext,
			});
		}

		return validationResult;
	}

	/**
	 * Validate output for security violations
	 */
	async validateOutput(
		outputText: string,
		inputText: string,
		context: SecurityContext,
		modelName?: string,
	): Promise<ValidationResult> {
		const validatedContext = SecurityContextSchema.parse(context);

		const result = await this.callPythonMethod("validate_output", {
			output_text: outputText,
			input_text: inputText,
			context: validatedContext,
			model_name: modelName,
		});

		const validationResult = ValidationResultSchema.parse(result);

		if (!validationResult.is_valid) {
			this.emit("outputViolation", {
				outputText: outputText.substring(0, 100),
				violations: validationResult.violations,
				context: validatedContext,
			});
		}

		return validationResult;
	}

	/**
	 * Get current performance metrics
	 */
	async getPerformanceMetrics(): Promise<PerformanceMetrics> {
		const result = await this.callPythonMethod("get_performance_metrics", {});
		return PerformanceMetricsSchema.parse(result);
	}

	/**
	 * Get memory state and predictions
	 */
	async getMemoryState(): Promise<{
		current: {
			total_gb: number;
			available_gb: number;
			used_gb: number;
			usage_percent: number;
		};
		predictions: {
			predicted_memory_gb: number;
			confidence: number;
			reasoning: string;
		};
	}> {
		const res = await this.callPythonMethod("get_memory_state", {});
		return MemoryStateSchema.parse(res);
	}

	/**
	 * Get fallback chain status
	 */
	async getFallbackStatus(): Promise<{
		chains: Record<string, unknown>;
		models: Record<string, unknown>;
		global: {
			total_fallbacks: number;
			successful_recoveries: number;
		};
	}> {
		const res = await this.callPythonMethod("get_fallback_status", {});
		return FallbackStatusSchema.parse(res);
	}

	/**
	 * Force model switch
	 */
	async forceModelSwitch(
		modelName: string,
		reason = "user_request",
	): Promise<boolean> {
		const result = await this.callPythonMethod("force_model_switch", {
			model_name: modelName,
			reason,
		});
		const parsed = z.object({ success: z.boolean() }).parse(result);
		if (parsed.success) {
			this.emit("modelSwitched", { modelName, reason });
		}
		return parsed.success;
	}

	/**
	 * Get optimization statistics
	 */
	async getOptimizationStats(): Promise<{
		current_model: string | null;
		total_optimizations: number;
		model_switches: number;
		memory_usage_gb: number;
		average_latency_ms: number;
	}> {
		const res = await this.callPythonMethod("get_optimization_stats", {});
		return OptimizationStatsSchema.parse(res);
	}

	/**
	 * Record inference metrics
	 */
	async recordInference(metrics: {
		latency_ms: number;
		input_tokens: number;
		output_tokens: number;
		model_name: string;
		task_type: string;
		error_occurred?: boolean;
		user_id?: string;
		session_id?: string;
	}): Promise<void> {
		await this.callPythonMethod("record_inference", { metrics });
		this.emit("inferenceRecorded", metrics);
	}

	/**
	 * Health check for the Python bridge
	 */
	async healthCheck(): Promise<boolean> {
		try {
			const result = await this.callPythonMethod("health_check", {}, 5000); // 5 second timeout
			const status = z.object({ status: z.string() }).parse(result);
			return status.status === "healthy";
		} catch (error) {
			this.log("error", `Health check failed: ${this.errorMessage(error)}`);
			return false;
		}
	}

	/**
	 * Get bridge metrics
	 */
	getBridgeMetrics(): BridgeMetrics & { cacheSize: number } {
		return {
			...this.metrics,
			cacheSize: this.cache.size,
		};
	}

	/**
	 * Clear cache
	 */
	clearCache(): void {
		this.cache.clear();
		this.log("info", "Cache cleared");
	}

	/**
	 * Shutdown the bridge
	 */
	async shutdown(): Promise<void> {
		if (this.pythonProcess) {
			this.pythonProcess.kill("SIGTERM");

			// Give process time to cleanup
			await new Promise((resolve) => setTimeout(resolve, 2000));

			if (!this.pythonProcess.killed) {
				this.pythonProcess.kill("SIGKILL");
			}

			this.pythonProcess = null;
		}

		this.isInitialized = false;
		this.clearCache();
		this.emit("shutdown");
		this.log("info", "ML Optimization Bridge shutdown");
	}

	// Private methods

	private async startPythonProcess(): Promise<void> {
		return new Promise((resolve, reject) => {
			const scriptExists = this.checkScriptExists();
			if (!scriptExists) {
				reject(new Error(`Python script not found: ${this.config.scriptPath}`));
				return;
			}

			this.pythonProcess = spawn(
				this.config.pythonPath,
				[this.config.scriptPath],
				{
					stdio: ["pipe", "pipe", "pipe"],
					env: { ...process.env, PYTHONUNBUFFERED: "1" },
				},
			);

			let stdoutBuffer = "";
			let _stderrBuffer = "";

			this.pythonProcess.stdout?.on("data", (data) => {
				stdoutBuffer += data.toString();
				this.processMessages(stdoutBuffer);
			});

			this.pythonProcess.stderr?.on("data", (data) => {
				_stderrBuffer += data.toString();
				if (this.config.logLevel === "debug") {
					this.log("debug", `Python stderr: ${data.toString()}`);
				}
			});

			this.pythonProcess.on("error", (error) => {
				this.log("error", `Python process error: ${error}`);
				this.emit("error", error);
				reject(error);
			});

			this.pythonProcess.on("exit", (code, signal) => {
				this.log(
					"warn",
					`Python process exited with code ${code}, signal ${signal}`,
				);
				this.pythonProcess = null;
				this.isInitialized = false;
				this.emit("processExit", { code, signal });
			});

			// Wait for process to be ready
			setTimeout(() => {
				if (this.pythonProcess && !this.pythonProcess.killed) {
					resolve();
				} else {
					reject(new Error("Python process failed to start"));
				}
			}, 2000);
		});
	}

	private checkScriptExists(): boolean {
		try {
			fsSync.accessSync(this.config.scriptPath, fsSync.constants.F_OK);
			return true;
		} catch (_err) {
			return false;
		}
	}

	private processMessages(buffer: string): void {
		const lines = buffer.split("\n");

		for (const line of lines) {
			if (line.trim()) {
				try {
					const message = JSON.parse(line);
					this.handlePythonMessage(message);
				} catch (_err) {
					// Not a JSON message, might be debug output
					if (this.config.logLevel === "debug") {
						this.log("debug", `Python output: ${line}`);
					}
				}
			}
		}
	}
	private handlePythonMessage(message: unknown): void {
		const m = message as {
			type?: string;
			id?: string;
			error?: string;
			result?: unknown;
			event?: string;
			data?: unknown;
			level?: string;
			message?: string;
		};
		if (m.type === "response") {
			// Find pending request and resolve it
			const requestIndex = this.requestQueue.findIndex(
				(req) => req.id === m.id,
			);
			if (requestIndex >= 0) {
				const request = this.requestQueue[requestIndex];
				this.requestQueue.splice(requestIndex, 1);

				const latency = Date.now() - request.timestamp;
				this.updateMetrics(true, latency);

				if (m.error) {
					request.reject(new Error(m.error));
				} else {
					request.resolve(m.result);
				}
			}
		} else if (m.type === "event") {
			// Forward Python events
			if (typeof m.event === "string") {
				this.emit(m.event, m.data);
			}
		} else if (m.type === "log") {
			// Forward Python logs
			this.log(m.level || "info", `Python: ${m.message}`);
		}
	}
	private async callPythonMethod(
		method: string,
		params: unknown,
		timeoutMs?: number,
	): Promise<unknown> {
		if (!this.isInitialized || !this.pythonProcess) {
			throw new Error("ML Optimization Bridge not initialized");
		}

		const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const timeout = timeoutMs || this.config.timeout;

		this.metrics.totalRequests++;

		return new Promise((resolve, reject) => {
			const request = {
				id: requestId,
				method,
				params,
				resolve,
				reject,
				timestamp: Date.now(),
			};

			this.requestQueue.push(request);

			// Send request to Python
			const message = `${JSON.stringify({
				id: requestId,
				method,
				params,
			})}\n`;

			this.pythonProcess?.stdin?.write(message);

			// Set timeout
			const timeoutHandle = setTimeout(() => {
				const requestIndex = this.requestQueue.findIndex(
					(req) => req.id === requestId,
				);
				if (requestIndex >= 0) {
					this.requestQueue.splice(requestIndex, 1);
					this.updateMetrics(false, timeout);
					reject(new Error(`Request timeout: ${method}`));
				}
			}, timeout);

			// Clear timeout when request completes
			const originalResolve = resolve;
			const originalReject = reject;

			request.resolve = (value: unknown) => {
				clearTimeout(timeoutHandle);
				originalResolve(value);
			};

			request.reject = (error: Error) => {
				clearTimeout(timeoutHandle);
				originalReject(error);
			};
		});
	}

	private updateMetrics(success: boolean, latencyMs: number): void {
		if (success) {
			this.metrics.successfulRequests++;
		} else {
			this.metrics.failedRequests++;
		}

		// Update average latency (exponential moving average)
		const alpha = 0.1;
		this.metrics.averageLatencyMs =
			alpha * latencyMs + (1 - alpha) * this.metrics.averageLatencyMs;

		this.metrics.lastProcessTime = Date.now();

		// Update cache hit rate
		if (this.metrics.totalRequests > 0) {
			// This is approximate - would need more detailed tracking for exact rate
			this.metrics.cacheHitRate = this.cache.size / this.metrics.totalRequests;
		}
	}

	private getFromCache<T>(key: string): T | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		if (Date.now() - entry.timestamp > entry.ttl) {
			this.cache.delete(key);
			return null;
		}

		return entry.data as T;
	}

	private setCache<T>(key: string, data: T, ttlMs?: number): void {
		const ttl = ttlMs || this.config.cacheTtlMs;
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl,
		});
	}

	private cleanupCache(): void {
		const now = Date.now();
		const keysToDelete: string[] = [];

		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.timestamp > entry.ttl) {
				keysToDelete.push(key);
			}
		}

		for (const key of keysToDelete) {
			this.cache.delete(key);
		}

		if (keysToDelete.length > 0) {
			this.log(
				"debug",
				`Cleaned up ${keysToDelete.length} expired cache entries`,
			);
		}
	}

	private log(level: string, message: string): void {
		if (this.config.monitoringEnabled) {
			const levels = ["debug", "info", "warn", "error"];
			const currentLevelIndex = levels.indexOf(this.config.logLevel);
			const messageLevelIndex = levels.indexOf(level);

			if (messageLevelIndex >= currentLevelIndex) {
				// Bridge-level logging uses console for process-wide visibility
				// This is a controlled bridge-level logger; allow console here with a narrow justify comment

				console.log(`[MLOptimizationBridge:${level.toUpperCase()}] ${message}`);
			}
		}
	}

	private errorMessage(e: unknown): string {
		return e instanceof Error ? e.message : String(e);
	}
}

// Export singleton instance
export const mlOptimizationBridge = new MLOptimizationBridge();
