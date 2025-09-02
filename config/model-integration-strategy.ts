/**
 * Model Integration Strategy for Cortex-OS
 * Maps available models to specific use cases across packages
 */

export interface ModelIntegrationConfig {
	// Agent Package Models
	agents: {
		codeIntelligence: {
			primary: "qwen3-coder:30b"; // Ollama - Heavy lifting
			fallback: "deepseek-coder:6.7b"; // Ollama - Backup
		};
		reasoning: {
			primary: "phi4-mini-reasoning:latest"; // Ollama - Fast decisions
			fallback: "phi4-mini-reasoning:3.8b"; // Ollama - Lightweight
		};
		multimodal: {
			primary: "qwen2.5-vl"; // MLX - Vision + Language
		};
	};

	// Orchestration Package Models
	orchestration: {
		coordinator: {
			primary: "mixtral-8x7b"; // MLX - Complex reasoning
			fallback: "qwen2.5-0.5b"; // MLX - Fast responses
		};
		safety: {
			primary: "llama_guard"; // Safety validation
		};
		planning: {
			primary: "phi4-mini-reasoning:latest"; // Ollama - Task decomposition
		};
	};

	// A2A Package Models
	a2a: {
		embedding: {
			primary: "qwen3-4b"; // MLX - Balanced performance
			fallback: "qwen3-0.6b"; // MLX - Fast/lightweight
			premium: "qwen3-8b"; // MLX - High accuracy
		};
		reranking: {
			primary: "qwen3-reranker"; // MLX - Dedicated reranker
		};
		communication: {
			primary: "qwen2.5-0.5b"; // MLX - Fast chat
		};
	};
}

export const DEFAULT_MODEL_INTEGRATION: ModelIntegrationConfig = {
	agents: {
		codeIntelligence: {
			primary: "qwen3-coder:30b",
			fallback: "deepseek-coder:6.7b",
		},
		reasoning: {
			primary: "phi4-mini-reasoning:latest",
			fallback: "phi4-mini-reasoning:3.8b",
		},
		multimodal: {
			primary: "qwen2.5-vl",
		},
	},
	orchestration: {
		coordinator: {
			primary: "mixtral-8x7b",
			fallback: "qwen2.5-0.5b",
		},
		safety: {
			primary: "llama_guard",
		},
		planning: {
			primary: "phi4-mini-reasoning:latest",
		},
	},
	a2a: {
		embedding: {
			primary: "qwen3-4b",
			fallback: "qwen3-0.6b",
			premium: "qwen3-8b",
		},
		reranking: {
			primary: "qwen3-reranker",
		},
		communication: {
			primary: "qwen2.5-0.5b",
		},
	},
};

/**
 * Model Selection Strategy based on task characteristics
 */
export interface TaskCharacteristics {
	complexity: "low" | "medium" | "high";
	latency: "realtime" | "fast" | "batch";
	accuracy: "sufficient" | "high" | "premium";
	resource_constraint: "strict" | "moderate" | "flexible";
	modality: "text" | "code" | "multimodal";
}

export function selectOptimalModel(
	category: keyof ModelIntegrationConfig,
	subcategory: string,
	characteristics: TaskCharacteristics,
	config: ModelIntegrationConfig = DEFAULT_MODEL_INTEGRATION,
): string {
	const models = config[category] as Record<
		string,
		{ primary: string; fallback?: string; premium?: string }
	>;
	const modelGroup = models[subcategory];

	if (!modelGroup) {
		throw new Error(`Unknown model category: ${category}.${subcategory}`);
	}

	// Strategy 1: Real-time tasks prefer smaller models
	if (characteristics.latency === "realtime") {
		return modelGroup.fallback || modelGroup.primary;
	}

	// Strategy 2: High accuracy tasks prefer premium models
	if (characteristics.accuracy === "premium" && modelGroup.premium) {
		return modelGroup.premium;
	}

	// Strategy 3: High complexity tasks prefer primary models
	if (characteristics.complexity === "high") {
		return modelGroup.primary;
	}

	// Strategy 4: Resource-constrained tasks prefer fallback
	if (characteristics.resource_constraint === "strict") {
		return modelGroup.fallback || modelGroup.primary;
	}

	// Default: Primary model
	return modelGroup.primary;
}

/**
 * Integration Points for each package
 */
export const INTEGRATION_POINTS = {
	agents: {
		codeIntelligence: [
			"Code analysis and suggestions",
			"Architecture recommendations",
			"Refactoring proposals",
			"Performance optimization",
		],
		reasoning: [
			"Task planning and decomposition",
			"Decision making under uncertainty",
			"Workflow optimization",
			"Resource allocation",
		],
		multimodal: [
			"UI/UX analysis from screenshots",
			"Diagram understanding",
			"Visual coordination",
			"Multi-modal task interpretation",
		],
	},
	orchestration: {
		coordinator: [
			"Complex multi-agent coordination",
			"Dynamic workflow adaptation",
			"Conflict resolution",
			"Performance optimization",
		],
		safety: [
			"Action validation before execution",
			"Content filtering",
			"Policy compliance checking",
			"Risk assessment",
		],
		planning: [
			"Task decomposition",
			"Resource planning",
			"Timeline estimation",
			"Dependency analysis",
		],
	},
	a2a: {
		embedding: [
			"Message semantic understanding",
			"Context-aware routing",
			"Similarity-based matching",
			"Knowledge retrieval",
		],
		reranking: [
			"Message priority scoring",
			"Response relevance ranking",
			"Quality-based ordering",
			"Context-aware prioritization",
		],
		communication: [
			"Agent-to-agent dialogue",
			"Status updates and notifications",
			"Simple query responses",
			"Protocol negotiations",
		],
	},
};

/**
 * Performance characteristics of each model type
 */
export const MODEL_PERFORMANCE_PROFILES = {
	"qwen3-coder:30b": {
		latency: "batch",
		accuracy: "premium",
		resource: "high",
	},
	"deepseek-coder:6.7b": {
		latency: "fast",
		accuracy: "high",
		resource: "moderate",
	},
	"phi4-mini-reasoning:latest": {
		latency: "realtime",
		accuracy: "high",
		resource: "low",
	},
	"phi4-mini-reasoning:3.8b": {
		latency: "realtime",
		accuracy: "sufficient",
		resource: "low",
	},
	"qwen2.5-vl": { latency: "fast", accuracy: "high", resource: "moderate" },
	"mixtral-8x7b": { latency: "batch", accuracy: "premium", resource: "high" },
	"qwen2.5-0.5b": {
		latency: "realtime",
		accuracy: "sufficient",
		resource: "low",
	},
	llama_guard: { latency: "fast", accuracy: "high", resource: "moderate" },
	"qwen3-4b": { latency: "fast", accuracy: "high", resource: "moderate" },
	"qwen3-0.6b": {
		latency: "realtime",
		accuracy: "sufficient",
		resource: "low",
	},
	"qwen3-8b": { latency: "batch", accuracy: "premium", resource: "high" },
	"qwen3-reranker": { latency: "fast", accuracy: "high", resource: "moderate" },
} as const;
