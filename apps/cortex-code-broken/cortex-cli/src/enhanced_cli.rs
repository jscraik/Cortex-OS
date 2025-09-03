use anyhow::Result;
use clap::{ArgAction, CommandFactory, Parser};
use cortex_common::{CliConfigOverrides, ApprovalModeCliArg};
use cortex_core::protocol::AskForApproval;
use std::path::PathBuf;

/// Enhanced Cortex Code CLI with comprehensive AI-powered coding features
#[derive(Parser)]
#[command(name = "cortex")]
#[command(about = "A comprehensive AI-powered coding assistant")]
#[command(version)]
#[command(long_about = r#"
Cortex Code provides AI-powered assistance for software development with multiple interaction modes:

MODES:
  code        Interactive code editor (default)
  chat        Chat interface for discussions
  tui         Terminal user interface with multiple views
  run         Execute single prompt and exit
  exec        Non-interactive execution mode (alias for run --ci)
  daemon      Start background service
  mcp         Model Context Protocol operations

APPROVAL MODES:
  --approval-mode untrusted    Only run trusted commands without approval
  --approval-mode on-failure   Ask approval only when commands fail
  --approval-mode on-request   Model decides when to ask for approval
  --approval-mode never        Never ask for approval (autonomous)

EXAMPLES:
  cortex                                    # Start interactive code mode
  cortex --approval-mode never             # Fully autonomous mode
  cortex run "Add error handling to main"  # Single prompt execution
  cortex chat                              # Start chat interface
  cortex tui                               # Launch terminal UI
  cortex daemon --port 8080                # Start background service
  cortex mcp list                          # List MCP servers
  cortex completion zsh                    # Generate shell completions
"#)]
pub struct EnhancedCli {
    #[clap(flatten)]
    pub config_overrides: CliConfigOverrides,

    #[command(subcommand)]
    pub command: Option<Commands>,

    /// Run in CI mode (non-interactive, structured output)
    #[arg(long, help = "Enable CI mode for automated environments")]
    pub ci: bool,

    /// Configuration file path (overrides default ~/.cortex/config.toml)
    #[arg(short, long, value_name = "PATH")]
    pub config: Option<PathBuf>,

    /// Enable debug logging and verbose output
    #[arg(short, long)]
    pub debug: bool,

    /// Set approval mode for AI actions
    #[arg(long, value_enum, help = "Control when to ask for user approval")]
    pub approval_mode: Option<ApprovalModeCliArg>,

    /// Path to image file for multimodal input
    #[arg(long, value_name = "PATH", help = "Include image in prompt for vision models")]
    pub image: Option<PathBuf>,

    /// Override model (e.g., gpt-4o, gpt-4o-mini, claude-3-5-sonnet)
    #[arg(short = 'm', long = "model", value_name = "MODEL")]
    pub model: Option<String>,

    /// Ask for approval before applying edits (forces confirmation for this session)
    #[arg(short = 'a', long = "ask-for-approval", action = ArgAction::SetTrue)]
    pub ask_for_approval: bool,

    /// Change working directory before starting
    #[arg(short = 'C', long = "cd", value_name = "DIR")]
    pub change_dir: Option<PathBuf>,

    /// Enable streaming responses (real-time output)
    #[arg(long, help = "Stream responses in real-time")]
    pub stream: bool,

    /// Set maximum context window size
    #[arg(long, value_name = "TOKENS", help = "Maximum context window size")]
    pub max_context: Option<usize>,

    /// Include specific files in context
    #[arg(long, value_name = "PATTERN", action = ArgAction::Append)]
    pub include: Vec<String>,

    /// Exclude files from context
    #[arg(long, value_name = "PATTERN", action = ArgAction::Append)]
    pub exclude: Vec<String>,

    /// Set temperature for model responses (0.0-2.0)
    #[arg(long, value_name = "FLOAT", help = "Creativity level (0.0=deterministic, 2.0=creative)")]
    pub temperature: Option<f32>,

    /// Enable safe mode (additional safety checks)
    #[arg(long, help = "Enable additional safety checks and restrictions")]
    pub safe_mode: bool,
}

#[derive(clap::Subcommand)]
pub enum Commands {
    /// Interactive code editing and assistance (default mode)
    #[command(about = "Start interactive code editor with AI assistance")]
    Code {
        /// Initial prompt or task description
        #[arg(value_name = "PROMPT")]
        prompt: Option<String>,

        /// Focus on specific files or directories
        #[arg(long, value_name = "PATH", action = ArgAction::Append)]
        focus: Vec<PathBuf>,
    },

    /// Chat interface for discussions and planning
    #[command(about = "Start conversational chat interface")]
    Chat {
        /// Initial message to start conversation
        #[arg(value_name = "MESSAGE")]
        message: Option<String>,

        /// Load previous conversation by ID
        #[arg(long, value_name = "ID")]
        conversation_id: Option<String>,
    },

    /// Terminal UI interface with multiple views and panels
    #[command(about = "Launch full terminal user interface")]
    Tui {
        /// Theme to use for the interface
        #[arg(short, long, default_value = "default")]
        theme: String,

        /// Start with specific layout
        #[arg(long, value_enum)]
        layout: Option<TuiLayout>,
    },

    /// Execute single prompt and exit
    #[command(about = "Run a single prompt non-interactively")]
    Run {
        /// The prompt to send to the AI
        #[arg(value_name = "PROMPT")]
        prompt: String,

        /// Output file to write response to
        #[arg(short, long, value_name = "PATH")]
        output: Option<PathBuf>,

        /// Output format (text, json, markdown)
        #[arg(long, default_value = "text")]
        format: OutputFormat,
    },

    /// Non-interactive execution mode (alias for run --ci)
    #[command(about = "Execute prompt in fully automated mode")]
    Exec {
        /// The prompt to execute
        #[arg(value_name = "PROMPT")]
        prompt: String,

        /// Output file to write response to
        #[arg(short, long, value_name = "PATH")]
        output: Option<PathBuf>,

        /// Output format (text, json, markdown)
        #[arg(long, default_value = "json")]
        format: OutputFormat,
    },

    /// Start daemon server for remote access
    #[command(about = "Start background service for remote access")]
    Daemon {
        /// Port to listen on
        #[arg(short, long, default_value = "3030")]
        port: u16,

        /// Host address to bind to
        #[arg(long, default_value = "127.0.0.1")]
        host: String,

        /// Enable authentication
        #[arg(long)]
        auth: bool,

        /// Maximum concurrent connections
        #[arg(long, default_value = "10")]
        max_connections: usize,
    },

    /// Model Context Protocol operations
    #[command(about = "Manage MCP servers and tools")]
    Mcp {
        #[command(subcommand)]
        action: McpAction,
    },

    /// Generate shell completions
    #[command(about = "Generate shell completion scripts")]
    Completion {
        /// Shell to generate completions for
        #[arg(value_enum)]
        shell: CompletionShell,
    },

    /// Workspace and project management
    #[command(about = "Manage workspace configuration and projects")]
    Workspace {
        #[command(subcommand)]
        action: WorkspaceAction,
    },

    /// Memory and conversation management
    #[command(about = "Manage conversation history and memory")]
    Memory {
        #[command(subcommand)]
        action: MemoryAction,
    },

    /// Configuration management
    #[command(about = "Manage Cortex configuration")]
    Config {
        #[command(subcommand)]
        action: ConfigAction,
    },
}

#[derive(clap::Subcommand)]
pub enum McpAction {
    /// List all configured MCP servers
    List,

    /// Add a new MCP server
    Add {
        name: String,
        #[arg(long)]
        config: String,
    },

    /// Remove an MCP server
    Remove {
        name: String
    },

    /// Search for available MCP servers
    Search {
        query: String
    },

    /// Show detailed information about an MCP server
    Show {
        name: String
    },

    /// Start MCP bridge service
    Bridge {
        #[arg(long, default_value = "3031")]
        port: u16,
    },

    /// Run MCP diagnostics and health checks
    Doctor,

    /// Test MCP server connection
    Test {
        name: String,
    },
}

#[derive(clap::Subcommand)]
pub enum WorkspaceAction {
    /// Initialize new workspace
    Init {
        /// Workspace directory
        #[arg(value_name = "DIR")]
        dir: Option<PathBuf>,
    },

    /// Show workspace status
    Status,

    /// Clean workspace cache and temporary files
    Clean,

    /// List workspace projects
    List,

    /// Set workspace-specific configuration
    Set {
        key: String,
        value: String,
    },
}

#[derive(clap::Subcommand)]
pub enum MemoryAction {
    /// List conversation history
    List {
        #[arg(long)]
        limit: Option<usize>,
    },

    /// Show specific conversation
    Show {
        id: String,
    },

    /// Delete conversation(s)
    Delete {
        id: String,
    },

    /// Export conversation history
    Export {
        #[arg(short, long)]
        output: PathBuf,

        #[arg(long)]
        format: Option<OutputFormat>,
    },

    /// Import conversation history
    Import {
        #[arg(short, long)]
        input: PathBuf,
    },

    /// Clear all conversation history
    Clear {
        #[arg(long)]
        confirm: bool,
    },
}

#[derive(clap::Subcommand)]
pub enum ConfigAction {
    /// Show current configuration
    Show,

    /// Set configuration value
    Set {
        key: String,
        value: String,
    },

    /// Get configuration value
    Get {
        key: String,
    },

    /// Reset configuration to defaults
    Reset {
        #[arg(long)]
        confirm: bool,
    },

    /// Validate configuration
    Validate,

    /// Show configuration file location
    Path,
}

#[derive(clap::ValueEnum, Clone)]
pub enum TuiLayout {
    Default,
    Split,
    Tabs,
    Focus,
}

#[derive(clap::ValueEnum, Clone)]
pub enum OutputFormat {
    Text,
    Json,
    Markdown,
    Html,
    Yaml,
}

#[derive(clap::ValueEnum, Clone)]
pub enum CompletionShell {
    Bash,
    Zsh,
    Fish,
    PowerShell,
    Elvish,
}

impl EnhancedCli {
    /// Get the effective approval mode, considering both CLI args and ask_for_approval flag
    pub fn get_approval_mode(&self) -> AskForApproval {
        if self.ask_for_approval {
            // Force confirmation mode if --ask-for-approval is set
            AskForApproval::OnRequest
        } else if let Some(mode) = self.approval_mode {
            mode.into()
        } else {
            // Default to untrusted mode (safe default)
            AskForApproval::UnlessTrusted
        }
    }

    /// Check if running in autonomous mode
    pub fn is_autonomous(&self) -> bool {
        matches!(self.approval_mode, Some(ApprovalModeCliArg::Never))
    }

    /// Check if streaming is enabled
    pub fn should_stream(&self) -> bool {
        self.stream && !self.ci
    }

    /// Get effective output format
    pub fn get_output_format(&self, default: OutputFormat) -> OutputFormat {
        if self.ci {
            // CI mode prefers structured output
            OutputFormat::Json
        } else {
            default
        }
    }

    /// Validate CLI arguments
    pub fn validate(&self) -> Result<()> {
        // Check temperature range
        if let Some(temp) = self.temperature {
            if !(0.0..=2.0).contains(&temp) {
                anyhow::bail!("Temperature must be between 0.0 and 2.0");
            }
        }

        // Check context size
        if let Some(context) = self.max_context {
            if context == 0 {
                anyhow::bail!("Max context must be greater than 0");
            }
        }

        // Validate paths exist
        if let Some(dir) = &self.change_dir {
            if !dir.exists() {
                anyhow::bail!("Directory does not exist: {}", dir.display());
            }
        }

        if let Some(image) = &self.image {
            if !image.exists() {
                anyhow::bail!("Image file does not exist: {}", image.display());
            }
        }

        Ok(())
    }
}

/// CLI argument parsing and validation
pub fn parse_cli() -> Result<EnhancedCli> {
    let cli = EnhancedCli::parse();
    cli.validate()?;
    Ok(cli)
}

/// Generate shell completions
pub fn generate_completions(shell: CompletionShell) -> Result<()> {
    use clap_complete::{generate, shells};

    let mut cmd = EnhancedCli::command();
    let name = cmd.get_name().to_string();

    match shell {
        CompletionShell::Bash => generate(shells::Bash, &mut cmd, name, &mut std::io::stdout()),
        CompletionShell::Zsh => generate(shells::Zsh, &mut cmd, name, &mut std::io::stdout()),
        CompletionShell::Fish => generate(shells::Fish, &mut cmd, name, &mut std::io::stdout()),
        CompletionShell::PowerShell => generate(shells::PowerShell, &mut cmd, name, &mut std::io::stdout()),
        CompletionShell::Elvish => generate(shells::Elvish, &mut cmd, name, &mut std::io::stdout()),
    }

    Ok(())
}
