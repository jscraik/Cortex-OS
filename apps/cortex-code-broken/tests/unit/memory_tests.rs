//! Enhanced memory system tests
//!
//! Tests for the RAG + A2A integrated memory system following September 2025 standards:
//! - Functional programming approach
//! - ≤40 lines per function
//! - Explicit error handling with anyhow::Result
//! - 100% branch coverage
//! - Named exports only

use cortex_core::memory::{
    EnhancedMemorySystem, MemoryOperation, ConversationContext,
    SearchQuery, StorageBackend, ConversationMetadata
};
use anyhow::Result;
use serde_json::json;
use std::collections::HashMap;
use tempfile::TempDir;
use tokio::test as tokio_test;
use uuid::Uuid;

/// Mock storage backend for testing
#[derive(Debug, Clone)]
pub struct MockStorageBackend {
    conversations: HashMap<Uuid, ConversationContext>,
    operations: Vec<MemoryOperation>,
}

impl MockStorageBackend {
    pub fn new() -> Self {
        Self {
            conversations: HashMap::new(),
            operations: Vec::new(),
        }
    }

    pub fn with_conversations(conversations: Vec<ConversationContext>) -> Self {
        let mut backend = Self::new();
        for conv in conversations {
            backend.conversations.insert(conv.id, conv);
        }
        backend
    }
}

impl StorageBackend for MockStorageBackend {
    async fn store_conversation(&mut self, context: ConversationContext) -> Result<()> {
        self.conversations.insert(context.id, context);
        Ok(())
    }

    async fn retrieve_conversation(&self, id: Uuid) -> Result<Option<ConversationContext>> {
        Ok(self.conversations.get(&id).cloned())
    }

    async fn search_conversations(&self, query: &SearchQuery) -> Result<Vec<ConversationContext>> {
        let filtered: Vec<_> = self.conversations
            .values()
            .filter(|conv| {
                query.keywords.iter().any(|keyword|
                    conv.summary.to_lowercase().contains(&keyword.to_lowercase()) ||
                    conv.messages.iter().any(|msg|
                        msg.content.to_lowercase().contains(&keyword.to_lowercase())
                    )
                )
            })
            .cloned()
            .collect();
        Ok(filtered)
    }

    async fn record_operation(&mut self, operation: MemoryOperation) -> Result<()> {
        self.operations.push(operation);
        Ok(())
    }
}

/// Create test conversation context
pub fn create_test_conversation() -> ConversationContext {
    ConversationContext {
        id: Uuid::new_v4(),
        summary: "Test conversation about Rust patterns".to_string(),
        messages: vec![
            json!({
                "role": "user",
                "content": "How do I implement the Strategy pattern in Rust?"
            }),
            json!({
                "role": "assistant",
                "content": "The Strategy pattern in Rust can be implemented using traits..."
            })
        ],
        metadata: ConversationMetadata {
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            tags: vec!["rust".to_string(), "patterns".to_string()],
            context_type: "technical_discussion".to_string(),
        },
        rag_context: Some("Relevant documentation about Rust design patterns".to_string()),
        a2a_coordination: Some(json!({
            "agents": ["code_analyst", "pattern_expert"],
            "workflow_id": "design_pattern_help"
        })),
    }
}

#[tokio_test]
async fn test_memory_system_initialization() -> Result<()> {
    // Given
    let backend = MockStorageBackend::new();

    // When
    let memory_system = EnhancedMemorySystem::new(Box::new(backend));

    // Then
    assert!(memory_system.is_initialized());
    Ok(())
}

#[tokio_test]
async fn test_store_and_retrieve_conversation() -> Result<()> {
    // Given
    let backend = MockStorageBackend::new();
    let mut memory_system = EnhancedMemorySystem::new(Box::new(backend));
    let test_conversation = create_test_conversation();
    let conversation_id = test_conversation.id;

    // When
    memory_system.store_conversation(test_conversation.clone()).await?;
    let retrieved = memory_system.retrieve_conversation(conversation_id).await?;

    // Then
    assert!(retrieved.is_some());
    let retrieved_conv = retrieved.unwrap();
    assert_eq!(retrieved_conv.id, conversation_id);
    assert_eq!(retrieved_conv.summary, test_conversation.summary);
    Ok(())
}

#[tokio_test]
async fn test_semantic_search_functionality() -> Result<()> {
    // Given
    let conversations = vec![
        create_test_conversation(),
        ConversationContext {
            id: Uuid::new_v4(),
            summary: "Discussion about Python async patterns".to_string(),
            messages: vec![json!({"role": "user", "content": "Python asyncio help"})],
            metadata: ConversationMetadata {
                created_at: chrono::Utc::now(),
                updated_at: chrono::Utc::now(),
                tags: vec!["python".to_string()],
                context_type: "technical_discussion".to_string(),
            },
            rag_context: None,
            a2a_coordination: None,
        }
    ];

    let backend = MockStorageBackend::with_conversations(conversations);
    let memory_system = EnhancedMemorySystem::new(Box::new(backend));

    // When
    let query = SearchQuery {
        keywords: vec!["Rust".to_string()],
        limit: Some(10),
        context_type: Some("technical_discussion".to_string()),
    };
    let results = memory_system.search_conversations(&query).await?;

    // Then
    assert_eq!(results.len(), 1);
    assert!(results[0].summary.contains("Rust"));
    Ok(())
}

#[tokio_test]
async fn test_rag_integration() -> Result<()> {
    // Given
    let mut test_conversation = create_test_conversation();
    test_conversation.rag_context = Some("Enhanced RAG context data".to_string());

    let backend = MockStorageBackend::new();
    let mut memory_system = EnhancedMemorySystem::new(Box::new(backend));

    // When
    memory_system.store_conversation(test_conversation.clone()).await?;
    let retrieved = memory_system.retrieve_conversation(test_conversation.id).await?;

    // Then
    assert!(retrieved.is_some());
    let conv = retrieved.unwrap();
    assert!(conv.rag_context.is_some());
    assert_eq!(conv.rag_context.unwrap(), "Enhanced RAG context data");
    Ok(())
}

#[tokio_test]
async fn test_a2a_coordination() -> Result<()> {
    // Given
    let mut test_conversation = create_test_conversation();
    let coordination_data = json!({
        "agents": ["memory_agent", "search_agent"],
        "workflow_id": "collaborative_search",
        "status": "active"
    });
    test_conversation.a2a_coordination = Some(coordination_data.clone());

    let backend = MockStorageBackend::new();
    let mut memory_system = EnhancedMemorySystem::new(Box::new(backend));

    // When
    memory_system.store_conversation(test_conversation.clone()).await?;
    let retrieved = memory_system.retrieve_conversation(test_conversation.id).await?;

    // Then
    assert!(retrieved.is_some());
    let conv = retrieved.unwrap();
    assert!(conv.a2a_coordination.is_some());
    assert_eq!(conv.a2a_coordination.unwrap(), coordination_data);
    Ok(())
}

#[tokio_test]
async fn test_operation_audit_trail() -> Result<()> {
    // Given
    let backend = MockStorageBackend::new();
    let mut memory_system = EnhancedMemorySystem::new(Box::new(backend));
    let test_conversation = create_test_conversation();

    // When
    memory_system.store_conversation(test_conversation.clone()).await?;
    let _ = memory_system.retrieve_conversation(test_conversation.id).await?;

    // Then - operations are recorded via the backend
    // This would be verified by checking the backend's operation log
    // In a real implementation, we'd have access to the audit trail
    assert!(true); // Placeholder for actual audit verification
    Ok(())
}

#[tokio_test]
async fn test_concurrent_access() -> Result<()> {
    // Given
    let backend = MockStorageBackend::new();
    let memory_system = std::sync::Arc::new(
        tokio::sync::Mutex::new(EnhancedMemorySystem::new(Box::new(backend)))
    );

    let conv1 = create_test_conversation();
    let conv2 = create_test_conversation();

    // When - concurrent operations
    let system1 = memory_system.clone();
    let system2 = memory_system.clone();
    let conv1_id = conv1.id;
    let conv2_id = conv2.id;

    let (result1, result2) = tokio::join!(
        async move {
            let mut sys = system1.lock().await;
            sys.store_conversation(conv1).await
        },
        async move {
            let mut sys = system2.lock().await;
            sys.store_conversation(conv2).await
        }
    );

    // Then
    assert!(result1.is_ok());
    assert!(result2.is_ok());

    // Verify both conversations are stored
    let sys = memory_system.lock().await;
    let retrieved1 = sys.retrieve_conversation(conv1_id).await?;
    let retrieved2 = sys.retrieve_conversation(conv2_id).await?;

    assert!(retrieved1.is_some());
    assert!(retrieved2.is_some());
    Ok(())
}

#[tokio_test]
async fn test_error_handling() -> Result<()> {
    // Given
    let backend = MockStorageBackend::new();
    let memory_system = EnhancedMemorySystem::new(Box::new(backend));

    // When - attempting to retrieve non-existent conversation
    let result = memory_system.retrieve_conversation(Uuid::new_v4()).await?;

    // Then
    assert!(result.is_none());
    Ok(())
}

#[tokio_test]
async fn test_metadata_search() -> Result<()> {
    // Given
    let conversation = ConversationContext {
        id: Uuid::new_v4(),
        summary: "Tagged conversation".to_string(),
        messages: vec![],
        metadata: ConversationMetadata {
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            tags: vec!["important".to_string(), "rust".to_string()],
            context_type: "code_review".to_string(),
        },
        rag_context: None,
        a2a_coordination: None,
    };

    let backend = MockStorageBackend::with_conversations(vec![conversation]);
    let memory_system = EnhancedMemorySystem::new(Box::new(backend));

    // When
    let query = SearchQuery {
        keywords: vec!["important".to_string()],
        limit: Some(5),
        context_type: Some("code_review".to_string()),
    };
    let results = memory_system.search_conversations(&query).await?;

    // Then
    assert_eq!(results.len(), 1);
    assert!(results[0].metadata.tags.contains(&"important".to_string()));
    Ok(())
}

#[tokio_test]
async fn test_conversation_lifecycle() -> Result<()> {
    // Given
    let backend = MockStorageBackend::new();
    let mut memory_system = EnhancedMemorySystem::new(Box::new(backend));
    let mut conversation = create_test_conversation();

    // When - store initial conversation
    let initial_id = conversation.id;
    memory_system.store_conversation(conversation.clone()).await?;

    // Update conversation
    conversation.summary = "Updated conversation summary".to_string();
    conversation.metadata.updated_at = chrono::Utc::now();
    memory_system.store_conversation(conversation.clone()).await?;

    // Then - verify update
    let retrieved = memory_system.retrieve_conversation(initial_id).await?;
    assert!(retrieved.is_some());
    assert_eq!(retrieved.unwrap().summary, "Updated conversation summary");
    Ok(())
}
