use crate::Result;
use crossterm::event::{Event, KeyCode, KeyEvent};
use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Clear, List, ListItem, Paragraph},
    Frame,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CortexCommand {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: CommandCategory,
    pub keywords: Vec<String>,
    pub shortcut: Option<String>,
    pub mcp_tool: Option<String>,
    pub requires_confirmation: bool,
    pub parameters: Vec<CommandParameter>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CommandCategory {
    GitHub,
    MCP,
    A2A,
    TUI,
    AI,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandParameter {
    pub name: String,
    pub description: String,
    pub required: bool,
    pub default_value: Option<String>,
}

#[derive(Debug, Clone)]
pub enum CommandPaletteResponse {
    ExecuteCommand(String, Vec<String>),
    Cancel,
    None,
}

pub struct CortexCommandPalette {
    commands: Vec<CortexCommand>,
    filtered_commands: Vec<usize>,
    search_input: String,
    selected_index: usize,
    visible: bool,
    mode: PaletteMode,
}

#[derive(Debug, Clone)]
enum PaletteMode {
    Search,
    ParameterInput { command_index: usize, param_index: usize, values: Vec<String> },
}

impl CortexCommandPalette {
    pub fn new() -> Self {
        let commands = Self::initialize_commands();
        let filtered_commands: Vec<usize> = (0..commands.len()).collect();

        Self {
            commands,
            filtered_commands,
            search_input: String::new(),
            selected_index: 0,
            visible: false,
            mode: PaletteMode::Search,
        }
    }

    fn initialize_commands() -> Vec<CortexCommand> {
        vec![
            // GitHub Commands
            CortexCommand {
                id: "github.create_pr".to_string(),
                name: "Create Pull Request".to_string(),
                description: "Create a new pull request from current branch".to_string(),
                category: CommandCategory::GitHub,
                keywords: vec!["pr", "pull", "request", "create"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+G P".to_string()),
                mcp_tool: Some("github_create_pr".to_string()),
                requires_confirmation: true,
                parameters: vec![
                    CommandParameter {
                        name: "title".to_string(),
                        description: "Pull request title".to_string(),
                        required: true,
                        default_value: None,
                    },
                    CommandParameter {
                        name: "body".to_string(),
                        description: "Pull request description".to_string(),
                        required: false,
                        default_value: None,
                    },
                ],
            },
            CortexCommand {
                id: "github.review_pr".to_string(),
                name: "AI Review Pull Request".to_string(),
                description: "Trigger AI-powered code review on current PR".to_string(),
                category: CommandCategory::GitHub,
                keywords: vec!["review", "ai", "pr", "analyze"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+G R".to_string()),
                mcp_tool: Some("github_ai_review".to_string()),
                requires_confirmation: false,
                parameters: vec![
                    CommandParameter {
                        name: "pr_number".to_string(),
                        description: "PR number to review".to_string(),
                        required: true,
                        default_value: None,
                    },
                ],
            },
            CortexCommand {
                id: "github.security_scan".to_string(),
                name: "Security Scan".to_string(),
                description: "Run AI security analysis on repository".to_string(),
                category: CommandCategory::GitHub,
                keywords: vec!["security", "scan", "vulnerability", "owasp"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+G S".to_string()),
                mcp_tool: Some("github_security_scan".to_string()),
                requires_confirmation: true,
                parameters: vec![],
            },
            CortexCommand {
                id: "github.issue_triage".to_string(),
                name: "AI Issue Triage".to_string(),
                description: "Intelligent triage and labeling of GitHub issues".to_string(),
                category: CommandCategory::GitHub,
                keywords: vec!["triage", "issue", "label", "priority"].iter().map(|s| s.to_string()).collect(),
                shortcut: None,
                mcp_tool: Some("github_issue_triage".to_string()),
                requires_confirmation: false,
                parameters: vec![
                    CommandParameter {
                        name: "issue_number".to_string(),
                        description: "Issue number to triage".to_string(),
                        required: false,
                        default_value: Some("latest".to_string()),
                    },
                ],
            },

            // MCP Commands
            CortexCommand {
                id: "mcp.list_servers".to_string(),
                name: "List MCP Servers".to_string(),
                description: "Show all available MCP servers and their status".to_string(),
                category: CommandCategory::MCP,
                keywords: vec!["mcp", "servers", "list", "status"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+M L".to_string()),
                mcp_tool: None,
                requires_confirmation: false,
                parameters: vec![],
            },
            CortexCommand {
                id: "mcp.start_server".to_string(),
                name: "Start MCP Server".to_string(),
                description: "Start a specific MCP server".to_string(),
                category: CommandCategory::MCP,
                keywords: vec!["mcp", "start", "server", "enable"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+M S".to_string()),
                mcp_tool: None,
                requires_confirmation: true,
                parameters: vec![
                    CommandParameter {
                        name: "server_name".to_string(),
                        description: "Name of MCP server to start".to_string(),
                        required: true,
                        default_value: None,
                    },
                ],
            },
            CortexCommand {
                id: "mcp.install_plugin".to_string(),
                name: "Install MCP Plugin".to_string(),
                description: "Install a new MCP plugin from marketplace".to_string(),
                category: CommandCategory::MCP,
                keywords: vec!["mcp", "install", "plugin", "marketplace"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+M I".to_string()),
                mcp_tool: Some("mcp_install_plugin".to_string()),
                requires_confirmation: true,
                parameters: vec![
                    CommandParameter {
                        name: "plugin_id".to_string(),
                        description: "Plugin ID from marketplace".to_string(),
                        required: true,
                        default_value: None,
                    },
                ],
            },

            // A2A Commands
            CortexCommand {
                id: "a2a.send_event".to_string(),
                name: "Send A2A Event".to_string(),
                description: "Send an event through the A2A message bus".to_string(),
                category: CommandCategory::A2A,
                keywords: vec!["a2a", "event", "send", "message"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+A S".to_string()),
                mcp_tool: None,
                requires_confirmation: false,
                parameters: vec![
                    CommandParameter {
                        name: "event_type".to_string(),
                        description: "Type of A2A event".to_string(),
                        required: true,
                        default_value: None,
                    },
                    CommandParameter {
                        name: "payload".to_string(),
                        description: "Event payload (JSON)".to_string(),
                        required: false,
                        default_value: Some("{}".to_string()),
                    },
                ],
            },
            CortexCommand {
                id: "a2a.list_agents".to_string(),
                name: "List Active Agents".to_string(),
                description: "Show all agents connected to A2A bus".to_string(),
                category: CommandCategory::A2A,
                keywords: vec!["a2a", "agents", "list", "active"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+A L".to_string()),
                mcp_tool: None,
                requires_confirmation: false,
                parameters: vec![],
            },

            // TUI Commands
            CortexCommand {
                id: "tui.switch_view".to_string(),
                name: "Switch View".to_string(),
                description: "Switch between different TUI views".to_string(),
                category: CommandCategory::TUI,
                keywords: vec!["view", "switch", "navigate", "tab"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+T V".to_string()),
                mcp_tool: None,
                requires_confirmation: false,
                parameters: vec![
                    CommandParameter {
                        name: "view".to_string(),
                        description: "Target view (chat, github, a2a, settings)".to_string(),
                        required: true,
                        default_value: Some("chat".to_string()),
                    },
                ],
            },
            CortexCommand {
                id: "tui.theme_toggle".to_string(),
                name: "Toggle Theme".to_string(),
                description: "Switch between dark and light themes".to_string(),
                category: CommandCategory::TUI,
                keywords: vec!["theme", "dark", "light", "toggle"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+T T".to_string()),
                mcp_tool: None,
                requires_confirmation: false,
                parameters: vec![],
            },
            CortexCommand {
                id: "tui.toggle_mouse_mode".to_string(),
                name: "Toggle Mouse Mode".to_string(),
                description: "Switch between TUI mouse handling and terminal native copy/paste".to_string(),
                category: CommandCategory::TUI,
                keywords: vec!["mouse", "mode", "toggle", "copy", "paste", "terminal"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+M".to_string()),
                mcp_tool: None,
                requires_confirmation: false,
                parameters: vec![],
            },

            // AI Commands
            CortexCommand {
                id: "ai.switch_model".to_string(),
                name: "Switch AI Model".to_string(),
                description: "Change the active AI model provider".to_string(),
                category: CommandCategory::AI,
                keywords: vec!["ai", "model", "provider", "switch"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+I M".to_string()),
                mcp_tool: None,
                requires_confirmation: false,
                parameters: vec![
                    CommandParameter {
                        name: "provider".to_string(),
                        description: "AI provider (github, openai, anthropic, mlx)".to_string(),
                        required: true,
                        default_value: Some("github".to_string()),
                    },
                ],
            },
            CortexCommand {
                id: "ai.clear_context".to_string(),
                name: "Clear AI Context".to_string(),
                description: "Clear the AI conversation context".to_string(),
                category: CommandCategory::AI,
                keywords: vec!["ai", "clear", "context", "reset"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+I C".to_string()),
                mcp_tool: None,
                requires_confirmation: true,
                parameters: vec![],
            },

            // Model Management Commands
            CortexCommand {
                id: "ai.show_model".to_string(),
                name: "Show Current Model".to_string(),
                description: "Show the current AI model and provider".to_string(),
                category: CommandCategory::AI,
                keywords: vec!["model", "provider", "current", "show"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+M M".to_string()),
                mcp_tool: None,
                requires_confirmation: false,
                parameters: vec![],
            },
            CortexCommand {
                id: "ai.switch_model_interactive".to_string(),
                name: "Switch AI Model".to_string(),
                description: "Interactively switch between available AI models".to_string(),
                category: CommandCategory::AI,
                keywords: vec!["model", "switch", "change", "provider"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+M S".to_string()),
                mcp_tool: None,
                requires_confirmation: false,
                parameters: vec![],
            },

            // System Commands
            CortexCommand {
                id: "system.export_logs".to_string(),
                name: "Export System Logs".to_string(),
                description: "Export Cortex system logs for debugging".to_string(),
                category: CommandCategory::System,
                keywords: vec!["logs", "export", "debug", "system"].iter().map(|s| s.to_string()).collect(),
                shortcut: None,
                mcp_tool: None,
                requires_confirmation: true,
                parameters: vec![
                    CommandParameter {
                        name: "format".to_string(),
                        description: "Export format (json, txt)".to_string(),
                        required: false,
                        default_value: Some("json".to_string()),
                    },
                ],
            },
            CortexCommand {
                id: "system.health_check".to_string(),
                name: "System Health Check".to_string(),
                description: "Run comprehensive system health diagnostics".to_string(),
                category: CommandCategory::System,
                keywords: vec!["health", "diagnostic", "system", "check"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+H".to_string()),
                mcp_tool: None,
                requires_confirmation: false,
                parameters: vec![],
            },

            // Cortex Code-Style AI Commands
            CortexCommand {
                id: "ai.explain".to_string(),
                name: "Explain Code".to_string(),
                description: "Explain selected code or concept in plain English".to_string(),
                category: CommandCategory::AI,
                keywords: vec!["explain", "code", "understand", "ai"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+E".to_string()),
                mcp_tool: Some("ai_code_explanation".to_string()),
                requires_confirmation: false,
                parameters: vec![
                    CommandParameter {
                        name: "code_selection".to_string(),
                        description: "Selected code to explain".to_string(),
                        required: false,
                        default_value: None,
                    },
                    CommandParameter {
                        name: "explanation_depth".to_string(),
                        description: "Level of detail (brief, detailed, comprehensive)".to_string(),
                        required: false,
                        default_value: Some("detailed".to_string()),
                    },
                ],
            },
            CortexCommand {
                id: "ai.refactor".to_string(),
                name: "Refactor Code".to_string(),
                description: "Suggest code improvements for selected code".to_string(),
                category: CommandCategory::AI,
                keywords: vec!["refactor", "improve", "code", "ai"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+R".to_string()),
                mcp_tool: Some("ai_code_refactoring".to_string()),
                requires_confirmation: false,
                parameters: vec![
                    CommandParameter {
                        name: "code_selection".to_string(),
                        description: "Selected code to refactor".to_string(),
                        required: true,
                        default_value: None,
                    },
                    CommandParameter {
                        name: "refactoring_type".to_string(),
                        description: "Type of refactoring (performance, readability, structure)".to_string(),
                        required: false,
                        default_value: Some("readability".to_string()),
                    },
                ],
            },
            CortexCommand {
                id: "ai.test".to_string(),
                name: "Generate Tests".to_string(),
                description: "Generate unit tests for selected code".to_string(),
                category: CommandCategory::AI,
                keywords: vec!["test", "unit", "generate", "ai"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+T".to_string()),
                mcp_tool: Some("ai_test_generation".to_string()),
                requires_confirmation: false,
                parameters: vec![
                    CommandParameter {
                        name: "code_selection".to_string(),
                        description: "Selected code to test".to_string(),
                        required: true,
                        default_value: None,
                    },
                    CommandParameter {
                        name: "test_framework".to_string(),
                        description: "Test framework to use".to_string(),
                        required: false,
                        default_value: Some("default".to_string()),
                    },
                ],
            },
            CortexCommand {
                id: "ai.document".to_string(),
                name: "Document Code".to_string(),
                description: "Create documentation for selected code".to_string(),
                category: CommandCategory::AI,
                keywords: vec!["document", "documentation", "comment", "ai"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+D".to_string()),
                mcp_tool: Some("ai_documentation_generation".to_string()),
                requires_confirmation: false,
                parameters: vec![
                    CommandParameter {
                        name: "code_selection".to_string(),
                        description: "Selected code to document".to_string(),
                        required: true,
                        default_value: None,
                    },
                    CommandParameter {
                        name: "documentation_format".to_string(),
                        description: "Documentation format (JSDoc, RustDoc, etc.)".to_string(),
                        required: false,
                        default_value: Some("auto".to_string()),
                    },
                ],
            },
            CortexCommand {
                id: "ai.find".to_string(),
                name: "Find Code Patterns".to_string(),
                description: "Search for code patterns in project".to_string(),
                category: CommandCategory::AI,
                keywords: vec!["find", "search", "pattern", "ai"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+F".to_string()),
                mcp_tool: Some("code_pattern_search".to_string()),
                requires_confirmation: false,
                parameters: vec![
                    CommandParameter {
                        name: "search_pattern".to_string(),
                        description: "Pattern to search for".to_string(),
                        required: true,
                        default_value: None,
                    },
                    CommandParameter {
                        name: "file_types".to_string(),
                        description: "File types to search in".to_string(),
                        required: false,
                        default_value: Some("all".to_string()),
                    },
                ],
            },
            CortexCommand {
                id: "ai.fix".to_string(),
                name: "Fix Code Issues".to_string(),
                description: "Suggest bug fixes for error messages".to_string(),
                category: CommandCategory::AI,
                keywords: vec!["fix", "bug", "error", "ai"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+X".to_string()),
                mcp_tool: Some("ai_bug_fixing".to_string()),
                requires_confirmation: false,
                parameters: vec![
                    CommandParameter {
                        name: "error_message".to_string(),
                        description: "Error message to fix".to_string(),
                        required: true,
                        default_value: None,
                    },
                    CommandParameter {
                        name: "code_context".to_string(),
                        description: "Relevant code context".to_string(),
                        required: false,
                        default_value: None,
                    },
                ],
            },
            CortexCommand {
                id: "ai.optimize".to_string(),
                name: "Optimize Code".to_string(),
                description: "Optimize performance of selected code".to_string(),
                category: CommandCategory::AI,
                keywords: vec!["optimize", "performance", "speed", "ai"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+O".to_string()),
                mcp_tool: Some("ai_performance_optimization".to_string()),
                requires_confirmation: false,
                parameters: vec![
                    CommandParameter {
                        name: "code_selection".to_string(),
                        description: "Selected code to optimize".to_string(),
                        required: true,
                        default_value: None,
                    },
                    CommandParameter {
                        name: "optimization_target".to_string(),
                        description: "Optimization target (speed, memory, etc.)".to_string(),
                        required: false,
                        default_value: Some("speed".to_string()),
                    },
                ],
            },
            CortexCommand {
                id: "ai.security".to_string(),
                name: "Security Scan".to_string(),
                description: "Scan selected code for vulnerabilities".to_string(),
                category: CommandCategory::AI,
                keywords: vec!["security", "vulnerability", "scan", "ai"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+S".to_string()),
                mcp_tool: Some("ai_security_scanning".to_string()),
                requires_confirmation: false,
                parameters: vec![
                    CommandParameter {
                        name: "code_selection".to_string(),
                        description: "Selected code to scan".to_string(),
                        required: true,
                        default_value: None,
                    },
                    CommandParameter {
                        name: "scan_depth".to_string(),
                        description: "Scan depth (shallow, deep, comprehensive)".to_string(),
                        required: false,
                        default_value: Some("deep".to_string()),
                    },
                ],
            },
            CortexCommand {
                id: "ai.complexity".to_string(),
                name: "Analyze Complexity".to_string(),
                description: "Analyze code complexity metrics".to_string(),
                category: CommandCategory::AI,
                keywords: vec!["complexity", "metrics", "analyze", "ai"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+C".to_string()),
                mcp_tool: Some("code_complexity_analysis".to_string()),
                requires_confirmation: false,
                parameters: vec![
                    CommandParameter {
                        name: "code_selection".to_string(),
                        description: "Selected code to analyze".to_string(),
                        required: true,
                        default_value: None,
                    },
                    CommandParameter {
                        name: "metrics_type".to_string(),
                        description: "Type of metrics (cyclomatic, cognitive, etc.)".to_string(),
                        required: false,
                        default_value: Some("cyclomatic".to_string()),
                    },
                ],
            },
            CortexCommand {
                id: "ai.dependencies".to_string(),
                name: "Analyze Dependencies".to_string(),
                description: "Analyze project dependencies".to_string(),
                category: CommandCategory::AI,
                keywords: vec!["dependencies", "analyze", "project", "ai"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+Y".to_string()),
                mcp_tool: Some("dependency_analysis".to_string()),
                requires_confirmation: false,
                parameters: vec![
                    CommandParameter {
                        name: "dependency_type".to_string(),
                        description: "Type of dependencies (all, direct, transitive)".to_string(),
                        required: false,
                        default_value: Some("all".to_string()),
                    },
                    CommandParameter {
                        name: "analysis_depth".to_string(),
                        description: "Analysis depth (shallow, deep)".to_string(),
                        required: false,
                        default_value: Some("deep".to_string()),
                    },
                ],
            },
            CortexCommand {
                id: "ai.review".to_string(),
                name: "Code Review".to_string(),
                description: "Perform code review on selected code".to_string(),
                category: CommandCategory::AI,
                keywords: vec!["review", "code", "analyze", "ai"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+V".to_string()),
                mcp_tool: Some("ai_code_review".to_string()),
                requires_confirmation: false,
                parameters: vec![
                    CommandParameter {
                        name: "code_selection".to_string(),
                        description: "Selected code to review".to_string(),
                        required: true,
                        default_value: None,
                    },
                    CommandParameter {
                        name: "review_aspect".to_string(),
                        description: "Aspect to review (style, security, performance)".to_string(),
                        required: false,
                        default_value: Some("comprehensive".to_string()),
                    },
                ],
            },
            CortexCommand {
                id: "ai.suggest".to_string(),
                name: "AI Suggestions".to_string(),
                description: "Get AI suggestions for improving code".to_string(),
                category: CommandCategory::AI,
                keywords: vec!["suggest", "improve", "recommend", "ai"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+U".to_string()),
                mcp_tool: Some("ai_suggestions".to_string()),
                requires_confirmation: false,
                parameters: vec![
                    CommandParameter {
                        name: "code_selection".to_string(),
                        description: "Selected code for suggestions".to_string(),
                        required: false,
                        default_value: None,
                    },
                    CommandParameter {
                        name: "suggestion_type".to_string(),
                        description: "Type of suggestions (all, style, performance)".to_string(),
                        required: false,
                        default_value: Some("all".to_string()),
                    },
                ],
            },
            CortexCommand {
                id: "ai.debug".to_string(),
                name: "Debug Code".to_string(),
                description: "Help debug issues with code".to_string(),
                category: CommandCategory::AI,
                keywords: vec!["debug", "troubleshoot", "fix", "ai"].iter().map(|s| s.to_string()).collect(),
                shortcut: Some("Ctrl+B".to_string()),
                mcp_tool: Some("ai_debugging".to_string()),
                requires_confirmation: false,
                parameters: vec![
                    CommandParameter {
                        name: "error_message".to_string(),
                        description: "Error message or issue description".to_string(),
                        required: false,
                        default_value: None,
                    },
                    CommandParameter {
                        name: "code_context".to_string(),
                        description: "Relevant code context".to_string(),
                        required: false,
                        default_value: None,
                    },
                ],
            },
        ]
    }

    pub fn show(&mut self) {
        self.visible = true;
        self.search_input.clear();
        self.filtered_commands = (0..self.commands.len()).collect();
        self.selected_index = 0;
        self.mode = PaletteMode::Search;
    }

    pub fn hide(&mut self) {
        self.visible = false;
    }

    pub fn is_visible(&self) -> bool {
        self.visible
    }

    pub fn handle_event(&mut self, event: Event) -> Result<CommandPaletteResponse> {
        if !self.visible {
            return Ok(CommandPaletteResponse::None);
        }

        match event {
            Event::Key(key) => self.handle_key_event(key),
            _ => Ok(CommandPaletteResponse::None),
        }
    }

    fn handle_key_event(&mut self, key: KeyEvent) -> Result<CommandPaletteResponse> {
        match self.mode {
            PaletteMode::Search => self.handle_search_key(key),
            PaletteMode::ParameterInput { .. } => self.handle_parameter_key(key),
        }
    }

    fn handle_search_key(&mut self, key: KeyEvent) -> Result<CommandPaletteResponse> {
        match key.code {
            KeyCode::Esc => {
                self.hide();
                Ok(CommandPaletteResponse::Cancel)
            },
            KeyCode::Enter => {
                if !self.filtered_commands.is_empty() {
                    let cmd_index = self.filtered_commands[self.selected_index];
                    let command_id = self.commands[cmd_index].id.clone();
                    let has_params = !self.commands[cmd_index].parameters.is_empty();

                    if !has_params {
                        self.hide();
                        Ok(CommandPaletteResponse::ExecuteCommand(command_id, vec![]))
                    } else {
                        self.mode = PaletteMode::ParameterInput {
                            command_index: cmd_index,
                            param_index: 0,
                            values: vec![],
                        };
                        Ok(CommandPaletteResponse::None)
                    }
                } else {
                    Ok(CommandPaletteResponse::None)
                }
            },
            KeyCode::Up => {
                if !self.filtered_commands.is_empty() && self.selected_index > 0 {
                    self.selected_index -= 1;
                }
                Ok(CommandPaletteResponse::None)
            },
            KeyCode::Down => {
                if !self.filtered_commands.is_empty() && self.selected_index < self.filtered_commands.len() - 1 {
                    self.selected_index += 1;
                }
                Ok(CommandPaletteResponse::None)
            },
            KeyCode::Char(c) => {
                self.search_input.push(c);
                self.filter_commands();
                self.selected_index = 0;
                Ok(CommandPaletteResponse::None)
            },
            KeyCode::Backspace => {
                self.search_input.pop();
                self.filter_commands();
                self.selected_index = 0;
                Ok(CommandPaletteResponse::None)
            },
            _ => Ok(CommandPaletteResponse::None),
        }
    }

    fn handle_parameter_key(&mut self, key: KeyEvent) -> Result<CommandPaletteResponse> {
        if let PaletteMode::ParameterInput { command_index, param_index, ref mut values } = &mut self.mode {
            match key.code {
                KeyCode::Esc => {
                    self.mode = PaletteMode::Search;
                    Ok(CommandPaletteResponse::None)
                },
                KeyCode::Enter => {
                    let command_index_val = *command_index;
                    let param_index_val = *param_index;
                    let param_count = self.commands[command_index_val].parameters.len();
                    let command_id = self.commands[command_index_val].id.clone();

                    if param_index_val < param_count {
                        values.push(String::new());
                        if param_index_val + 1 >= param_count {
                            // All parameters collected
                            let final_values = values.clone();
                            self.hide();
                            Ok(CommandPaletteResponse::ExecuteCommand(command_id, final_values))
                        } else {
                            // Move to next parameter
                            self.mode = PaletteMode::ParameterInput {
                                command_index: command_index_val,
                                param_index: param_index_val + 1,
                                values: values.clone(),
                            };
                            Ok(CommandPaletteResponse::None)
                        }
                    } else {
                        Ok(CommandPaletteResponse::None)
                    }
                },
                KeyCode::Char(c) => {
                    if values.len() <= *param_index {
                        values.resize(*param_index + 1, String::new());
                    }
                    values[*param_index].push(c);
                    Ok(CommandPaletteResponse::None)
                },
                KeyCode::Backspace => {
                    if values.len() > *param_index && !values[*param_index].is_empty() {
                        values[*param_index].pop();
                    }
                    Ok(CommandPaletteResponse::None)
                },
                _ => Ok(CommandPaletteResponse::None),
            }
        } else {
            Ok(CommandPaletteResponse::None)
        }
    }

    fn filter_commands(&mut self) {
        if self.search_input.is_empty() {
            self.filtered_commands = (0..self.commands.len()).collect();
            return;
        }

        let search_lower = self.search_input.to_lowercase();
        self.filtered_commands = self.commands
            .iter()
            .enumerate()
            .filter(|(_, cmd)| {
                cmd.name.to_lowercase().contains(&search_lower) ||
                cmd.description.to_lowercase().contains(&search_lower) ||
                cmd.keywords.iter().any(|k| k.to_lowercase().contains(&search_lower))
            })
            .map(|(i, _)| i)
            .collect();
    }

    pub fn render(&self, frame: &mut Frame, area: Rect) {
        if !self.visible {
            return;
        }

        let popup_area = self.centered_rect(80, 70, area);
        frame.render_widget(Clear, popup_area);

        let block = Block::default()
            .title(" Cortex Command Palette ")
            .borders(Borders::ALL)
            .border_style(Style::default().fg(Color::Cyan));

        let inner = block.inner(popup_area);
        frame.render_widget(block, popup_area);

        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Length(3), Constraint::Min(0)])
            .split(inner);

        // Search input
        let search_block = Block::default()
            .borders(Borders::ALL)
            .title(" Search Commands ");

        let search_text = match self.mode {
            PaletteMode::Search => {
                Paragraph::new(format!("> {}", self.search_input))
                    .block(search_block)
                    .style(Style::default().fg(Color::White))
            },
            PaletteMode::ParameterInput { command_index, param_index, ref values } => {
                let command = &self.commands[command_index];
                let param = &command.parameters[param_index];
                let empty_string = String::new();
                let current_value = values.get(param_index).unwrap_or(&empty_string);

                Paragraph::new(format!("{}: {}", param.name, current_value))
                    .block(search_block.clone().title(format!(" {} - {} ", command.name, param.description)))
                    .style(Style::default().fg(Color::Yellow))
            }
        };

        frame.render_widget(search_text, chunks[0]);

        // Commands list
        if matches!(self.mode, PaletteMode::Search) {
            let commands_list: Vec<ListItem> = self.filtered_commands
                .iter()
                .enumerate()
                .map(|(i, &cmd_index)| {
                    let command = &self.commands[cmd_index];
                    let style = if i == self.selected_index {
                        Style::default().bg(Color::Blue).fg(Color::White)
                    } else {
                        Style::default()
                    };

                    let category_color = match command.category {
                        CommandCategory::GitHub => Color::Green,
                        CommandCategory::MCP => Color::Magenta,
                        CommandCategory::A2A => Color::Cyan,
                        CommandCategory::TUI => Color::Yellow,
                        CommandCategory::AI => Color::Red,
                        CommandCategory::System => Color::Gray,
                    };

                    let content = vec![
                        Span::styled(format!("[{:?}] ", command.category), Style::default().fg(category_color)),
                        Span::styled(&command.name, style.clone().add_modifier(Modifier::BOLD)),
                        Span::raw(" - "),
                        Span::styled(&command.description, style.clone()),
                        if let Some(ref shortcut) = command.shortcut {
                            Span::styled(format!(" ({})", shortcut), Style::default().fg(Color::DarkGray))
                        } else {
                            Span::raw("")
                        },
                    ];

                    ListItem::new(Line::from(content)).style(style)
                })
                .collect();

            let commands_widget = List::new(commands_list)
                .block(Block::default()
                    .borders(Borders::ALL)
                    .title(format!(" Commands ({}) ", self.filtered_commands.len())));

            frame.render_widget(commands_widget, chunks[1]);
        }
    }

    fn centered_rect(&self, percent_x: u16, percent_y: u16, r: Rect) -> Rect {
        let popup_layout = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Percentage((100 - percent_y) / 2),
                Constraint::Percentage(percent_y),
                Constraint::Percentage((100 - percent_y) / 2),
            ])
            .split(r);

        Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Percentage((100 - percent_x) / 2),
                Constraint::Percentage(percent_x),
                Constraint::Percentage((100 - percent_x) / 2),
            ])
            .split(popup_layout[1])[1]
    }
}
