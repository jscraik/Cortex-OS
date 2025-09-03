use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs;

/// RAG Integration module for semantic code search and context management
/// Integrates with Cortex-OS RAG pipeline for enhanced memory capabilities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RagIntegration {
    pub enabled: bool,
    pub cortex_os_endpoint: String,
    pub embedding_model: String,
    pub vector_store_path: PathBuf,
    pub chunk_size: usize,
    pub chunk_overlap: usize,
    pub similarity_threshold: f32,
    pub max_results: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeContext {
    pub file_path: String,
    pub line_range: (usize, usize),
    pub content: String,
    pub language: String,
    pub embedding: Option<Vec<f32>>,
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticSearchQuery {
    pub query: String,
    pub language_filter: Option<String>,
    pub file_pattern: Option<String>,
    pub max_results: Option<usize>,
    pub threshold: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticSearchResult {
    pub context: CodeContext,
    pub similarity_score: f32,
    pub relevance_explanation: String,
}

impl Default for RagIntegration {
    fn default() -> Self {
        Self {
            enabled: false,
            cortex_os_endpoint: "http://localhost:8080/rag".to_string(),
            embedding_model: "text-embedding-3-small".to_string(),
            vector_store_path: PathBuf::from(".cortex/vectorstore"),
            chunk_size: 1000,
            chunk_overlap: 200,
            similarity_threshold: 0.7,
            max_results: 10,
        }
    }
}

impl RagIntegration {
    pub fn new(config_path: Option<PathBuf>) -> crate::Result<Self> {
        let mut rag = Self::default();

        if let Some(path) = config_path {
            if path.exists() {
                rag.load_config(&path)?;
            }
        }

        Ok(rag)
    }

    pub async fn initialize(&mut self) -> crate::Result<()> {
        if !self.enabled {
            return Ok(());
        }

        // Create vector store directory
        fs::create_dir_all(&self.vector_store_path).await
            .map_err(|e| crate::error::CortexError::Memory(format!("Failed to create vector store directory: {}", e)))?;

        // Test connection to Cortex-OS RAG endpoint
        self.test_connection().await?;

        Ok(())
    }

    pub async fn index_code_file(&self, file_path: &PathBuf) -> crate::Result<Vec<CodeContext>> {
        if !self.enabled {
            return Ok(vec![]);
        }

        let content = fs::read_to_string(file_path).await
            .map_err(|e| crate::error::CortexError::Memory(format!("Failed to read file: {}", e)))?;

        let language = self.detect_language(file_path);
        let chunks = self.chunk_content(&content, &language);

        let mut contexts = Vec::new();
        for (i, chunk) in chunks.iter().enumerate() {
            let context = CodeContext {
                file_path: file_path.to_string_lossy().to_string(),
                line_range: self.calculate_line_range(&content, chunk),
                content: chunk.clone(),
                language: language.clone(),
                embedding: None, // Will be filled by embedding service
                metadata: self.extract_metadata(file_path, chunk),
            };
            contexts.push(context);
        }

        // Send to Cortex-OS RAG pipeline for embedding and indexing
        self.send_contexts_to_rag(&contexts).await?;

        Ok(contexts)
    }

    pub async fn semantic_search(&self, query: &SemanticSearchQuery) -> crate::Result<Vec<SemanticSearchResult>> {
        if !self.enabled {
            return Ok(vec![]);
        }

        // Query Cortex-OS RAG pipeline
        let results = self.query_rag_pipeline(query).await?;

        Ok(results)
    }

    pub async fn find_similar_code(&self, code_snippet: &str, language: Option<&str>) -> crate::Result<Vec<SemanticSearchResult>> {
        let query = SemanticSearchQuery {
            query: code_snippet.to_string(),
            language_filter: language.map(|s| s.to_string()),
            file_pattern: None,
            max_results: Some(self.max_results),
            threshold: Some(self.similarity_threshold),
        };

        self.semantic_search(&query).await
    }

    pub async fn get_context_for_conversation(&self, conversation_id: &str) -> crate::Result<Vec<CodeContext>> {
        if !self.enabled {
            return Ok(vec![]);
        }

        // Retrieve relevant code context for a conversation
        let query = SemanticSearchQuery {
            query: format!("conversation:{}", conversation_id),
            language_filter: None,
            file_pattern: None,
            max_results: Some(5),
            threshold: Some(0.6),
        };

        let results = self.semantic_search(&query).await?;
        Ok(results.into_iter().map(|r| r.context).collect())
    }

    async fn test_connection(&self) -> crate::Result<()> {
        // Test connection to Cortex-OS RAG endpoint
        let client = reqwest::Client::new();
        let response = client
            .get(&format!("{}/health", self.cortex_os_endpoint))
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await
            .map_err(|e| crate::error::CortexError::Memory(format!("RAG endpoint unreachable: {}", e)))?;

        if !response.status().is_success() {
            return Err(crate::error::CortexError::Memory(
                format!("RAG endpoint health check failed: {}", response.status())
            ));
        }

        Ok(())
    }

    async fn send_contexts_to_rag(&self, contexts: &[CodeContext]) -> crate::Result<()> {
        let client = reqwest::Client::new();
        let response = client
            .post(&format!("{}/index", self.cortex_os_endpoint))
            .json(contexts)
            .send()
            .await
            .map_err(|e| crate::error::CortexError::Memory(format!("Failed to send contexts to RAG: {}", e)))?;

        if !response.status().is_success() {
            return Err(crate::error::CortexError::Memory(
                format!("RAG indexing failed: {}", response.status())
            ));
        }

        Ok(())
    }

    async fn query_rag_pipeline(&self, query: &SemanticSearchQuery) -> crate::Result<Vec<SemanticSearchResult>> {
        let client = reqwest::Client::new();
        let response = client
            .post(&format!("{}/search", self.cortex_os_endpoint))
            .json(query)
            .send()
            .await
            .map_err(|e| crate::error::CortexError::Memory(format!("Failed to query RAG: {}", e)))?;

        if !response.status().is_success() {
            return Err(crate::error::CortexError::Memory(
                format!("RAG search failed: {}", response.status())
            ));
        }

        let results: Vec<SemanticSearchResult> = response
            .json()
            .await
            .map_err(|e| crate::error::CortexError::Memory(format!("Failed to parse RAG response: {}", e)))?;

        Ok(results)
    }

    fn detect_language(&self, file_path: &PathBuf) -> String {
        if let Some(extension) = file_path.extension() {
            match extension.to_str() {
                Some("rs") => "rust".to_string(),
                Some("py") => "python".to_string(),
                Some("js") | Some("mjs") => "javascript".to_string(),
                Some("ts") => "typescript".to_string(),
                Some("go") => "go".to_string(),
                Some("java") => "java".to_string(),
                Some("cpp") | Some("cc") | Some("cxx") => "cpp".to_string(),
                Some("c") => "c".to_string(),
                Some("cs") => "csharp".to_string(),
                Some("rb") => "ruby".to_string(),
                Some("php") => "php".to_string(),
                Some("md") => "markdown".to_string(),
                Some("json") => "json".to_string(),
                Some("yaml") | Some("yml") => "yaml".to_string(),
                Some("toml") => "toml".to_string(),
                _ => "text".to_string(),
            }
        } else {
            "text".to_string()
        }
    }

    fn chunk_content(&self, content: &str, language: &str) -> Vec<String> {
        // Simple line-based chunking for now
        let lines: Vec<&str> = content.lines().collect();
        let mut chunks = Vec::new();
        let mut current_chunk = String::new();
        let mut current_size = 0;

        for line in lines {
            let line_size = line.len();

            if current_size + line_size > self.chunk_size && !current_chunk.is_empty() {
                chunks.push(current_chunk.clone());
                current_chunk.clear();
                current_size = 0;
            }

            current_chunk.push_str(line);
            current_chunk.push('\n');
            current_size += line_size + 1;
        }

        if !current_chunk.is_empty() {
            chunks.push(current_chunk);
        }

        chunks
    }

    fn calculate_line_range(&self, content: &str, chunk: &str) -> (usize, usize) {
        let content_lines: Vec<&str> = content.lines().collect();
        let chunk_lines: Vec<&str> = chunk.lines().collect();

        if chunk_lines.is_empty() {
            return (1, 1);
        }

        let first_line = chunk_lines[0];
        let last_line = chunk_lines[chunk_lines.len() - 1];

        let start_line = content_lines.iter().position(|&line| line == first_line).unwrap_or(0) + 1;
        let end_line = content_lines.iter().rposition(|&line| line == last_line).unwrap_or(0) + 1;

        (start_line, end_line.max(start_line))
    }

    fn extract_metadata(&self, file_path: &PathBuf, chunk: &str) -> HashMap<String, serde_json::Value> {
        let mut metadata = HashMap::new();

        metadata.insert("file_size".to_string(), serde_json::Value::Number(chunk.len().into()));
        metadata.insert("line_count".to_string(), serde_json::Value::Number(chunk.lines().count().into()));

        if let Some(parent) = file_path.parent() {
            metadata.insert("directory".to_string(), serde_json::Value::String(parent.to_string_lossy().to_string()));
        }

        // Extract function/class names for code files
        if let Some(extension) = file_path.extension() {
            match extension.to_str() {
                Some("rs") => {
                    let functions = self.extract_rust_functions(chunk);
                    if !functions.is_empty() {
                        metadata.insert("functions".to_string(), serde_json::Value::Array(
                            functions.into_iter().map(serde_json::Value::String).collect()
                        ));
                    }
                }
                Some("py") => {
                    let functions = self.extract_python_functions(chunk);
                    if !functions.is_empty() {
                        metadata.insert("functions".to_string(), serde_json::Value::Array(
                            functions.into_iter().map(serde_json::Value::String).collect()
                        ));
                    }
                }
                _ => {}
            }
        }

        metadata
    }

    fn extract_rust_functions(&self, code: &str) -> Vec<String> {
        let mut functions = Vec::new();
        for line in code.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("fn ") || trimmed.starts_with("pub fn ") || trimmed.starts_with("async fn ") || trimmed.starts_with("pub async fn ") {
                if let Some(name_end) = trimmed.find('(') {
                    let name_start = trimmed.rfind(' ').map(|i| i + 1).unwrap_or(0);
                    let function_name = &trimmed[name_start..name_end];
                    functions.push(function_name.to_string());
                }
            }
        }
        functions
    }

    fn extract_python_functions(&self, code: &str) -> Vec<String> {
        let mut functions = Vec::new();
        for line in code.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("def ") {
                if let Some(name_end) = trimmed.find('(') {
                    let name_start = 4; // "def ".len()
                    let function_name = &trimmed[name_start..name_end];
                    functions.push(function_name.trim().to_string());
                }
            }
        }
        functions
    }

    fn load_config(&mut self, config_path: &PathBuf) -> crate::Result<()> {
        // Load configuration from file
        // Implementation would read from TOML/JSON config file
        Ok(())
    }

    pub fn enable(&mut self) {
        self.enabled = true;
    }

    pub fn disable(&mut self) {
        self.enabled = false;
    }

    pub fn set_endpoint(&mut self, endpoint: String) {
        self.cortex_os_endpoint = endpoint;
    }

    pub fn set_embedding_model(&mut self, model: String) {
        self.embedding_model = model;
    }

    pub fn set_similarity_threshold(&mut self, threshold: f32) {
        self.similarity_threshold = threshold.clamp(0.0, 1.0);
    }
}
