use std::panic;
use tracing::error;

/// Enhanced panic handler with context capture and user-friendly error display
/// Inspired by OpenAI Codex CLI's panic recovery patterns
pub fn install_panic_handler() {
    panic::set_hook(Box::new(|info| {
        let location = if let Some(location) = info.location() {
            format!("{}:{}:{}", location.file(), location.line(), location.column())
        } else {
            "unknown location".to_string()
        };

        let message = if let Some(s) = info.payload().downcast_ref::<&str>() {
            *s
        } else if let Some(s) = info.payload().downcast_ref::<String>() {
            s.as_str()
        } else {
            "unknown panic message"
        };

        // Log the panic with context
        error!(
            target: "cortex::panic",
            location = location,
            message = message,
            "Application panic occurred"
        );

        // Display user-friendly error message
        eprintln!("\n🚨 Cortex Code encountered an unexpected error");
        eprintln!("   This is a bug - please report it at: https://github.com/cortex-os/cortex-code/issues");
        eprintln!("
📍 Error Details:
   Location: {}
   Message: {}

🔧 What you can do:
   1. Check if your configuration is valid (cortex.json or ~/.cortex/config.toml)
   2. Try running with --debug for more information
   3. Report this error with the details above
", location, message);

        // Try to save any important state before exiting
        if let Err(e) = save_crash_context() {
            eprintln!("⚠️  Could not save crash context: {}", e);
        }
    }));
}

/// Save crash context for debugging
fn save_crash_context() -> std::io::Result<()> {
    use std::fs;
    use std::io::Write;

    let crash_info = format!(
        "Cortex Code Crash Report
Time: {}
Version: {}
OS: {}
Architecture: {}
",
        chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC"),
        env!("CARGO_PKG_VERSION"),
        std::env::consts::OS,
        std::env::consts::ARCH,
    );

    // Try to save to temp directory
    if let Some(temp_dir) = directories::UserDirs::new() {
        let crash_file = temp_dir.home_dir().join(".cortex").join("crash.log");
        if let Some(parent) = crash_file.parent() {
            fs::create_dir_all(parent)?;
        }
        let mut file = fs::File::create(crash_file)?;
        file.write_all(crash_info.as_bytes())?;
    }

    Ok(())
}

/// Graceful shutdown handler for catching termination signals
pub fn install_signal_handlers() {
    #[cfg(unix)]
    {
        use tokio::signal::unix::{signal, SignalKind};

        tokio::spawn(async {
            let mut sigterm = signal(SignalKind::terminate()).expect("Failed to register SIGTERM handler");
            let mut sigint = signal(SignalKind::interrupt()).expect("Failed to register SIGINT handler");

            tokio::select! {
                _ = sigterm.recv() => {
                    tracing::info!("Received SIGTERM, shutting down gracefully");
                    graceful_shutdown().await;
                }
                _ = sigint.recv() => {
                    tracing::info!("Received SIGINT (Ctrl+C), shutting down gracefully");
                    graceful_shutdown().await;
                }
            }
        });
    }

    #[cfg(windows)]
    {
        use tokio::signal::windows;

        tokio::spawn(async {
            let mut ctrl_c = windows::ctrl_c().expect("Failed to register Ctrl+C handler");
            let mut ctrl_break = windows::ctrl_break().expect("Failed to register Ctrl+Break handler");

            tokio::select! {
                _ = ctrl_c.recv() => {
                    tracing::info!("Received Ctrl+C, shutting down gracefully");
                    graceful_shutdown().await;
                }
                _ = ctrl_break.recv() => {
                    tracing::info!("Received Ctrl+Break, shutting down gracefully");
                    graceful_shutdown().await;
                }
            }
        });
    }
}

/// Perform graceful shutdown cleanup
async fn graceful_shutdown() {
    tracing::info!("Starting graceful shutdown...");

    // Save any pending state
    if let Err(e) = save_shutdown_state().await {
        tracing::error!("Failed to save shutdown state: {}", e);
    }

    // Flush logs
    tracing::info!("Shutdown complete");

    std::process::exit(0);
}

/// Save application state during shutdown
async fn save_shutdown_state() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // This would be implemented to save conversation history, pending operations, etc.
    // For now, just ensure logs are flushed
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    Ok(())
}
