use crate::error::{ProviderError, Result};
use crate::providers::{ModelProvider, ResponseStream};
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;
use tokio_stream::{StreamExt, wrappers::UnboundedReceiverStream};
use futures::stream;

#[derive(Debug, Clone)]
pub struct OllamaProvider {
    base_url: String,
    model: String,
    client: Client,
}

#[derive(Debug, Serialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    stream: bool,
    options: OllamaOptions,
}

#[derive(Debug, Serialize)]
struct OllamaOptions {
    temperature: f32,
    top_p: f32,
    max_tokens: u32,
}

#[derive(Debug, Deserialize)]
struct OllamaResponse {
    response: String,
    done: bool,
}

#[derive(Debug, Deserialize)]
struct OllamaStreamResponse {
    response: String,
    done: bool,
}

impl OllamaProvider {
    pub fn new(base_url: String, model: String) -> Result<Self> {
        let client = Client::builder()
            .timeout(Duration::from_secs(300)) // 5 minute timeout for generation
            .build()
            .map_err(|e| ProviderError::Config(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self {
            base_url,
            model,
            client,
        })
    }

    pub fn with_default_model() -> Result<Self> {
        Self::new("http://localhost:11434".to_string(), "deepseek-coder:6.7b".to_string())
    }

    async fn check_ollama_running(&self) -> Result<bool> {
        match self.client.get(&format!("{}/api/tags", self.base_url)).send().await {
            Ok(response) => Ok(response.status().is_success()),
            Err(_) => Ok(false),
        }
    }

    async fn check_model_available(&self) -> Result<bool> {
        let response = self.client
            .get(&format!("{}/api/tags", self.base_url))
            .send()
            .await
            .map_err(|e| ProviderError::Api(format!("Failed to list models: {}", e)))?;

        if !response.status().is_success() {
            return Ok(false);
        }

        let models: serde_json::Value = response.json().await
            .map_err(|e| ProviderError::Api(format!("Failed to parse models response: {}", e)))?;

        if let Some(models_array) = models["models"].as_array() {
            for model in models_array {
                if let Some(name) = model["name"].as_str() {
                    if name.starts_with(&self.model) {
                        return Ok(true);
                    }
                }
            }
        }

        Ok(false)
    }
}

#[async_trait]
impl ModelProvider for OllamaProvider {
    fn provider_name(&self) -> &str {
        "ollama"
    }

    async fn complete(&self, prompt: &str) -> Result<String> {
        // Check if Ollama is running
        if !self.check_ollama_running().await? {
            return Err(ProviderError::Api(
                "Ollama is not running. Start with: ollama serve".to_string()
            ).into());
        }

        // Check if model is available
        if !self.check_model_available().await? {
            return Err(ProviderError::Api(
                format!("Model '{}' not found. Pull with: ollama pull {}", self.model, self.model)
            ).into());
        }

        let request = OllamaRequest {
            model: self.model.clone(),
            prompt: prompt.to_string(),
            stream: false,
            options: OllamaOptions {
                temperature: 0.7,
                top_p: 0.9,
                max_tokens: 2000,
            },
        };

        let response = self.client
            .post(&format!("{}/api/generate", self.base_url))
            .json(&request)
            .send()
            .await
            .map_err(|e| ProviderError::Api(format!("Failed to send request: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(ProviderError::Api(format!("Ollama API error: {}", error_text)).into());
        }

        let ollama_response: OllamaResponse = response.json().await
            .map_err(|e| ProviderError::Api(format!("Failed to parse response: {}", e)))?;

        Ok(ollama_response.response)
    }

    async fn stream(&self, prompt: &str) -> Result<ResponseStream> {
        // Check if Ollama is running
        if !self.check_ollama_running().await? {
            return Err(ProviderError::Api(
                "Ollama is not running. Start with: ollama serve".to_string()
            ).into());
        }

        // Check if model is available
        if !self.check_model_available().await? {
            return Err(ProviderError::Api(
                format!("Model '{}' not found. Pull with: ollama pull {}", self.model, self.model)
            ).into());
        }

        let request = OllamaRequest {
            model: self.model.clone(),
            prompt: prompt.to_string(),
            stream: true,
            options: OllamaOptions {
                temperature: 0.7,
                top_p: 0.9,
                max_tokens: 2000,
            },
        };

        let response = self.client
            .post(&format!("{}/api/generate", self.base_url))
            .json(&request)
            .send()
            .await
            .map_err(|e| ProviderError::Api(format!("Failed to send request: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(ProviderError::Api(format!("Ollama API error: {}", error_text)).into());
        }

        let stream = response.bytes_stream();
        let mapped_stream = stream.map(|chunk_result| {
            match chunk_result {
                Ok(bytes) => {
                    let text = String::from_utf8_lossy(&bytes);
                    // Parse each line as JSON
                    for line in text.lines() {
                        if !line.trim().is_empty() {
                            match serde_json::from_str::<OllamaStreamResponse>(line) {
                                Ok(response) => return Ok(response.response),
                                Err(_) => continue,
                            }
                        }
                    }
                    Ok(String::new())
                }
                Err(e) => Err(ProviderError::Api(format!("Stream error: {}", e)).into()),
            }
        });

        Ok(Box::pin(mapped_stream))
    }

    async fn health_check(&self) -> Result<bool> {
        self.check_ollama_running().await
    }

    fn supported_models(&self) -> Vec<String> {
        vec![
            "deepseek-coder:6.7b".to_string(),
            "gpt-oss:20b".to_string(),
            "qwen3-coder:30b".to_string(),
            "gemma3n:e4b".to_string(),
            "phi4-mini-reasoning:latest".to_string(),
            "nomic-embed-text:v1.5".to_string(),
            "granite-embedding:278m".to_string(),
        ]
    }
}

impl Default for OllamaProvider {
    fn default() -> Self {
        Self::with_default_model().expect("Failed to create default Ollama provider")
    }
}
