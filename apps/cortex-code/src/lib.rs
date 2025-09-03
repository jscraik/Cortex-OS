pub mod app;
pub mod config;
pub mod controller;
pub mod error;
pub mod error_panic_handler;
pub mod github;
pub mod mcp;
pub mod memory;
pub mod metrics;
pub mod model;
pub mod model_picker;
pub mod model_verification;
pub mod providers;
pub mod server;
pub mod view;
pub mod enhanced_config;
pub mod cloudflare;
pub mod webui;
pub mod client_server;
pub mod brainwav_integration;
pub mod cloud_provider_agnostic;
pub mod diagnostic_manager;
pub mod tui;
pub mod streaming;
pub mod features;

pub use error::{Error, Result};

// Re-export key types
pub use app::CortexApp;
pub use config::Config;
