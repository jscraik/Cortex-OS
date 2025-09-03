# Architecture

This document describes the technical architecture of Cortex Code, explaining how its components interact to provide a seamless terminal-based AI coding experience.

## Overview

Cortex Code is built using Rust, leveraging its performance, memory safety, and concurrency features. The application follows an event-driven architecture with a clear separation of concerns between the UI, business logic, and external integrations.

## System Components

### Main Application Structure

```markdown
src/
├── main.rs # Entry point and TUI event loop
├── app.rs # Core application state and logic
├── config.rs # Configuration management
├── event.rs # Event system definitions
├── tui/ # Terminal UI components
│ ├── mod.rs # TUI module entry point
│ ├── ui.rs # UI rendering logic
│ └── styles.rs # Styling definitions
├── view/ # Individual view implementations
│ ├── mod.rs # View module entry point
│ ├── chat.rs # AI Chat interface
│ ├── github_dashboard.rs # GitHub activity dashboard
│ ├── a2a_stream.rs # Agent-to-agent event stream
│ └── cortex_command_palette.rs # Command palette
└── mcp/ # Model Context Protocol integration
├── mod.rs # MCP module entry point
├── client.rs # MCP client implementation
└── server.rs # MCP server management
```

### Core Components

#### 1. Event Loop (main.rs)

The main event loop is responsible for:

- Handling terminal input events
- Managing view switching
- Coordinating between different application components
- Graceful shutdown handling

The event loop uses Crossterm for terminal input handling and Ratatui for rendering, running at 60 FPS for a responsive user experience.

#### 2. Application State (app.rs)

The App struct maintains the global application state:

- Current active view
- Configuration settings
- Shared data between views
- Event channels for inter-component communication

#### 3. Configuration Management (config.rs)

Handles:

- Loading configuration from files and environment variables
- Validating configuration values
- Providing typed access to configuration settings
- Supporting multiple configuration profiles

#### 4. Terminal UI Framework (tui/)

Built on top of Ratatui, this module provides:

- Consistent styling across all views
- Reusable UI components
- Responsive layout management
- Theme support (dark/light modes)

#### 5. Views (view/)

Each view implements a specific feature area:

- **Chat View**: AI conversation interface with streaming support
- **GitHub Dashboard**: Real-time GitHub activity monitoring
- **A2A Stream**: Agent-to-agent communication visualization
- **Command Palette**: Unified command execution interface

#### 6. MCP Integration (mcp/)

Implements the Model Context Protocol:

- Client for communicating with MCP servers
- Server management for starting/stopping MCP services
- Plugin system for extending functionality

## Data Flow

### Event Processing Pipeline

1. **Input Event**: User input or system event
2. **Event Handler**: Processes the event and updates application state
3. **State Update**: Modifies the application state
4. **UI Render**: Triggers UI re-render based on updated state
5. **Output**: Displays updated interface to user

### Asynchronous Operations

Cortex Code uses Tokio for asynchronous operations:

- HTTP requests to AI providers
- GitHub API calls
- MCP server communication
- File I/O operations
- Background tasks

## External Integrations

### AI Providers

Cortex Code supports multiple AI providers through a unified interface:

- GitHub Models (default, free tier)
- OpenAI (GPT models)
- Anthropic (Claude models)
- MLX (local inference for Apple Silicon)

Each provider implements a common trait with methods for:

- Model listing
- Chat completion
- Streaming responses

### GitHub Integration

The GitHub dashboard integrates with the GitHub API to provide:

- Real-time repository statistics
- Pull request monitoring
- Issue tracking
- Activity analytics

### Model Context Protocol (MCP)

MCP integration allows Cortex Code to:

- Communicate with external tools and services
- Extend functionality through plugins
- Provide context to AI models

## Concurrency Model

Cortex Code uses a multi-threaded approach with clear boundaries:

### Main Thread

- Terminal UI rendering
- Event handling
- View management

### Background Tasks

- AI provider communication
- GitHub API polling
- MCP server management
- File operations

### Communication Patterns

- **Channels**: For passing events between components
- **Shared State**: For data that needs to be accessed by multiple components
- **Locks**: Minimal use of mutexes for performance

## Data Storage

### Configuration

- JSON files stored in platform-appropriate locations
- Environment variable overrides
- In-memory representation as Rust structs

### Runtime Data

- In-memory data structures
- Temporary files for large data sets
- No persistent database in current implementation

### Caching

- In-memory caching for frequently accessed data
- Time-based cache invalidation
- Size-limited LRU eviction policies

## Security Architecture

### Data Protection

- API tokens encrypted at rest
- TLS for all external communications
- Input validation and sanitization
- Secure configuration file permissions

### Execution Safety

- Sandboxed command execution (planned)
- Command injection protection
- Rate limiting for external API calls

## Performance Characteristics

### Memory Usage

- Typically 8-15MB resident memory
- Efficient data structures
- Minimal memory allocations in hot paths

### CPU Usage

- <5% idle on modern systems
- Efficient event handling
- Background task throttling

### Startup Time

- <100ms cold start
- Optimized binary size
- Lazy loading of non-essential components

## macOS Specific Architecture

### File System Integration

- Uses standard macOS directories for configuration and data
- Proper file permissions for security
- Integration with macOS file system APIs

### Terminal Compatibility

- Optimized for Terminal.app and iTerm2
- Support for modern terminal features
- Proper handling of macOS keyboard shortcuts

### Process Management

- Follows macOS conventions for background processes
- Proper signal handling for clean shutdown
- Integration with macOS process monitoring

## Extensibility Points

### Plugin System

- MCP-based plugin architecture
- Command extension points
- View customization hooks

### Configuration Extension

- Custom provider support
- Theme customization
- Keybinding customization

## Future Architecture Enhancements

### WebUI Foundation

- REST API layer for remote access
- WebSocket support for real-time updates
- Browser-compatible UI components

### Enterprise Features

- Database integration for persistent storage
- Advanced authentication and authorization
- Horizontal scaling capabilities

### Performance Optimizations

- Enhanced caching strategies
- Connection pooling for external services
- Resource monitoring and optimization

## Related Documentation

- [Introduction](introduction.md) - Overview of Cortex Code
- [CLI Reference](cli-reference.md) - Command-line interface details
- [Configuration](configuration.md) - Configuration options and management
