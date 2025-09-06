//! Z.ai API client for Cortex-Codex
//!
//! This crate provides a comprehensive client for the Z.ai API,
//! implementing the ModelProvider trait for seamless integration with the
//! Cortex-Codex framework.

pub mod client;
pub mod error;
pub mod models;
pub mod streaming;

pub use client::ZaiClient;
pub use error::ZaiError;
pub use models::*;
pub use streaming::ZaiStream;
