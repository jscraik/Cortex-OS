#!/usr/bin/env bash
set -euo pipefail

# Allow opt-out to be respected when invoked indirectly by tooling
if [ "${CORTEX_EFFICIENCY_SETUP_SKIP:-}" = "1" ] || [ "${CORTEX_EFFICIENCY_SETUP_SKIP:-}" = "true" ]; then
  exit 0
fi

# Cross-platform installer for efficiency tools used in this repo.
# - Linux (Debian/Ubuntu): apt-get
# - macOS: Homebrew for packages, direct downloads where appropriate

SEMGREP_VERSION="1.62.0"
# Default CodeQL version; can be overridden by env var
CODEQL_VERSION="${CODEQL_VERSION:-2.23.0}"

uname_s="$(uname -s)" || uname_s=""
uname_m="$(uname -m)" || uname_m=""

log() { printf "\033[1;34m[install]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[warn]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[error]\033[0m %s\n" "$*"; }

# Helper: choose a bin dir that exists and is writable
choose_bindir() {
  for d in /usr/local/bin /opt/homebrew/bin /usr/bin; do
    if [ -d "$d" ] && [ -w "$d" ]; then
      echo "$d"; return 0;
    fi
  done
  # fallback to /usr/local/bin (may require sudo later)
  echo "/usr/local/bin"
}

BIN_DIR="$(choose_bindir)"

install_semgrep() {
  if command -v semgrep >/dev/null 2>&1; then
    log "semgrep already present: $(semgrep --version || true)"
    return 0
  fi
  log "Installing semgrep==${SEMGREP_VERSION} via pip"
  if command -v pipx >/dev/null 2>&1; then
    pipx install "semgrep==${SEMGREP_VERSION}" || true
  elif command -v pip3 >/dev/null 2>&1; then
    pip3 install "semgrep==${SEMGREP_VERSION}"
  elif command -v pip >/dev/null 2>&1; then
    pip install "semgrep==${SEMGREP_VERSION}"
  else
    warn "pip not found; attempting python3 -m pip"
    python3 -m pip install "semgrep==${SEMGREP_VERSION}"
  fi
}

install_codeql_linux() {
  local url="https://github.com/github/codeql-cli-binaries/releases/download/v${CODEQL_VERSION}/codeql-linux64.zip"
  local dest_zip="/tmp/codeql.zip"
  log "Installing CodeQL CLI ${CODEQL_VERSION} for Linux from ${url}"
  curl -fsSL "$url" -o "$dest_zip"
  sudo unzip -o "$dest_zip" -d /opt
  sudo ln -sf /opt/codeql/codeql /usr/local/bin/codeql
}

install_codeql_macos() {
  # macOS release asset is named osx64; it contains the macOS build (works on Intel and Apple Silicon).
  local url="https://github.com/github/codeql-cli-binaries/releases/download/v${CODEQL_VERSION}/codeql-osx64.zip"
  local dest_zip="/tmp/codeql.zip"
  log "Installing CodeQL CLI ${CODEQL_VERSION} for macOS from ${url}"
  curl -fsSL "$url" -o "$dest_zip"
  sudo unzip -o "$dest_zip" -d /opt
  # Symlink into a sensible bin dir if writable, else fallback to /usr/local/bin with sudo
  if ln -sf /opt/codeql/codeql "${BIN_DIR}/codeql" 2>/dev/null; then
    :
  else
    sudo ln -sf /opt/codeql/codeql /usr/local/bin/codeql
  fi
}

install_src_linux() {
  local SRC_URL="https://sourcegraph.com/.api/src-cli/src_linux_amd64"
  local SRC_SHA256_URL="https://sourcegraph.com/.api/src-cli/src_linux_amd64.sha256"
  local SRC_TMP="/tmp/src"
  local SRC_SHA="/tmp/src.sha256"
  local SRC_BIN="/usr/local/bin/src"
  log "Installing Sourcegraph src CLI for Linux"
  curl -fsSL "$SRC_URL" -o "$SRC_TMP"
  curl -fsSL "$SRC_SHA256_URL" -o "$SRC_SHA"
  (cd /tmp && sha256sum -c <(sed "s| .*|  src|" src.sha256))
  sudo mv "$SRC_TMP" "$SRC_BIN"
  sudo chmod +x "$SRC_BIN"
  rm -f "$SRC_SHA"
}

install_src_macos() {
  if command -v brew >/dev/null 2>&1; then
    log "Installing Sourcegraph src CLI via Homebrew"
    brew install sourcegraph/src-cli/src-cli || true
    return 0
  fi
  # Fallback to direct download with arch-aware URL
  local arch="${uname_m}"
  case "$arch" in
    x86_64) arch_pkg="amd64" ;;
    arm64|aarch64) arch_pkg="arm64" ;;
    *) arch_pkg="amd64"; warn "Unknown macOS arch '$arch', defaulting to amd64" ;;
  esac
  local SRC_URL="https://sourcegraph.com/.api/src-cli/src_darwin_${arch_pkg}"
  local SRC_SHA256_URL="${SRC_URL}.sha256"
  local SRC_TMP="/tmp/src"
  local SRC_SHA="/tmp/src.sha256"
  local DEST="${BIN_DIR}/src"
  log "Installing Sourcegraph src CLI for macOS from ${SRC_URL}"
  curl -fsSL "$SRC_URL" -o "$SRC_TMP"
  curl -fsSL "$SRC_SHA256_URL" -o "$SRC_SHA"
  (cd /tmp && shasum -a 256 -c <(sed "s| .*|  src|" src.sha256))
  if mv "$SRC_TMP" "$DEST" 2>/dev/null; then
    chmod +x "$DEST"
  else
    sudo mv "$SRC_TMP" /usr/local/bin/src
    sudo chmod +x /usr/local/bin/src
  fi
  rm -f "$SRC_SHA"
}

install_linux() {
  if command -v apt-get >/dev/null 2>&1; then
    log "Using apt-get to install packages"
    sudo apt-get update
    sudo apt-get install -y ripgrep universal-ctags hyperfine git-delta gitleaks curl unzip
    # ast-grep via official Debian package if available, else curl installer
    if ! command -v ast-grep >/dev/null 2>&1; then
      if apt-cache show ast-grep >/dev/null 2>&1; then
        sudo apt-get install -y ast-grep || true
      else
        log "Installing ast-grep via official install script"
        curl -fsSL https://raw.githubusercontent.com/ast-grep/ast-grep/main/install.sh | bash -s -- -b "${BIN_DIR}" || true
      fi
    fi
  else
    err "This Linux distro is not using apt-get. Please install prerequisites manually: ripgrep universal-ctags hyperfine git-delta gitleaks curl unzip"
  fi
  install_semgrep
  if ! command -v codeql >/dev/null 2>&1; then install_codeql_linux; fi
  if ! command -v src >/dev/null 2>&1; then install_src_linux; fi
}

install_macos() {
  if command -v brew >/dev/null 2>&1; then
    log "Using Homebrew to install packages"
    brew update || true
    # Note: formula is git-delta (a.k.a. delta)
    brew install ripgrep universal-ctags hyperfine git-delta gitleaks curl unzip || true
    # Install ast-grep via Homebrew if available
    if ! command -v ast-grep >/dev/null 2>&1; then
      brew install ast-grep || true
    fi
  else
    warn "Homebrew not found. Consider installing Homebrew: https://brew.sh"
  fi
  install_semgrep
  if ! command -v codeql >/dev/null 2>&1; then install_codeql_macos; fi
  if ! command -v src >/dev/null 2>&1; then install_src_macos; fi
}

case "$uname_s" in
  Linux)
    install_linux
    ;;
  Darwin)
    install_macos
    ;;
  *)
    err "Unsupported OS: $uname_s"
    exit 1
    ;;
esac

log "Installation complete. Versions:"
command -v rg >/dev/null 2>&1 && rg --version | head -n1 || true
command -v ctags >/dev/null 2>&1 && ctags --version | head -n1 || true
command -v hyperfine >/dev/null 2>&1 && hyperfine --version || true
command -v delta >/dev/null 2>&1 && delta --version | head -n1 || true
command -v gitleaks >/dev/null 2>&1 && gitleaks version || true
command -v semgrep >/dev/null 2>&1 && semgrep --version || true
command -v ast-grep >/dev/null 2>&1 && ast-grep --version || true
command -v codeql >/dev/null 2>&1 && codeql --version || true
command -v src >/dev/null 2>&1 && src version || true
