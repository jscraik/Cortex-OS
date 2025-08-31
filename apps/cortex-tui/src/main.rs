use anyhow::Result;
use clap::{Parser, Subcommand};
use cortex_tui::{app::CortexApp, config::Config, view::ChatWidget, error_panic_handler};
use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event as CrosstermEvent, KeyCode},
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

async fn run_tui(app: &mut CortexApp) -> Result<()> {
    // Setup terminal
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;
    
    // Create TUI state
    let mut chat_widget = ChatWidget::new();
    let mut running = true;
    
    info!("Starting TUI event loop");
    
    let result = loop {
        // Update cursor for streaming
        chat_widget.update_cursor();
        
        // Render
        terminal.draw(|frame| {
            chat_widget.render(frame, frame.area());
        })?;
        
        // Handle events
        if event::poll(std::time::Duration::from_millis(100))? {
            match event::read()? {
                CrosstermEvent::Key(key_event) => {
                    match key_event.code {
                        KeyCode::Char('q') if key_event.modifiers.contains(crossterm::event::KeyModifiers::CONTROL) => {
                            info!("Received Ctrl+Q, shutting down");
                            running = false;
                            break Ok(());
                        }
                        KeyCode::Esc => {
                            info!("Received ESC, shutting down");
                            running = false;
                            break Ok(());
                        }
                        _ => {
                            match chat_widget.handle_event(CrosstermEvent::Key(key_event))? {
                                cortex_tui::view::chat::EventResponse::SendMessage(message) => {
                                    info!("Sending message: {}", message);
                                    
                                    // Add user message to chat
                                    chat_widget.add_message(cortex_tui::app::Message::user(&message));
                                    
                                    // Get response from AI (this would be async in real implementation)
                                    let response = app.get_ai_response(&message).await?;
                                    chat_widget.add_message(cortex_tui::app::Message::assistant(&response));
                                }
                                cortex_tui::view::chat::EventResponse::RequestStreamingMessage(message) => {
                                    info!("Sending streaming message: {}", message);
                                    
                                    // Add user message to chat
                                    chat_widget.add_message(cortex_tui::app::Message::user(&message));
                                    
                                    // Start streaming (simulate with chunks for demo)
                                    chat_widget.start_streaming("session-123".to_string(), "github".to_string());
                                    
                                    // Simulate streaming response
                                    let response = app.get_ai_response(&message).await?;
                                    for chunk in response.chars().collect::<Vec<_>>().chunks(3) {
                                        let chunk_str: String = chunk.iter().collect();
                                        chat_widget.append_streaming_chunk(&chunk_str);
                                        // In real implementation, this would come from the provider stream
                                        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
                                    }
                                    chat_widget.complete_streaming();
                                }
                                cortex_tui::view::chat::EventResponse::None => {}
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