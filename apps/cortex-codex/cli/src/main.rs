use clap::CommandFactory;
use clap::Parser;
use clap_complete::generate;
use clap_complete::Shell;
use codex_arg0::arg0_dispatch_or_else;
use codex_chatgpt::apply_command::run_apply_command;
use codex_chatgpt::apply_command::ApplyCommand;
use codex_cli::login::run_login_status;
use codex_cli::login::run_login_with_api_key;
use codex_cli::login::run_login_with_chatgpt;
use codex_cli::login::run_logout;
use codex_cli::proto;
use codex_cli::LandlockCommand;
use codex_cli::SeatbeltCommand;
use codex_common::CliConfigOverrides;
use codex_exec::Cli as ExecCli;
use codex_tui::Cli as TuiCli;
use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio_stream::StreamExt;
use uuid::Uuid;

use crate::proto::ProtoCli;

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

    /// Tell the chat command to use the specified directory as its working root.
    #[clap(long = "cd", short = 'C', value_name = "DIR")]
    cwd: Option<PathBuf>,

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

            // If a working directory was provided, change to it before doing any work.
            if let Some(dir) = &chat_cli.cwd {
                std::env::set_current_dir(dir)?;
            }

            // Load full Config with overrides (keeps existing behavior intact).
            let cfg = codex_core::config::Config::load_with_cli_overrides(
                chat_cli
                    .config_overrides
                    .parse_overrides()
                    .map_err(anyhow::Error::msg)?,
                codex_core::config::ConfigOverrides::default(),
            )?;

            // Resolve session file path if provided.
            let session_path = resolve_session_path(
                &cfg.codex_home,
                &chat_cli.session_name,
                chat_cli.session_file.clone(),
            );

            // Load prior history when using sessions, unless reset.
            let history: Vec<codex_core::ResponseItem> = if let Some(path) = session_path.as_deref()
            {
                if chat_cli.reset {
                    // Ensure parent dir exists and truncate file.
                    ensure_parent_dir(path)?;
                    truncate_file(path)?;
                    Vec::new()
                } else {
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
            ) -> anyhow::Result<Vec<codex_core::ResponseItem>> {
                let mut prompt = codex_core::Prompt::default();
                prompt.input = prompt_input;
                let mut stream = client.stream(&prompt).await?;
                let mut completed_items: Vec<codex_core::ResponseItem> = Vec::new();
                while let Some(event) = stream.next().await {
                    match event? {
                        codex_core::ResponseEvent::OutputTextDelta(s) => {
                            print!("{s}");
                            use std::io::Write as _;
                            std::io::stdout().flush().ok();
                        }
                        codex_core::ResponseEvent::OutputItemDone(item) => {
                            // When using aggregated streams (default), deltas are not emitted.
                            // Print the final assistant message text here so users see output.
                            if let codex_core::ResponseItem::Message { content, role, .. } = &item {
                                if role == "assistant" {
                                    for c in content {
                                        if let codex_core::ContentItem::OutputText { text } = c {
                                            if !text.is_empty() {
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
                            println!();
                        }
                        _ => {}
                    }
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
                    let assistant_items = stream_turn(&client, prompt_input).await?;
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
                    let assistant_items = stream_turn(&client, prompt_input).await?;
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
                let assistant_items = stream_turn(&client, prompt_input).await?;
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

        // -C/--cd working directory parsing
        let args3 = ["codex", "chat", "-C", "/tmp", "-"];
        let cli3 = MultitoolCli::parse_from(args3);
        match cli3.subcommand {
            Some(Subcommand::Chat(cmd)) => {
                assert_eq!(cmd.cwd.as_deref(), Some(std::path::Path::new("/tmp")));
                assert_eq!(cmd.prompt.as_deref(), Some("-"));
            }
            _ => panic!("expected Chat command"),
        }
    }
}
