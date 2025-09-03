use crate::error::{ProviderError, Result};
use crate::providers::{ModelProvider, ResponseStream};
use async_trait::async_trait;
use std::process::Command;
use tokio::process::Command as TokioCommand;
use tokio::io::{AsyncBufReadExt, BufReader};

#[derive(Debug, Clone)]
pub struct LocalMLXProvider {
    model_path: Option<String>,
    model_name: String,
}

impl LocalMLXProvider {
    pub fn new() -> Result<Self> {
        // Don't fail during initialization - check availability later
        Ok(Self {
            model_path: None,
            model_name: "mlx-community/Llama-3.1-8B-Instruct".to_string(),
        })
    }

    pub fn with_model_path(model_path: String, model_name: String) -> Result<Self> {
        // Don't fail during initialization - check availability later
        Ok(Self {
            model_path: Some(model_path),
            model_name,
        })
    }
}

#[async_trait]
impl ModelProvider for LocalMLXProvider {
    fn provider_name(&self) -> &str {
    "mlx"
    }

    async fn complete(&self, prompt: &str) -> Result<String> {
        // Check if MLX is available
        if !self.is_mlx_available().await {
            return Err(ProviderError::Api(
                "MLX not found. Install with: pip install mlx-lm".to_string()
            ).into());
        }

        // Create secure Python script
        let model_path = self.model_path.as_ref()
            .map(|p| p.as_str())
            .unwrap_or("mlx-community/Llama-3.1-8B-Instruct");

        let script = format!(r#"
import sys
from mlx_lm import load, generate

# Read prompt from stdin
prompt = sys.stdin.read()
model, tokenizer = load('{}')
response = generate(model, tokenizer, prompt, verbose=False, max_tokens=2000)
print(response)
"#, model_path);

        let mut child = TokioCommand::new("python")
            .arg("-c")
            .arg(script)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| ProviderError::Api(format!("Failed to spawn MLX process: {}", e)))?;

        // Write prompt to stdin
        if let Some(stdin) = child.stdin.take() {
            use tokio::io::AsyncWriteExt;
            let mut stdin = tokio::io::BufWriter::new(stdin);
            stdin.write_all(prompt.as_bytes()).await
                .map_err(|e| ProviderError::Api(format!("Failed to write prompt: {}", e)))?;
            stdin.flush().await
                .map_err(|e| ProviderError::Api(format!("Failed to flush stdin: {}", e)))?;
        }

        let cmd = child.wait_with_output().await
            .map_err(|e| ProviderError::Api(format!("Failed to run MLX: {}", e)))?;

        if !cmd.status.success() {
            let stderr = String::from_utf8_lossy(&cmd.stderr);
            return Err(ProviderError::Api(
                format!("MLX error: {}", stderr)
            ).into());
        }

        let output = String::from_utf8_lossy(&cmd.stdout);
        let response = output.trim();

        Ok(response.to_string())
    }

    async fn stream(&self, prompt: &str) -> Result<ResponseStream> {
        // Check if MLX is available
        if !self.is_mlx_available().await {
            return Err(ProviderError::Api(
                "MLX not found. Install with: pip install mlx-lm".to_string()
            ).into());
        }

        // Create secure Python script for streaming
        let model_path = self.model_path.as_ref()
            .map(|p| p.as_str())
            .unwrap_or("mlx-community/Llama-3.1-8B-Instruct");

        let script = format!(r#"
import sys
from mlx_lm import load, generate

# Read prompt from stdin
prompt = sys.stdin.read()
model, tokenizer = load('{}')
for token in generate(model, tokenizer, prompt, verbose=False, max_tokens=2000):
    sys.stdout.write(token)
    sys.stdout.flush()
"#, model_path);

        let mut child = TokioCommand::new("python")
            .arg("-c")
            .arg(script)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| ProviderError::Api(format!("Failed to spawn MLX streaming process: {}", e)))?;

        // Write prompt to stdin
        if let Some(stdin) = child.stdin.take() {
            use tokio::io::AsyncWriteExt;
            let mut stdin = tokio::io::BufWriter::new(stdin);
            stdin.write_all(prompt.as_bytes()).await
                .map_err(|e| ProviderError::Api(format!("Failed to write prompt: {}", e)))?;
            stdin.flush().await
                .map_err(|e| ProviderError::Api(format!("Failed to flush stdin: {}", e)))?;
        }

        let stdout = child.stdout.take()
            .ok_or_else(|| ProviderError::Api("Failed to get MLX stdout".to_string()))?;

        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();

        let stream = async_stream::stream! {
            while let Some(line_result) = lines.next_line().await.transpose() {
                match line_result {
                    Ok(line) => yield Ok(line),
                    Err(e) => yield Err(ProviderError::Api(format!("MLX stream error: {}", e)).into()),
                }
            }
        };

        Ok(Box::pin(stream))
    }

    fn supported_models(&self) -> Vec<String> {
        vec![
            // Priority coding models
            "GLM-4.5-mlx-4Bit".to_string(),
            "qwen3-coder-7b-mlx".to_string(),
            "Qwen3-Coder-30B-A3B-Instruct-4bit".to_string(),
            "gpt-oss-20b-8bit-mlx".to_string(),
        ]
    }
}

impl LocalMLXProvider {
    async fn is_mlx_available(&self) -> bool {
        // Check if Python and mlx_lm are available
        let python_check = Command::new("python")
            .arg("-c")
            .arg("import mlx_lm")
            .output();

        match python_check {
            Ok(output) => output.status.success(),
            Err(_) => {
                // Try python3 as well
                let python3_check = Command::new("python3")
                    .arg("-c")
                    .arg("import mlx_lm")
                    .output();

                match python3_check {
                    Ok(output) => output.status.success(),
                    Err(_) => false,
                }
            }
        }
    }
}
