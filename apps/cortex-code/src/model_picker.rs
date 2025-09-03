use crate::config::Config;
use crate::error::{ProviderError, Result};
use crate::model_verification::ModelVerifier;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::Path;
use tracing::{info, warn};

/// Task categories for model selection
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum TaskType {
    /// Code generation, refactoring, debugging
    Coding,
    /// Text embedding and similarity
    Embedding,
    /// Document reranking and search
    Reranking,
    /// General chat and conversation
    Chat,
    /// Complex reasoning and analysis
    Reasoning,
    /// Image and multimodal tasks
    Multimodal,
    /// Small, quick tasks
    Quick,
}

/// Model capability and performance characteristics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelCapabilities {
    pub max_tokens: u32,
    pub context_window: u32,
    pub memory_gb: f32,
    pub task_types: Vec<TaskType>,
    pub quality_score: f32, // 0.0 to 1.0
    pub speed_score: f32,   // 0.0 to 1.0 (higher = faster)
    pub cost_score: f32,    // 0.0 to 1.0 (higher = more expensive)
}

/// External model from inventory
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExternalModel {
    pub name: String,
    pub path: String,
    pub ram_gb: f32,
    pub repo: Option<String>,
    pub provider_type: String, // "mlx" or "ollama"
}

/// Model inventory from external SSD
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInventory {
    pub mlx: Vec<ExternalModel>,
    pub ollama: Vec<ExternalModel>,
}

/// Model selection criteria
#[derive(Debug, Clone)]
pub struct SelectionCriteria {
    pub task_type: TaskType,
    pub max_memory_gb: Option<f32>,
    pub prefer_speed: bool,
    pub prefer_quality: bool,
    pub allow_cloud: bool,
}

/// Selected model with provider information
#[derive(Debug, Clone)]
pub struct SelectedModel {
    pub name: String,
    pub provider: String,
    pub model_path: Option<String>,
    pub base_url: Option<String>,
    pub capabilities: ModelCapabilities,
    pub selection_reason: String,
}

pub struct ModelPicker {
    config: Config,
    inventory: Option<ModelInventory>,
    model_capabilities: HashMap<String, ModelCapabilities>,
    verifier: ModelVerifier,
}

impl ModelPicker {
    pub fn new(config: Config) -> Result<Self> {
        let external_inventory_path = resolve_data_path(
            "CORTEX_EXTERNAL_MODEL_INVENTORY",
            "data/external-ssd-model-inventory.json",
        );
        let verifier = ModelVerifier::new(&external_inventory_path);

        let mut picker = Self {
            config,
            inventory: None,
            model_capabilities: HashMap::new(),
            verifier,
        };

        picker.load_coding_models_inventory()?;
        picker.initialize_model_capabilities();

        Ok(picker)
    }

    fn load_coding_models_inventory(&mut self) -> Result<()> {
        let inventory_path = resolve_data_path(
            "CORTEX_CODING_MODELS_INVENTORY",
            "data/coding-models-inventory.json",
        );

    if !Path::new(&inventory_path).exists() {
            warn!("Coding models inventory not found at {}", inventory_path);
            return Ok(());
        }

        let content = fs::read_to_string(inventory_path)
            .map_err(|e| ProviderError::Config(format!("Failed to read coding models inventory: {}", e)))?;

        let raw_inventory: serde_json::Value = serde_json::from_str(&content)
            .map_err(|e| ProviderError::Config(format!("Failed to parse coding models inventory: {}", e)))?;

        // Convert raw inventory to our format
        let mut inventory = ModelInventory {
            mlx: Vec::new(),
            ollama: Vec::new(),
        };

        // Process MLX coding models (4 priority models)
        if let Some(mlx_models) = raw_inventory["coding_models_mlx"].as_array() {
            for model in mlx_models {
                if let (Some(name), Some(path), Some(ram_gb)) = (
                    model["name"].as_str(),
                    model["path"].as_str(),
                    model["ram_gb"].as_f64(),
                ) {
                    inventory.mlx.push(ExternalModel {
                        name: name.to_string(),
                        path: path.to_string(),
                        ram_gb: ram_gb as f32,
                        repo: model["repo"].as_str().map(|s| s.to_string()),
                        provider_type: "mlx".to_string(),
                    });
                }
            }
        }

        // Process Ollama coding models (4 priority models)
        if let Some(ollama_models) = raw_inventory["coding_models_ollama"].as_array() {
            for model in ollama_models {
                if let (Some(name), Some(ram_gb)) = (
                    model["name"].as_str(),
                    model["ram_gb"].as_f64(),
                ) {
                    inventory.ollama.push(ExternalModel {
                        name: name.to_string(),
                        path: "".to_string(), // Ollama doesn't use paths
                        ram_gb: ram_gb as f32,
                        repo: None,
                        provider_type: "ollama".to_string(),
                    });
                }
            }
        }

        info!("Loaded {} MLX models and {} Ollama models from coding inventory",
              inventory.mlx.len(),
              inventory.ollama.len());

        self.inventory = Some(inventory);
        Ok(())
    }

    fn initialize_model_capabilities(&mut self) {
        // Define capabilities for the 4 priority coding models
        let mut capabilities = HashMap::new();

        // Priority 1: GLM-4.5-mlx-4Bit - Best general coding model
        capabilities.insert("GLM-4.5-mlx-4Bit".to_string(), ModelCapabilities {
            max_tokens: 8192,
            context_window: 32768,
            memory_gb: 8.0,
            task_types: vec![TaskType::Coding, TaskType::Reasoning, TaskType::Chat, TaskType::Multimodal],
            quality_score: 0.92,
            speed_score: 0.88,
            cost_score: 0.0, // Free local
        });

        // Priority 2: qwen3-coder-7b-mlx - Specialized coding model
        capabilities.insert("qwen3-coder-7b-mlx".to_string(), ModelCapabilities {
            max_tokens: 4096,
            context_window: 16384,
            memory_gb: 8.0,
            task_types: vec![TaskType::Coding, TaskType::Quick],
            quality_score: 0.85,
            speed_score: 0.95,
            cost_score: 0.0,
        });

        // Priority 3: Qwen3-Coder-30B-A3B-Instruct-4bit - Large coding model
        capabilities.insert("Qwen3-Coder-30B-A3B-Instruct-4bit".to_string(), ModelCapabilities {
            max_tokens: 8192,
            context_window: 32768,
            memory_gb: 17.0,
            task_types: vec![TaskType::Coding, TaskType::Reasoning],
            quality_score: 0.94,
            speed_score: 0.75,
            cost_score: 0.0,
        });

        // Priority 4: gpt-oss-20b-8bit-mlx - Advanced coding model
        capabilities.insert("gpt-oss-20b-8bit-mlx".to_string(), ModelCapabilities {
            max_tokens: 8192,
            context_window: 8192,
            memory_gb: 24.0,
            task_types: vec![TaskType::Coding, TaskType::Reasoning],
            quality_score: 0.90,
            speed_score: 0.70,
            cost_score: 0.0,
        });

        // Ollama Priority Models (fallback from MLX)
        // Priority 1: deepseek-coder:6.7b - Primary Ollama coding model
        capabilities.insert("deepseek-coder:6.7b".to_string(), ModelCapabilities {
            max_tokens: 4096,
            context_window: 16384,
            memory_gb: 8.0,
            task_types: vec![TaskType::Coding, TaskType::Quick],
            quality_score: 0.83,
            speed_score: 0.90,
            cost_score: 0.0,
        });

        // Priority 2: qwen3-coder:30b - Large Ollama coding model
        capabilities.insert("qwen3-coder:30b".to_string(), ModelCapabilities {
            max_tokens: 8192,
            context_window: 32768,
            memory_gb: 18.0,
            task_types: vec![TaskType::Coding, TaskType::Reasoning],
            quality_score: 0.87,
            speed_score: 0.65,
            cost_score: 0.0,
        });

        // Priority 3: gpt-oss:20b - Advanced Ollama model
        capabilities.insert("gpt-oss:20b".to_string(), ModelCapabilities {
            max_tokens: 8192,
            context_window: 8192,
            memory_gb: 15.0,
            task_types: vec![TaskType::Coding, TaskType::Reasoning],
            quality_score: 0.85,
            speed_score: 0.70,
            cost_score: 0.0,
        });

        // Priority 4: phi4-mini-reasoning:latest - Fast Ollama model
        capabilities.insert("phi4-mini-reasoning:latest".to_string(), ModelCapabilities {
            max_tokens: 2048,
            context_window: 4096,
            memory_gb: 4.0,
            task_types: vec![TaskType::Quick, TaskType::Reasoning],
            quality_score: 0.75,
            speed_score: 0.95,
            cost_score: 0.0,
        });

        // Fallback cloud models (only if local models fail)
        capabilities.insert("gpt-4o-mini".to_string(), ModelCapabilities {
            max_tokens: 4096,
            context_window: 128000,
            memory_gb: 0.0,
            task_types: vec![TaskType::Coding, TaskType::Quick, TaskType::Chat],
            quality_score: 0.85,
            speed_score: 0.8,
            cost_score: 0.3,
        });

        capabilities.insert("claude-3-sonnet".to_string(), ModelCapabilities {
            max_tokens: 4096,
            context_window: 200000,
            memory_gb: 0.0,
            task_types: vec![TaskType::Reasoning, TaskType::Chat, TaskType::Coding],
            quality_score: 0.92,
            speed_score: 0.75,
            cost_score: 0.8,
        });

        self.model_capabilities = capabilities;

        // Debug: Log all capability keys
        info!("Model capabilities initialized for {} models", self.model_capabilities.len());
        for key in self.model_capabilities.keys() {
            info!("Capability key: {}", key);
        }
    }

    pub fn select_best_model(&self, criteria: SelectionCriteria) -> Result<SelectedModel> {
        // Priority order for coding AI CLI: MLX > Ollama > Cloud APIs
        let coding_model_priority = vec![
            "GLM-4.5-mlx-4Bit",
            "qwen3-coder-7b-mlx",
            "Qwen3-Coder-30B-A3B-Instruct-4bit",
            "gpt-oss-20b-8bit-mlx",
        ];

        // Try MLX models first (priority 1-4)
        for model_name in &coding_model_priority {
            if let Some(caps) = self.model_capabilities.get(*model_name) {
                if self.matches_criteria(caps, &criteria) {
                    // Check if model is available on disk
                    if let Some(model_path) = self.get_mlx_model_path(model_name) {
                        let selection_reason = format!(
                            "Selected {} (MLX) - priority coding model (quality: {:.2}, speed: {:.2})",
                            model_name, caps.quality_score, caps.speed_score
                        );

                        info!("{}", selection_reason);

                        return Ok(SelectedModel {
                            name: model_name.to_string(),
                            provider: "mlx".to_string(),
                            model_path: Some(model_path),
                            base_url: Some("http://localhost:8081".to_string()),
                            capabilities: caps.clone(),
                            selection_reason,
                        });
                    }
                }
            }
        }

        // Fallback to Ollama models if MLX not available
        let ollama_model_priority = vec![
            "deepseek-coder:6.7b",
            "qwen3-coder:30b",
            "gpt-oss:20b",
            "phi4-mini-reasoning:latest",
        ];

        for model_name in &ollama_model_priority {
            if let Some(caps) = self.model_capabilities.get(*model_name) {
                if self.matches_criteria(caps, &criteria) {
                    let selection_reason = format!(
                        "Selected {} (Ollama) - MLX fallback (quality: {:.2}, speed: {:.2})",
                        model_name, caps.quality_score, caps.speed_score
                    );

                    info!("{}", selection_reason);

                    return Ok(SelectedModel {
                        name: model_name.to_string(),
                        provider: "ollama".to_string(),
                        model_path: None,
                        base_url: Some("http://localhost:11434".to_string()),
                        capabilities: caps.clone(),
                        selection_reason,
                    });
                }
            }
        }

        // Final fallback to cloud models if allowed
        if criteria.allow_cloud {
            let cloud_models = vec![
                ("gpt-4o-mini", "github"),
                ("gpt-4o", "openai"),
                ("claude-3-haiku", "anthropic"),
            ];

            for (model_name, provider) in &cloud_models {
                if let Some(caps) = self.model_capabilities.get(*model_name) {
                    if self.matches_criteria(caps, &criteria) {
                        let selection_reason = format!(
                            "Selected {} ({}) - cloud fallback (quality: {:.2})",
                            model_name, provider, caps.quality_score
                        );

                        warn!("Using cloud model as local models unavailable");

                        return Ok(SelectedModel {
                            name: model_name.to_string(),
                            provider: provider.to_string(),
                            model_path: None,
                            base_url: self.get_provider_base_url(provider),
                            capabilities: caps.clone(),
                            selection_reason,
                        });
                    }
                }
            }
        }

        Err(ProviderError::NotConfigured(
            format!("No suitable model found for task: {:?}. Try installing MLX models.", criteria.task_type)
        ).into())
    }

    fn get_mlx_model_path(&self, model_name: &str) -> Option<String> {
        // Load the coding models inventory to get exact paths
        let coding_inventory_path = resolve_data_path(
            "CORTEX_CODING_MODELS_INVENTORY",
            "data/coding-models-inventory.json",
        );
    if let Ok(content) = fs::read_to_string(&coding_inventory_path) {
            if let Ok(inventory) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(models) = inventory.get("coding_models_mlx").and_then(|v| v.as_array()) {
                    for model in models {
                        if let Some(name) = model.get("name").and_then(|v| v.as_str()) {
                            if name == model_name {
                                if let Some(path) = model.get("path").and_then(|v| v.as_str()) {
                                    if Path::new(path).exists() {
                                        return Some(path.to_string());
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        None
    }

    fn matches_criteria(&self, caps: &ModelCapabilities, criteria: &SelectionCriteria) -> bool {
        // Check if model supports the task type
        if !caps.task_types.contains(&criteria.task_type) {
            return false;
        }

        // Check memory constraints
        if let Some(max_memory) = criteria.max_memory_gb {
            if caps.memory_gb > 0.0 && caps.memory_gb > max_memory {
                return false;
            }
        }

        true
    }

    fn calculate_score(&self, caps: &ModelCapabilities, criteria: &SelectionCriteria) -> f32 {
        let mut score = 0.0;

        // Base quality score
        score += caps.quality_score * 0.4;

        // Speed preference
        if criteria.prefer_speed {
            score += caps.speed_score * 0.4;
        } else {
            score += caps.speed_score * 0.2;
        }

        // Quality preference
        if criteria.prefer_quality {
            score += caps.quality_score * 0.3;
        }

        // Cost penalty (lower cost is better)
        score += (1.0 - caps.cost_score) * 0.3;

        // Memory efficiency bonus
        if caps.memory_gb > 0.0 && caps.memory_gb < 8.0 {
            score += 0.1; // Bonus for efficient models
        }

        score
    }

    fn get_model_capabilities(&self, model_name: &str) -> Option<ModelCapabilities> {
        self.model_capabilities.get(model_name).cloned()
    }

    fn get_provider_base_url(&self, provider: &str) -> Option<String> {
        self.config.providers.config.get(provider)
            .and_then(|config| config.base_url.clone())
    }

    pub fn list_available_models(&self) -> Vec<(String, String, Vec<TaskType>)> {
        let mut models = Vec::new();

        // Add MLX models
        if let Some(inventory) = &self.inventory {
            for model in &inventory.mlx {
                if let Some(caps) = self.get_model_capabilities(&model.name) {
                    models.push((model.name.clone(), "mlx".to_string(), caps.task_types));
                }
            }

            // Add Ollama models
            for model in &inventory.ollama {
                if let Some(caps) = self.get_model_capabilities(&model.name) {
                    models.push((model.name.clone(), "ollama".to_string(), caps.task_types));
                }
            }
        }

        // Add cloud models
        for (provider, config) in &self.config.providers.config {
            if let Some(model_names) = &config.models {
                for model_name in model_names {
                    if let Some(caps) = self.model_capabilities.get(model_name) {
                        models.push((model_name.clone(), provider.clone(), caps.task_types.clone()));
                    }
                }
            }
        }

        models
    }

    pub fn get_model_info(&self, model_name: &str) -> Option<(String, ModelCapabilities)> {
        // Check external models first
        if let Some(inventory) = &self.inventory {
            for model in &inventory.mlx {
                if model.name == model_name {
                    return self.get_model_capabilities(&model.name)
                        .map(|caps| ("mlx".to_string(), caps));
                }
            }
            for model in &inventory.ollama {
                if model.name == model_name {
                    return self.get_model_capabilities(&model.name)
                        .map(|caps| ("ollama".to_string(), caps));
                }
            }
        }

        // Check cloud models
        for (provider, config) in &self.config.providers.config {
            if let Some(models) = &config.models {
                if models.contains(&model_name.to_string()) {
                    return self.model_capabilities.get(model_name)
                        .map(|caps| (provider.clone(), caps.clone()));
                }
            }
        }

        None
    }

    /// Verify all models and return health status
    pub async fn verify_all_models(&self) -> Result<std::collections::HashMap<String, bool>> {
        let verification_results = self.verifier.verify_all_models().await?;
        let mut health_status = std::collections::HashMap::new();

        for result in verification_results {
            let is_healthy = result.exists && result.accessible &&
                (result.mlx_compatible || result.path.contains("ollama"));
            health_status.insert(result.name, is_healthy);
        }

        Ok(health_status)
    }

    /// Check if a specific model is installed and working
    pub async fn is_model_available(&self, model_name: &str) -> bool {
        match self.verifier.check_model_health(model_name).await {
            Ok(healthy) => healthy,
            Err(_) => false,
        }
    }

    /// Generate a health report for all models
    pub async fn generate_health_report(&self) -> Result<String> {
        let results = self.verifier.verify_all_models().await?;
        let mut report = String::new();

        report.push_str("=== Model Health Report ===\n\n");

        let mut mlx_count = 0;
        let mut mlx_working = 0;
        let mut ollama_count = 0;
        let mut ollama_working = 0;

        for result in &results {
            let status = if result.exists && result.accessible {
                if result.mlx_compatible || result.path.contains("ollama") {
                    if result.path.contains("ollama") {
                        ollama_working += 1;
                    } else {
                        mlx_working += 1;
                    }
                    "✅ Working"
                } else {
                    "⚠️  Accessible but may have issues"
                }
            } else if result.exists {
                "❌ Not accessible"
            } else {
                "❌ Not found"
            };

            if result.path.contains("ollama") {
                ollama_count += 1;
            } else {
                mlx_count += 1;
            }

            report.push_str(&format!("📦 {}: {}\n", result.name, status));
            report.push_str(&format!("   Path: {}\n", result.path));
            if let Some(size) = result.size_mb {
                report.push_str(&format!("   Size: {} MB\n", size));
            }
            if let Some(error) = &result.error {
                report.push_str(&format!("   Error: {}\n", error));
            }
            report.push_str("\n");
        }

        report.push_str(&format!("\n=== Summary ===\n"));
        report.push_str(&format!("MLX Models: {}/{} working\n", mlx_working, mlx_count));
        report.push_str(&format!("Ollama Models: {}/{} working\n", ollama_working, ollama_count));
        report.push_str(&format!("Total Working: {}/{}\n", mlx_working + ollama_working, mlx_count + ollama_count));

        Ok(report)
    }

    /// Create optimal selection criteria for coding tasks
    pub fn create_coding_criteria() -> SelectionCriteria {
        SelectionCriteria {
            task_type: TaskType::Coding,
            max_memory_gb: Some(32.0), // Allow up to 32GB models
            prefer_speed: true,        // Prioritize fast local models
            prefer_quality: true,      // But don't sacrifice too much quality
            allow_cloud: false,        // Prefer local models for coding
        }
    }

    /// Create selection criteria for quick tasks
    pub fn create_quick_criteria() -> SelectionCriteria {
        SelectionCriteria {
            task_type: TaskType::Quick,
            max_memory_gb: Some(8.0),  // Limit to smaller models
            prefer_speed: true,
            prefer_quality: false,     // Speed over quality for quick tasks
            allow_cloud: false,
        }
    }

    /// Create selection criteria that allows cloud fallback
    pub fn create_coding_criteria_with_cloud() -> SelectionCriteria {
        SelectionCriteria {
            task_type: TaskType::Coding,
            max_memory_gb: Some(32.0),
            prefer_speed: true,
            prefer_quality: true,
            allow_cloud: true,         // Allow cloud fallback
        }
    }
}

// Resolve a data file path with the following precedence:
// 1) Environment variable override
// 2) $HOME/.Cortex-OS/<default_rel>
fn resolve_data_path(env_key: &str, default_rel: &str) -> String {
    if let Ok(p) = env::var(env_key) {
        return p;
    }
    if let Ok(home) = env::var("HOME") {
        return format!("{}/.Cortex-OS/{}", home, default_rel);
    }
    // Fallback to relative path if HOME is not set (rare)
    default_rel.to_string()
}

// Helper function to determine task type from prompt
pub fn infer_task_type(prompt: &str) -> TaskType {
    let prompt_lower = prompt.to_lowercase();

    // Coding keywords
    if prompt_lower.contains("code") || prompt_lower.contains("function") ||
       prompt_lower.contains("debug") || prompt_lower.contains("refactor") ||
       prompt_lower.contains("implement") || prompt_lower.contains("fix") {
        return TaskType::Coding;
    }

    // Embedding keywords
    if prompt_lower.contains("similar") || prompt_lower.contains("embed") ||
       prompt_lower.contains("vector") || prompt_lower.contains("search") {
        return TaskType::Embedding;
    }

    // Reasoning keywords
    if prompt_lower.contains("analyze") || prompt_lower.contains("explain") ||
       prompt_lower.contains("reason") || prompt_lower.contains("think") ||
       prompt_lower.contains("complex") || prompt_lower.contains("problem") {
        return TaskType::Reasoning;
    }

    // Quick task indicators: only very short prompts or explicit quick/simple hints
    if prompt.len() < 15 || prompt_lower.contains("quick") || prompt_lower.contains("simple") {
        return TaskType::Quick;
    }

    // Default to chat
    TaskType::Chat
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_type_inference() {
        assert_eq!(infer_task_type("Write a function to sort an array"), TaskType::Coding);
        assert_eq!(infer_task_type("Find similar documents"), TaskType::Embedding);
        assert_eq!(infer_task_type("Analyze this complex problem"), TaskType::Reasoning);
        assert_eq!(infer_task_type("Hi"), TaskType::Quick);
        assert_eq!(infer_task_type("How are you today?"), TaskType::Chat);
    }

    #[test]
    fn test_model_selection_criteria() {
        let criteria = SelectionCriteria {
            task_type: TaskType::Coding,
            max_memory_gb: Some(8.0),
            prefer_speed: true,
            prefer_quality: false,
            allow_cloud: false,
        };

        let caps = ModelCapabilities {
            max_tokens: 4096,
            context_window: 32768,
            memory_gb: 7.0,
            task_types: vec![TaskType::Coding],
            quality_score: 0.8,
            speed_score: 0.9,
            cost_score: 0.0,
        };

        // Should match since memory is under limit and supports coding
        assert!(caps.task_types.contains(&criteria.task_type));
        assert!(caps.memory_gb <= criteria.max_memory_gb.unwrap());
    }
}
