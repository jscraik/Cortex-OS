//! Provider client implementations

use anyhow::Result;
use serde_json::Value;

/// Generic provider client trait
pub trait ProviderClient: Send + Sync {
    async fn call(&self, request: Value) -> Result<Value>;
    async fn health_check(&self) -> Result<()>;
}

/// Basic HTTP client for providers
pub struct HttpProviderClient {
    base_url: String,
    api_key: Option<String>,
}

impl HttpProviderClient {
    pub fn new(base_url: String, api_key: Option<String>) -> Self {
        Self { base_url, api_key }
    }
}

impl ProviderClient for HttpProviderClient {
    async fn call(&self, _request: Value) -> Result<Value> {
        // Basic implementation - would normally make HTTP calls
        Ok(Value::Null)
    }

    async fn health_check(&self) -> Result<()> {
        Ok(())
    }
}
