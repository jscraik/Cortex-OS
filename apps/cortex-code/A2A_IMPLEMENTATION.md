# A2A Native Communication Implementation for Cortex-Code (Rust)

## Overview

This document describes the implementation of A2A (Agent-to-Agent) native communication for the cortex-code application, which is written in Rust. The implementation follows the same patterns established in other Cortex-OS applications like cortex-py and the API service.

## Implementation Details

### A2A Module Structure

The implementation consists of a new A2A module (`codex_cli::a2a`) that provides:

1. **A2AEnvelope** - A struct representing CloudEvents 1.0 compliant messages
2. **A2ABridge** - A bridge that communicates with the TypeScript A2A core via stdio
3. **Helper functions** - Utility functions for creating common A2A messages

### Key Components

#### A2AEnvelope

The `A2AEnvelope` struct follows the CloudEvents 1.0 specification:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct A2AEnvelope {
    pub id: String,
    pub source: String,
    pub specversion: String,
    pub r#type: String,
    pub datacontenttype: String,
    pub subject: Option<String>,
    pub time: String,
    pub data: serde_json::Value,
    #[serde(default)]
    pub cortex_meta: HashMap<String, serde_json::Value>,
}
```

#### A2ABridge

The `A2ABridge` struct provides communication with the TypeScript A2A core:

```rust
pub struct A2ABridge {
    source: String,
    child_process: Option<Child>,
}
```

Key methods include:

- `start()` - Spawns the TypeScript A2A core with stdio transport
- `publish()` - Publishes an A2A message via the bridge
- `send_message()` - Creates and sends a simple A2A message
- `listen()` - Listens for messages from the TypeScript A2A core
- `stop()` - Stops the A2A bridge

#### Helper Functions

The module includes helper functions for creating common message types:

- `create_health_message()` - Creates a health status message
- `create_status_message()` - Creates a status message with optional details
- `create_list_message()` - Creates a list response message

### Integration with CLI

The A2A commands in the CLI have been updated to use the real A2A implementation instead of stubs:

1. **Doctor Command** - Now starts the A2A bridge, sends a health check message, and returns real health information
2. **List Command** - Now starts the A2A bridge and sends a list request message
3. **Send Command** - Now starts the A2A bridge and sends the specified message type

### Communication Pattern

The Rust implementation follows the same stdio bridge pattern used in cortex-py:

1. The Rust CLI spawns a Node.js process that runs the TypeScript A2A core
2. Communication between Rust and TypeScript happens via stdio (stdin/stdout)
3. Messages are serialized as JSON and sent line-by-line
4. The TypeScript A2A core handles routing and delivery of messages

### Dependencies Added

The following dependencies were added to support the A2A implementation:

```toml
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1.0", features = ["v4", "serde"] }
```

## Usage Examples

### Sending a Health Check

```bash
codex a2a doctor
```

### Listing A2A Handlers

```bash
codex a2a list
```

### Sending a Custom Message

```bash
codex a2a send "custom.message.type"
```

## Future Improvements

1. **Message Handling** - Implement more sophisticated message handling in the `handle_message` function
2. **Error Recovery** - Add better error recovery and retry mechanisms
3. **Performance Optimization** - Optimize the bridge communication for high-throughput scenarios
4. **Security** - Add message validation and security features

## Testing

The implementation includes basic error handling and fallback mechanisms. If the A2A bridge fails to start, the CLI falls back to the original stub behavior to maintain compatibility.

## Conclusion

This implementation brings cortex-code in line with other Cortex-OS applications by providing full A2A native communication capabilities. The stdio bridge pattern allows seamless communication between the Rust CLI and the TypeScript A2A core, maintaining consistency with the overall Cortex-OS architecture.
