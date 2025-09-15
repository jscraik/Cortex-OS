# Cortex Code Configuration
<!-- markdownlint-disable MD013 -->

This guide explains how to configure Cortex Code for your environment and preferences.

## Configuration File Location

Cortex Code looks for configuration files in the following locations (in order of precedence):

1. Current directory: `./cortex.json`
2. Home directory: `~/.cortex/cortex.json`
3. System config directory: `~/Library/Application Support/ai.cortex-os.cortex/cortex.json` (macOS)

## Configuration File Format

Cortex Code uses JSON for configuration files. Here's a complete example:

```json
{
  "name": "Cortex Code",
  "version": "2.0.0",
  "description": "AI-powered terminal interface for Cortex-OS",
  "providers": {
    "default": "github",
    "fallback": ["openai", "anthropic", "mlx"],
    "config": {
      "github": {
        "base_url": "https://models.inference.ai.azure.com",
        "models": ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
        "free_tier": true,
        "requires_key": false,
        "rate_limits": {
          "requests_per_minute": 60,
          "tokens_per_minute": 150000
        }
      },
      "openai": {
        "base_url": "https://api.openai.com/v1",
        "models": ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
        "free_tier": false,
        "requires_key": true
      },
      "anthropic": {
        "base_url": "https://api.anthropic.com",
        "models": ["claude-3-sonnet", "claude-3-haiku", "claude-3-opus"],
        "free_tier": false,
        "requires_key": true
      },
      "mlx": {
        "models": ["mlx-community/Llama-3.1-8B-Instruct"],
        "free_tier": true,
        "requires_key": false,
        "requires_installation": "pip install mlx-lm",
        "provider_type": "local"
      }
    }
  },
  "features": {
    "tui": {
      "enabled": true,
      "framework": "ratatui",
      "version": "0.29.0",
      "accessibility": "wcag-2.2-aa"
    },
    "daemon": {
      "enabled": true,
      "port": 8080,
      "bind_address": "127.0.0.1"
    },
    "mcp": {
      "enabled": true,
      "servers": [
        {
          "name": "cortex-fs",
          "command": "cortex-mcp-fs",
          "description": "File system operations"
        },
        {
          "name": "cortex-git",
          "command": "cortex-mcp-git",
          "description": "Git operations"
        }
      ]
    },
    "memory": {
      "enabled": true,
      "backend": "agents_md",
      "retention_days": 30,
      "audit_enabled": true
    },
    "metrics": {
      "enabled": true,
      "prometheus_endpoint": "/metrics",
      "health_endpoint": "/health"
    },
    "streaming": {
      "enabled": true,
      "chunk_size": 1024,
      "timeout_ms": 30000
    }
  },
  "security": {
    "network": {
      "bind_localhost_only": true,
      "tls_enabled": false,
      "cors_enabled": true,
      "allowed_origins": ["http://localhost:*"]
    },
    "execution": {
      "sandbox_enabled": true,
      "command_injection_protection": true,
      "input_validation": true
    },
    "data": {
      "encryption_at_rest": false,
      "pii_detection": true,
      "audit_logging": true
    }
  },
  "ui": {
    "theme": "dark",
    "keybindings": "default",
    "vim_mode": false,
    "components": {
      "chat_widget": {
        "enabled": true,
        "streaming": true,
        "history_size": 1000
      },
      "command_palette": {
        "enabled": true,
        "fuzzy_search": true,
        "max_results": 10
      },
      "file_tree": {
        "enabled": false,
        "show_hidden": false,
        "git_integration": true
      },
      "diff_viewer": {
        "enabled": true,
        "syntax_highlighting": true,
        "side_by_side": true
      },
      "status_bar": {
        "enabled": true,
        "show_provider": true,
        "show_model": true,
        "show_tokens": true
      }
    }
  }
}
```

## Environment Variables

Cortex Code also supports configuration through environment variables, which take precedence over file-based configuration:

### Provider Configuration

```bash
export CORTEX_AI_PROVIDER="openai"
export OPENAI_API_KEY="sk-your-key-here"
export ANTHROPIC_API_KEY="your-anthropic-key"
export GITHUB_TOKEN="ghp_your-token-here"
```

### Daemon Configuration

```bash
export CORTEX_DAEMON_PORT=8080
export CORTEX_BIND_ADDRESS="127.0.0.1"
```

### UI Configuration

```bash
export CORTEX_THEME="dark"
export CORTEX_REFRESH_RATE=60
```

### Security Environment Variables

```bash
export CORTEX_TLS_ENABLED=false
export CORTEX_ENCRYPTION_AT_REST=false
```

## Cloudflare Tunnel Configuration

Cortex Code supports Cloudflare Tunnels for secure remote access to your development environment. This configuration section allows you to set up and manage tunnels directly from Cortex Code.

### Server Configuration

```json
{
  "server": {
    "cloudflare": {
      "tunnel_name": "cortex-code",
      "auto_start": true,
      "health_checks": true,
      "tunnel_token": "your-tunnel-token-here",
      "domain": "cortex.example.com",
      "config_path": "/path/to/tunnel-config.yml"
    }
  }
}
```

### WebUI Configuration

When using Cloudflare Tunnels, you'll typically want to enable the WebUI:

```json
{
  "webui": {
    "enabled": true,
    "port": 3000,
    "host": "127.0.0.1"
  }
}
```

### Configuration Options

#### tunnel_name

- **Type**: String
- **Required**: Yes (if not using tunnel_token)
- **Description**: The name of your Cloudflare tunnel

#### auto_start

- **Type**: Boolean
- **Default**: false
- **Description**: Whether to automatically start the tunnel when Cortex Code starts

#### health_checks

- **Type**: Boolean
- **Default**: false
- **Description**: Enable health checks and metrics collection for the tunnel

#### tunnel_token

- **Type**: String
- **Required**: Yes (if not using tunnel_name)
- **Description**: The token for your Cloudflare tunnel (alternative to tunnel_name)

#### domain

- **Type**: String
- **Required**: No
- **Description**: Custom domain for your tunnel (instead of the default trycloudflare.com domain)

#### config_path

- **Type**: String
- **Required**: No
- **Description**: Path to a custom tunnel configuration file

## Provider-Specific Configuration

### GitHub Models

GitHub Models provide free access to AI models with rate limits:

```json
{
  "github": {
    "base_url": "https://models.inference.ai.azure.com",
    "models": ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
    "free_tier": true,
    "requires_key": false,
    "rate_limits": {
      "requests_per_minute": 60,
      "tokens_per_minute": 150000
    }
  }
}
```

### OpenAI

OpenAI requires an API key and offers various models:

```json
{
  "openai": {
    "base_url": "https://api.openai.com/v1",
    "models": ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
    "free_tier": false,
    "requires_key": true
  }
}
```

### Anthropic

Anthropic requires an API key and offers Claude models:

```json
{
  "anthropic": {
    "base_url": "https://api.anthropic.com",
    "models": ["claude-3-sonnet", "claude-3-haiku", "claude-3-opus"],
    "free_tier": false,
    "requires_key": true
  }
}
```

### MLX (Local)

MLX provides local inference for Apple Silicon Macs:

```json
{
  "mlx": {
    "models": ["mlx-community/Llama-3.1-8B-Instruct"],
    "free_tier": true,
    "requires_key": false,
    "requires_installation": "pip install mlx-lm",
    "provider_type": "local"
  }
}
```

## Feature Configuration

### TUI Features

Configure the terminal user interface:

```json
{
  "tui": {
    "enabled": true,
    "framework": "ratatui",
    "version": "0.29.0",
    "accessibility": "wcag-2.2-aa"
  }
}
```

### Daemon Mode

Configure the background daemon server:

```json
{
  "daemon": {
    "enabled": true,
    "port": 8080,
    "bind_address": "127.0.0.1"
  }
}
```

### MCP Integration

Configure Model Context Protocol servers:

```json
{
  "mcp": {
    "enabled": true,
    "servers": [
      {
        "name": "cortex-fs",
        "command": "cortex-mcp-fs",
        "description": "File system operations"
      }
    ]
  }
}
```

### Memory Management

Configure persistent storage and memory features:

```json
{
  "memory": {
    "enabled": true,
    "backend": "agents_md",
    "retention_days": 30,
    "audit_enabled": true
  }
}
```

## Security Configuration

### Network Security

Configure network-level security settings:

```json
{
  "network": {
    "bind_localhost_only": true,
    "tls_enabled": false,
    "cors_enabled": true,
    "allowed_origins": ["http://localhost:*"]
  }
}
```

### Execution Security

Configure execution-level security settings:

```json
{
  "execution": {
    "sandbox_enabled": true,
    "command_injection_protection": true,
    "input_validation": true
  }
}
```

### Data Security

Configure data-level security settings:

```json
{
  "data": {
    "encryption_at_rest": false,
    "pii_detection": true,
    "audit_logging": true
  }
}
```

## UI Component Configuration

Configure individual UI components:

```json
{
  "components": {
    "chat_widget": {
      "enabled": true,
      "streaming": true,
      "history_size": 1000
    },
    "command_palette": {
      "enabled": true,
      "fuzzy_search": true,
      "max_results": 10
    },
    "status_bar": {
      "enabled": true,
      "show_provider": true,
      "show_model": true,
      "show_tokens": true
    }
  }
}
```

## Profile Management

Cortex Code supports multiple configuration profiles for different environments:

### Creating Profiles

Create profile-specific configuration files:

- `~/.cortex/profiles/development.json`
- `~/.cortex/profiles/production.json`
- `~/.cortex/profiles/staging.json`

### Using Profiles

Set the active profile with an environment variable:

```bash
export CORTEX_PROFILE=development
```

## Configuration Validation

Cortex Code validates configuration on startup and will report errors for invalid settings:

### Common Validation Errors

1. Missing required fields
2. Invalid enum values (e.g., invalid theme names)
3. Port conflicts
4. Invalid file paths

### Example Error Message

```text
Error: Invalid configuration value for ui.theme: "purple"
Valid values are: "dark", "light", "auto"
```

## Best Practices

### Security Best Practices

1. Store API keys in environment variables, not config files
2. Use read-only tokens when possible
3. Enable audit logging in production
4. Regularly rotate API tokens
5. Monitor for suspicious activity

### Performance Best Practices

1. Adjust refresh rate based on system capabilities
2. Enable only required UI components
3. Configure appropriate rate limits
4. Use local providers (MLX) when possible for better performance

### Maintenance Best Practices

1. Regularly update configuration for new features
2. Backup configuration files
3. Document custom configurations
4. Test configuration changes in development first

## Troubleshooting

### Configuration Not Loading

1. Check file permissions
2. Validate JSON syntax
3. Verify file location
4. Check environment variable precedence

### Provider Configuration Issues

1. Verify API keys are correct
2. Check rate limits
3. Confirm model availability
4. Test connectivity manually

### Security Configuration Issues

1. Check TLS certificate paths
2. Verify CORS settings
3. Test encryption settings
4. Review audit log configuration

## Advanced Configuration

### Custom Providers

Add custom AI providers:

```json
{
  "custom_provider": {
    "base_url": "https://your-custom-endpoint.com/v1",
    "models": ["custom-model-v1"],
    "free_tier": false,
    "requires_key": true
  }
}
```

### Conditional Configuration

Use environment variables for conditional settings:

```json
{
  "daemon": {
    "enabled": true,
    "port": "${CORTEX_PORT:-8080}",
    "bind_address": "${CORTEX_BIND_ADDRESS:-127.0.0.1}"
  }
}
```

### Configuration Templates

Create reusable configuration templates for teams:

```bash
# Create a template
cp ~/.cortex/cortex.json ~/.cortex/templates/team-default.json

# Use the template
cp ~/.cortex/templates/team-default.json ~/.cortex/cortex.json
```
