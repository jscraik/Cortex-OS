use clap::Parser;
use codex_common::ApprovalModeCliArg;
use codex_common::CliConfigOverrides;
use codex_core::config::StreamMode;
use std::path::PathBuf;

#[derive(Parser, Debug)]
#[command(version)]
pub struct Cli {
    /// Optional user prompt to start the session.
    pub prompt: Option<String>,

    /// Optional image(s) to attach to the initial prompt.
    #[arg(long = "image", short = 'i', value_name = "FILE", value_delimiter = ',', num_args = 1..)]
    pub images: Vec<PathBuf>,

    /// Model the agent should use.
    #[arg(long, short = 'm')]
    pub model: Option<String>,

    /// Convenience flag to select the local open source model provider.
    /// Equivalent to -c model_provider=oss; verifies a local Ollama server is
    /// running.
    #[arg(long = "oss", default_value_t = false)]
    pub oss: bool,

    /// Configuration profile from config.toml to specify default options.
    #[arg(long = "profile", short = 'p')]
    pub config_profile: Option<String>,

    /// Select the sandbox policy to use when executing model-generated shell
    /// commands.
    #[arg(long = "sandbox", short = 's')]
    pub sandbox_mode: Option<codex_common::SandboxModeCliArg>,

    /// Configure when the model requires human approval before executing a command.
    #[arg(long = "ask-for-approval", short = 'a')]
    pub approval_policy: Option<ApprovalModeCliArg>,

    /// Convenience alias for low-friction sandboxed automatic execution (-a on-failure, --sandbox workspace-write).
    #[arg(long = "full-auto", default_value_t = false)]
    pub full_auto: bool,

    /// Skip all confirmation prompts and execute commands without sandboxing.
    /// EXTREMELY DANGEROUS. Intended solely for running in environments that are externally sandboxed.
    #[arg(
        long = "dangerously-bypass-approvals-and-sandbox",
        alias = "yolo",
        default_value_t = false,
        conflicts_with_all = ["approval_policy", "full_auto"]
    )]
    pub dangerously_bypass_approvals_and_sandbox: bool,

    /// Tell the agent to use the specified directory as its working root.
    #[clap(long = "cd", short = 'C', value_name = "DIR")]
    pub cwd: Option<PathBuf>,

    /// Enable web search (off by default). When enabled, the native Responses `web_search` tool is available to the model (no per‑call approval).
    #[arg(long = "search", default_value_t = false)]
    pub web_search: bool,

    #[clap(skip)]
    pub config_overrides: CliConfigOverrides,

    /// Preferred streaming display mode for model responses (auto, aggregate, raw, json).
    #[arg(long = "stream-mode", value_name = "MODE", value_parser = stream_mode_parser)]
    pub stream_mode: Option<StreamMode>,

    /// Force aggregated (single final) output even when raw streaming available.
    #[arg(long = "aggregate", conflicts_with_all=["raw","json","stream_mode"], requires_if("false","json"))]
    pub aggregate: bool,

    /// Force raw token delta streaming.
    #[arg(long = "raw", conflicts_with_all=["aggregate","json","stream_mode"], requires_if("false","json"))]
    pub raw: bool,

    /// Emit structured NDJSON streaming events to the TUI (still rendered, but drives internal display differently).
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
