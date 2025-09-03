use anyhow::Result;
use clap::{ArgAction, CommandFactory, Parser};
use cortex_code::{
    app::{ApprovalMode, CortexApp},
    config::Config,
    error_panic_handler,
    view::{
        a2a_stream::A2aEventStream,
        chat::ChatWidget,
        cortex_command_palette::CortexCommandPalette,
        github_dashboard::GitHubDashboard,
        status_bar::StatusBar,
    },
};

use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event as CrosstermEvent, KeyCode, KeyModifiers},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{
    backend::CrosstermBackend,
    layout::{Constraint, Direction, Layout},
    Terminal,
};
use std::io::{self, Write};
use tracing::{info, Level};

#[derive(Parser)]
#[command(name = "cortex-code")]
#[command(about = "A comprehensive AI-powered coding assistant")]
#[command(version)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,

    /// Run in CI mode (non-interactive)
    #[arg(long)]
    ci: bool,

    /// Configuration file path
    #[arg(short, long)]
    config: Option<String>,

    /// Enable debug logging
    #[arg(short, long)]
    debug: bool,

    /// Set approval mode for AI actions (auto-edit, suggest, full-auto, plan)
    #[arg(long, value_enum)]
    approval_mode: Option<ApprovalMode>,

    /// Path to image file for multimodal input
    #[arg(long)]
    image: Option<String>,

    /// Override model (e.g., gpt-4o, gpt-4o-mini). Falls back to config/provider default.
    #[arg(short = 'm', long = "model")]
    model: Option<String>,

    /// Ask for approval before applying edits (forces Suggest mode for this session)
    #[arg(short = 'a', long = "ask-for-approval", action = ArgAction::SetTrue)]
    ask_for_approval: bool,

    /// Change working directory before starting (Codex parity)
    #[arg(short = 'C', long = "cd")]
    change_dir: Option<String>,
}

#[derive(clap::Subcommand)]
enum Commands {
    /// Code completion and editing (default, Cortex Code-like behavior)
    Code,
    /// Chat interface (legacy mode)
    Chat,
    /// Terminal UI interface with multiple views
    Tui {
        /// Theme to use for the interface
        #[arg(short, long, default_value = "default")]
        theme: String,
    },
    /// Run a single prompt and exit
    Run {
        /// The prompt to send to the AI
        prompt: String,
        /// Optional output file to write the response to
        #[arg(short, long)]
        output: Option<String>,
    },
    /// Alias for non-interactive exec mode (Codex parity)
    Exec {
        /// The prompt to send to the AI (non-interactive)
        prompt: String,
        /// Optional output file to write the response to
        #[arg(short, long)]
        output: Option<String>,
    },
    /// Start daemon server
    Daemon {
        /// Port to listen on
        #[arg(short, long, default_value = "3030")]
        port: u16,
        /// Host to bind to
        #[arg(long, default_value = "127.0.0.1")]
        host: String,
    },
    /// MCP (Model Context Protocol) operations
    Mcp {
        #[command(subcommand)]
        action: McpAction,
    },
    /// Generate shell completions for your shell
    Completion {
        /// Shell to generate for: bash|zsh|fish|elvish|powershell
        shell: String,
    },
}

#[derive(clap::Subcommand)]
enum McpAction {
    /// List all MCP servers
    List,
    /// Add a new MCP server
    Add {
        name: String,
        #[arg(long)]
        config: String,
    },
    /// Remove an MCP server
    Remove { name: String },
    /// Search for MCP servers
    Search { query: String },
    /// Show MCP server details
    Show { name: String },
    /// Start MCP bridge
    Bridge,
    /// Run MCP diagnostics
    Doctor,
}

// Background tool services integrated into main chat interface
struct CortexIntegratedTools {
    mcp_manager: cortex_code::mcp::McpService,
    github_tools: GitHubDashboard,
    a2a_monitor: A2aEventStream,
    command_palette: CortexCommandPalette,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    // Install panic handler and signal handlers for graceful shutdown
    error_panic_handler::install_panic_handler();
    error_panic_handler::install_signal_handlers();

    // Initialize logging
    let level = if cli.debug { Level::DEBUG } else { Level::INFO };
    tracing_subscriber::fmt()
        .with_max_level(level)
        .with_target(false)
        .init();

    info!("Starting Cortex Code v{} with enhanced error handling", env!("CARGO_PKG_VERSION"));

    // Optional: change working directory early (before config load)
    if let Some(dir) = &cli.change_dir {
        std::env::set_current_dir(dir)?;
    }

    // Load configuration (after potential directory change)
    let config = match cli.config {
        Some(path) => Config::from_file(&path)?,
        None => Config::from_default_locations()?,
    };

    // Create application
    let mut app = CortexApp::new(config).await?;

    // Set approval mode if specified
    if let Some(mode) = cli.approval_mode {
        app.set_approval_mode(mode).await?;
    }

    // If ask-for-approval is set, force Suggest mode for this run
    if cli.ask_for_approval {
        app.set_approval_mode(ApprovalMode::Suggest).await?;
    }

    // Optional: set model override for current provider if supported (env propagation)
    if let Some(model) = cli.model.as_deref() {
        std::env::set_var("CORTEX_MODEL", model);
    }

    info!("Approval mode set to: {:?}", app.get_approval_mode());

    // Handle commands
    match cli.command.unwrap_or(Commands::Code) {
        Commands::Code => {
            if cli.ci {
                anyhow::bail!("Code interface cannot be used with --ci flag");
            }
            run_cortex_code_mode(&mut app).await?;
        }
        Commands::Chat => {
            if cli.ci {
                anyhow::bail!("Chat interface cannot be used with --ci flag");
            }
            run_integrated_chat_interface(&mut app).await?;
        }
        Commands::Tui { theme } => {
            if cli.ci {
                anyhow::bail!("TUI interface cannot be used with --ci flag");
            }
            run_integrated_chat_interface(&mut app).await?;
        }
        Commands::Run { prompt, output } => {
            if cli.ci {
                let output_format = output.as_deref().unwrap_or("text");
                app.run_ci_with_image(&prompt, output_format, cli.image.as_deref()).await?;
            } else {
                let response = app.run_single_with_image(&prompt, cli.image.as_deref()).await?;
                if let Some(output_file) = output {
                    std::fs::write(output_file, response)?;
                } else {
                    println!("{}", response);
                }
            }
        }
        Commands::Exec { prompt, output } => {
            // Always non-interactive exec mode
            let output_format = output.as_deref().unwrap_or("text");
            app.run_ci_with_image(&prompt, output_format, cli.image.as_deref()).await?;
        }
        Commands::Daemon { port, host: _ } => {
            app.run_daemon(port).await?;
        }
        Commands::Mcp { action } => {
            handle_mcp_command(&mut app, action).await?;
        }
        Commands::Completion { shell } => {
            use clap_complete::{generate, shells};
            let mut cmd = Cli::command();
            let name = cmd.get_name().to_string();
            match shell.as_str() {
                "bash" => generate(shells::Bash, &mut cmd, name, &mut std::io::stdout()),
                "zsh" => generate(shells::Zsh, &mut cmd, name, &mut std::io::stdout()),
                "fish" => generate(shells::Fish, &mut cmd, name, &mut std::io::stdout()),
                "powershell" => generate(shells::PowerShell, &mut cmd, name, &mut std::io::stdout()),
                "elvish" => generate(shells::Elvish, &mut cmd, name, &mut std::io::stdout()),
                _ => {
                    eprintln!("Unsupported shell: {}", shell);
                }
            }
        }
    }

    Ok(())
}

async fn run_cortex_code_mode(app: &mut CortexApp) -> Result<()> {
    info!("Starting Codex-like code completion mode");
    let mut current_dir = std::env::current_dir()?;

    // Header banner similar to Codex
    println!(">_ You are using Cortex Code in {}", current_dir.display());
    println!("\nTo get started, describe a task or try one of these commands:");
    println!("/init    – create an AGENTS.md file with instructions for Cortex");
    println!("/status  – show current session configuration and token usage");
    println!("/diff    – show git diff (including untracked files)");
    println!("/prompts – show example prompts");
    println!("\nType your request below. Type /help for more.");

    let mut stdout = io::stdout();

    loop {
        print!("cortex> ");
        stdout.flush()?;

        let mut input = String::new();
        io::stdin().read_line(&mut input)?;
        let input = input.trim();

        if input.is_empty() {
            continue;
        }

        // Slash command handling (Codex-like)
        if input.starts_with('/') {
            let mut parts = input.split_whitespace();
            let cmd = parts.next().unwrap_or("");
            match cmd {
                "/help" | "/h" => {
                    println!("Commands:\n  /init\n  /status\n  /diff\n  /prompts\n  /cd <path>\n  /mode <suggest|auto-edit|full-auto|plan>\n  /quit");
                }
                "/quit" | "/q" | "/exit" => {
                    println!("� Goodbye!");
                    break;
                }
                "/mode" => {
                    if let Some(mode) = parts.next() {
                        match mode {
                            "suggest" => { app.set_approval_mode(ApprovalMode::Suggest).await?; println!("Mode: Suggest"); }
                            "auto-edit" => { app.set_approval_mode(ApprovalMode::AutoEdit).await?; println!("Mode: AutoEdit"); }
                            "full-auto" => { app.set_approval_mode(ApprovalMode::FullAuto).await?; println!("Mode: FullAuto"); }
                            "plan" => { app.set_approval_mode(ApprovalMode::Plan).await?; println!("Mode: Plan"); }
                            _ => println!("Invalid mode"),
                        }
                    } else { println!("Usage: /mode <suggest|auto-edit|full-auto|plan>"); }
                }
                "/status" => {
                    let (provider, models) = app.get_current_provider_info().await;
                    println!("Provider: {}", provider);
                    if !models.is_empty() { println!("Models: {}", models.join(", ")); }
                    println!("Approval mode: {:?}", app.get_approval_mode());
                    if let Ok(stats) = app.get_memory_stats().await {
                        println!("Memory: entries={} providers={} models={} tags={}", stats.total_entries, stats.unique_providers, stats.unique_models, stats.unique_tags);
                    }
                    if let Ok((count, ids)) = app.get_active_session_info().await {
                        println!("Active sessions: {}{}", count, if ids.is_empty() { "".to_string() } else { format!(" (sample: {})", ids.join(", ")) });
                    }
                    // Try to show provider usage stats if available
                    if let Some(usage) = app.get_usage_stats().await {
                        if usage.tokens_used.is_some() || usage.context_window.is_some() {
                            let used = usage.tokens_used.map(|v| v.to_string()).unwrap_or("?".into());
                            let win = usage.context_window.map(|v| v.to_string()).unwrap_or("?".into());
                            println!("Usage: tokens={} context_window={}", used, win);
                        }
                    }
                }
                "/init" => {
                    let path = app.ensure_agents_md_exists().await?;
                    println!("Initialized AGENTS.md at {}", path.display());
                }
                "/diff" => {
                    // Show git diff including untracked files
                    let output = std::process::Command::new("bash")
                        .arg("-lc")
                        .arg("git --no-pager diff --patch-with-raw; git --no-pager ls-files --others --exclude-standard")
                        .output();
                    match output {
                        Ok(out) => {
                            if !out.stdout.is_empty() { print!("{}", String::from_utf8_lossy(&out.stdout)); }
                            if !out.stderr.is_empty() { eprint!("{}", String::from_utf8_lossy(&out.stderr)); }
                        }
                        Err(e) => eprintln!("git not available: {}", e),
                    }
                }
                "/prompts" => {
                    println!("Examples:\n- Refactor this module to reduce duplication and add tests.\n- Implement a CLI flag \"--model\" and wire to provider.\n- Write a unit test for X with edge cases.\n- Migrate function Y to async and update callers.");
                }
                "/cd" => {
                    if let Some(path) = parts.next() {
                        let target = std::path::Path::new(path);
                        if let Err(e) = std::env::set_current_dir(target) { eprintln!("Failed to cd: {}", e); }
                        else { current_dir = std::env::current_dir()?; println!("Working directory: {}", current_dir.display()); }
                    } else { println!("Usage: /cd <path>"); }
                }
                _ => {
                    println!("Unknown command. Try /help");
                }
            }
            println!();
            continue;
        }

        match input.to_lowercase().as_str() {
            "exit" | "quit" | "q" => {
                println!("👋 Goodbye!");
                break;
            }
            "help" | "h" => {
                println!("Available commands:");
                println!("  help, h          - Show this help");
                println!("  exit, quit, q    - Exit the application");
                println!("  clear            - Clear screen");
                println!("  status           - Show current settings");
                println!("  mode [suggest|auto-edit|full-auto|plan] - Change approval mode");
                println!("  <code request>   - Request code assistance");
                println!("  Slash commands: /init /status /diff /prompts /cd");
                println!();
                continue;
            }
            "clear" => {
                print!("\x1B[2J\x1B[1;1H");
                stdout.flush()?;
                continue;
            }
            "status" => {
                println!("📊 Current Status:");
                println!("  Approval mode: {:?}", app.get_approval_mode());
                println!("  Working directory: {}", current_dir.display());
                println!();
                continue;
            }
            _ if input.starts_with("mode ") => {
                let mode_str = input.strip_prefix("mode ").unwrap().trim();
                match mode_str {
                    "suggest" => {
                        app.set_approval_mode(ApprovalMode::Suggest).await?;
                        println!("✅ Approval mode set to: Suggest");
                    }
                    "auto-edit" => {
                        app.set_approval_mode(ApprovalMode::AutoEdit).await?;
                        println!("✅ Approval mode set to: AutoEdit");
                    }
                    "full-auto" => {
                        app.set_approval_mode(ApprovalMode::FullAuto).await?;
                        println!("✅ Approval mode set to: FullAuto");
                    }
                    "plan" => {
                        app.set_approval_mode(ApprovalMode::Plan).await?;
                        println!("✅ Approval mode set to: Plan");
                    }
                    _ => {
                        println!("❌ Invalid mode. Use: suggest, auto-edit, full-auto, or plan");
                    }
                }
                println!();
                continue;
            }
            _ => {
                // Handle code assistance request
                println!("🤖 Processing request...");
                match app.run_single(input).await {
                    Ok(response) => {
                        println!("📝 Response:");
                        println!("{}", response);
                        // Try to show usage stats footer if available
                        if let Some(usage) = app.get_usage_stats().await {
                            if let (Some(tokens), Some(window)) = (usage.tokens_used, usage.context_window) {
                                let pct = (tokens as f64 / window as f64 * 100.0).min(100.0);
                                println!("[usage] {} tokens used · {:.0}% context left", tokens, 100.0 - pct);
                            } else if let Some(tokens) = usage.tokens_used {
                                println!("[usage] {} tokens used", tokens);
                            }
                        }
                        println!();
                    }
                    Err(e) => {
                        println!("❌ Error: {}", e);
                        println!();
                    }
                }
            }
        }
    }

    Ok(())
}

async fn run_integrated_chat_interface(app: &mut CortexApp) -> Result<()> {
    info!("Starting Cortex Code - focused AI coding assistant");

    // Setup terminal
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    // Create main chat interface (Cortex-like focused experience)
    let mut chat_widget = ChatWidget::new();
    let mut command_palette = CortexCommandPalette::new();
    let status_bar = StatusBar::new();

    // Initialize background tools (integrated, not separate views)
    let mut cortex_tools = CortexIntegratedTools {
        github_tools: GitHubDashboard::new(),
        a2a_monitor: A2aEventStream::new(),
        mcp_manager: cortex_code::mcp::McpService::new().await?,
        command_palette: CortexCommandPalette::new(),
    };

    // Background services run as part of the widget state (no explicit monitoring)
    // The widgets themselves handle their data and display

    // Generate some sample data for demo
    cortex_tools.a2a_monitor.generate_sample_event("cortex-mcp", "tool_call");
    cortex_tools.a2a_monitor.generate_sample_event("cortex-core", "agent_message");

    // Welcome message similar to Cortex focused interface
    chat_widget.add_message(cortex_code::app::Message::system("Welcome to Cortex Code - AI-powered coding assistant"));
    chat_widget.add_message(cortex_code::app::Message::system("Available tools: MCP servers, GitHub integration, A2A events"));
    chat_widget.add_message(cortex_code::app::Message::system("Press Ctrl+P for command palette, Ctrl+Q to quit"));

    info!("Starting focused Cortex Code interface with background tools integration");

    let result = loop {
        // Update cursor for streaming
        chat_widget.update_cursor();

        // Render only the chat interface with status bar
        terminal.draw(|frame| {
            let chunks = Layout::default()
                .direction(Direction::Vertical)
                .constraints([
                    Constraint::Min(0),     // Chat interface
                    Constraint::Length(1),  // Status bar
                ])
                .split(frame.size());

            if command_palette.is_visible() {
                // Render chat first, then overlay command palette
                chat_widget.render(frame, chunks[0]);
                command_palette.render(frame, chunks[0]);
            } else {
                // Just render the main chat interface
                chat_widget.render(frame, chunks[0]);
            }

            // Always render status bar showing available tools
            status_bar.render(frame, chunks[1]);
        })?;

        // Handle events
        if event::poll(std::time::Duration::from_millis(100))? {
            match event::read()? {
                CrosstermEvent::Key(key_event) => {
                    match (key_event.code, key_event.modifiers) {
                        (KeyCode::Char('q'), KeyModifiers::CONTROL) => {
                            info!("Received Ctrl+Q, shutting down");
                            break Ok(());
                        },
                        (KeyCode::Esc, _) if command_palette.is_visible() => {
                            command_palette.hide();
                        },
                        (KeyCode::Esc, _) => {
                            info!("Received ESC, shutting down");
                            break Ok(());
                        },
                        (KeyCode::Char('p'), KeyModifiers::CONTROL) => {
                            // Show command palette with available tools
                            command_palette.show();
                        },
                        _ => {
                            // Handle command palette events first
                            if command_palette.is_visible() {
                                match command_palette.handle_event(CrosstermEvent::Key(key_event))? {
                                    cortex_code::view::cortex_command_palette::CommandPaletteResponse::ExecuteCommand(cmd_id, params) => {
                                        info!("Executing command: {} with params: {:?}", cmd_id, params);

                                        // Handle background tool operations via command palette
                                        match cmd_id.as_str() {
                                            "cortex.mcp.list_servers" => {
                                                let servers = cortex_tools.mcp_manager.list_servers().await?;
                                                let server_names: Vec<String> = servers.iter().map(|s| s.name.clone()).collect();
                                                chat_widget.add_message(cortex_code::app::Message::system(&format!("🔧 MCP Servers: {}", server_names.join(", "))));
                                            },
                                            "cortex.github.show_status" => {
                                                // Show GitHub dashboard status
                                                chat_widget.add_message(cortex_code::app::Message::system("🔗 GitHub: Dashboard ready for PR/issue management"));
                                            },
                                            "cortex.a2a.show_events" => {
                                                // Show recent A2A events from the stream
                                                chat_widget.add_message(cortex_code::app::Message::system("📡 Recent A2A events: 2 (cortex-mcp, cortex-core)"));
                                            },
                                            "cortex.tools.status" => {
                                                // Show integrated tool status in chat
                                                let mcp_servers = cortex_tools.mcp_manager.list_servers().await?;
                                                let mcp_count = mcp_servers.len();

                                                chat_widget.add_message(cortex_code::app::Message::system(&format!(
                                                    "🛠️ Tool Status: MCP ({} servers), GitHub (ready), A2A (monitoring)",
                                                    mcp_count
                                                )));
                                            },
                                            _ => {
                                                info!("Unknown Cortex command: {}", cmd_id);
                                            }
                                        }
                                    },
                                    cortex_code::view::cortex_command_palette::CommandPaletteResponse::Cancel => {
                                        // Command palette handled hiding
                                    },
                                    _ => {}
                                }
                            } else {
                                // Route events to main chat interface
                                match chat_widget.handle_event(CrosstermEvent::Key(key_event))? {
                                    cortex_code::view::chat::EventResponse::SendMessage(message) => {
                                        info!("Sending message: {}", message);

                                        // Add user message to chat
                                        chat_widget.add_message(cortex_code::app::Message::user(&message));

                                        // The AI can use standard response method
                                        // TODO: Enhance this to include tool access context
                                        let response = app.get_ai_response(&message).await?;
                                        chat_widget.add_message(cortex_code::app::Message::assistant(&response));
                                    }
                                    cortex_code::view::chat::EventResponse::RequestStreamingMessage(message) => {
                                        info!("Sending streaming message: {}", message);

                                        // Add user message to chat
                                        chat_widget.add_message(cortex_code::app::Message::user(&message));

                                        // Start streaming with integrated tool access
                                        chat_widget.start_streaming("cortex-session".to_string(), "cortex-ai".to_string());

                                        // Get streaming response
                                        // TODO: Enhance this to include tool access context
                                        let response = app.get_ai_response(&message).await?;
                                        for chunk in response.chars().collect::<Vec<_>>().chunks(5) {
                                            let chunk_str: String = chunk.iter().collect();
                                            chat_widget.append_streaming_chunk(&chunk_str);
                                            tokio::time::sleep(tokio::time::Duration::from_millis(30)).await;
                                        }
                                        chat_widget.complete_streaming();
                                    }
                                    _ => {}
                                }
                            }
                        }
                    }
                }
                CrosstermEvent::Resize(_, _) => {
                    // Terminal resized, handled on next render
                }
                CrosstermEvent::Mouse(_mouse_event) => {
                    // Basic mouse support - forward to active widget
                    if command_palette.is_visible() {
                        let _ = command_palette.handle_event(CrosstermEvent::Mouse(_mouse_event));
                    } else {
                        let _ = chat_widget.handle_event(CrosstermEvent::Mouse(_mouse_event));
                    }
                }
                _ => {}
            }
        }
    };

    // Cleanup
    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;

    result
}

async fn handle_mcp_command(app: &mut CortexApp, action: McpAction) -> Result<()> {
    match action {
        McpAction::List => {
            let servers = app.list_mcp_servers().await?;
            for server in servers {
                println!("{}: {}", server.name, server.status);
            }
        }
        McpAction::Add { name, config } => {
            app.add_mcp_server(&name, &config).await?;
            println!("Added MCP server: {}", name);
        }
        McpAction::Remove { name } => {
            app.remove_mcp_server(&name).await?;
            println!("Removed MCP server: {}", name);
        }
        McpAction::Search { query } => {
            println!("Searching for MCP servers matching: {}", query);
            let servers = app.list_mcp_servers().await?;
            let matching_servers: Vec<_> = servers.iter()
                .filter(|server| server.name.to_lowercase().contains(&query.to_lowercase()) ||
                                server.status.to_lowercase().contains(&query.to_lowercase()))
                .collect();

            if matching_servers.is_empty() {
                println!("No MCP servers found matching '{}'", query);
            } else {
                println!("Found {} matching server(s):", matching_servers.len());
                for server in matching_servers {
                    println!("  {}: {}", server.name, server.status);
                }
            }
        }
        McpAction::Show { name } => {
            println!("MCP Server Details: {}", name);
            let servers = app.list_mcp_servers().await?;
            if let Some(server) = servers.iter().find(|s| s.name == name) {
                println!("  Name: {}", server.name);
                println!("  Status: {}", server.status);
                println!("  Type: MCP Protocol Server");
                // Additional details could be added from MCP service
            } else {
                println!("Server '{}' not found", name);
            }
        }
        McpAction::Bridge => {
            println!("Starting MCP bridge...");
            println!("MCP bridge allows communication between different MCP servers");
            println!("Bridge status: Available but not actively bridging");
            // Implementation would go here for actual bridging
        }
        McpAction::Doctor => {
            println!("Running MCP diagnostics...");
            let servers = app.list_mcp_servers().await?;
            println!("📊 MCP Health Check Report:");
            println!("  Total servers configured: {}", servers.len());

            let mut healthy = 0;
            let mut unhealthy = 0;

            for server in &servers {
                match server.status.as_str() {
                    "running" | "active" | "healthy" => {
                        healthy += 1;
                        println!("  ✅ {}: {}", server.name, server.status);
                    }
                    _ => {
                        unhealthy += 1;
                        println!("  ❌ {}: {}", server.name, server.status);
                    }
                }
            }

            println!("  Summary: {}/{} servers healthy", healthy, servers.len());
            if unhealthy > 0 {
                println!("  ⚠️  {} server(s) need attention", unhealthy);
            }
        }
    }
    Ok(())
}
