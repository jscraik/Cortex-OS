use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use tracing::{debug, info};

/// Enhanced scrollback manager inspired by OpenAI Codex's conversation history
/// Provides expandable entries, session management, and efficient scrolling
#[derive(Debug, Clone)]
pub struct ScrollbackManager {
    history: ConversationHistory,
    scroll_state: ScrollState,
    view_config: ViewConfig,
    session_manager: SessionManager,
}

#[derive(Debug, Clone)]
pub struct ConversationHistory {
    entries: VecDeque<ExpandableEntry>,
    max_entries: usize,
    current_session: String,
    total_entries: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpandableEntry {
    pub id: String,
    pub entry_type: EntryType,
    pub timestamp: DateTime<Utc>,
    pub title: String,
    pub summary: String,
    pub full_content: String,
    pub expanded: bool,
    pub metadata: EntryMetadata,
    pub session_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EntryType {
    UserMessage,
    AssistantMessage,
    ToolCall { tool_name: String, status: ToolStatus },
    SystemEvent { event_type: String },
    ErrorMessage { error_code: Option<String> },
    SessionMarker { session_name: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ToolStatus {
    Pending,
    Running,
    Completed,
    Failed { error: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntryMetadata {
    pub provider: Option<String>,
    pub model: Option<String>,
    pub tokens_used: Option<u32>,
    pub processing_time_ms: Option<u64>,
    pub confidence_score: Option<f32>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct ScrollState {
    pub offset: usize,
    pub visible_lines: usize,
    pub total_lines: usize,
    pub selected_index: Option<usize>,
    pub auto_scroll: bool,
}

#[derive(Debug, Clone)]
pub struct ViewConfig {
    pub show_timestamps: bool,
    pub show_metadata: bool,
    pub compact_mode: bool,
    pub max_line_length: usize,
    pub expand_on_select: bool,
    pub highlight_pattern: Option<String>,
}

#[derive(Debug, Clone)]
pub struct SessionManager {
    sessions: VecDeque<SessionInfo>,
    current_session: String,
    max_sessions: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfo {
    pub id: String,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    pub entry_count: usize,
    pub provider: String,
}

#[derive(Debug, Clone)]
pub enum ScrollbackEventResponse {
    EntryExpanded { entry_id: String },
    EntryCollapsed { entry_id: String },
    SessionChanged { session_id: String },
    ScrollPositionChanged { offset: usize },
    EntrySelected { entry_id: String },
    CopyToClipboard { content: String },
    None,
}

impl Default for ScrollbackManager {
    fn default() -> Self {
        Self::new()
    }
}

impl ScrollbackManager {
    pub fn new() -> Self {
        Self {
            history: ConversationHistory {
                entries: VecDeque::new(),
                max_entries: 1000,
                current_session: uuid::Uuid::new_v4().to_string(),
                total_entries: 0,
            },
            scroll_state: ScrollState {
                offset: 0,
                visible_lines: 0,
                total_lines: 0,
                selected_index: None,
                auto_scroll: true,
            },
            view_config: ViewConfig {
                show_timestamps: true,
                show_metadata: false,
                compact_mode: false,
                max_line_length: 120,
                expand_on_select: true,
                highlight_pattern: None,
            },
            session_manager: SessionManager {
                sessions: VecDeque::new(),
                current_session: uuid::Uuid::new_v4().to_string(),
                max_sessions: 50,
            },
        }
    }

    /// Add a new entry to the conversation history
    pub fn add_entry(&mut self, entry: ExpandableEntry) {
        debug!("Adding entry: {} (type: {:?})", entry.title, entry.entry_type);

        // Add to current session
        let mut entry = entry;
        entry.session_id = self.history.current_session.clone();

        self.history.entries.push_back(entry);
        self.history.total_entries += 1;

        // Maintain max entries limit
        while self.history.entries.len() > self.history.max_entries {
            self.history.entries.pop_front();
        }

        // Auto-scroll to bottom if enabled
        if self.scroll_state.auto_scroll {
            self.scroll_to_bottom();
        }

        // Update session activity
        self.update_session_activity();
    }

    /// Create a user message entry
    pub fn add_user_message(&mut self, content: &str) {
        let entry = ExpandableEntry {
            id: uuid::Uuid::new_v4().to_string(),
            entry_type: EntryType::UserMessage,
            timestamp: Utc::now(),
            title: if content.len() > 50 {
                format!("{}...", &content[..47])
            } else {
                content.to_string()
            },
            summary: content.lines().take(3).collect::<Vec<_>>().join(" "),
            full_content: content.to_string(),
            expanded: false,
            metadata: EntryMetadata {
                provider: None,
                model: None,
                tokens_used: None,
                processing_time_ms: None,
                confidence_score: None,
                tags: vec!["user".to_string()],
            },
            session_id: String::new(), // Will be set in add_entry
        };
        self.add_entry(entry);
    }

    /// Create an assistant message entry
    pub fn add_assistant_message(&mut self, content: &str, provider: Option<String>, model: Option<String>) {
        let entry = ExpandableEntry {
            id: uuid::Uuid::new_v4().to_string(),
            entry_type: EntryType::AssistantMessage,
            timestamp: Utc::now(),
            title: if content.len() > 50 {
                format!("{}...", &content[..47])
            } else {
                content.to_string()
            },
            summary: content.lines().take(3).collect::<Vec<_>>().join(" "),
            full_content: content.to_string(),
            expanded: false,
            metadata: EntryMetadata {
                provider,
                model,
                tokens_used: None,
                processing_time_ms: None,
                confidence_score: None,
                tags: vec!["assistant".to_string()],
            },
            session_id: String::new(),
        };
        self.add_entry(entry);
    }

    /// Create a tool call entry
    pub fn add_tool_call(&mut self, tool_name: &str, status: ToolStatus, content: &str) {
        let entry = ExpandableEntry {
            id: uuid::Uuid::new_v4().to_string(),
            entry_type: EntryType::ToolCall {
                tool_name: tool_name.to_string(),
                status,
            },
            timestamp: Utc::now(),
            title: format!("Tool: {}", tool_name),
            summary: if content.len() > 100 {
                format!("{}...", &content[..97])
            } else {
                content.to_string()
            },
            full_content: content.to_string(),
            expanded: false,
            metadata: EntryMetadata {
                provider: None,
                model: None,
                tokens_used: None,
                processing_time_ms: None,
                confidence_score: None,
                tags: vec!["tool".to_string(), tool_name.to_string()],
            },
            session_id: String::new(),
        };
        self.add_entry(entry);
    }

    /// Toggle expansion of an entry
    pub fn toggle_entry_expansion(&mut self, entry_id: &str) -> ScrollbackEventResponse {
        for entry in &mut self.history.entries {
            if entry.id == entry_id {
                entry.expanded = !entry.expanded;
                info!("Entry {} expanded: {}", entry_id, entry.expanded);

                if entry.expanded {
                    return ScrollbackEventResponse::EntryExpanded {
                        entry_id: entry_id.to_string(),
                    };
                } else {
                    return ScrollbackEventResponse::EntryCollapsed {
                        entry_id: entry_id.to_string(),
                    };
                }
            }
        }
        ScrollbackEventResponse::None
    }

    /// Scroll to bottom
    pub fn scroll_to_bottom(&mut self) {
        self.scroll_state.offset = self.scroll_state.total_lines.saturating_sub(self.scroll_state.visible_lines);
    }

    /// Scroll to top
    pub fn scroll_to_top(&mut self) {
        self.scroll_state.offset = 0;
    }

    /// Scroll up by lines
    pub fn scroll_up(&mut self, lines: usize) {
        self.scroll_state.offset = self.scroll_state.offset.saturating_sub(lines);
    }

    /// Scroll down by lines
    pub fn scroll_down(&mut self, lines: usize) {
        let max_offset = self.scroll_state.total_lines.saturating_sub(self.scroll_state.visible_lines);
        self.scroll_state.offset = (self.scroll_state.offset + lines).min(max_offset);
    }

    /// Select next entry
    pub fn select_next(&mut self) {
        if let Some(index) = self.scroll_state.selected_index {
            if index < self.history.entries.len().saturating_sub(1) {
                self.scroll_state.selected_index = Some(index + 1);
            }
        } else if !self.history.entries.is_empty() {
            self.scroll_state.selected_index = Some(0);
        }
    }

    /// Select previous entry
    pub fn select_previous(&mut self) {
        if let Some(index) = self.scroll_state.selected_index {
            if index > 0 {
                self.scroll_state.selected_index = Some(index - 1);
            }
        } else if !self.history.entries.is_empty() {
            self.scroll_state.selected_index = Some(self.history.entries.len() - 1);
        }
    }

    /// Get selected entry
    pub fn get_selected_entry(&self) -> Option<&ExpandableEntry> {
        if let Some(index) = self.scroll_state.selected_index {
            self.history.entries.get(index)
        } else {
            None
        }
    }

    /// Create new session
    pub fn create_session(&mut self, name: &str, provider: &str) -> String {
        let session_id = uuid::Uuid::new_v4().to_string();
        let session = SessionInfo {
            id: session_id.clone(),
            name: name.to_string(),
            created_at: Utc::now(),
            last_activity: Utc::now(),
            entry_count: 0,
            provider: provider.to_string(),
        };

        self.session_manager.sessions.push_back(session);
        while self.session_manager.sessions.len() > self.session_manager.max_sessions {
            self.session_manager.sessions.pop_front();
        }

        // Switch to new session
        self.switch_session(&session_id);
        session_id
    }

    /// Switch to a different session
    pub fn switch_session(&mut self, session_id: &str) {
        self.history.current_session = session_id.to_string();
        self.session_manager.current_session = session_id.to_string();

        // Clear current history (in a real implementation, you'd load from storage)
        self.history.entries.clear();
        self.scroll_state.offset = 0;
        self.scroll_state.selected_index = None;

        info!("Switched to session: {}", session_id);
    }

    /// Update session activity timestamp
    fn update_session_activity(&mut self) {
        for session in &mut self.session_manager.sessions {
            if session.id == self.history.current_session {
                session.last_activity = Utc::now();
                session.entry_count += 1;
                break;
            }
        }
    }

    /// Get current session info
    pub fn get_current_session(&self) -> Option<&SessionInfo> {
        self.session_manager.sessions
            .iter()
            .find(|s| s.id == self.history.current_session)
    }

    /// Get all sessions
    pub fn get_sessions(&self) -> &VecDeque<SessionInfo> {
        &self.session_manager.sessions
    }

    /// Search entries by content
    pub fn search(&self, query: &str) -> Vec<&ExpandableEntry> {
        let query_lower = query.to_lowercase();
        self.history.entries
            .iter()
            .filter(|entry| {
                entry.title.to_lowercase().contains(&query_lower) ||
                entry.full_content.to_lowercase().contains(&query_lower) ||
                entry.summary.to_lowercase().contains(&query_lower)
            })
            .collect()
    }

    /// Export conversation history
    pub fn export_history(&self, format: &str) -> Result<String> {
        match format {
            "json" => Ok(serde_json::to_string_pretty(&self.history.entries)?),
            "markdown" => {
                let mut output = String::new();
                for entry in &self.history.entries {
                    output.push_str(&format!("## {} ({})\n\n", entry.title, entry.timestamp.format("%Y-%m-%d %H:%M:%S")));
                    output.push_str(&entry.full_content);
                    output.push_str("\n\n---\n\n");
                }
                Ok(output)
            }
            _ => anyhow::bail!("Unsupported export format: {}", format),
        }
    }

    /// Update view configuration
    pub fn update_view_config(&mut self, config: ViewConfig) {
        self.view_config = config;
    }

    /// Get view configuration
    pub fn get_view_config(&self) -> &ViewConfig {
        &self.view_config
    }

    /// Get total entry count
    pub fn get_total_entries(&self) -> usize {
        self.history.total_entries
    }

    /// Get current entry count
    pub fn get_current_entries(&self) -> usize {
        self.history.entries.len()
    }
}
