use crate::memory::storage::MessageRole;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationContext {
    session_id: String,
    provider: String,
    model: String,
    messages: Vec<ContextMessage>,
    decisions: Vec<String>,
    context_data: HashMap<String, serde_json::Value>,
    tags: Vec<String>,
    created_at: std::time::SystemTime,
    last_updated: std::time::SystemTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextMessage {
    pub role: MessageRole,
    pub content: String,
    pub timestamp: std::time::SystemTime,
    pub token_count: Option<usize>,
}

#[derive(Debug, Clone)]
pub struct ConversationSummary {
    pub text: String,
    pub key_decisions: Vec<String>,
    pub context: HashMap<String, serde_json::Value>,
    pub tags: Vec<String>,
    pub message_count: usize,
    pub duration: std::time::Duration,
}

impl ConversationContext {
    pub fn new(session_id: String, provider: String, model: String) -> Self {
        let now = std::time::SystemTime::now();
        Self {
            session_id,
            provider,
            model,
            messages: Vec::new(),
            decisions: Vec::new(),
            context_data: HashMap::new(),
            tags: Vec::new(),
            created_at: now,
            last_updated: now,
        }
    }
    
    pub fn add_message(&mut self, role: MessageRole, content: String) {
        let message = ContextMessage {
            role,
            content,
            timestamp: std::time::SystemTime::now(),
            token_count: None, // Could implement token counting
        };
        
        self.messages.push(message);
        self.last_updated = std::time::SystemTime::now();
    }
    
    pub fn add_decision(&mut self, decision: String) {
        self.decisions.push(decision);
        self.last_updated = std::time::SystemTime::now();
    }
    
    pub fn add_context(&mut self, key: String, value: serde_json::Value) {
        self.context_data.insert(key, value);
        self.last_updated = std::time::SystemTime::now();
    }
    
    pub fn add_tag(&mut self, tag: String) {
        if !self.tags.contains(&tag) {
            self.tags.push(tag);
            self.last_updated = std::time::SystemTime::now();
        }
    }
    
    pub fn get_messages(&self) -> &[ContextMessage] {
        &self.messages
    }
    
    pub fn get_recent_messages(&self, count: usize) -> &[ContextMessage] {
        let start_index = self.messages.len().saturating_sub(count);
        &self.messages[start_index..]
    }
    
    pub fn get_user_messages(&self) -> Vec<&ContextMessage> {
        self.messages.iter()
            .filter(|msg| matches!(msg.role, MessageRole::User))
            .collect()
    }
    
    pub fn get_assistant_messages(&self) -> Vec<&ContextMessage> {
        self.messages.iter()
            .filter(|msg| matches!(msg.role, MessageRole::Assistant))
            .collect()
    }
    
    pub fn message_count(&self) -> usize {
        self.messages.len()
    }
    
    pub fn trim_context(&mut self, keep_count: usize) {
        if self.messages.len() > keep_count {
            let remove_count = self.messages.len() - keep_count;
            self.messages.drain(0..remove_count);
            self.last_updated = std::time::SystemTime::now();
        }
    }
    
    pub fn generate_summary(&self) -> ConversationSummary {
        let summary_text = self.create_conversation_summary();
        let duration = self.last_updated.duration_since(self.created_at)
            .unwrap_or_default();
        
        ConversationSummary {
            text: summary_text,
            key_decisions: self.decisions.clone(),
            context: self.context_data.clone(),
            tags: self.tags.clone(),
            message_count: self.messages.len(),
            duration,
        }
    }
    
    fn create_conversation_summary(&self) -> String {
        if self.messages.is_empty() {
            return "Empty conversation".to_string();
        }
        
        let user_messages = self.get_user_messages();
        let assistant_messages = self.get_assistant_messages();
        
        let main_topics = self.extract_main_topics();
        let interaction_pattern = self.analyze_interaction_pattern();
        
        format!(
            "Conversation with {} messages over {} duration. Main topics: {}. Pattern: {}. {} decisions made.",
            self.messages.len(),
            self.format_duration(),
            main_topics,
            interaction_pattern,
            self.decisions.len()
        )
    }
    
    fn extract_main_topics(&self) -> String {
        // Simplified topic extraction - in production would use NLP
        let all_text: String = self.messages.iter()
            .map(|msg| msg.content.clone())
            .collect::<Vec<_>>()
            .join(" ");
        
        // Simple keyword extraction (in production, use proper NLP)
        let keywords = ["implement", "create", "fix", "update", "analyze", "design", "test", "debug"];
        let found_keywords: Vec<&str> = keywords.iter()
            .filter(|&&keyword| all_text.to_lowercase().contains(keyword))
            .copied()
            .collect();
        
        if found_keywords.is_empty() {
            "general discussion".to_string()
        } else {
            found_keywords.join(", ")
        }
    }
    
    fn analyze_interaction_pattern(&self) -> String {
        let user_count = self.get_user_messages().len();
        let assistant_count = self.get_assistant_messages().len();
        
        if user_count == 0 {
            "no user input".to_string()
        } else if assistant_count == 0 {
            "no assistant responses".to_string()
        } else {
            let ratio = assistant_count as f64 / user_count as f64;
            match ratio {
                r if r > 1.5 => "assistant-heavy",
                r if r < 0.5 => "user-heavy", 
                _ => "balanced"
            }.to_string()
        }
    }
    
    fn format_duration(&self) -> String {
        let duration = self.last_updated.duration_since(self.created_at)
            .unwrap_or_default();
        
        let seconds = duration.as_secs();
        if seconds < 60 {
            format!("{}s", seconds)
        } else if seconds < 3600 {
            format!("{}m {}s", seconds / 60, seconds % 60)
        } else {
            format!("{}h {}m", seconds / 3600, (seconds % 3600) / 60)
        }
    }
    
    pub fn get_context_for_prompt(&self, max_messages: usize) -> String {
        let recent_messages = self.get_recent_messages(max_messages);
        
        let mut context = String::new();
        
        // Add relevant context data
        if !self.context_data.is_empty() {
            context.push_str("Context:\n");
            for (key, value) in &self.context_data {
                context.push_str(&format!("- {}: {}\n", key, value));
            }
            context.push('\n');
        }
        
        // Add recent decisions
        if !self.decisions.is_empty() {
            context.push_str("Recent Decisions:\n");
            for decision in self.decisions.iter().rev().take(3) {
                context.push_str(&format!("- {}\n", decision));
            }
            context.push('\n');
        }
        
        // Add message history
        context.push_str("Recent Messages:\n");
        for message in recent_messages {
            let role = match message.role {
                MessageRole::User => "User",
                MessageRole::Assistant => "Assistant",
                MessageRole::System => "System",
            };
            context.push_str(&format!("{}: {}\n", role, message.content));
        }
        
        context
    }
    
    pub fn session_id(&self) -> &str {
        &self.session_id
    }
    
    pub fn provider(&self) -> &str {
        &self.provider
    }
    
    pub fn model(&self) -> &str {
        &self.model
    }
    
    pub fn decisions(&self) -> &[String] {
        &self.decisions
    }
    
    pub fn context_data(&self) -> &HashMap<String, serde_json::Value> {
        &self.context_data
    }
    
    pub fn tags(&self) -> &[String] {
        &self.tags
    }
    
    pub fn created_at(&self) -> std::time::SystemTime {
        self.created_at
    }
    
    pub fn last_updated(&self) -> std::time::SystemTime {
        self.last_updated
    }
    
    pub fn is_empty(&self) -> bool {
        self.messages.is_empty()
    }
    
    pub fn estimated_token_count(&self) -> usize {
        // Simple estimation: ~4 characters per token
        self.messages.iter()
            .map(|msg| msg.content.len() / 4)
            .sum()
    }
}

impl ContextMessage {
    pub fn new(role: MessageRole, content: String) -> Self {
        Self {
            role,
            content,
            timestamp: std::time::SystemTime::now(),
            token_count: None,
        }
    }
    
    pub fn with_token_count(mut self, count: usize) -> Self {
        self.token_count = Some(count);
        self
    }
}

impl std::fmt::Display for MessageRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MessageRole::User => write!(f, "User"),
            MessageRole::Assistant => write!(f, "Assistant"),
            MessageRole::System => write!(f, "System"),
        }
    }
}