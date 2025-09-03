use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// MCP message envelope
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum McpMessage {
    /// Request message
    Request(McpRequest),
    /// Response message
    Response(McpResponse),
}

/// MCP request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpRequest {
    /// Request ID
    pub id: String,
    /// Method name
    pub method: String,
    /// Request parameters
    pub params: Option<Value>,
    /// Response channel (not serialized)
    #[serde(skip)]
    pub response_tx: Option<tokio::sync::oneshot::Sender<Result<Value>>>,
}

/// MCP response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpResponse {
    /// Response ID
    pub id: String,
    /// Response result
    pub result: Option<Value>,
    /// Response error
    pub error: Option<McpError>,
}

/// MCP error
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpError {
    /// Error code
    pub code: i32,
    /// Error message
    pub message: String,
    /// Additional error data
    pub data: Option<Value>,
}

/// MCP transport layer
#[derive(Debug)]
pub struct McpTransport {
    /// Transport configuration
    config: McpTransportConfig,
}

/// Transport configuration
#[derive(Debug, Clone)]
pub struct McpTransportConfig {
    /// Maximum message size in bytes
    pub max_message_size: usize,
    /// Connection timeout
    pub timeout: std::time::Duration,
    /// Enable compression
    pub compression: bool,
    /// Buffer size
    pub buffer_size: usize,
    /// Enable keepalive
    pub keepalive: bool,
    /// Keepalive interval
    pub keepalive_interval: std::time::Duration,
}

impl Default for McpTransportConfig {
    fn default() -> Self {
        Self {
            max_message_size: 1024 * 1024, // 1MB
            timeout: std::time::Duration::from_secs(30),
            compression: false,
            buffer_size: 8192,
            keepalive: true,
            keepalive_interval: std::time::Duration::from_secs(30),
        }
    }
}

impl McpTransport {
    /// Create a new transport
    pub fn new(config: McpTransportConfig) -> Self {
        Self { config }
    }

    /// Create with default configuration
    pub fn default() -> Self {
        Self::new(McpTransportConfig::default())
    }

    /// Serialize a message
    pub fn serialize_message(&self, message: &McpMessage) -> Result<Vec<u8>> {
        let json = serde_json::to_string(message)?;

        if json.len() > self.config.max_message_size {
            return Err(anyhow::anyhow!(
                "Message size {} exceeds maximum {}",
                json.len(),
                self.config.max_message_size
            ));
        }

        let mut data = json.into_bytes();

        if self.config.compression {
            data = self.compress_data(&data)?;
        }

        Ok(data)
    }

    /// Deserialize a message
    pub fn deserialize_message(&self, data: &[u8]) -> Result<McpMessage> {
        if data.len() > self.config.max_message_size {
            return Err(anyhow::anyhow!(
                "Message size {} exceeds maximum {}",
                data.len(),
                self.config.max_message_size
            ));
        }

        let mut data = data.to_vec();

        if self.config.compression {
            data = self.decompress_data(&data)?;
        }

        let json = String::from_utf8(data)?;
        let message = serde_json::from_str(&json)?;

        Ok(message)
    }

    /// Create a request message
    pub fn create_request(&self, id: String, method: String, params: Option<Value>) -> McpMessage {
        McpMessage::Request(McpRequest {
            id,
            method,
            params,
            response_tx: None,
        })
    }

    /// Create a success response
    pub fn create_success_response(&self, id: String, result: Value) -> McpMessage {
        McpMessage::Response(McpResponse {
            id,
            result: Some(result),
            error: None,
        })
    }

    /// Create an error response
    pub fn create_error_response(&self, id: String, code: i32, message: String, data: Option<Value>) -> McpMessage {
        McpMessage::Response(McpResponse {
            id,
            result: None,
            error: Some(McpError {
                code,
                message,
                data,
            }),
        })
    }

    /// Validate message format
    pub fn validate_message(&self, message: &McpMessage) -> Result<()> {
        match message {
            McpMessage::Request(req) => {
                if req.id.is_empty() {
                    return Err(anyhow::anyhow!("Request ID cannot be empty"));
                }
                if req.method.is_empty() {
                    return Err(anyhow::anyhow!("Request method cannot be empty"));
                }
                Ok(())
            }
            McpMessage::Response(resp) => {
                if resp.id.is_empty() {
                    return Err(anyhow::anyhow!("Response ID cannot be empty"));
                }
                if resp.result.is_none() && resp.error.is_none() {
                    return Err(anyhow::anyhow!("Response must have either result or error"));
                }
                if resp.result.is_some() && resp.error.is_some() {
                    return Err(anyhow::anyhow!("Response cannot have both result and error"));
                }
                Ok(())
            }
        }
    }

    /// Get configuration
    pub fn config(&self) -> &McpTransportConfig {
        &self.config
    }

    /// Update configuration
    pub fn update_config(&mut self, config: McpTransportConfig) {
        self.config = config;
    }

    /// Compress data (placeholder - would use actual compression)
    fn compress_data(&self, data: &[u8]) -> Result<Vec<u8>> {
        // For now, just return the data as-is
        // In a real implementation, you might use flate2, zstd, etc.
        Ok(data.to_vec())
    }

    /// Decompress data (placeholder - would use actual decompression)
    fn decompress_data(&self, data: &[u8]) -> Result<Vec<u8>> {
        // For now, just return the data as-is
        // In a real implementation, you might use flate2, zstd, etc.
        Ok(data.to_vec())
    }

    /// Calculate message overhead
    pub fn calculate_overhead(&self, payload_size: usize) -> usize {
        let base_overhead = 32; // JSON structure overhead
        let compression_overhead = if self.config.compression { 16 } else { 0 };

        base_overhead + compression_overhead
    }

    /// Check if message size is valid
    pub fn is_valid_message_size(&self, size: usize) -> bool {
        size <= self.config.max_message_size
    }

    /// Get maximum payload size
    pub fn max_payload_size(&self) -> usize {
        let overhead = self.calculate_overhead(0);
        self.config.max_message_size.saturating_sub(overhead)
    }
}

/// Standard MCP error codes
pub mod error_codes {
    /// Parse error
    pub const PARSE_ERROR: i32 = -32700;
    /// Invalid request
    pub const INVALID_REQUEST: i32 = -32600;
    /// Method not found
    pub const METHOD_NOT_FOUND: i32 = -32601;
    /// Invalid parameters
    pub const INVALID_PARAMS: i32 = -32602;
    /// Internal error
    pub const INTERNAL_ERROR: i32 = -32603;
    /// Server error range start
    pub const SERVER_ERROR_START: i32 = -32099;
    /// Server error range end
    pub const SERVER_ERROR_END: i32 = -32000;
}

impl McpError {
    /// Create a parse error
    pub fn parse_error(message: String) -> Self {
        Self {
            code: error_codes::PARSE_ERROR,
            message,
            data: None,
        }
    }

    /// Create an invalid request error
    pub fn invalid_request(message: String) -> Self {
        Self {
            code: error_codes::INVALID_REQUEST,
            message,
            data: None,
        }
    }

    /// Create a method not found error
    pub fn method_not_found(method: String) -> Self {
        Self {
            code: error_codes::METHOD_NOT_FOUND,
            message: format!("Method not found: {}", method),
            data: None,
        }
    }

    /// Create an invalid parameters error
    pub fn invalid_params(message: String) -> Self {
        Self {
            code: error_codes::INVALID_PARAMS,
            message,
            data: None,
        }
    }

    /// Create an internal error
    pub fn internal_error(message: String) -> Self {
        Self {
            code: error_codes::INTERNAL_ERROR,
            message,
            data: None,
        }
    }

    /// Create a custom server error
    pub fn server_error(code: i32, message: String, data: Option<Value>) -> Self {
        assert!(code >= error_codes::SERVER_ERROR_END && code <= error_codes::SERVER_ERROR_START);

        Self {
            code,
            message,
            data,
        }
    }

    /// Check if error is in server error range
    pub fn is_server_error(&self) -> bool {
        self.code >= error_codes::SERVER_ERROR_END && self.code <= error_codes::SERVER_ERROR_START
    }

    /// Get error type as string
    pub fn error_type(&self) -> &'static str {
        match self.code {
            error_codes::PARSE_ERROR => "ParseError",
            error_codes::INVALID_REQUEST => "InvalidRequest",
            error_codes::METHOD_NOT_FOUND => "MethodNotFound",
            error_codes::INVALID_PARAMS => "InvalidParams",
            error_codes::INTERNAL_ERROR => "InternalError",
            code if code >= error_codes::SERVER_ERROR_END && code <= error_codes::SERVER_ERROR_START => "ServerError",
            _ => "UnknownError",
        }
    }
}

impl std::fmt::Display for McpError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{} ({}): {}", self.error_type(), self.code, self.message)
    }
}

impl std::error::Error for McpError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mcp_transport_config_default() {
        let config = McpTransportConfig::default();
        assert_eq!(config.max_message_size, 1024 * 1024);
        assert_eq!(config.timeout, std::time::Duration::from_secs(30));
        assert!(!config.compression);
        assert!(config.keepalive);
    }

    #[test]
    fn test_mcp_transport_creation() {
        let transport = McpTransport::default();
        assert_eq!(transport.config.max_message_size, 1024 * 1024);
    }

    #[test]
    fn test_create_request() {
        let transport = McpTransport::default();
        let message = transport.create_request(
            "test-id".to_string(),
            "test_method".to_string(),
            Some(serde_json::json!({"arg": "value"}))
        );

        match message {
            McpMessage::Request(req) => {
                assert_eq!(req.id, "test-id");
                assert_eq!(req.method, "test_method");
                assert!(req.params.is_some());
            }
            _ => panic!("Expected request message"),
        }
    }

    #[test]
    fn test_create_success_response() {
        let transport = McpTransport::default();
        let message = transport.create_success_response(
            "test-id".to_string(),
            serde_json::json!({"result": "success"})
        );

        match message {
            McpMessage::Response(resp) => {
                assert_eq!(resp.id, "test-id");
                assert!(resp.result.is_some());
                assert!(resp.error.is_none());
            }
            _ => panic!("Expected response message"),
        }
    }

    #[test]
    fn test_create_error_response() {
        let transport = McpTransport::default();
        let message = transport.create_error_response(
            "test-id".to_string(),
            -32601,
            "Method not found".to_string(),
            None
        );

        match message {
            McpMessage::Response(resp) => {
                assert_eq!(resp.id, "test-id");
                assert!(resp.result.is_none());
                assert!(resp.error.is_some());

                let error = resp.error.unwrap();
                assert_eq!(error.code, -32601);
                assert_eq!(error.message, "Method not found");
            }
            _ => panic!("Expected response message"),
        }
    }

    #[test]
    fn test_message_validation() {
        let transport = McpTransport::default();

        // Valid request
        let valid_request = McpMessage::Request(McpRequest {
            id: "test-id".to_string(),
            method: "test_method".to_string(),
            params: None,
            response_tx: None,
        });
        assert!(transport.validate_message(&valid_request).is_ok());

        // Invalid request (empty ID)
        let invalid_request = McpMessage::Request(McpRequest {
            id: "".to_string(),
            method: "test_method".to_string(),
            params: None,
            response_tx: None,
        });
        assert!(transport.validate_message(&invalid_request).is_err());

        // Valid response
        let valid_response = McpMessage::Response(McpResponse {
            id: "test-id".to_string(),
            result: Some(serde_json::json!({"success": true})),
            error: None,
        });
        assert!(transport.validate_message(&valid_response).is_ok());
    }

    #[test]
    fn test_mcp_error_types() {
        let parse_error = McpError::parse_error("Invalid JSON".to_string());
        assert_eq!(parse_error.code, error_codes::PARSE_ERROR);
        assert_eq!(parse_error.error_type(), "ParseError");

        let method_error = McpError::method_not_found("unknown_method".to_string());
        assert_eq!(method_error.code, error_codes::METHOD_NOT_FOUND);
        assert_eq!(method_error.error_type(), "MethodNotFound");

        let server_error = McpError::server_error(-32001, "Custom error".to_string(), None);
        assert!(server_error.is_server_error());
        assert_eq!(server_error.error_type(), "ServerError");
    }

    #[test]
    fn test_message_serialization() {
        let transport = McpTransport::default();

        let message = transport.create_request(
            "test-id".to_string(),
            "test_method".to_string(),
            Some(serde_json::json!({"arg": "value"}))
        );

        let serialized = transport.serialize_message(&message).unwrap();
        let deserialized = transport.deserialize_message(&serialized).unwrap();

        match (message, deserialized) {
            (McpMessage::Request(original), McpMessage::Request(restored)) => {
                assert_eq!(original.id, restored.id);
                assert_eq!(original.method, restored.method);
                assert_eq!(original.params, restored.params);
            }
            _ => panic!("Message type mismatch"),
        }
    }

    #[test]
    fn test_message_size_validation() {
        let transport = McpTransport::default();

        assert!(transport.is_valid_message_size(1024));
        assert!(transport.is_valid_message_size(1024 * 1024));
        assert!(!transport.is_valid_message_size(2 * 1024 * 1024));

        let max_payload = transport.max_payload_size();
        assert!(max_payload < transport.config.max_message_size);
    }

    #[test]
    fn test_error_display() {
        let error = McpError::method_not_found("test_method".to_string());
        let display = format!("{}", error);
        assert!(display.contains("MethodNotFound"));
        assert!(display.contains("test_method"));
    }
}
