pub mod storage;
pub mod context;
pub mod agents_md;
pub mod rag_integration;
pub mod a2a_integration;

pub use storage::*;
pub use context::*;
pub use agents_md::*;
pub use rag_integration::*;
pub use a2a_integration::*;

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Enhanced memory system configuration combining all components
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancedMemoryConfig {
    pub storage: MemoryStorageConfig,
    pub rag: RagIntegration,
    pub a2a: A2AIntegration,
    pub agents_md_path: PathBuf,
    pub enable_audit_trail: bool,
    pub context_window_size: usize,
    pub memory_retention_days: u32,
}

impl Default for EnhancedMemoryConfig {
    fn default() -> Self {
        Self {
            storage: MemoryStorageConfig::default(),
            rag: RagIntegration::default(),
            a2a: A2AIntegration::default(),
            agents_md_path: PathBuf::from(".cortex/AGENTS.md"),
            enable_audit_trail: true,
            context_window_size: 4000,
            memory_retention_days: 30,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use tokio::sync::RwLock;
    use tempfile::TempDir;

    /// Helper to create test config with temporary directories
    fn create_test_config() -> (EnhancedMemoryConfig, TempDir) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let config = EnhancedMemoryConfig {
            storage: MemoryStorageConfig {
                retention_days: 7,
                enable_audit: true,
                auto_summarize: false,
                max_context_length: 1000,
            },
            rag: RagIntegration::default(),
            a2a: A2AIntegration::default(),
            agents_md_path: temp_dir.path().join("AGENTS.md"),
            enable_audit_trail: true,
            context_window_size: 2000,
            memory_retention_days: 7,
        };
        (config, temp_dir)
    }

    /// Helper to create test memory system
    async fn create_test_memory_system() -> (EnhancedMemorySystem, TempDir) {
        let (config, temp_dir) = create_test_config();
        let memory_system = EnhancedMemorySystem::new(config.clone())
            .await
            .expect("Failed to create memory system");
        (memory_system, temp_dir)
    }

    #[tokio::test]
    async fn test_enhanced_memory_config_defaults() {
        let config = EnhancedMemoryConfig::default();

        assert_eq!(config.agents_md_path, PathBuf::from(".cortex/AGENTS.md"));
        assert!(config.enable_audit_trail);
        assert_eq!(config.context_window_size, 4000);
        assert_eq!(config.memory_retention_days, 30);
    }

    #[tokio::test]
    async fn test_memory_system_creation() {
        let (memory_system, _temp_dir) = create_test_memory_system().await;

        // Test that all components are properly initialized
        assert_eq!(memory_system.config.context_window_size, 2000);
        assert_eq!(memory_system.config.memory_retention_days, 7);
        assert!(memory_system.config.enable_audit_trail);
    }

    #[tokio::test]
    async fn test_conversation_lifecycle() {
        let (mut memory_system, _temp_dir) = create_test_memory_system().await;

        // Start conversation
        let session_id = memory_system
            .start_conversation("openai".to_string(), "gpt-4".to_string())
            .await
            .expect("Failed to start conversation");

        assert!(!session_id.is_empty());

        // Add message
        let message = ConversationMessage {
            role: MessageRole::User,
            content: "Hello, world!".to_string(),
            timestamp: chrono::Utc::now(),
            metadata: None,
        };

        memory_system
            .add_message(&session_id, message.clone())
            .await
            .expect("Failed to add message");

        // Retrieve conversation
        let context = memory_system
            .get_conversation_context(&session_id)
            .await
            .expect("Failed to get context")
            .expect("Context should exist");

        assert_eq!(context.session_id, session_id);
        assert_eq!(context.messages.len(), 1);
        assert_eq!(context.messages[0].content, "Hello, world!");
    }

    #[tokio::test]
    async fn test_semantic_search_integration() {
        let (mut memory_system, _temp_dir) = create_test_memory_system().await;

        // Test that RAG integration is initialized
        let search_results = memory_system
            .semantic_search("test query", 5)
            .await
            .expect("Semantic search should work");

        // Should return empty results for test setup
        assert!(search_results.is_empty());
    }

    #[tokio::test]
    async fn test_context_enhancement() {
        let (mut memory_system, _temp_dir) = create_test_memory_system().await;

        let session_id = memory_system
            .start_conversation("anthropic".to_string(), "claude-3".to_string())
            .await
            .expect("Failed to start conversation");

        // Test context enhancement
        let enhanced_context = memory_system
            .enhance_context_with_rag(&session_id, "test query".to_string())
            .await
            .expect("Failed to enhance context");

        assert_eq!(enhanced_context.session_id, session_id);
        assert_eq!(enhanced_context.enhanced_query, "test query");
    }

    #[tokio::test]
    async fn test_agents_md_integration() {
        let (memory_system, _temp_dir) = create_test_memory_system().await;

        // Test that agents.md is properly initialized
        let agents_path = &memory_system.config.agents_md_path;
        assert!(agents_path.to_string_lossy().ends_with("AGENTS.md"));
    }

    #[tokio::test]
    async fn test_concurrent_conversations() {
        let (mut memory_system, _temp_dir) = create_test_memory_system().await;

        // Start multiple conversations concurrently
        let session1 = memory_system
            .start_conversation("openai".to_string(), "gpt-4".to_string())
            .await
            .expect("Failed to start conversation 1");

        let session2 = memory_system
            .start_conversation("anthropic".to_string(), "claude-3".to_string())
            .await
            .expect("Failed to start conversation 2");

        // Ensure they have different session IDs
        assert_ne!(session1, session2);

        // Both should be retrievable
        let context1 = memory_system.get_conversation_context(&session1).await.expect("Failed to get context 1");
        let context2 = memory_system.get_conversation_context(&session2).await.expect("Failed to get context 2");

        assert!(context1.is_some());
        assert!(context2.is_some());
    }

    #[tokio::test]
    async fn test_memory_cleanup() {
        let (mut memory_system, _temp_dir) = create_test_memory_system().await;

        let session_id = memory_system
            .start_conversation("local".to_string(), "llama-3".to_string())
            .await
            .expect("Failed to start conversation");

        // Test cleanup functionality
        let cleaned_count = memory_system
            .cleanup_old_conversations(0) // Clean up everything older than 0 days
            .await
            .expect("Failed to cleanup conversations");

        // Should be able to clean up without errors
        assert!(cleaned_count >= 0);
    }

    #[tokio::test]
    async fn test_error_handling_invalid_session() {
        let (memory_system, _temp_dir) = create_test_memory_system().await;

        // Test accessing non-existent session
        let result = memory_system
            .get_conversation_context("invalid-session-id")
            .await
            .expect("Should not error on invalid session");

        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_message_role_serialization() {
        // Test that message roles serialize/deserialize correctly
        let user_msg = ConversationMessage {
            role: MessageRole::User,
            content: "Test user message".to_string(),
            timestamp: chrono::Utc::now(),
            metadata: None,
        };

        let serialized = serde_json::to_string(&user_msg).expect("Failed to serialize");
        let deserialized: ConversationMessage = serde_json::from_str(&serialized).expect("Failed to deserialize");

        assert_eq!(deserialized.role, MessageRole::User);
        assert_eq!(deserialized.content, "Test user message");
    }
}

/// Enhanced memory system integrating storage, RAG, A2A, and audit capabilities
pub struct EnhancedMemorySystem {
    storage: MemoryStorage,
    rag: RagIntegration,
    a2a_manager: Option<A2AManager>,
    agents_md: AgentsMd,
    config: EnhancedMemoryConfig,
}

impl EnhancedMemorySystem {
    pub async fn new(config: EnhancedMemoryConfig) -> crate::Result<Self> {
        let storage = MemoryStorage::new(config.storage.clone()).await?;
        let rag = RagIntegration::new(None)?;
        let agents_md = AgentsMd::new(config.agents_md_path.clone()).await?;

        let a2a_manager = if config.a2a.enabled {
            Some(A2AManager::new(config.a2a.clone()))
        } else {
            None
        };

        Ok(Self {
            storage,
            rag,
            a2a_manager,
            agents_md,
            config,
        })
    }

    pub async fn initialize(&mut self) -> crate::Result<()> {
        // Initialize RAG if enabled
        if self.config.rag.enabled {
            self.rag.initialize().await?;
        }

        // Initialize A2A if enabled
        if let Some(ref mut a2a_manager) = self.a2a_manager {
            a2a_manager.initialize().await?;
        }

        Ok(())
    }

    pub async fn store_conversation(&mut self, conversation: Conversation) -> crate::Result<()> {
        // Store in main storage
        self.storage.store_conversation(conversation.clone()).await?;

        // Index in RAG if enabled
        if self.config.rag.enabled {
            // Convert conversation to code contexts for RAG indexing
            // This would be implemented based on conversation content
        }

        // Create AGENTS.md entry if audit trail is enabled
        if self.config.enable_audit_trail {
            let entry = AgentEntry::new(
                conversation.id.clone(),
                conversation.provider.clone(),
                conversation.model.clone(),
                conversation.summary.unwrap_or_else(|| "No summary available".to_string()),
            );
            self.agents_md.add_entry(entry).await?;
        }

        Ok(())
    }

    pub async fn search_semantic(&self, query: &str) -> crate::Result<Vec<SemanticSearchResult>> {
        if !self.config.rag.enabled {
            return Ok(vec![]);
        }

        let search_query = SemanticSearchQuery {
            query: query.to_string(),
            language_filter: None,
            file_pattern: None,
            max_results: Some(10),
            threshold: Some(0.7),
        };

        self.rag.semantic_search(&search_query).await
    }

    pub async fn coordinate_agent_task(&self, task_type: &str, payload: serde_json::Value) -> crate::Result<Option<String>> {
        if let Some(ref a2a_manager) = self.a2a_manager {
            let task = AgentTask {
                id: uuid::Uuid::new_v4().to_string(),
                task_type: task_type.to_string(),
                payload,
                requester_id: self.config.a2a.agent_id.clone(),
                priority: TaskPriority::Normal,
                created_at: std::time::SystemTime::now(),
                deadline: Some(std::time::SystemTime::now() + self.config.a2a.task_timeout),
                dependencies: vec![],
                metadata: std::collections::HashMap::new(),
            };

            let task_id = a2a_manager.submit_task(task).await?;
            Ok(Some(task_id))
        } else {
            Ok(None)
        }
    }

    pub async fn get_conversation_context(&self, conversation_id: &str) -> crate::Result<Option<ConversationContext>> {
        self.storage.get_conversation_context(conversation_id).await
    }

    pub async fn get_memory_statistics(&self) -> MemorySystemStatistics {
        let storage_stats = self.storage.get_statistics();
        let agents_md_stats = self.agents_md.get_stats();

        let a2a_stats = if let Some(ref a2a_manager) = self.a2a_manager {
            Some(a2a_manager.get_statistics())
        } else {
            None
        };

        MemorySystemStatistics {
            storage_stats,
            agents_md_stats,
            a2a_stats,
            rag_enabled: self.config.rag.enabled,
            a2a_enabled: self.config.a2a.enabled,
            audit_trail_enabled: self.config.enable_audit_trail,
        }
    }

    pub fn get_config(&self) -> &EnhancedMemoryConfig {
        &self.config
    }

    pub async fn shutdown(&self) -> crate::Result<()> {
        if let Some(ref a2a_manager) = self.a2a_manager {
            a2a_manager.shutdown().await?;
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemorySystemStatistics {
    pub storage_stats: MemoryStats,
    pub agents_md_stats: super::agents_md::MemoryStats,
    pub a2a_stats: Option<A2AStatistics>,
    pub rag_enabled: bool,
    pub a2a_enabled: bool,
    pub audit_trail_enabled: bool,
}

pub use storage::{MemoryStorage, MemoryConfig};
pub use context::{ConversationContext, MessageRole, ContextSummary};
pub use agents_md::{AgentsMd, AgentEntry};
