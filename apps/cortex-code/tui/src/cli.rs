use clap::Parser;
use codex_common::ApprovalModeCliArg;
use codex_common::CliConfigOverrides;
use codex_core::config::StreamMode;
use codex_protocol::config_types::ReasoningEffort;
use codex_protocol::config_types::ReasoningSummary;
use codex_core::config_types::Verbosity;
use std::path::PathBuf;

#[derive(Parser, Debug)]
#[command(version)]
pub struct Cli {
    /// Optional user prompt to start the session.
    pub prompt: Option<String>,

    /// Optional image(s) to attach to the initial prompt.
    #[arg(long = "image", short = 'i', value_name = "FILE", value_delimiter = ',', num_args = 1..)]
    pub images: Vec<PathBuf>,

    /// Open an interactive picker to resume a previous session recorded on disk
    /// instead of starting a new one.
    ///
    /// Notes:
    /// - Mutually exclusive with `--continue`.
    /// - The picker displays recent sessions and a preview of the first real user
    ///   message to help you select the right one.
    #[arg(
        long = "resume",
        default_value_t = false,
        conflicts_with = "continue",
        hide = true
    )]
    pub resume: bool,

    /// Continue the most recent conversation without showing the picker.
    ///
    /// Notes:
    /// - Mutually exclusive with `--resume`.
    /// - If no recorded sessions are found, this behaves like starting fresh.
    /// - Equivalent to picking the newest item in the resume picker.
    #[arg(
        id = "continue",
        long = "continue",
        default_value_t = false,
        conflicts_with = "resume",
        hide = true
    )]
    pub r#continue: bool,

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
    #[arg(long = "aggregate", conflicts_with_all=["raw","json_stream","stream_mode"])]
    pub aggregate: bool,

    /// Force raw token delta streaming.
    #[arg(long = "raw", conflicts_with_all=["aggregate","json_stream","stream_mode"])]
    pub raw: bool,

    /// Emit structured NDJSON streaming events to the TUI (still rendered, but drives internal display differently).
    #[arg(long = "json-stream", conflicts_with_all=["aggregate","raw","stream_mode"], alias="json-events")]
    pub json_stream: bool,

    /// Reasoning effort for Responses API (minimal|low|medium|high)
    #[arg(long = "reasoning-effort", value_name = "LEVEL", value_parser = reasoning_effort_parser)]
    pub reasoning_effort: Option<ReasoningEffort>,

    /// Reasoning summary level (auto|concise|detailed|none)
    #[arg(long = "reasoning-summary", value_name = "LEVEL", value_parser = reasoning_summary_parser)]
    pub reasoning_summary: Option<ReasoningSummary>,

    /// Text verbosity for GPT-5 models (low|medium|high)
    #[arg(long = "verbosity", value_name = "LEVEL", value_parser = verbosity_parser)]
    pub verbosity: Option<Verbosity>,
}

fn stream_mode_parser(s: &str) -> Result<StreamMode, String> {
    StreamMode::parse(s).ok_or_else(|| {
        format!(
            "invalid stream mode `{}` (expected auto|aggregate|raw|json)",
            s
        )
    })
}

fn reasoning_effort_parser(s: &str) -> Result<ReasoningEffort, String> {
    match s.to_ascii_lowercase().as_str() {
        "minimal" => Ok(ReasoningEffort::Minimal),
        "low" => Ok(ReasoningEffort::Low),
        "medium" => Ok(ReasoningEffort::Medium),
        "high" => Ok(ReasoningEffort::High),
        _ => Err(format!(
            "invalid reasoning effort `{}` (expected minimal|low|medium|high)",
            s
        )),
    }
}

fn reasoning_summary_parser(s: &str) -> Result<ReasoningSummary, String> {
    match s.to_ascii_lowercase().as_str() {
        "auto" => Ok(ReasoningSummary::Auto),
        "concise" => Ok(ReasoningSummary::Concise),
        "detailed" => Ok(ReasoningSummary::Detailed),
        "none" => Ok(ReasoningSummary::None),
        _ => Err(format!(
            "invalid reasoning summary `{}` (expected auto|concise|detailed|none)",
            s
        )),
    }
}

fn verbosity_parser(s: &str) -> Result<Verbosity, String> {
    match s.to_ascii_lowercase().as_str() {
        "low" => Ok(Verbosity::Low),
        "medium" => Ok(Verbosity::Medium),
        "high" => Ok(Verbosity::High),
        _ => Err(format!(
            "invalid verbosity `{}` (expected low|medium|high)",
            s
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use clap::CommandFactory;

    #[test]
    fn cli_flag_graph_is_valid() {
        // Ensure clap debug assertions pass for this CLI definition
        Cli::command().debug_assert();
    }

    #[test]
    fn stream_mode_parser_accepts_known_values() {
        for v in ["auto", "aggregate", "raw", "json"] {
            assert!(stream_mode_parser(v).is_ok(), "{} should parse", v);
        }
        assert!(stream_mode_parser("bogus").is_err());
    }

    #[test]
    fn aggregate_conflicts_with_raw_and_json_stream() {
        // --aggregate with --raw should be rejected
        let res = Cli::try_parse_from([
            "codex",
            "--aggregate",
            "--raw",
        ]);
        assert!(res.is_err());

        // --aggregate with --json-stream should be rejected
        let res = Cli::try_parse_from([
            "codex",
            "--aggregate",
            "--json-stream",
        ]);
        assert!(res.is_err());
    }

    #[test]
    fn raw_conflicts_with_aggregate_and_json_stream() {
        let res = Cli::try_parse_from(["codex", "--raw", "--aggregate"]);
        assert!(res.is_err());
        let res = Cli::try_parse_from(["codex", "--raw", "--json-stream"]);
        assert!(res.is_err());
    }

    #[test]
    fn stream_mode_conflicts_with_aggregate_and_raw_and_json_stream() {
        for arg in [["--aggregate"], ["--raw"], ["--json-stream"]] {
            let mut v = vec!["codex", "--stream-mode", "auto"];
            v.extend(arg.iter().copied());
            let res = Cli::try_parse_from(v);
            assert!(res.is_err());
        }
    }

    #[test]
    fn reasoning_parsers_accept_values() {
        assert!(matches!(reasoning_effort_parser("low"), Ok(ReasoningEffort::Low)));
        assert!(matches!(reasoning_summary_parser("auto"), Ok(ReasoningSummary::Auto)));
        assert!(matches!(verbosity_parser("high"), Ok(Verbosity::High)));
        assert!(reasoning_effort_parser("bogus").is_err());
        assert!(reasoning_summary_parser("bogus").is_err());
        assert!(verbosity_parser("bogus").is_err());
    }
}
