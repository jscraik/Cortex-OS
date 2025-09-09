use clap::CommandFactory;
use clap::Parser;
use clap_complete::Shell;
use clap_complete::generate;
use codex_arg0::arg0_dispatch_or_else;
use codex_chatgpt::apply_command::ApplyCommand;
use codex_chatgpt::apply_command::run_apply_command;
use codex_cli::LandlockCommand;
use codex_cli::SeatbeltCommand;
use codex_cli::login::run_login_status;
use codex_cli::login::run_login_with_api_key;
use codex_cli::login::run_login_with_chatgpt;
use codex_cli::login::run_logout;
use codex_cli::proto;
use codex_common::CliConfigOverrides;
use codex_exec::Cli as ExecCli;
use codex_tui::Cli as TuiCli;
use codex_protocol::config_types::ReasoningEffort;
use codex_protocol::config_types::ReasoningSummary;
use codex_core::config_types::Verbosity;
use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio_stream::StreamExt;
use uuid::Uuid;

use crate::proto::ProtoCli;
use serde::Serialize;

/// CLI argument enum for stream mode selection
#[derive(Debug, Clone, clap::ValueEnum)]
enum StreamModeArg {
    /// Auto-detect best streaming mode (default)
    Auto,
    /// Force aggregation (single final message)
    Aggregate,
    /// Force raw token streaming (immediate deltas)
    Raw,
    /// Emit structured JSON events (delta/item/completed)
    Json,
}

impl From<StreamModeArg> for codex_core::config::StreamMode {
    fn from(arg: StreamModeArg) -> Self {
        match arg {
            StreamModeArg::Auto => codex_core::config::StreamMode::Auto,
            StreamModeArg::Aggregate => codex_core::config::StreamMode::Aggregate,
            StreamModeArg::Raw => codex_core::config::StreamMode::Raw,
            StreamModeArg::Json => codex_core::config::StreamMode::Json,
        }
    }
}

/// Codex CLI
///
/// If no subcommand is specified, options will be forwarded to the interactive CLI.
#[derive(Debug, Parser)]
#[clap(
    author,
    version,
    // If a sub‑command is given, ignore requirements of the default args.
    subcommand_negates_reqs = true,
    // The executable is sometimes invoked via a platform‑specific name like
    // `codex-x86_64-unknown-linux-musl`, but the help output should always use
    // the generic `codex` command name that users run.
    bin_name = "codex"
)]
struct MultitoolCli {
    #[clap(flatten)]
    pub config_overrides: CliConfigOverrides,

    #[clap(flatten)]
    interactive: TuiCli,

    #[clap(subcommand)]
    subcommand: Option<Subcommand>,
}

#[derive(Debug, clap::Subcommand)]
enum Subcommand {
    /// Run Codex non-interactively.
    #[clap(visible_alias = "e")]
    Exec(ExecCli),

    /// Manage login.
    Login(LoginCommand),

    /// Remove stored authentication credentials.
    Logout(LogoutCommand),

    /// Experimental: run Codex as an MCP server.
    Mcp,

    /// Run the Protocol stream via stdin/stdout
    #[clap(visible_alias = "p")]
    Proto(ProtoCli),

    /// Generate shell completion scripts.
    Completion(CompletionCommand),

    /// Internal debugging commands.
    Debug(DebugArgs),

    /// Apply the latest diff produced by Codex agent as a `git apply` to your local working tree.
    #[clap(visible_alias = "a")]
    Apply(ApplyCommand),

    /// Internal: generate TypeScript protocol bindings.
    #[clap(hide = true)]
    GenerateTs(GenerateTsCommand),

    /// Send a single prompt and stream the assistant's reply to stdout.
    #[clap(visible_alias = "c")]
    Chat(ChatCommand),
}

#[derive(Debug, Parser)]
struct CompletionCommand {
    /// Shell to generate completions for
    #[clap(value_enum, default_value_t = Shell::Bash)]
    shell: Shell,
}

#[derive(Debug, Parser)]
struct DebugArgs {
    #[command(subcommand)]
    cmd: DebugCommand,
}

#[derive(Debug, clap::Subcommand)]
enum DebugCommand {
    /// Run a command under Seatbelt (macOS only).
    Seatbelt(SeatbeltCommand),

    /// Run a command under Landlock+seccomp (Linux only).
    Landlock(LandlockCommand),
}

#[derive(Debug, Parser)]
struct LoginCommand {
    #[clap(skip)]
    config_overrides: CliConfigOverrides,

    #[arg(long = "api-key", value_name = "API_KEY")]
    api_key: Option<String>,

    #[command(subcommand)]
    action: Option<LoginSubcommand>,
}

#[derive(Debug, clap::Subcommand)]
enum LoginSubcommand {
    /// Show login status.
    Status,
}

#[derive(Debug, Parser)]
struct LogoutCommand {
    #[clap(skip)]
    config_overrides: CliConfigOverrides,
}

#[derive(Debug, Parser)]
struct GenerateTsCommand {
    /// Output directory where .ts files will be written
    #[arg(short = 'o', long = "out", value_name = "DIR")]
    out_dir: PathBuf,

    /// Optional path to the Prettier executable to format generated files
    #[arg(short = 'p', long = "prettier", value_name = "PRETTIER_BIN")]
    prettier: Option<PathBuf>,
}

#[derive(Debug, Parser)]
struct ChatCommand {
    #[clap(skip)]
    config_overrides: CliConfigOverrides,

    /// The prompt to send to the model.
    /// Use "-" to read the prompt from stdin.
    /// Optional when using --repl.
    #[arg(value_name = "PROMPT")]
    prompt: Option<String>,

    /// Named session persisted under `$CODEX_HOME/sessions/<name>.jsonl`.
    #[arg(long = "session", value_name = "NAME", conflicts_with = "session_file")]
    session_name: Option<String>,

    /// Explicit path to a session history file (JSONL of ResponseItem).
    #[arg(long = "session-file", value_name = "PATH")]
    session_file: Option<PathBuf>,

    /// Start a fresh session, ignoring any existing history file.
    #[arg(long = "reset")]
    reset: bool,

    /// Stay in a simple REPL and send each line as a new turn.
    /// When set, PROMPT is optional and used as the first turn if provided.
    #[arg(long = "repl")]
    repl: bool,

    /// Unified streaming mode control. Preferred over legacy flags.
    #[arg(long = "stream-mode", value_enum, conflicts_with_all = ["aggregate", "no_aggregate", "stream_json", "json"])]
    stream_mode: Option<StreamModeArg>,

    /// Force aggregation (opposite of --no-aggregate). Mutually exclusive with --no-aggregate.
    /// DEPRECATED: Use --stream-mode aggregate instead.
    #[arg(long = "aggregate", conflicts_with = "no_aggregate")]
    aggregate: bool,

    /// Disable aggregation and force raw token streaming (prints each delta as it arrives).
    /// DEPRECATED: Use --stream-mode raw instead.
    #[arg(
        long = "no-aggregate",
        visible_alias = "raw",
        conflicts_with = "aggregate"
    )]
    no_aggregate: bool,

    /// Stream structured JSON lines (one per event) instead of plain text.
    /// DEPRECATED: Use --stream-mode json instead.
    #[arg(long = "stream-json", conflicts_with_all = ["aggregate", "no_aggregate"])]
    stream_json: bool,

    /// Convenience alias: equivalent to --stream-json plus aggregation semantics.
    /// Cannot be combined with raw/aggregate flags.
    /// DEPRECATED: Use --stream-mode json instead.
    #[arg(long = "json", conflicts_with_all = ["aggregate", "no_aggregate", "stream_json"])]
    json: bool,

    /// Reasoning effort for Responses API (minimal|low|medium|high)
    #[arg(long = "reasoning-effort", value_name = "LEVEL", value_parser = reasoning_effort_parser)]
    reasoning_effort: Option<ReasoningEffort>,

    /// Reasoning summary level (auto|concise|detailed|none)
    #[arg(long = "reasoning-summary", value_name = "LEVEL", value_parser = reasoning_summary_parser)]
    reasoning_summary: Option<ReasoningSummary>,

    /// Text verbosity for GPT-5 models (low|medium|high)
    #[arg(long = "verbosity", value_name = "LEVEL", value_parser = verbosity_parser)]
    verbosity: Option<Verbosity>,
}

fn main() -> anyhow::Result<()> {
    arg0_dispatch_or_else(|codex_linux_sandbox_exe| async move {
        cli_main(codex_linux_sandbox_exe).await?;
        Ok(())
    })
}

async fn cli_main(codex_linux_sandbox_exe: Option<PathBuf>) -> anyhow::Result<()> {
    let cli = MultitoolCli::parse();

    match cli.subcommand {
        None => {
            let mut tui_cli = cli.interactive;
            prepend_config_flags(&mut tui_cli.config_overrides, cli.config_overrides);
            let usage = codex_tui::run_main(tui_cli, codex_linux_sandbox_exe).await?;
            if !usage.is_zero() {
                println!("{}", codex_core::protocol::FinalOutput::from(usage));
            }
        }
        Some(Subcommand::Exec(mut exec_cli)) => {
            prepend_config_flags(&mut exec_cli.config_overrides, cli.config_overrides);
            codex_exec::run_main(exec_cli, codex_linux_sandbox_exe).await?;
        }
        Some(Subcommand::Mcp) => {
            codex_mcp_server::run_main(codex_linux_sandbox_exe, cli.config_overrides).await?;
        }
        Some(Subcommand::Login(mut login_cli)) => {
            prepend_config_flags(&mut login_cli.config_overrides, cli.config_overrides);
            match login_cli.action {
                Some(LoginSubcommand::Status) => {
                    run_login_status(login_cli.config_overrides).await;
                }
                None => {
                    if let Some(api_key) = login_cli.api_key {
                        run_login_with_api_key(login_cli.config_overrides, api_key).await;
                    } else {
                        run_login_with_chatgpt(login_cli.config_overrides).await;
                    }
                }
            }
        }
        Some(Subcommand::Logout(mut logout_cli)) => {
            prepend_config_flags(&mut logout_cli.config_overrides, cli.config_overrides);
            run_logout(logout_cli.config_overrides).await;
        }
        Some(Subcommand::Proto(mut proto_cli)) => {
            prepend_config_flags(&mut proto_cli.config_overrides, cli.config_overrides);
            proto::run_main(proto_cli).await?;
        }
        Some(Subcommand::Completion(completion_cli)) => {
            print_completion(completion_cli);
        }
        Some(Subcommand::Debug(debug_args)) => match debug_args.cmd {
            DebugCommand::Seatbelt(mut seatbelt_cli) => {
                prepend_config_flags(&mut seatbelt_cli.config_overrides, cli.config_overrides);
                codex_cli::debug_sandbox::run_command_under_seatbelt(
                    seatbelt_cli,
                    codex_linux_sandbox_exe,
                )
                .await?;
            }
            DebugCommand::Landlock(mut landlock_cli) => {
                prepend_config_flags(&mut landlock_cli.config_overrides, cli.config_overrides);
                codex_cli::debug_sandbox::run_command_under_landlock(
                    landlock_cli,
                    codex_linux_sandbox_exe,
                )
                .await?;
            }
        },
        Some(Subcommand::Apply(mut apply_cli)) => {
            prepend_config_flags(&mut apply_cli.config_overrides, cli.config_overrides);
            run_apply_command(apply_cli, None).await?;
        }
        Some(Subcommand::GenerateTs(gen_cli)) => {
            codex_protocol_ts::generate_ts(&gen_cli.out_dir, gen_cli.prettier.as_deref())?;
        }
        Some(Subcommand::Chat(mut chat_cli)) => {
            // Merge root-level config overrides with subcommand-specific ones.
            prepend_config_flags(&mut chat_cli.config_overrides, cli.config_overrides);

            // Load full Config with overrides (keeps existing behavior intact).
            // Determine stream mode override from CLI flags with deprecation warnings
            let stream_mode_override = compute_stream_mode_override(&chat_cli);

            let mut overrides = codex_core::config::ConfigOverrides::default();
            overrides.stream_mode_override = stream_mode_override;
            overrides.model_reasoning_effort = chat_cli.reasoning_effort;
            overrides.model_reasoning_summary = chat_cli.reasoning_summary;
            overrides.model_verbosity = chat_cli.verbosity;

            let cfg = codex_core::config::Config::load_with_cli_overrides(
                chat_cli
                    .config_overrides
                    .parse_overrides()
                    .map_err(anyhow::Error::msg)?,
                overrides,
            )?;

            // Resolve session file path if provided.
            let session_path = resolve_session_path(
                &cfg.codex_home,
                &chat_cli.session_name,
                chat_cli.session_file.clone(),
            );

            // Load prior history when using sessions, unless reset. Ensure a meta header is present for new/emptied files.
            let history: Vec<codex_core::ResponseItem> = if let Some(path) = session_path.as_deref()
            {
                let git = codex_core::git_info::collect_git_info(&cfg.cwd).await;
                if chat_cli.reset {
                    // Ensure parent dir exists and truncate file.
                    ensure_parent_dir(path)?;
                    truncate_file(path)?;
                    write_session_meta_if_empty(
                        path,
                        &cfg.model,
                        &cfg.model_provider_id,
                        git.as_ref().and_then(|g| g.branch.as_deref()),
                        git.as_ref().and_then(|g| g.commit_hash.as_deref()),
                    )?;
                    Vec::new()
                } else {
                    write_session_meta_if_empty(
                        path,
                        &cfg.model,
                        &cfg.model_provider_id,
                        git.as_ref().and_then(|g| g.branch.as_deref()),
                        git.as_ref().and_then(|g| g.commit_hash.as_deref()),
                    )?;
                    read_history_jsonl(path)
                }
            } else {
                Vec::new()
            };

            // Create AuthManager and ModelClient like other entry points do.
            let auth_manager = Arc::new(codex_core::AuthManager::new(
                cfg.codex_home.clone(),
                cfg.preferred_auth_method,
            ));
            let provider = cfg.model_provider.clone();
            let effort = cfg.model_reasoning_effort;
            let summary = cfg.model_reasoning_summary;
            let client = codex_core::ModelClient::new(
                Arc::new(cfg.clone()),
                Some(auth_manager),
                provider,
                effort,
                summary,
                Uuid::new_v4(),
            );

            // Helper closure to run a single turn given text input.
            let run_turn = |text: String,
                            prior: &Vec<codex_core::ResponseItem>|
             -> anyhow::Result<(
                codex_core::ResponseItem,
                Vec<codex_core::ResponseItem>,
            )> {
                let user_item = codex_core::ResponseItem::Message {
                    id: None,
                    role: "user".to_string(),
                    content: vec![codex_core::ContentItem::InputText { text }],
                };

                let mut prompt = codex_core::Prompt::default();
                if !prior.is_empty() {
                    prompt.input.extend(prior.clone());
                }
                prompt.input.push(user_item.clone());

                Ok((user_item, prompt.input))
            };

            // Execute a single turn and stream, returning assistant outputs.
            async fn stream_turn(
                client: &codex_core::ModelClient,
                prompt_input: Vec<codex_core::ResponseItem>,
                stream_mode: codex_core::config::StreamMode,
            ) -> anyhow::Result<Vec<codex_core::ResponseItem>> {
                let mut prompt = codex_core::Prompt::default();
                prompt.input = prompt_input;
                let mut stream = match stream_mode {
                    codex_core::config::StreamMode::Raw
                    | codex_core::config::StreamMode::Json => client.stream_raw(&prompt).await?,
                    codex_core::config::StreamMode::Aggregate
                    | codex_core::config::StreamMode::Auto => client.stream(&prompt).await?,
                };
                let mut completed_items: Vec<codex_core::ResponseItem> = Vec::new();
                // Track whether we've printed any token deltas. When the provider
                // (Chat Completions wire API) is aggregated by the core client it
                // suppresses per‑token `OutputTextDelta` events and only emits a
                // final `OutputItemDone` containing the full assistant message.
                // The original loop only printed deltas, so in aggregated mode
                // nothing was printed (breaking our CLI streaming test). If we
                // see a terminal assistant message item *and* no deltas were
                // printed yet, we now print its text so the user still sees the
                // response once. This preserves real streaming when available
                // while remaining backward compatible with aggregated mode.
                let mut printed_any_delta = false;

                fn process_event(
                    ev: codex_core::ResponseEvent,
                    printed_any_delta: &mut bool,
                    completed_items: &mut Vec<codex_core::ResponseItem>,
                    as_json: bool,
                ) {
                    if as_json {
                        // Serialize a lightweight representation of the event.
                        // We avoid serializing full items except for OutputItemDone.
                        #[derive(serde::Serialize)]
                        struct JsonEvent<'a> {
                            r#type: &'static str,
                            #[serde(skip_serializing_if = "Option::is_none")]
                            delta: Option<&'a str>,
                            #[serde(skip_serializing_if = "Option::is_none")]
                            item: Option<&'a codex_core::ResponseItem>,
                        }
                        match &ev {
                            codex_core::ResponseEvent::OutputTextDelta(s) => {
                                let line = serde_json::to_string(&JsonEvent {
                                    r#type: "delta",
                                    delta: Some(s),
                                    item: None,
                                })
                                .ok();
                                if let Some(l) = line {
                                    println!("{l}");
                                }
                            }
                            codex_core::ResponseEvent::OutputItemDone(item) => {
                                let line = serde_json::to_string(&JsonEvent {
                                    r#type: "item",
                                    delta: None,
                                    item: Some(item),
                                })
                                .ok();
                                if let Some(l) = line {
                                    println!("{l}");
                                }
                            }
                            codex_core::ResponseEvent::Completed { .. } => {
                                let line = serde_json::to_string(&JsonEvent {
                                    r#type: "completed",
                                    delta: None,
                                    item: None,
                                })
                                .ok();
                                if let Some(l) = line {
                                    println!("{l}");
                                }
                            }
                            codex_core::ResponseEvent::Created => {}
                            _ => {}
                        }
                    }
                    match ev {
                        codex_core::ResponseEvent::OutputTextDelta(s) => {
                            if !as_json {
                                print!("{s}");
                                use std::io::Write as _;
                                std::io::stdout().flush().ok();
                            }
                            *printed_any_delta = true;
                        }
                        codex_core::ResponseEvent::OutputItemDone(item) => {
                            if !*printed_any_delta {
                                if !as_json {
                                    if let codex_core::ResponseItem::Message {
                                        role, content, ..
                                    } = &item
                                    {
                                        if role == "assistant" {
                                            if let Some(text) = content.iter().find_map(|c| match c
                                            {
                                                codex_core::ContentItem::OutputText { text } => {
                                                    Some(text)
                                                }
                                                _ => None,
                                            }) {
                                                print!("{text}");
                                                use std::io::Write as _;
                                                std::io::stdout().flush().ok();
                                            }
                                        }
                                    }
                                }
                            }
                            completed_items.push(item);
                        }
                        codex_core::ResponseEvent::Completed { .. } => {
                            if !as_json {
                                println!();
                            }
                        }
                        _ => {}
                    }
                }
                while let Some(event) = stream.next().await {
                    process_event(
                        event?,
                        &mut printed_any_delta,
                        &mut completed_items,
                        matches!(stream_mode, codex_core::config::StreamMode::Json),
                    );
                }
                Ok(completed_items)
            }

            // Choose mode: single turn or REPL.
            let mut session_history = history.clone();
            if chat_cli.repl {
                // Optional first turn from PROMPT or stdin when "-".
                if let Some(p) = chat_cli.prompt.clone() {
                    let first_text = if p == "-" { read_stdin_all()? } else { p };
                    let (user_item, prompt_input) = run_turn(first_text, &session_history)?;
                    let assistant_items =
                        stream_turn(&client, prompt_input, cfg.stream_mode).await?;
                    // Persist and update in-memory history
                    if let Some(path) = session_path.as_deref() {
                        ensure_parent_dir(path)?;
                        append_history_jsonl(path, &user_item)?;
                        for item in &assistant_items {
                            append_history_jsonl(path, item)?;
                        }
                    }
                    session_history.push(user_item);
                    session_history.extend(assistant_items);
                }

                // Read lines in a simple REPL until EOF/empty ctrl-d.
                let stdin = std::io::stdin();
                let mut buf = String::new();
                loop {
                    buf.clear();
                    print!("You> ");
                    use std::io::Write as _;
                    std::io::stdout().flush().ok();
                    if stdin.read_line(&mut buf).is_err() {
                        break;
                    }
                    let line = buf.trim_end().to_string();
                    if line.is_empty() || line == ":q" || line == ":quit" {
                        break;
                    }
                    let (user_item, prompt_input) = run_turn(line, &session_history)?;
                    let assistant_items =
                        stream_turn(&client, prompt_input, cfg.stream_mode).await?;
                    if let Some(path) = session_path.as_deref() {
                        ensure_parent_dir(path)?;
                        append_history_jsonl(path, &user_item)?;
                        for item in &assistant_items {
                            append_history_jsonl(path, item)?;
                        }
                    }
                    session_history.push(user_item);
                    session_history.extend(assistant_items);
                }
            } else {
                // Single turn. PROMPT is required in this mode.
                let p = chat_cli
                    .prompt
                    .clone()
                    .ok_or_else(|| anyhow::anyhow!("PROMPT is required unless --repl is used"))?;
                let text = if p == "-" { read_stdin_all()? } else { p };
                let (user_item, prompt_input) = run_turn(text, &session_history)?;
                let assistant_items = stream_turn(&client, prompt_input, cfg.stream_mode).await?;
                if let Some(path) = session_path.as_deref() {
                    ensure_parent_dir(path)?;
                    append_history_jsonl(path, &user_item)?;
                    for item in assistant_items {
                        append_history_jsonl(path, &item)?;
                    }
                }
            }
        }
    }

    Ok(())
}

/// Compute the effective stream mode override from ChatCommand flags, emitting
/// deprecation warnings for legacy flags. New --stream-mode takes precedence
/// (clap already prevents mixing them). Extracted for unit testing.
fn compute_stream_mode_override(chat_cli: &ChatCommand) -> Option<codex_core::config::StreamMode> {
    if let Some(mode) = &chat_cli.stream_mode {
        return Some(mode.clone().into());
    }
    let mut warned = false;
    let mode = if chat_cli.stream_json || chat_cli.json {
        if chat_cli.json {
            eprintln!("(deprecated) --json: use --stream-mode json");
        } else {
            eprintln!("(deprecated) --stream-json: use --stream-mode json");
        }
        warned = true;
        Some(codex_core::config::StreamMode::Json)
    } else if chat_cli.aggregate {
        eprintln!("(deprecated) --aggregate: use --stream-mode aggregate");
        warned = true;
        Some(codex_core::config::StreamMode::Aggregate)
    } else if chat_cli.no_aggregate {
        eprintln!("(deprecated) --no-aggregate: use --stream-mode raw");
        warned = true;
        Some(codex_core::config::StreamMode::Raw)
    } else {
        None
    };
    if warned {
        eprintln!(
            "         See --help for current flags or set CODEX_STREAM_MODE environment variable."
        );
    }
    mode
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
mod io_tests {
    use super::*;
    use clap::Parser;
    use clap::CommandFactory;

    // Helper to parse just the Chat subcommand args returning ChatCommand
    fn parse_chat(args: &[&str]) -> ChatCommand {
        // Build full CLI args: binary name + subcommand + provided args
        let mut full: Vec<String> = vec!["codex".into(), "chat".into()];
        full.extend(args.iter().map(|s| s.to_string()));
        // MultitoolCli parsing will route to Chat subcommand.
        let cli = MultitoolCli::parse_from(&full);
        match cli.subcommand.expect("chat subcommand") {
            Subcommand::Chat(chat) => chat,
            _ => panic!("expected chat subcommand"),
        }
    }

    #[test]
    fn legacy_aggregate_maps_to_aggregate() {
        let chat = parse_chat(&["--aggregate", "hello"]);
        let mode = compute_stream_mode_override(&chat);
        assert!(matches!(mode, Some(codex_core::config::StreamMode::Aggregate)));
    }

    #[test]
    fn legacy_no_aggregate_maps_to_raw() {
        let chat = parse_chat(&["--no-aggregate", "hello"]);
        let mode = compute_stream_mode_override(&chat);
        assert!(matches!(mode, Some(codex_core::config::StreamMode::Raw)));
    }

    #[test]
    fn legacy_stream_json_maps_to_json() {
        let chat = parse_chat(&["--stream-json", "hello"]);
        let mode = compute_stream_mode_override(&chat);
        assert!(matches!(mode, Some(codex_core::config::StreamMode::Json)));
    }

    #[test]
    fn legacy_json_maps_to_json() {
        let chat = parse_chat(&["--json", "hello"]);
        let mode = compute_stream_mode_override(&chat);
        assert!(matches!(mode, Some(codex_core::config::StreamMode::Json)));
    }

    #[test]
    fn new_stream_mode_takes_precedence() {
        // Provide only new flag.
        let chat = parse_chat(&["--stream-mode", "raw", "hello"]);
        let mode = compute_stream_mode_override(&chat);
        assert!(matches!(mode, Some(codex_core::config::StreamMode::Raw)));
    }

    #[test]
    fn top_level_cli_debug_assert() {
        // Ensure our command graph remains valid as we add flags/features
        MultitoolCli::command().debug_assert();
    }
}

/// Prepend root-level overrides so they have lower precedence than
/// CLI-specific ones specified after the subcommand (if any).
fn prepend_config_flags(
    subcommand_config_overrides: &mut CliConfigOverrides,
    cli_config_overrides: CliConfigOverrides,
) {
    subcommand_config_overrides
        .raw_overrides
        .splice(0..0, cli_config_overrides.raw_overrides);
}

fn print_completion(cmd: CompletionCommand) {
    let mut app = MultitoolCli::command();
    let name = "codex";
    generate(cmd.shell, &mut app, name, &mut std::io::stdout());
}

fn resolve_session_path(
    codex_home: &Path,
    session_name: &Option<String>,
    session_file: Option<PathBuf>,
) -> Option<PathBuf> {
    if let Some(file) = session_file {
        return Some(file);
    }
    if let Some(name) = session_name {
        let mut p = codex_home.to_path_buf();
        p.push("sessions");
        p.push(format!("{name}.jsonl"));
        return Some(p);
    }
    None
}

fn ensure_parent_dir(path: &Path) -> anyhow::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    Ok(())
}

fn truncate_file(path: &Path) -> anyhow::Result<()> {
    File::create(path)?; // create truncates
    Ok(())
}

#[derive(Serialize)]
struct SessionMeta<'a> {
    r#type: &'static str,
    created_at: String,
    model: &'a str,
    provider: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    git: Option<GitMeta<'a>>,
}

#[derive(Serialize)]
struct GitMeta<'a> {
    #[serde(skip_serializing_if = "Option::is_none")]
    branch: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    commit: Option<&'a str>,
}

fn write_session_meta_if_empty(
    path: &Path,
    model: &str,
    provider: &str,
    git_branch: Option<&str>,
    git_commit: Option<&str>,
) -> anyhow::Result<()> {
    // If file exists and non-empty, do nothing
    if path.exists() {
        let meta = std::fs::metadata(path)?;
        if meta.len() > 0 {
            return Ok(());
        }
    } else {
        ensure_parent_dir(path)?;
    }

    let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    let git_meta = if git_branch.is_some() || git_commit.is_some() {
        Some(GitMeta {
            branch: git_branch,
            commit: git_commit,
        })
    } else {
        None
    };

    let header = SessionMeta {
        r#type: "session_meta",
        created_at: now,
        model,
        provider,
        git: git_meta,
    };

    let mut file = OpenOptions::new().create(true).append(true).open(path)?;
    let line = serde_json::to_string(&header)?;
    writeln!(file, "{line}")?;
    Ok(())
}

fn read_history_jsonl(path: &Path) -> Vec<codex_core::ResponseItem> {
    let f = match File::open(path) {
        Ok(f) => f,
        Err(_) => return Vec::new(),
    };
    let reader = BufReader::new(f);
    let mut items = Vec::new();
    for line in reader.lines().map_while(Result::ok) {
        if line.trim().is_empty() {
            continue;
        }
        if let Ok(item) = serde_json::from_str::<codex_core::ResponseItem>(&line) {
            items.push(item);
        }
    }
    items
}

fn append_history_jsonl(path: &Path, item: &codex_core::ResponseItem) -> anyhow::Result<()> {
    let mut file = OpenOptions::new().create(true).append(true).open(path)?;
    let line = serde_json::to_string(item)?;
    writeln!(file, "{line}")?;
    Ok(())
}

fn read_stdin_all() -> anyhow::Result<String> {
    use std::io::Read;
    let mut buf = String::new();
    std::io::stdin().read_to_string(&mut buf)?;
    Ok(buf)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn resolve_session_path_by_name_and_file() {
        let tmp = TempDir::new().expect("tmp");
        let home = tmp.path();
        // By name
        let p = resolve_session_path(home, &Some("demo".to_string()), None).expect("path");
        assert!(p.ends_with("sessions/demo.jsonl"), "{}", p.display());
        // By explicit file
        let explicit = home.join("my.jsonl");
        let p2 = resolve_session_path(home, &None, Some(explicit.clone())).expect("path");
        assert_eq!(p2, explicit);
    }

    #[test]
    fn history_jsonl_roundtrip() {
        let tmp = TempDir::new().expect("tmp");
        let f = tmp.path().join("hist.jsonl");
        // Empty read returns empty
        let items0 = read_history_jsonl(&f);
        assert!(items0.is_empty());

        // Append two items, then read back
        let u1 = codex_core::ResponseItem::Message {
            id: None,
            role: "user".into(),
            content: vec![codex_core::ContentItem::InputText { text: "hi".into() }],
        };
        let a1 = codex_core::ResponseItem::Message {
            id: None,
            role: "assistant".into(),
            content: vec![codex_core::ContentItem::OutputText {
                text: "hello".into(),
            }],
        };
        ensure_parent_dir(&f).unwrap();
        append_history_jsonl(&f, &u1).unwrap();
        append_history_jsonl(&f, &a1).unwrap();

        let items = read_history_jsonl(&f);
        assert_eq!(items.len(), 2);
        // Spot-check roles
        match &items[0] {
            codex_core::ResponseItem::Message { role, .. } => assert_eq!(role, "user"),
            _ => panic!("expected message"),
        }
        match &items[1] {
            codex_core::ResponseItem::Message { role, .. } => assert_eq!(role, "assistant"),
            _ => panic!("expected message"),
        }
    }

    #[test]
    fn session_meta_written_on_empty_file() {
        let tmp = TempDir::new().expect("tmp");
        let f = tmp.path().join("s.jsonl");
        write_session_meta_if_empty(&f, "gpt-5", "openai", None, None).unwrap();
        let contents = std::fs::read_to_string(&f).unwrap();
        assert!(contents.contains("\"session_meta\""));
        assert!(contents.contains("\"created_at\""));
        assert!(contents.contains("\"model\""));
        assert!(contents.contains("\"provider\""));
    }

    #[test]
    fn chat_cli_parsing() {
        // REPL with session name, no prompt
        let args = ["codex", "chat", "--session", "demo", "--repl"];
        let cli = MultitoolCli::parse_from(args);
        match cli.subcommand {
            Some(Subcommand::Chat(cmd)) => {
                assert_eq!(cmd.session_name.as_deref(), Some("demo"));
                assert!(cmd.repl);
                assert!(cmd.prompt.is_none());
            }
            _ => panic!("expected Chat command"),
        }

        // Single-turn with stdin prompt
        let args2 = ["codex", "chat", "-"];
        let cli2 = MultitoolCli::parse_from(args2);
        match cli2.subcommand {
            Some(Subcommand::Chat(cmd)) => {
                assert_eq!(cmd.prompt.as_deref(), Some("-"));
                assert!(!cmd.repl);
            }
            _ => panic!("expected Chat command"),
        }
    }
}
