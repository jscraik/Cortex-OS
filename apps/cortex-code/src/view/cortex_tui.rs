/// Codex-like TUI interface with integrated background tools
/// Based on OpenAI Codex patterns but enhanced with Cortex features
use anyhow::Result;
use crossterm::event::{Event as CrosstermEvent, KeyCode, KeyModifiers};
use ratatui::{
    backend::CrosstermBackend,
    layout::{Constraint, Direction, Layout, Margin},
    style::{Color, Modifier, Style},
    text::{Line, Span, Text},
    widgets::{Block, Borders, Clear, List, ListItem, Paragraph, Wrap},
    Frame, Terminal,
};
use std::io;
use tokio::sync::mpsc;
use tracing::{info, warn};

use crate::{
    app::{CortexApp, Message},
    config::Config,
    view::chat::ChatHistory,
};

/// Background tool managers (integrated, not separate views)
pub struct BackgroundTools {
    pub mcp_manager: McpManager,
    pub github_monitor: GitHubMonitor,
    pub a2a_monitor: A2aMonitor,
    pub command_executor: CommandExecutor,
}

/// Codex-style TUI interface with background tool integration
pub struct CodexTui {
    chat_history: ChatHistory,
    input_buffer: String,
    cursor_position: usize,
    background_tools: BackgroundTools,
    command_palette: CommandPalette,
    status_info: StatusInfo,
    is_streaming: bool,
    streaming_buffer: String,
    config: Config,
}

/// Command palette for accessing background tools (Ctrl+P like VS Code)
#[derive(Debug, Default)]
pub struct CommandPalette {
    visible: bool,
    input: String,
    selected_index: usize,
    commands: Vec<PaletteCommand>,
}

#[derive(Debug, Clone)]
pub struct PaletteCommand {
    pub id: String,
    pub label: String,
    pub description: String,
    pub category: String,
}

/// Status information displayed at bottom
#[derive(Debug, Default)]
pub struct StatusInfo {
    current_provider: String,
    model: String,
    approval_mode: String,
    tools_available: Vec<String>,
    token_usage: Option<(u32, u32)>, // (used, total)
}

/// Background MCP manager (not a view)
pub struct McpManager {
    available_servers: Vec<String>,
    active_tools: Vec<String>,
}

/// Background GitHub monitor (not a view)
pub struct GitHubMonitor {
    current_repo: Option<String>,
    recent_activity: Vec<String>,
}

/// Background A2A monitor (not a view)
pub struct A2aMonitor {
    recent_events: Vec<String>,
    event_count: u32,
}

/// Command executor for slash commands
pub struct CommandExecutor {
    current_dir: std::path::PathBuf,
}

impl CodexTui {
    pub fn new(config: Config) -> Self {
        let background_tools = BackgroundTools {
            mcp_manager: McpManager::new(),
            github_monitor: GitHubMonitor::new(),
            a2a_monitor: A2aMonitor::new(),
            command_executor: CommandExecutor::new(),
        };

        let mut command_palette = CommandPalette::default();
        command_palette.initialize_commands();

        Self {
            chat_history: ChatHistory::new(),
            input_buffer: String::new(),
            cursor_position: 0,
            background_tools,
            command_palette,
            status_info: StatusInfo::default(),
            is_streaming: false,
            streaming_buffer: String::new(),
            config,
        }
    }

    /// Start the Codex-like TUI interface
    pub async fn run(&mut self, app: &mut CortexApp) -> Result<()> {
        // Initialize background tools
        self.background_tools.initialize().await?;

        // Update status info
        self.update_status_info(app).await?;

        // Add welcome message
        self.chat_history.add_message(Message::system(
            "Welcome to Cortex Code! Type your request or use /help for commands."
        ));

        info!("Starting Codex-style TUI with background tools");

        loop {
            // Handle any background tool updates
            self.background_tools.process_updates().await?;

            // Render interface
            if let Err(e) = self.render() {
                warn!("Render error: {}", e);
                continue;
            }

            // Handle events
            if crossterm::event::poll(std::time::Duration::from_millis(100))? {
                match crossterm::event::read()? {
                    CrosstermEvent::Key(key_event) => {
                        match self.handle_key_event(key_event, app).await? {
                            EventResponse::Continue => continue,
                            EventResponse::Exit => break,
                        }
                    }
                    _ => {}
                }
            }
        }

        Ok(())
    }

    /// Handle key events (similar to Codex)
    async fn handle_key_event(
        &mut self,
        key_event: crossterm::event::KeyEvent,
        app: &mut CortexApp,
    ) -> Result<EventResponse> {
        match (key_event.code, key_event.modifiers) {
            // Exit commands
            (KeyCode::Char('q'), KeyModifiers::CONTROL) | (KeyCode::Esc, _) => {
                return Ok(EventResponse::Exit);
            }

            // Command palette (like VS Code Ctrl+P)
            (KeyCode::Char('p'), KeyModifiers::CONTROL) => {
                self.command_palette.show();
            }

            // Handle command palette
            _ if self.command_palette.visible => {
                self.handle_command_palette_event(key_event, app).await?;
            }

            // Enter - send message
            (KeyCode::Enter, _) => {
                if !self.input_buffer.trim().is_empty() {
                    let message = self.input_buffer.trim().to_string();
                    self.input_buffer.clear();
                    self.cursor_position = 0;

                    if message.starts_with('/') {
                        // Handle slash commands (Codex-like)
                        self.handle_slash_command(&message, app).await?;
                    } else {
                        // Send to AI with background tool access
                        self.send_ai_message(message, app).await?;
                    }
                }
            }

            // Text input
            (KeyCode::Char(c), _) => {
                self.input_buffer.insert(self.cursor_position, c);
                self.cursor_position += 1;
            }

            // Backspace
            (KeyCode::Backspace, _) => {
                if self.cursor_position > 0 {
                    self.input_buffer.remove(self.cursor_position - 1);
                    self.cursor_position -= 1;
                }
            }

            // Navigation
            (KeyCode::Left, _) => {
                if self.cursor_position > 0 {
                    self.cursor_position -= 1;
                }
            }
            (KeyCode::Right, _) => {
                if self.cursor_position < self.input_buffer.len() {
                    self.cursor_position += 1;
                }
            }

            _ => {}
        }

        Ok(EventResponse::Continue)
    }

    /// Handle slash commands (Codex-like)
    async fn handle_slash_command(&mut self, command: &str, app: &mut CortexApp) -> Result<()> {
        let parts: Vec<&str> = command.split_whitespace().collect();
        let cmd = parts.get(0).unwrap_or(&"");

        match *cmd {
            "/help" | "/h" => {
                self.chat_history.add_message(Message::system(
                    "Available commands:\n\
                    /help - Show this help\n\
                    /init - Create AGENTS.md file\n\
                    /status - Show current configuration\n\
                    /diff - Show git diff\n\
                    /mcp - List MCP tools\n\
                    /github - Show GitHub status\n\
                    /cd <path> - Change directory\n\
                    /clear - Clear chat history"
                ));
            }

            "/init" => {
                let path = app.ensure_agents_md_exists().await?;
                self.chat_history.add_message(Message::system(&format!(
                    "Created AGENTS.md at {}", path.display()
                )));
            }

            "/status" => {
                let status = self.get_comprehensive_status(app).await?;
                self.chat_history.add_message(Message::system(&status));
            }

            "/diff" => {
                let diff = self.background_tools.command_executor.get_git_diff().await?;
                self.chat_history.add_message(Message::system(&format!("Git diff:\n{}", diff)));
            }

            "/mcp" => {
                let mcp_info = self.background_tools.mcp_manager.get_status().await?;
                self.chat_history.add_message(Message::system(&mcp_info));
            }

            "/github" => {
                let github_info = self.background_tools.github_monitor.get_status().await?;
                self.chat_history.add_message(Message::system(&github_info));
            }

            "/cd" => {
                if let Some(path) = parts.get(1) {
                    self.background_tools.command_executor.change_directory(path).await?;
                    self.chat_history.add_message(Message::system(&format!(
                        "Changed directory to {}", path
                    )));
                } else {
                    self.chat_history.add_message(Message::system("Usage: /cd <path>"));
                }
            }

            "/clear" => {
                self.chat_history.clear();
                self.chat_history.add_message(Message::system("Chat history cleared"));
            }

            _ => {
                self.chat_history.add_message(Message::system(&format!(
                    "Unknown command: {}. Type /help for available commands.", cmd
                )));
            }
        }

        Ok(())
    }

    /// Send message to AI with background tool access
    async fn send_ai_message(&mut self, message: String, app: &mut CortexApp) -> Result<()> {
        // Add user message
        self.chat_history.add_message(Message::user(&message));

        // Start streaming response
        self.is_streaming = true;
        self.streaming_buffer.clear();

        // Get AI response with access to background tools
        let response = app.get_ai_response_with_background_tools(
            &message,
            &mut self.background_tools,
        ).await?;

        // For now, add complete response (TODO: implement real streaming)
        self.chat_history.add_message(Message::assistant(&response));
        self.is_streaming = false;

        // Update status after AI interaction
        self.update_status_info(app).await?;

        Ok(())
    }

    /// Render the interface (Codex-like layout)
    fn render(&self) -> Result<()> {
        // This would use the terminal framework to render
        // Main chat area + input + status bar + command palette overlay
        Ok(())
    }

    /// Get comprehensive status information
    async fn get_comprehensive_status(&self, app: &CortexApp) -> Result<String> {
        let mut status = format!("Cortex Code Status:\n");
        status.push_str(&format!("Provider: {}\n", self.status_info.current_provider));
        status.push_str(&format!("Model: {}\n", self.status_info.model));
        status.push_str(&format!("Approval Mode: {}\n", self.status_info.approval_mode));

        if let Some((used, total)) = self.status_info.token_usage {
            let percentage = (used as f64 / total as f64 * 100.0) as u32;
            status.push_str(&format!("Tokens: {}/{} ({}%)\n", used, total, percentage));
        }

        status.push_str(&format!("Available Tools: {}\n", self.status_info.tools_available.join(", ")));

        // Add background tool status
        status.push_str(&format!("MCP Servers: {}\n", self.background_tools.mcp_manager.available_servers.len()));
        status.push_str(&format!("A2A Events: {}\n", self.background_tools.a2a_monitor.event_count));

        if let Some(repo) = &self.background_tools.github_monitor.current_repo {
            status.push_str(&format!("Git Repository: {}\n", repo));
        }

        Ok(status)
    }

    /// Update status information
    async fn update_status_info(&mut self, app: &CortexApp) -> Result<()> {
        let (provider, _models) = app.get_current_provider_info().await;
        self.status_info.current_provider = provider;
        self.status_info.approval_mode = format!("{:?}", app.get_approval_mode());

        // Update available tools
        self.status_info.tools_available = vec![
            "MCP".to_string(),
            "GitHub".to_string(),
            "A2A".to_string(),
            "Git".to_string(),
        ];

        Ok(())
    }
}

/// Command palette implementation
impl CommandPalette {
    fn initialize_commands(&mut self) {
        self.commands = vec![
            PaletteCommand {
                id: "mcp.list".to_string(),
                label: "MCP: List Servers".to_string(),
                description: "Show available MCP servers".to_string(),
                category: "Tools".to_string(),
            },
            PaletteCommand {
                id: "github.status".to_string(),
                label: "GitHub: Show Status".to_string(),
                description: "Show current GitHub repository status".to_string(),
                category: "Tools".to_string(),
            },
            PaletteCommand {
                id: "a2a.events".to_string(),
                label: "A2A: Recent Events".to_string(),
                description: "Show recent A2A events".to_string(),
                category: "Tools".to_string(),
            },
            PaletteCommand {
                id: "git.diff".to_string(),
                label: "Git: Show Diff".to_string(),
                description: "Show git diff including untracked files".to_string(),
                category: "Git".to_string(),
            },
        ];
    }

    fn show(&mut self) {
        self.visible = true;
        self.input.clear();
        self.selected_index = 0;
    }

    fn hide(&mut self) {
        self.visible = false;
    }
}

/// Background tool implementations
impl McpManager {
    fn new() -> Self {
        Self {
            available_servers: Vec::new(),
            active_tools: Vec::new(),
        }
    }

    async fn initialize(&mut self) -> Result<()> {
        // Initialize MCP servers in background
        self.available_servers = vec!["cortex-fs".to_string(), "cortex-git".to_string()];
        Ok(())
    }

    async fn get_status(&self) -> Result<String> {
        Ok(format!("MCP: {} servers available, {} tools active",
            self.available_servers.len(), self.active_tools.len()))
    }
}

impl GitHubMonitor {
    fn new() -> Self {
        Self {
            current_repo: None,
            recent_activity: Vec::new(),
        }
    }

    async fn initialize(&mut self) -> Result<()> {
        // Initialize GitHub monitoring
        self.current_repo = Some("cortex-os/cortex-os".to_string());
        Ok(())
    }

    async fn get_status(&self) -> Result<String> {
        match &self.current_repo {
            Some(repo) => Ok(format!("GitHub: {} ({})", repo, self.recent_activity.len())),
            None => Ok("GitHub: No repository detected".to_string()),
        }
    }
}

impl A2aMonitor {
    fn new() -> Self {
        Self {
            recent_events: Vec::new(),
            event_count: 0,
        }
    }

    async fn initialize(&mut self) -> Result<()> {
        // Initialize A2A event monitoring
        Ok(())
    }
}

impl CommandExecutor {
    fn new() -> Self {
        Self {
            current_dir: std::env::current_dir().unwrap_or_default(),
        }
    }

    async fn get_git_diff(&self) -> Result<String> {
        let output = tokio::process::Command::new("git")
            .args(&["--no-pager", "diff", "--patch-with-raw"])
            .current_dir(&self.current_dir)
            .output()
            .await?;

        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    }

    async fn change_directory(&mut self, path: &str) -> Result<()> {
        let new_path = std::path::Path::new(path);
        if new_path.exists() {
            self.current_dir = new_path.canonicalize()?;
            std::env::set_current_dir(&self.current_dir)?;
        }
        Ok(())
    }
}

impl BackgroundTools {
    async fn initialize(&mut self) -> Result<()> {
        self.mcp_manager.initialize().await?;
        self.github_monitor.initialize().await?;
        self.a2a_monitor.initialize().await?;
        Ok(())
    }

    async fn process_updates(&mut self) -> Result<()> {
        // Process any background updates from tools
        Ok(())
    }
}

#[derive(Debug)]
enum EventResponse {
    Continue,
    Exit,
}
