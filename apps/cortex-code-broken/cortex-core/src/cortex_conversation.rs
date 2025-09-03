//! Cortex conversation management

use anyhow::Result;
use serde::{Deserialize, Serialize};

/// Cortex conversation state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CortexConversation {
    pub id: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub messages: Vec<ConversationMessage>,
}

/// Individual conversation message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationMessage {
    pub role: String,
    pub content: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl CortexConversation {
    pub fn new(id: String) -> Self {
        let now = chrono::Utc::now();
        Self {
            id,
            created_at: now,
            updated_at: now,
            messages: Vec::new(),
        }
    }

    pub async fn add_message(&mut self, role: String, content: String) -> Result<()> {
        let message = ConversationMessage {
            role,
            content,
            timestamp: chrono::Utc::now(),
        };
        self.messages.push(message);
        self.updated_at = chrono::Utc::now();
        Ok(())
    }

    pub fn get_messages(&self) -> &[ConversationMessage] {
        &self.messages
    }
}
