use crate::memory::{AgentsMd, ConversationContext};
use crate::memory::agents_md::AgentEntry;
use serde::{Deserialize, Serialize};
use crate::Result;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct MemoryStorage {
    agents_md: Arc<RwLock<AgentsMd>>,
    active_contexts: Arc<RwLock<HashMap<String, ConversationContext>>>,
    config: MemoryConfig,
}

#[derive(Debug, Clone)]
pub struct MemoryConfig {
    pub agents_md_path: PathBuf,
    pub retention_days: u32,
    pub enable_audit: bool,
    pub auto_summarize: bool,
    pub max_context_length: usize,
}

impl MemoryStorage {
    pub async fn new(config: MemoryConfig) -> Result<Self> {
        let agents_md = AgentsMd::new(config.agents_md_path.clone()).await?;

        Ok(Self {
            agents_md: Arc::new(RwLock::new(agents_md)),
            active_contexts: Arc::new(RwLock::new(HashMap::new())),
            config,
        })
    }

    pub async fn start_conversation(
        &self,
        provider: String,
        model: String,
    ) -> Result<String> {
        let session_id = Uuid::new_v4().to_string();
        let context = ConversationContext::new(session_id.clone(), provider, model);

        let mut contexts = self.active_contexts.write().await;
        contexts.insert(session_id.clone(), context);

        Ok(session_id)
    }

    pub async fn end_conversation(&self, session_id: &str) -> Result<()> {
        let context = {
            let mut contexts = self.active_contexts.write().await;
            contexts.remove(session_id)
        };

        if let Some(context) = context {
            // Create summary and save to AGENTS.md
            let summary = context.generate_summary();
            let entry = AgentEntry::new(
                context.session_id().to_string(),
                context.provider().to_string(),
                context.model().to_string(),
                summary.text,
            )
            .with_decisions(summary.key_decisions)
            .with_context(summary.context)
            .with_tags(summary.tags);

            let mut agents_md = self.agents_md.write().await;
            agents_md.add_entry(entry).await?;
        }

        Ok(())
    }

    pub async fn add_message(
        &self,
        session_id: &str,
        role: MessageRole,
        content: String,
    ) -> Result<()> {
        let mut contexts = self.active_contexts.write().await;
        if let Some(context) = contexts.get_mut(session_id) {
            context.add_message(role, content);

            // Auto-trim if context gets too long
            if context.message_count() > self.config.max_context_length {
                context.trim_context(self.config.max_context_length / 2);
            }
        }

        Ok(())
    }

    pub async fn get_context(&self, session_id: &str) -> Option<ConversationContext> {
        let contexts = self.active_contexts.read().await;
        contexts.get(session_id).cloned()
    }

    pub async fn get_recent_context(&self, limit: usize) -> Result<Vec<String>> {
        let agents_md = self.agents_md.read().await;
        let recent_entries = agents_md.get_recent_context(limit);

        Ok(recent_entries.iter()
            .map(|entry| format!(
                "Session: {} ({})\nSummary: {}\nDecisions: {}",
                entry.session_id,
                entry.provider,
                entry.conversation_summary,
                entry.key_decisions.join("; ")
            ))
            .collect())
    }

    pub async fn search_memory(&self, query: &str) -> Result<Vec<String>> {
        let agents_md = self.agents_md.read().await;
        let matching_entries = agents_md.search_entries(query);

        Ok(matching_entries.iter()
            .map(|entry| format!(
                "Session: {} ({}, {})\nSummary: {}\nTags: {}",
                entry.session_id,
                entry.provider,
                entry.model,
                entry.conversation_summary,
                entry.tags.join(", ")
            ))
            .collect())
    }

    pub async fn get_provider_history(&self, provider: &str) -> Result<Vec<String>> {
        let agents_md = self.agents_md.read().await;
        let provider_entries = agents_md.get_entries_by_provider(provider);

        Ok(provider_entries.iter()
            .map(|entry| format!(
                "Session: {} ({})\nSummary: {}",
                entry.session_id,
                entry.model,
                entry.conversation_summary
            ))
            .collect())
    }

    pub async fn add_decision(&self, session_id: &str, decision: String) -> Result<()> {
        let mut contexts = self.active_contexts.write().await;
        if let Some(context) = contexts.get_mut(session_id) {
            context.add_decision(decision);
        }
        Ok(())
    }

    pub async fn add_context_data(
        &self,
        session_id: &str,
        key: String,
        value: serde_json::Value,
    ) -> Result<()> {
        let mut contexts = self.active_contexts.write().await;
        if let Some(context) = contexts.get_mut(session_id) {
            context.add_context(key, value);
        }
        Ok(())
    }

    pub async fn add_tag(&self, session_id: &str, tag: String) -> Result<()> {
        let mut contexts = self.active_contexts.write().await;
        if let Some(context) = contexts.get_mut(session_id) {
            context.add_tag(tag);
        }
        Ok(())
    }

    pub async fn get_memory_stats(&self) -> Result<MemoryStorageStats> {
        let agents_md = self.agents_md.read().await;
        let active_contexts = self.active_contexts.read().await;

        let agents_stats = agents_md.get_stats();

        Ok(MemoryStorageStats {
            total_historical_entries: agents_stats.total_entries,
            active_conversations: active_contexts.len(),
            unique_providers: agents_stats.unique_providers,
            unique_models: agents_stats.unique_models,
            unique_tags: agents_stats.unique_tags,
            oldest_entry: agents_stats.oldest_entry,
            newest_entry: agents_stats.newest_entry,
        })
    }

    pub async fn cleanup_expired(&self) -> Result<usize> {
        let mut agents_md = self.agents_md.write().await;
        let initial_count = agents_md.get_entries().len();

        // This would trigger cleanup in the AgentsMd implementation
        agents_md.save().await?;

        let final_count = agents_md.get_entries().len();
        Ok(initial_count - final_count)
    }

    pub async fn export_memory(&self, format: ExportFormat) -> Result<String> {
        let agents_md = self.agents_md.read().await;

        match format {
            ExportFormat::Json => {
                let entries = agents_md.get_entries();
                serde_json::to_string_pretty(entries)
                    .map_err(|e| crate::error::ProviderError::Api(format!("JSON export failed: {}", e)).into())
            }
            ExportFormat::Markdown => {
                // Already in markdown format
                tokio::fs::read_to_string(&self.config.agents_md_path).await
                    .map_err(|e| crate::error::ProviderError::Api(format!("Failed to read AGENTS.md: {}", e)).into())
            }
            ExportFormat::Csv => {
                let entries = agents_md.get_entries();
                let mut csv = String::from("timestamp,session_id,provider,model,summary,decisions,tags\n");

                for entry in entries {
                    csv.push_str(&format!(
                        "{:?},{},{},{},{},{},{}\n",
                        entry.timestamp,
                        entry.session_id,
                        entry.provider,
                        entry.model,
                        entry.conversation_summary.replace(',', ";"),
                        entry.key_decisions.join(";"),
                        entry.tags.join(";")
                    ));
                }

                Ok(csv)
            }
        }
    }

    pub async fn active_sessions_summary(&self) -> Result<(usize, Vec<String>)> {
        let contexts = self.active_contexts.read().await;
        let count = contexts.len();
        let ids = contexts.keys().take(5).cloned().collect();
        Ok((count, ids))
    }

    pub fn config(&self) -> &MemoryConfig {
        &self.config
    }
}

#[derive(Debug, Clone)]
pub struct MemoryStorageStats {
    pub total_historical_entries: usize,
    pub active_conversations: usize,
    pub unique_providers: usize,
    pub unique_models: usize,
    pub unique_tags: usize,
    pub oldest_entry: Option<std::time::SystemTime>,
    pub newest_entry: Option<std::time::SystemTime>,
}

#[derive(Debug, Clone)]
pub enum ExportFormat {
    Json,
    Markdown,
    Csv,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MessageRole {
    User,
    Assistant,
    System,
}

impl Default for MemoryConfig {
    fn default() -> Self {
        Self {
            agents_md_path: PathBuf::from("~/.cortex/agents.md"),
            retention_days: 30,
            enable_audit: true,
            auto_summarize: true,
            max_context_length: 100,
        }
    }
}

impl MemoryConfig {
    pub fn with_path(mut self, path: PathBuf) -> Self {
        self.agents_md_path = path;
        self
    }

    pub fn with_retention_days(mut self, days: u32) -> Self {
        self.retention_days = days;
        self
    }

    pub fn with_audit_enabled(mut self, enabled: bool) -> Self {
        self.enable_audit = enabled;
        self
    }

    pub fn with_auto_summarize(mut self, enabled: bool) -> Self {
        self.auto_summarize = enabled;
        self
    }

    pub fn with_max_context_length(mut self, length: usize) -> Self {
        self.max_context_length = length;
        self
    }
}
