#!/usr/bin/env bash
# brAInwav 1Password Session Setup
# Sets up persistent 1Password CLI session to prevent repeated auth prompts
#
# Co-authored-by: brAInwav Development Team <dev@brainwav.dev>

set -euo pipefail

echo "🔐 brAInwav 1Password Session Setup"
echo ""

# Check if 1Password CLI is installed
if ! command -v op &> /dev/null; then
    echo "❌ 1Password CLI not installed"
    echo "   Install from: https://developer.1password.com/docs/cli/get-started/"
    exit 1
fi

echo "✅ 1Password CLI installed: $(op --version)"
echo ""

# Check if already signed in
if op whoami &> /dev/null; then
    ACCOUNT=$(op whoami)
    echo "✅ Already signed in to: $ACCOUNT"
    echo ""
    echo "Session is active. You're all set!"
    exit 0
fi

echo "🔑 Setting up 1Password session..."
echo ""
echo "Choose your authentication method:"
echo "  1) Service Account Token (recommended for dev - no prompts)"
echo "  2) Interactive Sign-In (requires biometric/password)"
echo ""
read -p "Enter choice [1-2]: " CHOICE

case $CHOICE in
    1)
        echo ""
        echo "📝 Service Account Setup:"
        echo "   1. Go to https://start.1password.com/settings/serviceaccounts"
        echo "   2. Create a new service account token"
        echo "   3. Grant it 'Read Items in Vault' permission for 'brAInwav Development'"
        echo ""
        read -sp "Paste your service account token: " TOKEN
        echo ""
        
        if [ -z "$TOKEN" ]; then
            echo "❌ No token provided"
            exit 1
        fi
        
        # Add to shell profile
        SHELL_CONFIG=""
        if [ -f "$HOME/.zshrc" ]; then
            SHELL_CONFIG="$HOME/.zshrc"
        elif [ -f "$HOME/.bashrc" ]; then
            SHELL_CONFIG="$HOME/.bashrc"
        fi
        
        if [ -n "$SHELL_CONFIG" ]; then
            echo "" >> "$SHELL_CONFIG"
            echo "# brAInwav 1Password Service Account" >> "$SHELL_CONFIG"
            echo "export OP_SERVICE_ACCOUNT_TOKEN=\"$TOKEN\"" >> "$SHELL_CONFIG"
            echo ""
            echo "✅ Added OP_SERVICE_ACCOUNT_TOKEN to $SHELL_CONFIG"
            echo ""
            echo "Run: source $SHELL_CONFIG"
            echo "Or restart your terminal"
        else
            echo "⚠️  Could not detect shell config file"
            echo "   Add this to your shell profile:"
            echo "   export OP_SERVICE_ACCOUNT_TOKEN=\"$TOKEN\""
        fi
        ;;
        
    2)
        echo ""
        echo "🔐 Interactive Sign-In:"
        echo ""
        
        # Enable biometric unlock if on macOS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo "Setting up biometric unlock..."
            op biometric set || echo "⚠️  Biometric setup skipped"
        fi
        
        # Sign in
        eval $(op signin)
        
        if op whoami &> /dev/null; then
            ACCOUNT=$(op whoami)
            echo ""
            echo "✅ Signed in to: $ACCOUNT"
            echo ""
            echo "💡 To persist session across terminal windows, add to your shell profile:"
            echo "   eval \$(op signin --account $ACCOUNT)"
        else
            echo "❌ Sign-in failed"
            exit 1
        fi
        ;;
        
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Test your configuration with:"
echo "  op whoami"
echo "  pnpm license-manager info"
