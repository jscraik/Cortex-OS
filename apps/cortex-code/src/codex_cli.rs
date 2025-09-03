// Codex-like CLI structure for cortex-code
// Add this to src/main.rs or create a separate src/codex_cli.rs

use crate::app::ApprovalMode;
use clap::Parser;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "cortex-code")]
#[command(about = "A codex-style AI-powered coding assistant")]
#[command(version)]
pub struct CodexLikeCli {
    /// Optional user prompt to start the session
    pub prompt: Option<String>,

    /// Optional image(s) to attach to the initial prompt
    #[arg(long = "image", short = 'i', value_name = "FILE", value_delimiter = ',', num_args = 1..)]
    pub images: Vec<PathBuf>,

    /// Model the agent should use
    #[arg(long, short = 'm')]
    pub model: Option<String>,

    /// Convenience flag to select the local open source model provider
    /// Equivalent to -c model_provider=oss; verifies a local Ollama server is running
    #[arg(long = "oss", default_value_t = false)]
    pub oss: bool,

    /// Configuration profile from config.toml to specify default options
    #[arg(long = "profile", short = 'p')]
    pub config_profile: Option<String>,

    /// Select the sandbox policy to use when executing model-generated shell commands
    #[arg(long = "sandbox", short = 's')]
    pub sandbox_mode: Option<String>, // Could be enum: workspace-write, danger-full-access, etc.

    /// Configure when the model requires human approval before executing a command
    #[arg(long = "ask-for-approval", short = 'a')]
    pub approval_policy: Option<String>, // Could be enum: always, on-failure, never

    /// Convenience alias for low-friction sandboxed automatic execution
    /// (-a on-failure, --sandbox workspace-write)
    #[arg(long = "full-auto", default_value_t = false)]
    pub full_auto: bool,

    /// Skip all confirmation prompts and execute commands without sandboxing
    /// EXTREMELY DANGEROUS. Intended solely for running in environments that are externally sandboxed
    #[arg(
        long = "dangerously-bypass-approvals-and-sandbox",
        alias = "yolo",
        default_value_t = false,
        conflicts_with_all = ["approval_policy", "full_auto"]
    )]
    pub dangerously_bypass_approvals_and_sandbox: bool,

    /// Tell the agent to use the specified directory as its working root
    #[clap(long = "cd", short = 'C', value_name = "DIR")]
    pub cwd: Option<PathBuf>,

    /// Enable web search (off by default)
    #[arg(long = "search", default_value_t = false)]
    pub web_search: bool,

    /// Configuration overrides in key=value format
    #[arg(short = 'c', long = "config-override", value_name = "KEY=VALUE")]
    pub config_overrides: Vec<String>,

    /// Enable debug logging
    #[arg(short, long)]
    pub debug: bool,

    /// Run in non-interactive mode (for CI/automation)
    #[arg(long)]
    pub non_interactive: bool,

    /// Skip the trust/onboarding screen
    #[arg(long)]
    pub skip_onboarding: bool,
}

impl CodexLikeCli {
    /// Parse configuration overrides from -c key=value format
    pub fn parse_config_overrides(
        &self,
    ) -> Result<std::collections::HashMap<String, String>, String> {
        let mut overrides = std::collections::HashMap::new();

        for override_str in &self.config_overrides {
            if let Some((key, value)) = override_str.split_once('=') {
                overrides.insert(key.to_string(), value.to_string());
            } else {
                return Err(format!(
                    "Invalid config override format: '{}'. Expected 'key=value'",
                    override_str
                ));
            }
        }

        Ok(overrides)
    }
}
