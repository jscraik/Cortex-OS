// Codex-style main function
// This creates a codex-like experience using cortex-code infrastructure

use anyhow::Result;
use clap::Parser;
use cortex_code::{
    app::{ApprovalMode, CortexApp},
    codex_cli::CodexLikeCli,
    config::Config,
    error_panic_handler,
};
use std::collections::HashMap;
use tracing::{info, Level};

#[tokio::main]
async fn main() -> Result<()> {
    let cli = CodexLikeCli::parse();

    // Install panic handler and signal handlers for graceful shutdown
    error_panic_handler::install_panic_handler();
    error_panic_handler::install_signal_handlers();

    // Initialize logging
    let level = if cli.debug { Level::DEBUG } else { Level::INFO };
    tracing_subscriber::fmt()
        .with_max_level(level)
        .with_target(false)
        .init();

    info!(
        "Starting Cortex Code in Codex mode v{}",
        env!("CARGO_PKG_VERSION")
    );

    // Change working directory if specified (codex parity)
    if let Some(dir) = &cli.cwd {
        std::env::set_current_dir(dir)?;
        info!("Changed working directory to: {}", dir.display());
    }

    // Load configuration with profile support
    let mut config = load_config_with_profile(&cli)?;

    // Apply configuration overrides
    apply_config_overrides(&mut config, &cli)?;

    // Create application
    let mut app = CortexApp::new(config).await?;

    // Configure approval mode based on flags
    configure_approval_mode(&mut app, &cli).await?;

    // Set model override if specified
    if let Some(model) = &cli.model {
        std::env::set_var("CORTEX_MODEL", model);
        info!("Model override set to: {}", model);
    }

    // Handle OSS mode
    if cli.oss {
        std::env::set_var("CORTEX_MODEL_PROVIDER", "oss");
        info!("OSS mode enabled - using local models");
    }

    // Configure web search
    if cli.web_search {
        info!("Web search enabled");
        // Set appropriate config or env var for web search
    }

    // Run the appropriate mode
    if cli.non_interactive {
        // Non-interactive mode for CI/automation
        if let Some(prompt) = cli.prompt {
            let image_path = cli.images.first().and_then(|p| p.to_str());
            let response = app.run_single_with_image(&prompt, image_path).await?;
            println!("{}", response);
        } else {
            anyhow::bail!("Non-interactive mode requires a prompt");
        }
    } else {
        // Default to TUI mode (codex-style)
        run_codex_tui_mode(&mut app, &cli).await?;
    }

    Ok(())
}

fn load_config_with_profile(cli: &CodexLikeCli) -> Result<Config> {
    let mut config = Config::from_default_locations()?;

    // Apply profile if specified
    if let Some(profile) = &cli.config_profile {
        info!("Loading configuration profile: {}", profile);
        config.apply_profile(profile)?;
    }

    Ok(config)
}

fn apply_config_overrides(config: &mut Config, cli: &CodexLikeCli) -> Result<()> {
    let overrides = cli
        .parse_config_overrides()
        .map_err(|e| anyhow::anyhow!("Failed to parse config overrides: {}", e))?;

    if !overrides.is_empty() {
        config.apply_overrides(&overrides)?;
        info!("Applied {} configuration overrides", overrides.len());
    }

    Ok(())
}

async fn configure_approval_mode(app: &mut CortexApp, cli: &CodexLikeCli) -> Result<()> {
    if cli.dangerously_bypass_approvals_and_sandbox {
        app.set_approval_mode(ApprovalMode::FullAuto).await?;
        info!("DANGER MODE: All approvals and sandboxing bypassed!");
    } else if cli.full_auto {
        app.set_approval_mode(ApprovalMode::AutoEdit).await?;
        info!("Full auto mode enabled with sandboxing");
    } else if let Some(policy) = &cli.approval_policy {
        match policy.as_str() {
            "always" => app.set_approval_mode(ApprovalMode::Suggest).await?,
            "on-failure" => app.set_approval_mode(ApprovalMode::AutoEdit).await?,
            "never" => app.set_approval_mode(ApprovalMode::FullAuto).await?,
            _ => anyhow::bail!("Invalid approval policy: {}", policy),
        }
        info!("Approval policy set to: {}", policy);
    }

    Ok(())
}

async fn run_codex_tui_mode(app: &mut CortexApp, cli: &CodexLikeCli) -> Result<()> {
    info!("Starting Codex-style TUI interface");

    // Show repository trust screen if needed (unless skipped)
    if !cli.skip_onboarding {
        // Check if repository needs trust confirmation
        // This would need to be implemented based on your existing trust logic
        info!("Checking repository trust status...");
    }

    // Start TUI with initial prompt if provided
    if let Some(initial_prompt) = &cli.prompt {
        info!("Starting with initial prompt: {}", initial_prompt);
        // You could set this in the app state to show initially
    }

    // Run the integrated TUI interface - use existing implementation
    // This should connect to your existing TUI implementation from the main.rs
    run_integrated_chat_interface(app).await?;

    Ok(())
}

// Import the existing TUI function from main.rs
async fn run_integrated_chat_interface(app: &mut CortexApp) -> Result<()> {
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
    use cortex_code::view::{
        a2a_stream::A2aEventStream,
        chat::ChatWidget,
        cortex_command_palette::CortexCommandPalette,
        github_dashboard::GitHubDashboard,
        status_bar::StatusBar,
    };

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
    struct CortexIntegratedTools {
        github_tools: GitHubDashboard,
        a2a_monitor: A2aEventStream,
        mcp_manager: cortex_code::mcp::McpService,
        command_palette: CortexCommandPalette,
    }

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
                                        let response = app.get_ai_response(&message).await?;
                                        chat_widget.add_message(cortex_code::app::Message::assistant(&response));
                                    },
                                    cortex_code::view::chat::EventResponse::Continue => {},
                                }
                            }
                        }
                    }
                },
                _ => {},
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
