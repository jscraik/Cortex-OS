use serde::{Deserialize, Serialize};

/// Protocol definitions for client-server communication
/// Based on SST OpenCode protocol patterns

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MessageType {
    Request,
    Response,
    Notification,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtocolMessage {
    pub version: String,
    pub message_type: MessageType,
    pub payload: serde_json::Value,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl ProtocolMessage {
    pub fn new(message_type: MessageType, payload: serde_json::Value) -> Self {
        Self {
            version: "1.0".to_string(),
            message_type,
            payload,
            timestamp: chrono::Utc::now(),
        }
    }
}

/// Protocol constants
pub mod constants {
    pub const PROTOCOL_VERSION: &str = "1.0";
    pub const MAX_MESSAGE_SIZE: usize = 1024 * 1024; // 1MB
    pub const HEARTBEAT_INTERVAL: u64 = 30; // seconds
}
