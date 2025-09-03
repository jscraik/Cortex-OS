#!/bin/bash
set -euo pipefail

echo "🦀 Building Cortex Code..."

# Build for current platform
cargo build --release

echo "✅ Build complete!"

# Create symlink for easy access
mkdir -p ../../bin
ln -sf "../apps/cortex-code/target/release/cortex-code" ../../bin/cortex-code

echo "🔗 Created symlink at bin/cortex-code"

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

echo "🎉 Cortex Code is ready to use!"
echo "   Run: ./bin/cortex-code --help"
