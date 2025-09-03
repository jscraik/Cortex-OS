#!/bin/bash
# GitHub Apps Diagnostic and Setup Script
# Load central port registry
PORTS_FILE="/Users/jamiecraik/.Cortex-OS/config/ports.env"
if [ -f "$PORTS_FILE" ]; then
    # shellcheck source=/dev/null
    . "$PORTS_FILE"
else
    MCP_PORT=${MCP_PORT:-3000}
    GITHUB_AI_PORT=${GITHUB_AI_PORT:-3001}
    SEMGREP_PORT=${SEMGREP_PORT:-3002}
    STRUCTURE_PORT=${STRUCTURE_PORT:-3003}
fi


echo "🔍 GitHub Apps Diagnostic Report"
echo "================================="
echo
echo "📘 Port registry (expected):"
echo "  MCP:           ${MCP_PORT}"
echo "  GitHub AI:     ${GITHUB_AI_PORT}"
echo "  Semgrep:       ${SEMGREP_PORT}"
echo "  Structure:     ${STRUCTURE_PORT}"
echo

# Check if processes are running
echo "📊 Process Status:"
echo "-------------------"
if pgrep -f "cortex.*github" > /dev/null; then
    echo "✅ GitHub app processes found:"
    pgrep -fl "cortex.*github"
else
    echo "❌ No GitHub app processes running"
fi
echo

# Check ports
echo "📡 Port Status:"
echo "---------------"
for port in "$GITHUB_AI_PORT" "$SEMGREP_PORT" "$STRUCTURE_PORT"; do
    if lsof -i :$port > /dev/null 2>&1; then
        echo "✅ Port $port: $(lsof -i :$port | tail -1 | awk '{print $1}')"
    else
        echo "❌ Port $port: Not in use"
    fi
done
echo

# Check environment files
echo "⚙️ Configuration Status:"
echo "------------------------"
for app in cortex-ai-github cortex-semgrep-github cortex-structure-github; do
    env_file="/Users/jamiecraik/.Cortex-OS/packages/$app/.env"
    if [ -f "$env_file" ]; then
        echo "✅ $app: .env exists"
    else
        echo "❌ $app: .env missing"
        echo "   Example: /Users/jamiecraik/.Cortex-OS/packages/$app/.env.example"
    fi
done
echo

# Check if built
echo "🏗️ Build Status:"
echo "----------------"
for app in cortex-ai-github cortex-semgrep-github cortex-structure-github; do
    dist_dir="/Users/jamiecraik/.Cortex-OS/packages/$app/dist"
    if [ -d "$dist_dir" ]; then
        echo "✅ $app: Built (dist/ exists)"
    else
        echo "❌ $app: Not built"
    fi
done
echo

# Recommendations
echo "💡 Recommendations:"
echo "-------------------"
echo "1. Create .env files for each app with required variables"
echo "2. Build the apps: pnpm run build"
echo "3. Start the apps manually or create startup scripts"
echo "4. Register actual GitHub Apps with webhooks"
echo "5. Configure webhook URLs to point to the running servers"
echo

echo "🔧 Quick Start Commands:"
echo "------------------------"
echo "# Create environment files:"
echo "cp packages/cortex-ai-github/.env.example packages/cortex-ai-github/.env"
echo "cp packages/cortex-semgrep-github/.env.example packages/cortex-semgrep-github/.env"
echo "cp packages/cortex-structure-github/.env.example packages/cortex-structure-github/.env"
echo
echo "# Build all apps:"
echo "cd packages/cortex-ai-github && pnpm build"
echo "cd packages/cortex-semgrep-github && pnpm build"
echo "cd packages/cortex-structure-github && pnpm build"
echo
echo "# Start apps (in separate terminals):"
echo "cd packages/cortex-ai-github && pnpm dev"
echo "cd packages/cortex-semgrep-github && pnpm dev"
echo "cd packages/cortex-structure-github && pnpm dev"
