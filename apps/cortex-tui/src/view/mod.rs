// View module - Ratatui TUI components
pub mod chat;
pub mod diff;
pub mod palette;
pub mod mcp_manager;
pub mod github_dashboard;
pub mod a2a_stream;
pub mod cortex_command_palette;

pub use chat::ChatWidget;
pub use diff::DiffViewer;
pub use palette::CommandPalette;
pub use mcp_manager::McpManagerWidget;
pub use github_dashboard::GitHubDashboard;
pub use a2a_stream::A2aEventStream;
pub use cortex_command_palette::CortexCommandPalette;