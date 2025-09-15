#!/usr/bin/env bash
# Hook Doctor - Diagnostic utility for debugging git hook issues
# Usage: .husky/hook-doctor.sh [--verbose]

set -euo pipefail

VERBOSE="${1:-}"
DOCTOR_DIR="$(dirname -- "$0")"

echo "🩺 Hook Doctor - Git Hook Environment Diagnostics"
echo "=================================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    local status="$1"
    local message="$2"
    case $status in
        "ok")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "warn")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "error")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "info")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
    esac
}

check_basic_env() {
    echo "🔍 Basic Environment Checks"
    echo "----------------------------"
    
    print_status "info" "Shell: $0 (PID: $$)"
    print_status "info" "User: $(whoami)"
    print_status "info" "Working directory: $(pwd)"
    print_status "info" "HOME: ${HOME:-'(not set)'}"
    
    # Check if we're in a git repository
    if git rev-parse --git-dir >/dev/null 2>&1; then
        print_status "ok" "Git repository detected"
        print_status "info" "Git dir: $(git rev-parse --git-dir)"
        print_status "info" "Current branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'detached')"
    else
        print_status "error" "Not in a git repository"
        return 1
    fi
    
    echo
}

check_husky_config() {
    echo "🐶 Husky Configuration"
    echo "----------------------"
    
    # Check git hooks path
    local hooks_path
    hooks_path=$(git config core.hooksPath 2>/dev/null || echo "")
    if [ "$hooks_path" = ".husky/_" ]; then
        print_status "ok" "Git hooks path correctly set to .husky/_"
    elif [ -z "$hooks_path" ]; then
        print_status "warn" "Git hooks path not set (using default .git/hooks)"
    else
        print_status "warn" "Git hooks path set to: $hooks_path (expected .husky/_)"
    fi
    
    # Check .husky directory
    if [ -d ".husky" ]; then
        print_status "ok" ".husky directory exists"
        
        # Check individual hooks
        for hook in pre-commit commit-msg pre-push; do
            if [ -f ".husky/$hook" ]; then
                if [ -x ".husky/$hook" ]; then
                    print_status "ok" "$hook hook exists and is executable"
                else
                    print_status "warn" "$hook hook exists but is not executable"
                fi
            else
                print_status "info" "$hook hook not found (optional)"
            fi
        done
        
        # Check common.sh
        if [ -f ".husky/common.sh" ]; then
            print_status "ok" "common.sh exists"
            if [ "$VERBOSE" = "--verbose" ]; then
                echo "  Content preview:"
                head -5 .husky/common.sh | sed 's/^/    /'
            fi
        else
            print_status "warn" "common.sh not found"
        fi
    else
        print_status "error" ".husky directory not found"
    fi
    
    echo
}

check_node_environment() {
    echo "📦 Node.js Environment"
    echo "----------------------"
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        local node_version
        node_version=$(node --version)
        print_status "ok" "Node.js available: $node_version"
        
        # Check if version meets requirements (>=20)
        local major_version
        major_version=$(echo "$node_version" | sed 's/v\([0-9]*\).*/\1/')
        if [ "$major_version" -ge 20 ]; then
            print_status "ok" "Node.js version meets requirements (>=20)"
        else
            print_status "warn" "Node.js version may be too old (current: $major_version, required: >=20)"
        fi
    else
        print_status "error" "Node.js not found in PATH"
    fi
    
    # Check pnpm
    if command -v pnpm >/dev/null 2>&1; then
        local pnpm_version
        pnpm_version=$(pnpm --version)
        print_status "ok" "pnpm available: $pnpm_version"
        
        # Check pnpm home
        if [ -n "${PNPM_HOME:-}" ]; then
            print_status "ok" "PNPM_HOME set: $PNPM_HOME"
        else
            print_status "warn" "PNPM_HOME not set"
        fi
    else
        print_status "error" "pnpm not found in PATH"
        
        # Check for corepack
        if command -v corepack >/dev/null 2>&1; then
            print_status "info" "corepack available - may be able to enable pnpm"
        else
            print_status "warn" "corepack not available"
        fi
    fi
    
    # Check npm as fallback
    if command -v npm >/dev/null 2>&1; then
        local npm_version
        npm_version=$(npm --version)
        print_status "info" "npm available: $npm_version (fallback)"
    else
        print_status "warn" "npm not available"
    fi
    
    echo
}

check_development_tools() {
    echo "🛠️  Development Tools"
    echo "---------------------"
    
    # Essential tools for the hooks
    local tools=("git" "bash" "grep" "xargs" "wc" "timeout")
    local optional_tools=("semgrep" "ruff" "uv" "ast-grep")
    
    for tool in "${tools[@]}"; do
        if command -v "$tool" >/dev/null 2>&1; then
            if [ "$VERBOSE" = "--verbose" ]; then
                local version_info
                case $tool in
                    "git")
                        version_info=$(git --version)
                        ;;
                    "bash")
                        version_info=$(bash --version | head -1)
                        ;;
                    *)
                        version_info="$($tool --version 2>/dev/null | head -1 || echo 'version unknown')"
                        ;;
                esac
                print_status "ok" "$tool available: $version_info"
            else
                print_status "ok" "$tool available"
            fi
        else
            print_status "error" "$tool not found (required)"
        fi
    done
    
    for tool in "${optional_tools[@]}"; do
        if command -v "$tool" >/dev/null 2>&1; then
            if [ "$VERBOSE" = "--verbose" ]; then
                local version_info
                version_info="$($tool --version 2>/dev/null | head -1 || echo 'version unknown')"
                print_status "ok" "$tool available: $version_info"
            else
                print_status "ok" "$tool available"
            fi
        else
            print_status "info" "$tool not found (optional, some features may be skipped)"
        fi
    done
    
    echo
}

check_package_json() {
    echo "📋 Package Configuration"
    echo "------------------------"
    
    if [ -f "package.json" ]; then
        print_status "ok" "package.json exists"
        
        # Check for key scripts
        local scripts=("test:smart" "lint:smart" "typecheck:smart" "structure:validate" "security:scan")
        for script in "${scripts[@]}"; do
            if grep -q "\"$script\":" package.json 2>/dev/null; then
                print_status "ok" "Script '$script' defined"
            else
                print_status "info" "Script '$script' not defined (may use fallback)"
            fi
        done
        
        # Check lint-staged configuration
        if grep -q "\"lint-staged\":" package.json 2>/dev/null; then
            print_status "ok" "lint-staged configuration found"
        else
            print_status "warn" "lint-staged configuration not found"
        fi
        
        # Check husky dependency
        if grep -q "\"husky\":" package.json 2>/dev/null; then
            print_status "ok" "husky dependency found"
        else
            print_status "warn" "husky dependency not found"
        fi
    else
        print_status "error" "package.json not found"
    fi
    
    echo
}

test_common_sh() {
    echo "🧪 Testing common.sh Bootstrap"
    echo "------------------------------"
    
    if [ -f ".husky/common.sh" ]; then
        # Test sourcing common.sh
        if source ".husky/common.sh" 2>/dev/null; then
            print_status "ok" "common.sh sources successfully"
            
            # Test pnpm availability after sourcing
            if command -v pnpm >/dev/null 2>&1; then
                print_status "ok" "pnpm available after sourcing common.sh"
            else
                print_status "warn" "pnpm still not available after sourcing common.sh"
            fi
        else
            print_status "error" "Failed to source common.sh"
        fi
    else
        print_status "warn" "common.sh not found - cannot test bootstrap"
    fi
    
    echo
}

check_git_status() {
    echo "📊 Git Status Information"
    echo "-------------------------"
    
    # Check if there are staged files
    local staged_files
    staged_files=$(git diff --cached --name-only 2>/dev/null || true)
    if [ -n "$staged_files" ]; then
        local count
        count=$(echo "$staged_files" | wc -l | tr -d ' ')
        print_status "info" "$count staged files found"
        if [ "$VERBOSE" = "--verbose" ]; then
            echo "  Staged files:"
            echo "$staged_files" | head -10 | sed 's/^/    /'
            if [ "$count" -gt 10 ]; then
                echo "    ... and $((count - 10)) more"
            fi
        fi
    else
        print_status "info" "No staged files"
    fi
    
    # Check if there are modified files
    local modified_files
    modified_files=$(git diff --name-only 2>/dev/null || true)
    if [ -n "$modified_files" ]; then
        local count
        count=$(echo "$modified_files" | wc -l | tr -d ' ')
        print_status "info" "$count modified files found"
    else
        print_status "info" "No modified files"
    fi
    
    echo
}

run_hook_simulation() {
    echo "🎯 Hook Simulation Test"
    echo "-----------------------"
    
    if [ -f ".husky/pre-commit" ]; then
        print_status "info" "Testing pre-commit hook syntax..."
        if bash -n ".husky/pre-commit" 2>/dev/null; then
            print_status "ok" "pre-commit hook syntax is valid"
        else
            print_status "error" "pre-commit hook has syntax errors"
        fi
    fi
    
    if [ -f ".husky/pre-push" ]; then
        print_status "info" "Testing pre-push hook syntax..."
        if bash -n ".husky/pre-push" 2>/dev/null; then
            print_status "ok" "pre-push hook syntax is valid"
        else
            print_status "error" "pre-push hook has syntax errors"
        fi
    fi
    
    echo
}

print_summary() {
    echo "📝 Summary and Recommendations"
    echo "==============================="
    
    echo
    echo "Common Issues and Solutions:"
    echo
    echo "1. 'pnpm: command not found'"
    echo "   • Run: source .husky/common.sh"
    echo "   • Check PNPM_HOME is in PATH"
    echo "   • Install pnpm: npm install -g pnpm"
    echo
    echo "2. 'Hook failed with exit code X'"
    echo "   • Check specific tool versions and availability"
    echo "   • Use bypass flags for emergency commits:"
    echo "     CORTEX_SKIP_PRECOMMIT=1 git commit"
    echo "     CORTEX_SKIP_PREPUSH=1 git push"
    echo
    echo "3. 'Permission denied' errors"
    echo "   • Run: chmod +x .husky/*"
    echo "   • Check hooks are executable"
    echo
    echo "4. Hook environment differs from terminal"
    echo "   • Hooks run in minimal environment"
    echo "   • common.sh should handle PATH setup"
    echo "   • Test with: env -i bash -l -c 'cd $(pwd) && .husky/hook-doctor.sh'"
    echo
    echo "Environment Variables for Debugging:"
    echo "  CORTEX_SKIP_PRECOMMIT=1    # Skip all pre-commit checks"
    echo "  CORTEX_SKIP_HOOK_TESTS=1   # Skip tests in pre-commit"
    echo "  CORTEX_SKIP_PREPUSH=1      # Skip all pre-push checks"
    echo "  CORTEX_SKIP_PUSH_TESTS=1   # Skip tests in pre-push"
    echo
}

# Main execution
main() {
    check_basic_env
    check_husky_config
    check_node_environment
    check_development_tools
    check_package_json
    test_common_sh
    check_git_status
    run_hook_simulation
    print_summary
    
    echo "🏁 Hook Doctor diagnosis complete!"
    echo
    echo "To run a comprehensive test:"
    echo "  .husky/hook-doctor.sh --verbose"
    echo
    echo "To test hooks in minimal environment:"
    echo "  env -i bash -l -c 'cd \$(pwd) && .husky/hook-doctor.sh'"
}

main "$@"
