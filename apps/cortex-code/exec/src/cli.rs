use clap::Parser;
use clap::ValueEnum;
use codex_common::CliConfigOverrides;
use codex_core::config::StreamMode;
use std::path::PathBuf;

#[derive(Parser, Debug)]
#[command(version)]
pub struct Cli {
    /// Optional image(s) to attach to the initial prompt.
    #[arg(long = "image", short = 'i', value_name = "FILE", value_delimiter = ',', num_args = 1..)]
    pub images: Vec<PathBuf>,

    /// Model the agent should use.
    #[arg(long, short = 'm')]
    pub model: Option<String>,

    #[arg(long = "oss", default_value_t = false)]
    pub oss: bool,

    /// Select the sandbox policy to use when executing model-generated shell
    /// commands.
    #[arg(long = "sandbox", short = 's', value_enum)]
    pub sandbox_mode: Option<codex_common::SandboxModeCliArg>,

    /// Configuration profile from config.toml to specify default options.
    #[arg(long = "profile", short = 'p')]
    pub config_profile: Option<String>,

    /// Convenience alias for low-friction sandboxed automatic execution (-a on-failure, --sandbox workspace-write).
    #[arg(long = "full-auto", default_value_t = false)]
    pub full_auto: bool,

    /// Skip all confirmation prompts and execute commands without sandboxing.
    /// EXTREMELY DANGEROUS. Intended solely for running in environments that are externally sandboxed.
    #[arg(
        long = "dangerously-bypass-approvals-and-sandbox",
        alias = "yolo",
        default_value_t = false,
        conflicts_with = "full_auto"
    )]
    pub dangerously_bypass_approvals_and_sandbox: bool,

    /// Tell the agent to use the specified directory as its working root.
    #[clap(long = "cd", short = 'C', value_name = "DIR")]
    pub cwd: Option<PathBuf>,

    /// Allow running Codex outside a Git repository.
    #[arg(long = "skip-git-repo-check", default_value_t = false)]
    pub skip_git_repo_check: bool,

    #[clap(skip)]
    pub config_overrides: CliConfigOverrides,

    /// Specifies color settings for use in the output.
    #[arg(long = "color", value_enum, default_value_t = Color::Auto)]
    pub color: Color,

    /// Print events to stdout as JSONL.
    #[arg(long = "json", default_value_t = false)]
    pub json: bool,

    /// Specifies file where the last message from the agent should be written.
    #[arg(long = "output-last-message")]
    pub last_message_file: Option<PathBuf>,

    /// Initial instructions for the agent. If not provided as an argument (or
    /// if `-` is used), instructions are read from stdin.
    #[arg(value_name = "PROMPT")]
    pub prompt: Option<String>,

    /// Preferred streaming display mode for model responses (auto, aggregate, raw, json).
    #[arg(long = "stream-mode", value_name = "MODE", value_parser = stream_mode_parser)]
    pub stream_mode: Option<StreamMode>,

    /// Force aggregated (single final) output even when raw streaming available.
    #[arg(long = "aggregate", conflicts_with_all=["raw","json","stream_mode"], requires_if("false","json"))]
    pub aggregate: bool,

    /// Force raw token delta streaming.
    #[arg(long = "raw", conflicts_with_all=["aggregate","json","stream_mode"], requires_if("false","json"))]
    pub raw: bool,

    /// Emit structured NDJSON streaming events.
    #[arg(long = "json-stream", conflicts_with_all=["aggregate","raw","stream_mode"], alias="json-events")]
    pub json_stream: bool,
}

fn stream_mode_parser(s: &str) -> Result<StreamMode, String> {
    StreamMode::parse(s).ok_or_else(|| {
        format!(
            "invalid stream mode `{}` (expected auto|aggregate|raw|json)",
            s
        )
    })
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, ValueEnum)]
#[value(rename_all = "kebab-case")]
pub enum Color {
    Always,
    Never,
    #[default]
    Auto,
}
