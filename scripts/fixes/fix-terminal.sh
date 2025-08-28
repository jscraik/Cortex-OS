#!/bin/bash
# Terminal Fix Script
# Run this script to resolve sudo terminal issues

echo "=== Cortex-OS Terminal Fix Script ==="
echo "This script will help resolve sudo terminal issues"
echo ""

# Check current user and sudo status
echo "Current user: $(whoami)"
echo "Checking sudo configuration..."

# Check if user can run sudo without password for development commands
if sudo -n true 2>/dev/null; then
    echo "✓ Sudo access available without password prompt"
else
    echo "⚠ Sudo requires password - this may cause terminal blocks"
    echo ""
    echo "To fix this for development, you can:"
    echo "1. Add your user to sudo group with NOPASSWD for specific commands"
    echo "2. Or run: sudo visudo and add a line like:"
    echo "   $USER ALL=(ALL) NOPASSWD: /usr/local/bin/node, /usr/local/bin/pnpm, /usr/bin/rm, /usr/bin/mv"
    echo ""
fi

# Check shell configuration
echo "Current shell: $SHELL"
echo "Checking shell configuration files..."

# Check for problematic shell configurations
if [ -f ~/.bashrc ]; then
    if grep -q "sudo" ~/.bashrc; then
        echo "⚠ Found sudo configuration in ~/.bashrc"
        echo "This might be causing automatic sudo prompts"
    fi
fi

if [ -f ~/.zshrc ]; then
    if grep -q "sudo" ~/.zshrc; then
        echo "⚠ Found sudo configuration in ~/.zshrc"
        echo "This might be causing automatic sudo prompts"
    fi
fi

# Check if we're in a container or restricted environment
if [ -f /.dockerenv ] || [ -n "$CONTAINER" ]; then
    echo "⚠ Running in container environment"
    echo "Container restrictions may require sudo for file operations"
fi

echo ""
echo "=== Recommended Solutions ==="
echo ""
echo "Option 1: Fix sudo configuration"
echo "  sudo visudo"
echo "  Add: $USER ALL=(ALL) NOPASSWD: ALL"
echo ""
echo "Option 1b: Opt-in to sudo for MLX probes"
echo "  # Most Cortex-OS system probes avoid sudo by default to prevent prompts."
echo "  # To allow sudo non-interactively for powermetrics, set:"
echo "  export CORTEX_ALLOW_SUDO=true"
echo ""
echo "Option 2: Use a different terminal session"
echo "  - Close current VS Code terminal"
echo "  - Open new integrated terminal"
echo "  - Try running commands without sudo prefix"
echo ""
echo "Option 3: Check VS Code terminal settings"
echo "  - Go to VS Code Settings"
echo "  - Search for 'terminal.integrated.shell.linux'"
echo "  - Ensure it's set to your preferred shell without sudo wrapper"
echo ""
echo "Option 4: Run VS Code with proper permissions"
echo "  - Close VS Code"
echo "  - Start VS Code with: code --user-data-dir=/tmp/vscode-user"
echo ""

# Test basic commands without sudo
echo "Testing basic commands..."
echo "Current directory: $(pwd)"
echo "Node version: $(node --version 2>/dev/null || echo 'Node not found')"
echo "PNPM version: $(pnpm --version 2>/dev/null || echo 'PNPM not found')"

echo ""
echo "=== Fix Complete ==="
echo "Try running your commands again in a new terminal session"
