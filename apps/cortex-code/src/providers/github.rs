use crate::config::GitHubModelsConfig;
use crate::error::{ProviderError, Result};
use crate::providers::{ModelProvider, ResponseStream};
use async_trait::async_trait;
use futures::StreamExt;
use reqwest::{header, Client};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct GitHubModelsProvider {
    client: Client,
    config: GitHubModelsConfig,
}

#[derive(Debug, Serialize)]
struct CompletionRequest {
    model: String,
    messages: Vec<Message>,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct CompletionResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    message: Option<AssistantMessage>,
    delta: Option<Delta>,
}

#[derive(Debug, Deserialize)]
struct AssistantMessage {
    content: String,
}

#[derive(Debug, Deserialize)]
struct Delta {
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ErrorResponse {
    error: ErrorDetail,
}

#[derive(Debug, Deserialize)]
struct ErrorDetail {
    message: String,
}

impl GitHubModelsProvider {
    pub fn new(config: &GitHubModelsConfig) -> Result<Self> {
        let mut headers = header::HeaderMap::new();
        headers.insert("Accept", "application/vnd.github+json".parse().unwrap());
        headers.insert("X-GitHub-Api-Version", "2022-11-28".parse().unwrap());
        
        // Use GitHub token from environment or config
        let token = config.token.clone()
            .or_else(|| std::env::var("GITHUB_TOKEN").ok())
            .ok_or_else(|| ProviderError::NotConfigured("GitHub token not found".to_string()))?;
        
        let auth_header = format!("Bearer {}", token);
        headers.insert("Authorization", auth_header.parse().unwrap());
        
        let client = Client::builder()
            .default_headers(headers)
            .build()
            .map_err(|e| ProviderError::Api(format!("Failed to create HTTP client: {}", e)))?;
        
        Ok(Self {
            client,
            config: config.clone(),
        })
    }
}

#[async_trait]
impl ModelProvider for GitHubModelsProvider {
    fn provider_name(&self) -> &str {
        "github-models"
    }
    
    async fn complete(&self, prompt: &str) -> Result<String> {
        let request = CompletionRequest {
            model: self.config.model.clone(),
            messages: vec![
                Message {
                    role: "system".to_string(),
                    content: "You are Cortex AI, a helpful coding assistant.".to_string(),
                },
                Message {
                    role: "user".to_string(),
                    content: prompt.to_string(),
                },
            ],
            stream: false,
            temperature: Some(0.7),
            max_tokens: Some(1000),
        };
        
        let url = format!("{}/inference/chat/completions", self.config.endpoint);
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await
            .map_err(|e| ProviderError::Api(format!("Request failed: {}", e)))?;
        
        let status = response.status();
        if status == 429 {
            return Err(ProviderError::RateLimited.into());
        } else if status == 401 {
            return Err(ProviderError::AuthFailed.into());
        } else if !status.is_success() {
            let error: ErrorResponse = response.json().await
                .map_err(|e| ProviderError::Api(format!("Failed to parse error: {}", e)))?;
            return Err(ProviderError::Api(error.error.message).into());
        }
        
        let completion: CompletionResponse = response.json().await
            .map_err(|e| ProviderError::Api(format!("Failed to parse response: {}", e)))?;
        
        completion.choices
            .first()
            .and_then(|choice| choice.message.as_ref())
            .map(|msg| msg.content.clone())
            .ok_or_else(|| ProviderError::Api("No content in response".to_string()).into())
    }
    
    async fn stream(&self, prompt: &str) -> Result<ResponseStream> {
        let request = CompletionRequest {
            model: self.config.model.clone(),
            messages: vec![
                Message {
                    role: "system".to_string(),
                    content: "You are Cortex AI, a helpful coding assistant.".to_string(),
                },
                Message {
                    role: "user".to_string(),
                    content: prompt.to_string(),
                },
            ],
            stream: true,
            temperature: Some(0.7),
            max_tokens: Some(1000),
        };
        
        let url = format!("{}/inference/chat/completions", self.config.endpoint);
        let response = self.client
            .post(&url)
            .json(&request)
            .send()
            .await
            .map_err(|e| ProviderError::Api(format!("Request failed: {}", e)))?;
        
        if !response.status().is_success() {
            return Err(ProviderError::Api(format!("HTTP {}", response.status())).into());
        }
        
        let stream = response.bytes_stream()
            .map(|chunk| {
                let chunk = chunk.map_err(|e| ProviderError::Api(format!("Stream error: {}", e)))?;
                let text = String::from_utf8_lossy(&chunk);
                
                // Parse SSE format
                for line in text.lines() {
                    if line.starts_with("data: ") {
                        let data = &line[6..]; // Remove "data: " prefix
                        if data == "[DONE]" {
                            continue;
                        }
                        
                        if let Ok(chunk_response) = serde_json::from_str::<CompletionResponse>(data) {
                            if let Some(choice) = chunk_response.choices.first() {
                                if let Some(delta) = &choice.delta {
                                    if let Some(content) = &delta.content {
                                        return Ok(content.clone());
                                    }
                                }
                            }
                        }
                    }
                }
                
                Ok(String::new())
            })
            .filter(|result| {
                // Filter out empty strings
                match result {
                    Ok(s) => futures::future::ready(!s.is_empty()),
                    Err(_) => futures::future::ready(true),
                }
            });
        
        Ok(Box::pin(stream))
    }
    
    fn supported_models(&self) -> Vec<String> {
        vec![
            "openai/gpt-4o-mini".to_string(),
            "openai/gpt-4o".to_string(),
            "anthropic/claude-3-5-sonnet".to_string(),
        ]
    }
}