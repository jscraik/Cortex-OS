// View module - Ratatui TUI components
pub mod chat;
pub mod diff;
pub mod palette;
pub mod mcp_manager;

pub use chat::ChatWidget;
pub use diff::DiffViewer;
pub use palette::CommandPalette;
pub use mcp_manager::McpManagerWidget;