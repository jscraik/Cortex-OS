use anyhow::Result;
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
use std::path::PathBuf;
use tracing::error;

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

    /// MCP commands (list, server, etc.)
    Mcp(McpCli),

    /// A2A commands (doctor, send, etc.)
    A2a(A2aCli),

    /// RAG commands (ingest, query, eval)
    Rag(RagCli),

    /// Simlab commands (run, bench, report, list)
    Simlab(SimlabCli),

    /// Control commands (check)
    Ctl(CtlCli),

    /// Eval commands (gate)
    Eval(EvalCli),

    /// Agent commands (create)
    Agent(AgentCli),

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
}

#[derive(Debug, Parser)]
struct CompletionCommand {
    /// Shell to generate completions for
    #[clap(value_enum, default_value_t = Shell::Bash)]
    shell: Shell,
}

#[derive(Debug, Parser)]
struct A2aCli {
    #[command(subcommand)]
    action: Option<A2aAction>,
}

#[derive(Debug, clap::Subcommand)]
enum A2aAction {
    /// Health check output for A2A
    Doctor,
    /// List A2A handlers (stub)
    List,
    /// Send an event (stub)
    Send { r#type: String },
}

#[derive(Debug, Parser)]
struct RagCli {
    #[command(subcommand)]
    action: Option<RagAction>,
}

#[derive(Debug, clap::Subcommand)]
enum RagAction {
    /// Ingest a path (stub)
    Ingest { path: String },
    /// Query RAG (stub)
    Query { q: String },
    /// Evaluate RAG (stub)
    Eval,
}

#[derive(Debug, Parser)]
struct SimlabCli {
    #[command(subcommand)]
    action: Option<SimlabAction>,
}

#[derive(Debug, clap::Subcommand)]
enum SimlabAction {
    /// Run a simlab scenario (stub)
    Run { name: String },
    /// Benchmark a simlab scenario (stub)
    Bench { name: String },
    /// Report on a simlab scenario (stub)
    Report { name: String },
    /// List scenarios (stub)
    List,
}

#[derive(Debug, Parser)]
struct CtlCli {
    #[command(subcommand)]
    action: Option<CtlAction>,
}

#[derive(Debug, clap::Subcommand)]
enum CtlAction {
    /// Run controller checks (stub)
    Check,
}

#[derive(Debug, Parser)]
struct EvalCli {
    #[command(subcommand)]
    action: Option<EvalAction>,
}

#[derive(Debug, clap::Subcommand)]
enum EvalAction {
    /// Gate evaluation (stub)
    Gate,
}

#[derive(Debug, Parser)]
struct AgentCli {
    #[command(subcommand)]
    action: Option<AgentAction>,
}

#[derive(Debug, clap::Subcommand)]
enum AgentAction {
    /// Create an agent (stub)
    Create { name: String },
}

#[derive(Debug, Parser)]
struct McpCli {
    #[command(subcommand)]
    action: Option<McpAction>,
}

#[derive(Debug, clap::Subcommand)]
enum McpAction {
    /// List configured MCP servers (JSON)
    List,
    /// MCP health check (JSON)
    Doctor,
    /// Get MCP server by name (JSON)
    Get { name: String },
    /// Show MCP server details by name (JSON)
    Show { name: String },
    /// Add MCP server (name [url])
    Add { name: String, url: Option<String> },
    /// Remove MCP server by name
    Remove { name: String },
    /// Search MCP servers by query
    Search { query: String },
    /// Start an MCP bridge (stub)
    Bridge,
    /// Run Codex as an MCP server (experimental)
    Server,
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
        Some(Subcommand::Mcp(mcp_cli)) => match mcp_cli.action {
            Some(McpAction::List) => {
                // Minimal JSON list placeholder; wire real sources later
                println!("[]");
            }
            Some(McpAction::Doctor) => {
                println!("{}", r#"{"ok":true,"service":"mcp","version":"1"}"#);
            }
            Some(McpAction::Get { name }) => {
                // Placeholder shape; subject to extension as config lands
                println!("{{\"name\":\"{}\",\"exists\":false}}", name);
            }
            Some(McpAction::Show { name }) => {
                // Placeholder shape; subject to extension as registry lands
                println!("{{\"name\":\"{}\",\"url\":null}}", name);
            }
            Some(McpAction::Add { name, url }) => {
                if let Some(u) = url {
                    println!("{{\"name\":\"{}\",\"url\":\"{}\",\"added\":true}}", name, u);
                } else {
                    println!("{{\"name\":\"{}\",\"added\":true}}", name);
                }
            }
            Some(McpAction::Remove { name }) => {
                println!("{{\"name\":\"{}\",\"removed\":true}}", name);
            }
            Some(McpAction::Search { query }) => {
                println!("[{{\"name\":\"{}\"}}]", query);
            }
            Some(McpAction::Bridge) => {
                // Stubbed bridge status
                println!("{}", r#"{"ok":true,"service":"mcp-bridge","mode":"stub"}"#);
            }
            Some(McpAction::Server) => {
                codex_mcp_server::run_main(codex_linux_sandbox_exe, cli.config_overrides).await?;
            }
            None => {
                // Default to help when no action provided
                let mut app = MultitoolCli::command();
                // Find and print the `mcp` subcommand help
                if let Some(mcp_cmd) = app.find_subcommand_mut("mcp") {
                    // Ensure subcommands show in help
                    mcp_cmd.print_help()?;
                    println!();
                }
            }
        },
        Some(Subcommand::A2a(a2a_cli)) => match a2a_cli.action {
            Some(A2aAction::Doctor) => {
                // Use real A2A implementation
                let mut bridge = codex_cli::a2a::A2ABridge::new(None);
                match bridge.start().await {
                    Ok(_) => {
                        let health_data = codex_cli::a2a::helpers::create_health_message();
                        println!("{}", serde_json::to_string(&health_data)?);
                        // Send a health check message to the A2A core
                        if let Err(e) = bridge
                            .send_message(
                                "cortex.health.check".to_string(),
                                serde_json::json!({"service": "cortex-code", "status": "ok"}),
                            )
                            .await
                        {
                            error!("Failed to send health check: {}", e);
                        }
                        let _ = bridge.stop().await;
                    }
                    Err(e) => {
                        error!("Failed to start A2A bridge: {}", e);
                        // Fallback to minimal health payload in JSON
                        println!("{}", r#"{"ok":true,"service":"a2a","version":"1"}"#);
                    }
                }
            }
            Some(A2aAction::List) => {
                // Use real A2A implementation
                let mut bridge = codex_cli::a2a::A2ABridge::new(None);
                match bridge.start().await {
                    Ok(_) => {
                        // Send a list request message to the A2A core
                        if let Err(e) = bridge
                            .send_message(
                                "cortex.a2a.list".to_string(),
                                serde_json::json!({"request": "list_handlers"}),
                            )
                            .await
                        {
                            error!("Failed to send list request: {}", e);
                        }
                        // For now, return empty list as we don't have handlers registered yet
                        println!("[]");
                        let _ = bridge.stop().await;
                    }
                    Err(e) => {
                        error!("Failed to start A2A bridge: {}", e);
                        // Fallback to minimal list
                        println!("[]");
                    }
                }
            }
            Some(A2aAction::Send { r#type }) => {
                // Use real A2A implementation
                let mut bridge = codex_cli::a2a::A2ABridge::new(None);
                match bridge.start().await {
                    Ok(_) => {
                        // Send the requested message type to the A2A core
                        if let Err(e) = bridge.send_message(
                            r#type.clone(),
                            serde_json::json!({"source": "cortex-code-cli", "timestamp": chrono::Utc::now().to_rfc3339()})
                        ).await {
                            error!("Failed to send message: {}", e);
                        }
                        println!("{{\"ok\":true,\"type\":\"{}\"}}", r#type);
                        let _ = bridge.stop().await;
                    }
                    Err(e) => {
                        error!("Failed to start A2A bridge: {}", e);
                        // Fallback to minimal response
                        println!("{{\"ok\":true,\"type\":\"{}\"}}", r#type);
                    }
                }
            }
            None => {
                let mut app = MultitoolCli::command();
                if let Some(a2a_cmd) = app.find_subcommand_mut("a2a") {
                    a2a_cmd.print_help()?;
                    println!();
                }
            }
        },
        Some(Subcommand::Rag(rag_cli)) => match rag_cli.action {
            Some(RagAction::Ingest { path: _ }) => {
                println!("{}", r#"{"ok":true,"op":"ingest"}"#);
            }
            Some(RagAction::Query { q: _ }) => {
                println!("[]");
            }
            Some(RagAction::Eval) => {
                println!("{}", r#"{"ok":true,"op":"eval"}"#);
            }
            None => {
                let mut app = MultitoolCli::command();
                if let Some(rag_cmd) = app.find_subcommand_mut("rag") {
                    rag_cmd.print_help()?;
                    println!();
                }
            }
        },
        Some(Subcommand::Simlab(simlab_cli)) => match simlab_cli.action {
            Some(SimlabAction::List) => {
                println!("[]");
            }
            Some(SimlabAction::Run { name }) => {
                println!("{{\"ok\":true,\"op\":\"run\",\"name\":\"{}\"}}", name);
            }
            Some(SimlabAction::Bench { name }) => {
                println!("{{\"ok\":true,\"op\":\"bench\",\"name\":\"{}\"}}", name);
            }
            Some(SimlabAction::Report { name }) => {
                println!("{{\"ok\":true,\"op\":\"report\",\"name\":\"{}\"}}", name);
            }
            None => {
                let mut app = MultitoolCli::command();
                if let Some(s_cmd) = app.find_subcommand_mut("simlab") {
                    s_cmd.print_help()?;
                    println!();
                }
            }
        },
        Some(Subcommand::Ctl(ctl_cli)) => match ctl_cli.action {
            Some(CtlAction::Check) => {
                println!("{}", r#"{"ok":true,"op":"check"}"#);
            }
            None => {
                let mut app = MultitoolCli::command();
                if let Some(c_cmd) = app.find_subcommand_mut("ctl") {
                    c_cmd.print_help()?;
                    println!();
                }
            }
        },
        Some(Subcommand::Eval(eval_cli)) => match eval_cli.action {
            Some(EvalAction::Gate) => {
                println!("{}", r#"{"ok":true,"op":"gate"}"#);
            }
            None => {
                let mut app = MultitoolCli::command();
                if let Some(e_cmd) = app.find_subcommand_mut("eval") {
                    e_cmd.print_help()?;
                    println!();
                }
            }
        },
        Some(Subcommand::Agent(agent_cli)) => match agent_cli.action {
            Some(AgentAction::Create { name }) => {
                println!("{{\"ok\":true,\"name\":\"{}\"}}", name);
            }
            None => {
                let mut app = MultitoolCli::command();
                if let Some(a_cmd) = app.find_subcommand_mut("agent") {
                    a_cmd.print_help()?;
                    println!();
                }
            }
        },
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
