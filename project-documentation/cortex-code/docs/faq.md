# Frequently Asked Questions (FAQ)
<!-- markdownlint-disable MD013 -->

This document answers common questions about Cortex Code, covering installation, usage, troubleshooting, and future plans.

## General Questions

### What is Cortex Code?

Cortex Code is a terminal-based user interface (TUI) for the Cortex-OS AI coding agent ecosystem. It enables developers to interact with AI agents, monitor GitHub activity, visualize agent-to-agent (A2A) communications, and execute system commands—all from a high-performance, low-latency terminal environment.

### Is Cortex Code free to use?

Yes, Cortex Code is open-source and free to use under the Apache 2.0 license. While the core application is free, some AI providers may charge for their services (e.g., OpenAI, Anthropic). GitHub Models offers a free tier with rate limits.

### What programming languages is Cortex Code written in?

Cortex Code is written in Rust, chosen for its performance, memory safety, and concurrency features. The terminal UI is built using the Ratatui framework.

## Installation and Setup

### How do I install Cortex Code?

You can install Cortex Code by building from source:

```bash
# Clone the repository
git clone https://github.com/cortex-os/cortex-os.git
cd cortex-os/apps/cortex-code

# Build the project
cargo build --release

# Run Cortex Code
./target/release/codex
```

### What are the system requirements?

- **Operating System**: Linux, macOS, or Windows
- **Terminal**: Unicode and 256-color support recommended
- **Rust**: 1.70+ (for building from source)
- **Memory**: 8-15MB RAM (typical usage)
- **Disk Space**: 50MB for installation

### How do I configure Cortex Code?

Create a configuration file at `$HOME/.cortex/cortex.json`:

```json
{
  "providers": {
    "default": "github",
    "config": {
      "github": {
        "token": "your_github_token"
      }
    }
  }
}
```

You can also use environment variables:

```bash
export GITHUB_TOKEN="your_github_token"
export CORTEX_AI_PROVIDER="openai"
```

## Usage Questions

### How do I switch between different views?

Use these keyboard shortcuts:

- `Alt+1`: AI Chat View
- `Alt+2`: GitHub Dashboard
- `Alt+3`: A2A Event Stream
- `Ctrl+P`: Command Palette

### How do I get streaming responses from AI?

In the AI Chat view, press `Ctrl+Enter` instead of `Enter` to send messages with streaming enabled.

### How do I trigger an AI code review?

Open the command palette with `Ctrl+P` and type "github.review_pr" to trigger an AI-powered code review.

### Can I use Cortex Code with my private repositories?

Yes, as long as you configure a GitHub token with appropriate permissions for your private repositories.

## AI Provider Questions

### Which AI providers does Cortex Code support?

Currently supported providers:

- **GitHub Models**: Free tier with gpt-4o-mini, gpt-4o, gpt-3.5-turbo
- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude 3 models (Sonnet, Haiku, Opus)
- **MLX**: Local inference for Apple Silicon Macs

### How do I switch between AI providers?

Use the command palette (`Ctrl+P`) and type "ai.switch_model" or configure the default provider in your configuration file.

### Are my conversations with AI providers private?

Cortex Code sends your prompts directly to the configured AI providers. Review each provider's privacy policy for details on how they handle your data. For maximum privacy, consider using local models with MLX on Apple Silicon.

## Cloudflare Tunnel Questions

### What is Cloudflare Tunnel integration?

Cloudflare Tunnel integration allows you to securely access your Cortex Code instance from anywhere on the internet without exposing ports on your local machine. It creates an encrypted tunnel through Cloudflare's network.

### How do I set up Cloudflare Tunnel?

1. Install `cloudflared` on your system
2. Authenticate with Cloudflare: `cloudflared tunnel login`
3. Configure your tunnel in the Cortex Code configuration file
4. Start Cortex Code with tunnel support

### Do I need a Cloudflare account?

Yes, you need a free Cloudflare account to use Cloudflare Tunnels. You can sign up at [cloudflare.com](https://cloudflare.com).

### Is Cloudflare Tunnel free to use?

Cloudflare Tunnel is free to use with certain limitations. Check Cloudflare's pricing page for details on bandwidth limits and features.

### How do I configure a custom domain?

Add the `domain` parameter to your Cloudflare tunnel configuration:

```json
{
  "server": {
    "cloudflare": {
      "tunnel_name": "cortex-code",
      "domain": "cortex.example.com"
    }
  }
}
```

### Can I use Cloudflare Tunnel with the TUI interface?

Cloudflare Tunnel primarily enables remote access to the WebUI interface. The TUI interface is designed for local use, but you can access it through a terminal session on the remote machine.

## Troubleshooting

### I'm getting "command not found" errors

Ensure that:

1. Cortex Code is properly installed
2. The installation directory is in your PATH
3. On macOS, you may need to add the installation directory to your shell profile:

```bash
# For zsh (default on macOS)
echo 'alias cortex="codex"' >> ~/.zshrc && source ~/.zshrc
source ~/.zshrc
```

### The interface looks strange or characters are missing

Ensure your terminal supports Unicode and 256 colors:

```bash
export TERM=xterm-256color
```

Try a modern terminal like iTerm2 (macOS) or Alacritty (cross-platform).

### I'm experiencing high CPU usage

Try reducing the refresh rate in your configuration:

```json
{
  "ui": {
    "refresh_rate": 30
  }
}
```

### GitHub integration isn't working

Verify that:

1. Your GitHub token is correctly configured
2. The token has appropriate permissions (repo, read:org)
3. Your network connection can reach GitHub's API

### How do I enable debug logging?

Run Cortex Code with debug flags:

```bash
RUST_LOG=debug cargo run -- --debug
```

## macOS Specific Questions

### Where are configuration files stored on macOS?

Configuration files are stored in standard macOS locations:

- `~/Library/Application Support/ai.cortex-os.cortex/cortex.json`
- `~/Library/Logs/ai.cortex-os.cortex/`
- `~/Library/Caches/ai.cortex-os.cortex/`

### How do I grant terminal access on macOS?

If you encounter permission issues on macOS:

1. Go to System Preferences > Security & Privacy > Privacy > Developer Tools
2. Grant terminal access to your terminal application

### Can I run Cortex Code as a background service on macOS?

Yes, you can create a launchd plist file at `~/Library/LaunchAgents/ai.cortex-os.cortex.plist` to run Cortex Code as a background service.

## Future Development

### When will the WebUI be available?

The WebUI is planned for the next major release phase. Check the [Roadmap](roadmap.md) for the latest timeline information.

### Will there be mobile apps?

Mobile apps are planned for future releases, with priority given to iOS and Android native applications.

### Are plugins supported?

MCP (Model Context Protocol) plugins are supported in the current release. A more extensive plugin marketplace is planned for future releases.

### Will Cortex Code support other version control systems?

Currently, only GitHub is supported. Support for GitLab, Bitbucket, and other VCS platforms is planned for future releases.

## Enterprise Questions

### Is there enterprise support?

Enterprise support, including SLA, dedicated support channels, and custom feature development, is available through Cortex-OS Enterprise plans.

### How does Cortex Code handle compliance?

Cortex Code follows security best practices and supports compliance frameworks like GDPR, HIPAA, and SOC 2. Enterprise deployments will include additional compliance features.

### Can Cortex Code be deployed on-premises?

On-premises deployment options are available for enterprise customers, including air-gapped installations and private cloud deployments.

## Contributing

### How can I contribute to Cortex Code?

We welcome contributions! You can:

1. Report bugs on GitHub Issues
2. Submit pull requests for new features
3. Improve documentation
4. Help with testing and QA

### How do I set up a development environment?

1. Fork the repository
2. Clone your fork
3. Install Rust 1.70+
4. Run `cargo build` to compile
5. Run `cargo test` to run tests

## Licensing

### What license is Cortex Code released under?

Cortex Code is released under the Apache License 2.0, a permissive open-source license.

### Can I use Cortex Code in commercial projects?

Yes, the Apache License 2.0 allows use in commercial projects. However, you are responsible for complying with the terms of service of any AI providers you use.

## Related Documentation

- [Getting Started](getting-started.md) - Installation and basic usage
- [User Guide](user-guide.md) - Detailed usage instructions
- [Configuration](configuration.md) - Setting up Cortex Code
- [CLI Reference](cli-reference.md) - Command-line interface details
- [Cloudflare Tunnel](cloudflare-tunnel.md) - Secure remote access configuration
