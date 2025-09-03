use anyhow::Result;
use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Paragraph, Wrap},
    Frame,
};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use tui_input::{Input, InputRequest};
use tracing::{debug, info};

/// Enhanced input component with multi-line support, history, and auto-completion
/// Inspired by OpenAI Codex and SST OpenCode input handling
#[derive(Debug, Clone)]
pub struct EnhancedInput {
    input: Input,
    mode: InputMode,
    history: InputHistory,
    auto_complete: AutoComplete,
    config: InputConfig,
    state: InputState,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum InputMode {
    /// Single line input (default)
    SingleLine,
    /// Multi-line input with Shift+Enter for new lines
    MultiLine,
    /// Command mode (for commands starting with /)
    Command,
    /// Search mode
    Search,
}

#[derive(Debug, Clone)]
pub struct InputHistory {
    entries: VecDeque<String>,
    max_entries: usize,
    current_index: Option<usize>,
    search_mode: bool,
    search_query: String,
}

#[derive(Debug, Clone)]
pub struct AutoComplete {
    suggestions: Vec<Suggestion>,
    selected_index: usize,
    active: bool,
    trigger_chars: Vec<char>,
    min_trigger_length: usize,
}

#[derive(Debug, Clone)]
pub struct Suggestion {
    pub text: String,
    pub description: String,
    pub category: SuggestionCategory,
    pub score: f32,
}

#[derive(Debug, Clone, PartialEq)]
pub enum SuggestionCategory {
    Command,
    Tool,
    Variable,
    File,
    Directory,
    History,
}

#[derive(Debug, Clone)]
pub struct InputConfig {
    pub max_line_length: usize,
    pub max_lines: usize,
    pub enable_history: bool,
    pub enable_auto_complete: bool,
    pub enable_syntax_highlighting: bool,
    pub placeholder_text: String,
    pub show_line_numbers: bool,
}

#[derive(Debug, Clone)]
pub struct InputState {
    pub cursor_position: (usize, usize), // (line, column)
    pub selection: Option<TextSelection>,
    pub is_focused: bool,
    pub is_dirty: bool,
    pub lines: Vec<String>,
    pub scroll_offset: usize,
}

#[derive(Debug, Clone)]
pub struct TextSelection {
    pub start: (usize, usize),
    pub end: (usize, usize),
}

#[derive(Debug, Clone)]
pub enum InputEventResponse {
    /// Submit the current input
    Submit { content: String, mode: InputMode },
    /// Content changed
    ContentChanged { content: String },
    /// Mode changed
    ModeChanged { mode: InputMode },
    /// Request auto-completion
    RequestAutoComplete { partial: String, position: usize },
    /// History navigation
    HistoryNavigation { direction: HistoryDirection },
    /// Cancel current input
    Cancel,
    /// No action
    None,
}

#[derive(Debug, Clone, Copy)]
pub enum HistoryDirection {
    Previous,
    Next,
}

impl Default for EnhancedInput {
    fn default() -> Self {
        Self::new()
    }
}

impl EnhancedInput {
    pub fn new() -> Self {
        Self {
            input: Input::default(),
            mode: InputMode::SingleLine,
            history: InputHistory {
                entries: VecDeque::new(),
                max_entries: 1000,
                current_index: None,
                search_mode: false,
                search_query: String::new(),
            },
            auto_complete: AutoComplete {
                suggestions: Vec::new(),
                selected_index: 0,
                active: false,
                trigger_chars: vec!['/', '@', '#'],
                min_trigger_length: 2,
            },
            config: InputConfig {
                max_line_length: 120,
                max_lines: 10,
                enable_history: true,
                enable_auto_complete: true,
                enable_syntax_highlighting: false,
                placeholder_text: "Type your message...".to_string(),
                show_line_numbers: false,
            },
            state: InputState {
                cursor_position: (0, 0),
                selection: None,
                is_focused: false,
                is_dirty: false,
                lines: vec![String::new()],
                scroll_offset: 0,
            },
        }
    }

    /// Handle key events
    pub fn handle_key_event(&mut self, event: KeyEvent) -> Result<InputEventResponse> {
        debug!("Handling key event: {:?} in mode: {:?}", event, self.mode);

        match (event.code, event.modifiers) {
            // Submit input
            (KeyCode::Enter, KeyModifiers::NONE) => {
                if self.mode == InputMode::MultiLine {
                    self.insert_newline()?;
                    Ok(InputEventResponse::ContentChanged {
                        content: self.get_content(),
                    })
                } else {
                    self.submit()
                }
            }

            // Multi-line input: Shift+Enter for new line, Enter for submit
            (KeyCode::Enter, KeyModifiers::SHIFT) => {
                if self.mode == InputMode::MultiLine {
                    self.submit()
                } else {
                    self.insert_newline()?;
                    Ok(InputEventResponse::ContentChanged {
                        content: self.get_content(),
                    })
                }
            }

            // Cancel input
            (KeyCode::Esc, _) => {
                if self.auto_complete.active {
                    self.auto_complete.active = false;
                    Ok(InputEventResponse::None)
                } else {
                    self.clear();
                    Ok(InputEventResponse::Cancel)
                }
            }

            // History navigation
            (KeyCode::Up, KeyModifiers::CONTROL) => {
                self.navigate_history(HistoryDirection::Previous)?;
                Ok(InputEventResponse::HistoryNavigation {
                    direction: HistoryDirection::Previous,
                })
            }
            (KeyCode::Down, KeyModifiers::CONTROL) => {
                self.navigate_history(HistoryDirection::Next)?;
                Ok(InputEventResponse::HistoryNavigation {
                    direction: HistoryDirection::Next,
                })
            }

            // Auto-completion
            (KeyCode::Tab, _) => {
                if self.auto_complete.active {
                    self.accept_suggestion()?;
                    Ok(InputEventResponse::ContentChanged {
                        content: self.get_content(),
                    })
                } else {
                    self.trigger_auto_complete()?;
                    Ok(InputEventResponse::RequestAutoComplete {
                        partial: self.get_current_word(),
                        position: self.input.visual_cursor(),
                    })
                }
            }

            // Auto-complete navigation
            (KeyCode::Up, _) if self.auto_complete.active => {
                self.auto_complete.selected_index = self.auto_complete.selected_index
                    .saturating_sub(1);
                Ok(InputEventResponse::None)
            }
            (KeyCode::Down, _) if self.auto_complete.active => {
                if self.auto_complete.selected_index < self.auto_complete.suggestions.len().saturating_sub(1) {
                    self.auto_complete.selected_index += 1;
                }
                Ok(InputEventResponse::None)
            }

            // Mode switching
            (KeyCode::Char('/'), KeyModifiers::NONE) if self.input.value().is_empty() => {
                self.set_mode(InputMode::Command);
                self.input.handle(InputRequest::InsertChar('/'));
                Ok(InputEventResponse::ModeChanged {
                    mode: InputMode::Command,
                })
            }

            // Regular input handling
            _ => {
                let old_content = self.get_content();

                // Convert KeyEvent to tui_input compatible handling
                match event.code {
                    KeyCode::Char(c) => {
                        self.input.handle(InputRequest::InsertChar(c));
                    }
                    KeyCode::Backspace => {
                        self.input.handle(InputRequest::DeletePrevChar);
                    }
                    KeyCode::Delete => {
                        self.input.handle(InputRequest::DeleteNextChar);
                    }
                    KeyCode::Left => {
                        self.input.handle(InputRequest::GoToPrevChar);
                    }
                    KeyCode::Right => {
                        self.input.handle(InputRequest::GoToNextChar);
                    }
                    KeyCode::Home => {
                        self.input.handle(InputRequest::GoToStart);
                    }
                    KeyCode::End => {
                        self.input.handle(InputRequest::GoToEnd);
                    }
                    _ => {}
                }

                let new_content = self.get_content();

                if old_content != new_content {
                    self.state.is_dirty = true;
                    self.update_auto_complete()?;
                    Ok(InputEventResponse::ContentChanged {
                        content: new_content,
                    })
                } else {
                    Ok(InputEventResponse::None)
                }
            }
        }
    }

    /// Submit current input
    fn submit(&mut self) -> Result<InputEventResponse> {
        let content = self.get_content();
        if !content.trim().is_empty() {
            self.add_to_history(&content);
            let mode = self.mode;
            self.clear();
            Ok(InputEventResponse::Submit { content, mode })
        } else {
            Ok(InputEventResponse::None)
        }
    }

    /// Insert newline at cursor position
    fn insert_newline(&mut self) -> Result<()> {
        if self.state.lines.len() < self.config.max_lines {
            self.input.handle(InputRequest::InsertChar('\n'));
            self.update_lines();
        }
        Ok(())
    }

    /// Clear input
    pub fn clear(&mut self) {
        self.input.reset();
        self.state.lines = vec![String::new()];
        self.state.cursor_position = (0, 0);
        self.state.is_dirty = false;
        self.auto_complete.active = false;
        self.history.current_index = None;
    }

    /// Get current input content
    pub fn get_content(&self) -> String {
        self.input.value().to_string()
    }

    /// Set input content
    pub fn set_content(&mut self, content: &str) {
        self.input = Input::new(content.to_string());
        self.update_lines();
        self.state.is_dirty = true;
    }

    /// Update internal line representation
    fn update_lines(&mut self) {
        self.state.lines = self.input.value().lines().map(|s| s.to_string()).collect();
        if self.state.lines.is_empty() {
            self.state.lines.push(String::new());
        }
    }

    /// Set input mode
    pub fn set_mode(&mut self, mode: InputMode) {
        if self.mode != mode {
            info!("Input mode changed from {:?} to {:?}", self.mode, mode);
            self.mode = mode;

            // Clear command prefix when switching away from command mode
            if mode != InputMode::Command && self.input.value().starts_with('/') {
                self.clear();
            }
        }
    }

    /// Get current mode
    pub fn get_mode(&self) -> InputMode {
        self.mode
    }

    /// Add entry to history
    fn add_to_history(&mut self, content: &str) {
        if !self.config.enable_history || content.trim().is_empty() {
            return;
        }

        // Don't add duplicates of the last entry
        if self.history.entries.back() == Some(&content.to_string()) {
            return;
        }

        self.history.entries.push_back(content.to_string());

        // Maintain max entries
        while self.history.entries.len() > self.history.max_entries {
            self.history.entries.pop_front();
        }

        debug!("Added to history: {} (total: {})", content, self.history.entries.len());
    }

    /// Navigate through input history
    fn navigate_history(&mut self, direction: HistoryDirection) -> Result<()> {
        if !self.config.enable_history || self.history.entries.is_empty() {
            return Ok(());
        }

        match direction {
            HistoryDirection::Previous => {
                if let Some(current) = self.history.current_index {
                    if current > 0 {
                        self.history.current_index = Some(current - 1);
                    }
                } else {
                    self.history.current_index = Some(self.history.entries.len() - 1);
                }
            }
            HistoryDirection::Next => {
                if let Some(current) = self.history.current_index {
                    if current < self.history.entries.len() - 1 {
                        self.history.current_index = Some(current + 1);
                    } else {
                        self.history.current_index = None;
                        self.clear();
                        return Ok(());
                    }
                }
            }
        }

        if let Some(index) = self.history.current_index {
            if let Some(entry) = self.history.entries.get(index) {
                let content = entry.clone();
                self.set_content(&content);
            }
        }

        Ok(())
    }

    /// Trigger auto-completion
    fn trigger_auto_complete(&mut self) -> Result<()> {
        if !self.config.enable_auto_complete {
            return Ok(());
        }

        let current_word = self.get_current_word();
        if current_word.len() >= self.auto_complete.min_trigger_length {
            self.auto_complete.active = true;
            self.update_suggestions(&current_word);
        }

        Ok(())
    }

    /// Update auto-completion suggestions
    fn update_auto_complete(&mut self) -> Result<()> {
        if !self.config.enable_auto_complete {
            return Ok(());
        }

        let current_word = self.get_current_word();

        // Check if we should trigger auto-complete
        let should_trigger = current_word.chars().any(|c| self.auto_complete.trigger_chars.contains(&c)) ||
                           current_word.len() >= self.auto_complete.min_trigger_length;

        if should_trigger {
            self.auto_complete.active = true;
            self.update_suggestions(&current_word);
        } else {
            self.auto_complete.active = false;
        }

        Ok(())
    }

    /// Update auto-completion suggestions based on current word
    fn update_suggestions(&mut self, word: &str) {
        self.auto_complete.suggestions.clear();
        self.auto_complete.selected_index = 0;

        // Command suggestions
        if word.starts_with('/') {
            self.add_command_suggestions(word);
        }

        // History suggestions
        self.add_history_suggestions(word);

        // Tool suggestions
        self.add_tool_suggestions(word);
    }

    /// Add command suggestions
    fn add_command_suggestions(&mut self, word: &str) {
        let commands = vec![
            ("/help", "Show help information"),
            ("/clear", "Clear the conversation"),
            ("/history", "Show command history"),
            ("/mode", "Switch input mode"),
            ("/save", "Save conversation"),
            ("/load", "Load conversation"),
            ("/settings", "Open settings"),
            ("/github", "GitHub operations"),
            ("/mcp", "MCP server operations"),
            ("/tunnel", "Cloudflare tunnel operations"),
            // Codex-style AI commands
            ("/explain", "Explain selected code or concept"),
            ("/refactor", "Suggest code improvements for selected code"),
            ("/test", "Generate unit tests for selected code"),
            ("/document", "Create documentation for selected code"),
            ("/find", "Search for code patterns in project"),
            ("/fix", "Suggest bug fixes for error messages"),
            ("/optimize", "Optimize performance of selected code"),
            ("/security", "Scan selected code for vulnerabilities"),
            ("/complexity", "Analyze code complexity metrics"),
            ("/dependencies", "Analyze project dependencies"),
            ("/review", "Perform code review on selected code"),
            ("/suggest", "Get AI suggestions for improving code"),
            ("/debug", "Help debug issues with code"),
            // Model management commands
            ("/model", "Show current model or switch models"),
        ];

        for (cmd, desc) in commands {
            if cmd.starts_with(word) {
                self.auto_complete.suggestions.push(Suggestion {
                    text: cmd.to_string(),
                    description: desc.to_string(),
                    category: SuggestionCategory::Command,
                    score: 1.0,
                });
            }
        }
    }

    /// Add history-based suggestions
    fn add_history_suggestions(&mut self, word: &str) {
        if word.len() < 2 {
            return;
        }

        for entry in self.history.entries.iter().rev().take(10) {
            if entry.to_lowercase().contains(&word.to_lowercase()) && entry != word {
                self.auto_complete.suggestions.push(Suggestion {
                    text: entry.clone(),
                    description: "From history".to_string(),
                    category: SuggestionCategory::History,
                    score: 0.8,
                });
            }
        }
    }

    /// Add tool suggestions
    fn add_tool_suggestions(&mut self, word: &str) {
        let tools = vec![
            ("@github", "GitHub integration tools"),
            ("@mcp", "MCP server tools"),
            ("@file", "File operations"),
            ("@search", "Search operations"),
        ];

        for (tool, desc) in tools {
            if tool.starts_with(word) {
                self.auto_complete.suggestions.push(Suggestion {
                    text: tool.to_string(),
                    description: desc.to_string(),
                    category: SuggestionCategory::Tool,
                    score: 0.9,
                });
            }
        }
    }

    /// Accept currently selected suggestion
    fn accept_suggestion(&mut self) -> Result<()> {
        if let Some(suggestion) = self.auto_complete.suggestions.get(self.auto_complete.selected_index) {
            let current_word = self.get_current_word();
            let current_content = self.get_content();

            // Replace the current word with the suggestion
            let new_content = if let Some(word_start) = current_content.rfind(&current_word) {
                format!("{}{}", &current_content[..word_start], suggestion.text)
            } else {
                suggestion.text.clone()
            };

            self.set_content(&new_content);
            self.auto_complete.active = false;
        }
        Ok(())
    }

    /// Get the current word being typed
    fn get_current_word(&self) -> String {
        let content = self.get_content();
        let cursor_pos = self.input.visual_cursor();

        if cursor_pos == 0 {
            return String::new();
        }

        let chars: Vec<char> = content.chars().collect();
        let mut start = cursor_pos.saturating_sub(1);

        // Find start of current word
        while start > 0 && !chars[start].is_whitespace() {
            start -= 1;
        }

        if start > 0 && chars[start].is_whitespace() {
            start += 1;
        }

        chars[start..cursor_pos.min(chars.len())].iter().collect()
    }

    /// Get auto-completion suggestions
    pub fn get_suggestions(&self) -> &[Suggestion] {
        &self.auto_complete.suggestions
    }

    /// Check if auto-completion is active
    pub fn is_auto_complete_active(&self) -> bool {
        self.auto_complete.active
    }

    /// Get selected suggestion index
    pub fn get_selected_suggestion_index(&self) -> usize {
        self.auto_complete.selected_index
    }

    /// Set focus state
    pub fn set_focused(&mut self, focused: bool) {
        self.state.is_focused = focused;
    }

    /// Check if input is focused
    pub fn is_focused(&self) -> bool {
        self.state.is_focused
    }

    /// Check if input has unsaved changes
    pub fn is_dirty(&self) -> bool {
        self.state.is_dirty
    }

    /// Get input configuration
    pub fn get_config(&self) -> &InputConfig {
        &self.config
    }

    /// Update input configuration
    pub fn update_config(&mut self, config: InputConfig) {
        self.config = config;
    }
}
