use crate::error::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::process::Command;
use tokio::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelVerificationResult {
    pub name: String,
    pub path: String,
    pub exists: bool,
    pub accessible: bool,
    pub mlx_compatible: bool,
    pub size_mb: Option<u64>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInventory {
    pub mlx: Vec<MLXModel>,
    pub ollama: Vec<OllamaModel>,
    pub mlx_knife: Vec<MLXKnifeModel>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MLXModel {
    pub name: String,
    pub repo: Option<String>,
    pub ram_gb: f64,
    pub path: String,
    pub size_bytes: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaModel {
    pub name: String,
    pub tag: String,
    pub manifest_path: String,
    pub size_bytes: Option<u64>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MLXKnifeModel {
    pub name: String,
    pub id: String,
    pub size: String,
    pub modified: String,
}

pub struct ModelVerifier {
    inventory_path: String,
}

impl ModelVerifier {
    pub fn new(inventory_path: &str) -> Self {
        Self {
            inventory_path: inventory_path.to_string(),
        }
    }

    pub async fn load_inventory(&self) -> Result<ModelInventory> {
        let content = fs::read_to_string(&self.inventory_path).await?;
        let inventory: ModelInventory = serde_json::from_str(&content)?;
        Ok(inventory)
    }

    pub async fn verify_all_models(&self) -> Result<Vec<ModelVerificationResult>> {
        let inventory = self.load_inventory().await?;
        let mut results = Vec::new();

        // Verify MLX models
        for model in inventory.mlx {
            let result = self.verify_mlx_model(&model).await;
            results.push(result);
        }

        // Verify Ollama models
        for model in inventory.ollama {
            let result = self.verify_ollama_model(&model).await;
            results.push(result);
        }

        Ok(results)
    }

    pub async fn verify_mlx_model(&self, model: &MLXModel) -> ModelVerificationResult {
        let path = Path::new(&model.path);
        let exists = path.exists();
        let mut accessible = false;
        let mut mlx_compatible = false;
        let mut size_mb = None;
        let mut error = None;

        if exists {
            // Check if path is accessible
            accessible = self.check_path_accessible(&model.path).await;

            if accessible {
                // Get directory size
                if let Ok(size) = self.get_directory_size(&model.path).await {
                    size_mb = Some(size / 1024 / 1024); // Convert to MB
                }

                // Check MLX compatibility
                mlx_compatible = self.check_mlx_compatibility(&model.path).await;
            }
        } else {
            error = Some(format!("Model path does not exist: {}", model.path));
        }

        ModelVerificationResult {
            name: model.name.clone(),
            path: model.path.clone(),
            exists,
            accessible,
            mlx_compatible,
            size_mb,
            error,
        }
    }

    pub async fn verify_ollama_model(&self, model: &OllamaModel) -> ModelVerificationResult {
        let path = Path::new(&model.manifest_path);
        let exists = path.exists();
        let mut accessible = false;
        let mut size_mb = None;
        let mut error = None;

        if exists {
            accessible = self.check_path_accessible(&model.manifest_path).await;

            if accessible {
                if let Ok(size) = self.get_file_size(&model.manifest_path).await {
                    size_mb = Some(size / 1024 / 1024);
                }
            }
        } else {
            error = Some(format!("Ollama manifest does not exist: {}", model.manifest_path));
        }

        ModelVerificationResult {
            name: format!("{}:{}", model.name, model.tag),
            path: model.manifest_path.clone(),
            exists,
            accessible,
            mlx_compatible: false, // Ollama models aren't MLX compatible
            size_mb,
            error,
        }
    }

    async fn check_path_accessible(&self, path: &str) -> bool {
        match fs::metadata(path).await {
            Ok(_) => true,
            Err(_) => false,
        }
    }

    async fn get_directory_size(&self, path: &str) -> Result<u64> {
        let output = Command::new("du")
            .arg("-s")
            .arg("-b") // Size in bytes
            .arg(path)
            .output()?;

        if output.status.success() {
            let output_str = String::from_utf8_lossy(&output.stdout);
            let size_str = output_str.split_whitespace().next().unwrap_or("0");
            Ok(size_str.parse().unwrap_or(0))
        } else {
            Ok(0)
        }
    }

    async fn get_file_size(&self, path: &str) -> Result<u64> {
        let metadata = fs::metadata(path).await?;
        Ok(metadata.len())
    }

    async fn check_mlx_compatibility(&self, path: &str) -> bool {
        // Check for common MLX model files
        let mlx_files = [
            "config.json",
            "tokenizer.json",
            "weights.npz",
            "model.safetensors",
        ];

        for file in &mlx_files {
            let file_path = Path::new(path).join(file);
            if file_path.exists() {
                return true;
            }
        }

        // Check for subdirectories that might contain MLX files
        if let Ok(mut entries) = tokio::fs::read_dir(path).await {
            while let Ok(Some(entry)) = entries.next_entry().await {
                if entry.file_type().await.map(|t| t.is_dir()).unwrap_or(false) {
                    let subdir_path = entry.path();
                    for file in &mlx_files {
                        let file_path = subdir_path.join(file);
                        if file_path.exists() {
                            return true;
                        }
                    }
                }
            }
        }

        false
    }

    pub async fn get_working_models(&self) -> Result<Vec<String>> {
        let results = self.verify_all_models().await?;
        let working_models: Vec<String> = results
            .into_iter()
            .filter(|r| r.exists && r.accessible && (r.mlx_compatible || r.path.contains("ollama")))
            .map(|r| r.name)
            .collect();
        Ok(working_models)
    }

    pub async fn check_model_health(&self, model_name: &str) -> Result<bool> {
        let inventory = self.load_inventory().await?;

        // Find the model in MLX section
        if let Some(model) = inventory.mlx.iter().find(|m| m.name == model_name) {
            let result = self.verify_mlx_model(model).await;
            return Ok(result.exists && result.accessible && result.mlx_compatible);
        }

        // Find the model in Ollama section
        if let Some(model) = inventory.ollama.iter().find(|m| format!("{}:{}", m.name, m.tag) == model_name) {
            let result = self.verify_ollama_model(model).await;
            return Ok(result.exists && result.accessible);
        }

        Ok(false)
    }

    pub async fn generate_health_report(&self) -> Result<HashMap<String, ModelVerificationResult>> {
        let results = self.verify_all_models().await?;
        let mut report = HashMap::new();

        for result in results {
            report.insert(result.name.clone(), result);
        }

        Ok(report)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;
    use std::io::Write;

    #[tokio::test]
    async fn test_model_verifier_creation() {
        let verifier = ModelVerifier::new("/tmp/test-inventory.json");
        assert_eq!(verifier.inventory_path, "/tmp/test-inventory.json");
    }

    #[tokio::test]
    async fn test_check_path_accessible() {
        let verifier = ModelVerifier::new("");

        // Test with /tmp which should exist
        assert!(verifier.check_path_accessible("/tmp").await);

        // Test with non-existent path
        assert!(!verifier.check_path_accessible("/non/existent/path").await);
    }
}
