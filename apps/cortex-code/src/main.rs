use anyhow::Result;
use clap::{Parser, Subcommand};
use cortex_tui::{
    app::CortexApp,
    config::Config,
    view::{ChatWidget, GitHubDashboard, A2aEventStream, CortexCommandPalette},
    error_panic_handler
};
use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event as CrosstermEvent, KeyCode, KeyModifiers},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{
    backend::CrosstermBackend,
    Terminal,
};
use std::io;
use tracing::{info, Level};

#[derive(Parser)]
#[command(name = "cortex-tui")]
#[command(about = "Terminal UI for Cortex-OS AI coding agent")]
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
}

#[derive(Subcommand)]
enum Commands {
    /// Interactive TUI mode
    Tui,
    /// Run a single command
    Run {
        /// The prompt to execute
        prompt: String,
        /// Output format for CI mode
        #[arg(long, default_value = "text")]
        output: String,
    },
    /// Start daemon server
    Daemon {
        /// Port to bind to
        #[arg(short, long, default_value = "8080")]
        port: u16,
    },
    /// MCP server management
    Mcp {
        #[command(subcommand)]
        action: McpAction,
    },
}

#[derive(Subcommand)]
enum McpAction {
    /// List available MCP servers
    List,
    /// Add a new MCP server
    Add { name: String, config: String },
    /// Remove an MCP server
    Remove { name: String },
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

    info!("Starting Cortex TUI v{} with enhanced error handling", env!("CARGO_PKG_VERSION"));

    // Load configuration
    let config = match cli.config {
        Some(path) => Config::from_file(&path)?,
        None => Config::from_default_locations()?,
    };

    // Create application
    let mut app = CortexApp::new(config).await?;

    // Handle commands
    match cli.command.unwrap_or(Commands::Tui) {
        Commands::Tui => {
            if cli.ci {
                anyhow::bail!("TUI mode cannot be used with --ci flag");
            }
            run_tui(&mut app).await?;
        }
        Commands::Run { prompt, output } => {
            if cli.ci {
                app.run_ci(&prompt, &output).await?;
            } else {
                app.run_single(&prompt).await?;
            }
        }
        Commands::Daemon { port } => {
            app.run_daemon(port).await?;
        }
        Commands::Mcp { action } => {
            handle_mcp_command(&mut app, action).await?;
        }
    }

    Ok(())
}

// Multi-view TUI enum
#[derive(Debug, Clone, Copy, PartialEq)]
enum TuiView {
    Chat,
    GitHub,
    A2aStream,
    CommandPalette,
}

async fn run_tui(app: &mut CortexApp) -> Result<()> {
    // Setup terminal
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    // Create TUI state
    let mut chat_widget = ChatWidget::new();
    let mut github_dashboard = GitHubDashboard::new();
    let mut a2a_stream = A2aEventStream::new();
    let mut command_palette = CortexCommandPalette::new();
    let mut current_view = TuiView::Chat;

    // Generate some sample data for development
    a2a_stream.generate_sample_event("mcp-github", "tool_call");
    a2a_stream.generate_sample_event("cortex-core", "agent_message");

    info!("Starting multi-view TUI event loop");

    let result = loop {
        // Update cursor for streaming
        chat_widget.update_cursor();

        // Render based on current view
        terminal.draw(|frame| {
            if command_palette.is_visible() {
                // Render current view first, then overlay command palette
                match current_view {
                    TuiView::Chat => chat_widget.render(frame, frame.area()),
                    TuiView::GitHub => github_dashboard.render(frame, frame.area()),
                    TuiView::A2aStream => a2a_stream.render(frame, frame.area()),
                    TuiView::CommandPalette => {} // Never directly shown
                }
                command_palette.render(frame, frame.area());
            } else {
                match current_view {
                    TuiView::Chat => chat_widget.render(frame, frame.area()),
                    TuiView::GitHub => github_dashboard.render(frame, frame.area()),
                    TuiView::A2aStream => a2a_stream.render(frame, frame.area()),
                    TuiView::CommandPalette => {} // Never directly shown
                }
            }
        })?;

        // Handle events
        if event::poll(std::time::Duration::from_millis(100))? {
            match event::read()? {
                CrosstermEvent::Key(key_event) => {
                    // Global shortcuts first
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
                            command_palette.show();
                        },
                        (KeyCode::Char('1'), KeyModifiers::ALT) => {
                            current_view = TuiView::Chat;
                        },
                        (KeyCode::Char('2'), KeyModifiers::ALT) => {
                            current_view = TuiView::GitHub;
                        },
                        (KeyCode::Char('3'), KeyModifiers::ALT) => {
                            current_view = TuiView::A2aStream;
                        },
                        _ => {
                            // Handle command palette events first
                            if command_palette.is_visible() {
                                match command_palette.handle_event(CrosstermEvent::Key(key_event))? {
                                    cortex_tui::view::cortex_command_palette::CommandPaletteResponse::ExecuteCommand(cmd_id, params) => {
                                        info!("Executing command: {} with params: {:?}", cmd_id, params);
                                        // TODO: Execute the command via MCP or direct handler
                                        // For now, just handle view switching
                                        match cmd_id.as_str() {
                                            "tui.switch_view" => {
                                                if let Some(view_name) = params.first() {
                                                    match view_name.as_str() {
                                                        "chat" => current_view = TuiView::Chat,
                                                        "github" => current_view = TuiView::GitHub,
                                                        "a2a" => current_view = TuiView::A2aStream,
                                                        _ => {}
                                                    }
                                                }
                                            },
                                            _ => {
                                                // TODO: Route to MCP or appropriate handler
                                            }
                                        }
                                    },
                                    cortex_tui::view::cortex_command_palette::CommandPaletteResponse::Cancel => {
                                        // Command palette already handled hiding itself
                                    },
                                    _ => {}
                                }
                            } else {
                                // Route events to current view
                                match current_view {
                                    TuiView::Chat => {
                                        match chat_widget.handle_event(CrosstermEvent::Key(key_event))? {
                                            cortex_tui::view::chat::EventResponse::SendMessage(message) => {
                                                info!("Sending message: {}", message);

                                                // Add user message to chat
                                                chat_widget.add_message(cortex_tui::app::Message::user(&message));

                                                // Get response from AI
                                                let response = app.get_ai_response(&message).await?;
                                                chat_widget.add_message(cortex_tui::app::Message::assistant(&response));
                                            }
                                            cortex_tui::view::chat::EventResponse::RequestStreamingMessage(message) => {
                                                info!("Sending streaming message: {}", message);

                                                // Add user message to chat
                                                chat_widget.add_message(cortex_tui::app::Message::user(&message));

                                                // Start streaming
                                                chat_widget.start_streaming("session-123".to_string(), "github".to_string());

                                                // Get and stream response
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
                                    },
                                    TuiView::GitHub => {
                                        match github_dashboard.handle_event(CrosstermEvent::Key(key_event))? {
                                            cortex_tui::view::github_dashboard::DashboardResponse::RefreshData => {
                                                info!("Refreshing GitHub dashboard data");
                                                // TODO: Trigger data refresh via MCP
                                            }
                                            cortex_tui::view::github_dashboard::DashboardResponse::OpenPR(pr_number) => {
                                                info!("Opening PR #{}", pr_number);
                                                // TODO: Handle PR opening
                                            }
                                            _ => {}
                                        }
                                    },
                                    TuiView::A2aStream => {
                                        match a2a_stream.handle_event(CrosstermEvent::Key(key_event))? {
                                            cortex_tui::view::a2a_stream::A2aStreamResponse::PauseResume => {
                                                info!("A2A stream paused/resumed");
                                            }
                                            cortex_tui::view::a2a_stream::A2aStreamResponse::ClearEvents => {
                                                info!("Clearing A2A events");
                                                a2a_stream.clear_events();
                                            }
                                            cortex_tui::view::a2a_stream::A2aStreamResponse::FilterLevel(level) => {
                                                info!("Setting A2A filter level: {:?}", level);
                                                a2a_stream.set_filter_level(level);
                                            }
                                            _ => {}
                                        }
                                    },
                                    TuiView::CommandPalette => {} // Never directly active
                                }
                            }
                        }
                    }
                }
                CrosstermEvent::Resize(_, _) => {
                    // Terminal was resized, will be handled on next render
                }
                _ => {}
            }
        }
    };

    // Restore terminal
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
    }
    Ok(())
}
