#!/bin/bash

# Cortex Code Installation Script
# Inspired by OpenCode's installation approach

set -e

INSTALL_DIR="${CORTEX_INSTALL_DIR:-${XDG_BIN_DIR:-${HOME}/bin}}"
BINARY_NAME="cortex-code"
REPO_URL="https://github.com/cortex-os/cortex-os"
LATEST_RELEASE_URL="$REPO_URL/releases/latest"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() {
    echo -e "${BLUE}INFO:${NC} $1"
}

success() {
    echo -e "${GREEN}SUCCESS:${NC} $1"
}

warn() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

error() {
    echo -e "${RED}ERROR:${NC} $1"
    exit 1
}

# Detect platform
detect_platform() {
    local arch=$(uname -m)
    local os=$(uname -s)

    case $arch in
        x86_64) arch="x86_64" ;;
        arm64|aarch64) arch="aarch64" ;;
        *) error "Unsupported architecture: $arch" ;;
    esac

    case $os in
        Darwin) os="apple-darwin" ;;
        Linux) os="unknown-linux-musl" ;;
        *) error "Unsupported operating system: $os" ;;
    esac

    echo "${arch}-${os}"
}

# Check if required tools are installed
check_dependencies() {
    info "Checking dependencies..."

    if ! command -v curl >/dev/null 2>&1; then
        error "curl is required but not installed"
    fi

    if ! command -v tar >/dev/null 2>&1; then
        error "tar is required but not installed"
    fi

    success "All dependencies found"
}

# Create install directory
create_install_dir() {
    info "Install directory: $INSTALL_DIR"

    if [[ ! -d "$INSTALL_DIR" ]]; then
        if mkdir -p "$INSTALL_DIR" 2>/dev/null; then
            success "Created install directory: $INSTALL_DIR"
        else
            error "Failed to create install directory: $INSTALL_DIR"
        fi
    fi

    if [[ ! -w "$INSTALL_DIR" ]]; then
        error "Install directory is not writable: $INSTALL_DIR"
    fi
}

# Download and install binary
install_binary() {
    local platform=$(detect_platform)
    local download_url

    info "Detecting platform: $platform"

    # Get latest release download URL
    info "Fetching latest release information..."

    # For now, we'll use a placeholder. In production, this would fetch from GitHub releases
    download_url="$REPO_URL/releases/download/v0.1.0/cortex-code-${platform}.tar.gz"

    info "Downloading from: $download_url"

    local temp_dir=$(mktemp -d)
    local archive_path="$temp_dir/cortex-code.tar.gz"

    if curl -L -o "$archive_path" "$download_url"; then
        success "Downloaded successfully"
    else
        error "Failed to download from $download_url"
    fi

    info "Extracting archive..."
    if tar -xzf "$archive_path" -C "$temp_dir"; then
        success "Extracted successfully"
    else
        error "Failed to extract archive"
    fi

    # Find the binary in the extracted files
    local binary_path
    if [[ -f "$temp_dir/cortex-code" ]]; then
        binary_path="$temp_dir/cortex-code"
    elif [[ -f "$temp_dir/cortex-code-${platform}" ]]; then
        binary_path="$temp_dir/cortex-code-${platform}"
    else
        error "Could not find binary in extracted archive"
    fi

    info "Installing binary to $INSTALL_DIR/$BINARY_NAME"
    if cp "$binary_path" "$INSTALL_DIR/$BINARY_NAME" && chmod +x "$INSTALL_DIR/$BINARY_NAME"; then
        success "Binary installed successfully"
    else
        error "Failed to install binary"
    fi

    # Cleanup
    rm -rf "$temp_dir"
}

# Setup initial configuration
setup_config() {
    info "Setting up initial configuration..."

    local config_dir="${XDG_CONFIG_HOME:-$HOME/.config}/cortex-code"
    mkdir -p "$config_dir"

    if [[ ! -f "$config_dir/config.toml" ]]; then
        cat > "$config_dir/config.toml" << 'EOF'
[app]
theme = "default"
log_level = "info"
auto_save_interval = 30
enable_telemetry = false

[providers]
default = "openai"

[providers.openai]
model = "gpt-4"
temperature = 0.7

[webui]
enabled = true
port = 3000
host = "127.0.0.1"
cors_enabled = true

[server]
daemon_mode = false
port = 8080
hot_reload = false

# Cloudflare tunnel configuration
[server.cloudflare]
tunnel_name = "cortex-code"
auto_start = false
health_checks = true
# tunnel_token = "your-tunnel-token-here"  # Add your token
# domain = "your-custom-domain.com"       # Optional custom domain

[dev]
enabled = false
file_watching = false
performance_monitoring = false
debug_endpoints = false
EOF
        success "Created default configuration at $config_dir/config.toml"
    else
        info "Configuration file already exists"
    fi
}

# Check if install directory is in PATH
check_path() {
    if echo "$PATH" | grep -q "$INSTALL_DIR"; then
        success "Install directory is in PATH"
    else
        warn "Install directory is not in PATH"
        echo ""
        echo "To use cortex-code from anywhere, add this to your shell profile:"
        echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
        echo ""
        echo "For bash users: echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> ~/.bashrc"
        echo "For zsh users:  echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> ~/.zshrc"
        echo ""
    fi
}

# Main installation function
main() {
    echo "Cortex Code Installation Script"
    echo "==============================="
    echo ""

    check_dependencies
    create_install_dir

    # For development, we'll build from source
    if [[ -f "Cargo.toml" ]] && command -v cargo >/dev/null 2>&1; then
        info "Building from source..."
        cargo build --release
        if cp target/release/cortex-code "$INSTALL_DIR/$BINARY_NAME"; then
            success "Built and installed from source"
        else
            error "Failed to install from source"
        fi
    else
        install_binary
    fi

    setup_config
    check_path

    echo ""
    success "Cortex Code installation completed!"
    echo ""
    echo "Next steps:"
    echo "1. Add your API keys to the configuration file"
    echo "2. Run 'cortex-code --help' to get started"
    echo "3. Run 'cortex-code' to launch the TUI interface"
    echo ""
    echo "🌐 Remote Access with Cloudflare Tunnels:"
    echo "4. Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    echo "5. Run 'cortex-code tunnel setup' to configure remote access"
    echo "6. Edit config file to add your tunnel token"
    echo "7. Enable WebUI and tunnel auto-start in config"
    echo ""
}

# Run main function
main "$@"
