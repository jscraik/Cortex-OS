#!/bin/bash
set -euo pipefail

echo "🦀 Building Cortex TUI..."

# Build for current platform
cargo build --release

echo "✅ Build complete!"

# Create symlink for easy access
mkdir -p ../../bin
ln -sf "../apps/cortex-tui/target/release/cortex-tui" ../../bin/cortex-tui

echo "🔗 Created symlink at bin/cortex-tui"

# Run tests if --test flag is provided
if [[ "${1:-}" == "--test" ]]; then
    echo "🧪 Running tests..."
    cargo test
    echo "✅ All tests passed!"
fi

# Check if config example exists in user's home
if [[ ! -f "$HOME/.cortex/config.toml" ]]; then
    echo "⚠️  No config found at ~/.cortex/config.toml"
    echo "📋 Copy config.toml.example to ~/.cortex/config.toml to get started"
fi

echo "🎉 Cortex TUI is ready to use!"
echo "   Run: ./bin/cortex-tui --help"