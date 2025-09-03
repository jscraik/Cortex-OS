use crate::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs;
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentsMd {
    path: PathBuf,
    entries: Vec<AgentEntry>,
    metadata: AgentMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentEntry {
    pub timestamp: std::time::SystemTime,
    pub session_id: String,
    pub provider: String,
    pub model: String,
    pub conversation_summary: String,
    pub key_decisions: Vec<String>,
    pub context: HashMap<String, serde_json::Value>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMetadata {
    pub version: String,
    pub created_at: std::time::SystemTime,
    pub last_updated: std::time::SystemTime,
    pub total_entries: usize,
    pub retention_days: u32,
    pub enable_audit: bool,
}

impl AgentsMd {
    pub async fn new(path: PathBuf) -> Result<Self> {
        let mut agents_md = Self {
            path,
            entries: Vec::new(),
            metadata: AgentMetadata {
                version: "2.0.0".to_string(),
                created_at: std::time::SystemTime::now(),
                last_updated: std::time::SystemTime::now(),
                total_entries: 0,
                retention_days: 30,
                enable_audit: true,
            },
        };

        if agents_md.path.exists() {
            agents_md.load().await?;
        } else {
            agents_md.initialize().await?;
        }

        Ok(agents_md)
    }

    pub async fn load(&mut self) -> Result<()> {
        let content = fs::read_to_string(&self.path).await
            .map_err(|e| crate::error::ProviderError::Api(format!("Failed to read AGENTS.md: {}", e)))?;

        self.parse_markdown(&content)?;
        Ok(())
    }

    pub async fn save(&mut self) -> Result<()> {
        self.metadata.last_updated = std::time::SystemTime::now();
        self.metadata.total_entries = self.entries.len();

        let markdown_content = self.generate_markdown();

        // Ensure parent directory exists
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).await
                .map_err(|e| crate::error::ProviderError::Api(format!("Failed to create directory: {}", e)))?;
        }

        fs::write(&self.path, markdown_content).await
            .map_err(|e| crate::error::ProviderError::Api(format!("Failed to write AGENTS.md: {}", e)))?;

        Ok(())
    }

    pub async fn add_entry(&mut self, entry: AgentEntry) -> Result<()> {
        self.entries.push(entry);
        self.cleanup_old_entries().await?;
        self.save().await?;
        Ok(())
    }

    pub fn get_entries(&self) -> &[AgentEntry] {
        &self.entries
    }

    pub fn get_entries_by_session(&self, session_id: &str) -> Vec<&AgentEntry> {
        self.entries.iter()
            .filter(|entry| entry.session_id == session_id)
            .collect()
    }

    pub fn get_entries_by_provider(&self, provider: &str) -> Vec<&AgentEntry> {
        self.entries.iter()
            .filter(|entry| entry.provider == provider)
            .collect()
    }

    pub fn get_recent_context(&self, limit: usize) -> Vec<&AgentEntry> {
        let mut entries: Vec<&AgentEntry> = self.entries.iter().collect();
        entries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        entries.into_iter().take(limit).collect()
    }

    pub fn search_entries(&self, query: &str) -> Vec<&AgentEntry> {
        let query_lower = query.to_lowercase();
        self.entries.iter()
            .filter(|entry| {
                entry.conversation_summary.to_lowercase().contains(&query_lower) ||
                entry.key_decisions.iter().any(|decision| decision.to_lowercase().contains(&query_lower)) ||
                entry.tags.iter().any(|tag| tag.to_lowercase().contains(&query_lower))
            })
            .collect()
    }

    async fn cleanup_old_entries(&mut self) -> Result<()> {
        if self.metadata.retention_days == 0 {
            return Ok(());
        }

        let retention_duration = Duration::from_secs((self.metadata.retention_days as u64) * 24 * 60 * 60);
        let cutoff_time = std::time::SystemTime::now()
            .checked_sub(retention_duration)
            .unwrap_or(std::time::SystemTime::UNIX_EPOCH);

        self.entries.retain(|entry| entry.timestamp >= cutoff_time);

        Ok(())
    }

    async fn initialize(&mut self) -> Result<()> {
        let initial_content = self.generate_initial_markdown();

        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).await
                .map_err(|e| crate::error::ProviderError::Api(format!("Failed to create directory: {}", e)))?;
        }

        fs::write(&self.path, initial_content).await
            .map_err(|e| crate::error::ProviderError::Api(format!("Failed to create AGENTS.md: {}", e)))?;

        Ok(())
    }

    fn parse_markdown(&mut self, content: &str) -> Result<()> {
        // Simplified markdown parser for AGENTS.md format
        // In production, would use a proper markdown parser

        let mut current_entry: Option<AgentEntry> = None;
        let mut _in_metadata = false;

        for line in content.lines() {
            let line = line.trim();

            if line.starts_with("# AGENTS.md") {
                _in_metadata = true;
                continue;
            }

            if line.starts_with("## Session:") {
                // Save previous entry if exists
                if let Some(entry) = current_entry.take() {
                    self.entries.push(entry);
                }

                // Start new entry
                let session_id = line.strip_prefix("## Session:").unwrap_or("unknown").trim().to_string();
                current_entry = Some(AgentEntry {
                    timestamp: std::time::SystemTime::now(), // Would parse from markdown in real implementation
                    session_id,
                    provider: String::new(),
                    model: String::new(),
                    conversation_summary: String::new(),
                    key_decisions: Vec::new(),
                    context: HashMap::new(),
                    tags: Vec::new(),
                });
                continue;
            }

            if let Some(ref mut entry) = current_entry {
                if line.starts_with("**Provider:**") {
                    entry.provider = line.strip_prefix("**Provider:**").unwrap_or("").trim().to_string();
                } else if line.starts_with("**Model:**") {
                    entry.model = line.strip_prefix("**Model:**").unwrap_or("").trim().to_string();
                } else if line.starts_with("**Summary:**") {
                    entry.conversation_summary = line.strip_prefix("**Summary:**").unwrap_or("").trim().to_string();
                } else if line.starts_with("- Key Decision:") {
                    let decision = line.strip_prefix("- Key Decision:").unwrap_or("").trim().to_string();
                    entry.key_decisions.push(decision);
                } else if line.starts_with("**Tags:**") {
                    let tags_str = line.strip_prefix("**Tags:**").unwrap_or("").trim();
                    entry.tags = tags_str.split(',').map(|s| s.trim().to_string()).collect();
                }
            }
        }

        // Save last entry if exists
        if let Some(entry) = current_entry {
            self.entries.push(entry);
        }

        Ok(())
    }

    fn generate_markdown(&self) -> String {
        let mut content = String::new();

        // Header and metadata
        content.push_str("# AGENTS.md\n\n");
        content.push_str(&format!("**Version:** {}\n", self.metadata.version));
        content.push_str(&format!("**Created:** {:?}\n", self.metadata.created_at));
        content.push_str(&format!("**Last Updated:** {:?}\n", self.metadata.last_updated));
        content.push_str(&format!("**Total Entries:** {}\n", self.metadata.total_entries));
        content.push_str(&format!("**Retention Days:** {}\n", self.metadata.retention_days));
        content.push_str(&format!("**Audit Enabled:** {}\n\n", self.metadata.enable_audit));

        content.push_str("---\n\n");
        content.push_str("## Agent Conversation Memory\n\n");
        content.push_str("This file maintains a record of AI agent conversations and decisions for context preservation and audit purposes.\n\n");

        // Entries sorted by timestamp (newest first)
        let mut sorted_entries: Vec<&AgentEntry> = self.entries.iter().collect();
        sorted_entries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

        for entry in sorted_entries {
            content.push_str(&format!("## Session: {}\n\n", entry.session_id));
            content.push_str(&format!("**Timestamp:** {:?}\n", entry.timestamp));
            content.push_str(&format!("**Provider:** {}\n", entry.provider));
            content.push_str(&format!("**Model:** {}\n", entry.model));
            content.push_str(&format!("**Summary:** {}\n\n", entry.conversation_summary));

            if !entry.key_decisions.is_empty() {
                content.push_str("**Key Decisions:**\n");
                for decision in &entry.key_decisions {
                    content.push_str(&format!("- Key Decision: {}\n", decision));
                }
                content.push('\n');
            }

            if !entry.context.is_empty() {
                content.push_str("**Context:**\n");
                for (key, value) in &entry.context {
                    content.push_str(&format!("- {}: {}\n", key, value));
                }
                content.push('\n');
            }

            if !entry.tags.is_empty() {
                content.push_str(&format!("**Tags:** {}\n", entry.tags.join(", ")));
                content.push('\n');
            }

            content.push_str("---\n\n");
        }

        content
    }

    fn generate_initial_markdown(&self) -> String {
        format!(
r#"# AGENTS.md

**Version:** {}
**Created:** {:?}
**Last Updated:** {:?}
**Total Entries:** 0
**Retention Days:** {}
**Audit Enabled:** {}

---

## Agent Conversation Memory

This file maintains a record of AI agent conversations and decisions for context preservation and audit purposes.

### Purpose
- **Context Preservation**: Maintain conversation history across sessions
- **Decision Tracking**: Record key decisions made by AI agents
- **Audit Trail**: Provide transparency for AI agent interactions
- **Learning**: Enable agents to learn from past conversations

### Structure
Each session entry contains:
- Session ID and timestamp
- Provider and model information
- Conversation summary
- Key decisions made
- Relevant context and tags

---

*No entries yet. Start a conversation to populate this memory.*
"#,
            self.metadata.version,
            self.metadata.created_at,
            self.metadata.last_updated,
            self.metadata.retention_days,
            self.metadata.enable_audit
        )
    }

    pub fn metadata(&self) -> &AgentMetadata {
        &self.metadata
    }

    pub fn set_retention_days(&mut self, days: u32) {
        self.metadata.retention_days = days;
    }

    pub fn set_audit_enabled(&mut self, enabled: bool) {
        self.metadata.enable_audit = enabled;
    }

    pub fn get_stats(&self) -> MemoryStats {
        let total_entries = self.entries.len();
        let providers: std::collections::HashSet<String> = self.entries.iter().map(|e| e.provider.clone()).collect();
        let models: std::collections::HashSet<String> = self.entries.iter().map(|e| e.model.clone()).collect();
        let tags: std::collections::HashSet<String> = self.entries.iter().flat_map(|e| e.tags.iter().cloned()).collect();

        let oldest_entry = self.entries.iter().min_by_key(|e| e.timestamp).map(|e| e.timestamp);
        let newest_entry = self.entries.iter().max_by_key(|e| e.timestamp).map(|e| e.timestamp);

        MemoryStats {
            total_entries,
            unique_providers: providers.len(),
            unique_models: models.len(),
            unique_tags: tags.len(),
            oldest_entry,
            newest_entry,
        }
    }
}

#[derive(Debug, Clone)]
pub struct MemoryStats {
    pub total_entries: usize,
    pub unique_providers: usize,
    pub unique_models: usize,
    pub unique_tags: usize,
    pub oldest_entry: Option<std::time::SystemTime>,
    pub newest_entry: Option<std::time::SystemTime>,
}

impl AgentEntry {
    pub fn new(
        session_id: String,
        provider: String,
        model: String,
        conversation_summary: String,
    ) -> Self {
        Self {
            timestamp: std::time::SystemTime::now(),
            session_id,
            provider,
            model,
            conversation_summary,
            key_decisions: Vec::new(),
            context: HashMap::new(),
            tags: Vec::new(),
        }
    }

    pub fn with_decisions(mut self, decisions: Vec<String>) -> Self {
        self.key_decisions = decisions;
        self
    }

    pub fn with_context(mut self, context: HashMap<String, serde_json::Value>) -> Self {
        self.context = context;
        self
    }

    pub fn with_tags(mut self, tags: Vec<String>) -> Self {
        self.tags = tags;
        self
    }

    pub fn add_decision(&mut self, decision: String) {
        self.key_decisions.push(decision);
    }

    pub fn add_context(&mut self, key: String, value: serde_json::Value) {
        self.context.insert(key, value);
    }

    pub fn add_tag(&mut self, tag: String) {
        if !self.tags.contains(&tag) {
            self.tags.push(tag);
        }
    }
}

// Extension trait for Duration to add days
trait DurationExt {
    fn from_days(days: u64) -> Self;
}

impl DurationExt for std::time::Duration {
    fn from_days(days: u64) -> Self {
        Self::from_secs(days * 24 * 60 * 60)
    }
}
