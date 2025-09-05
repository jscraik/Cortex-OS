#!/usr/bin/env bash
set -euo pipefail

# Ensure apt packages
sudo apt-get update
sudo apt-get install -y ripgrep universal-ctags hyperfine git-delta gitleaks

# Node-based CLIs are not installed globally to avoid version conflicts and permission issues.
# Use npx to run these tools, e.g.:
#   npx @ast-grep/cli <args>
#   npx jscodeshift <args>
#   npx sonar-scanner <args>
#   npx @withgraphite/graphite-cli <args>

# Install semgrep via pip
pip install semgrep

# Install CodeQL CLI
CODEQL_VERSION="2.17.3"
CODEQL_URL="https://github.com/github/codeql-cli-binaries/releases/download/v${CODEQL_VERSION}/codeql-linux64.zip"
if [ ! -x /usr/local/bin/codeql ]; then
  curl -L "$CODEQL_URL" -o /tmp/codeql.zip
  unzip -o /tmp/codeql.zip -d /opt
  ln -sf /opt/codeql/codeql /usr/local/bin/codeql
fi

# Install Sourcegraph CLI
SRC_URL="https://sourcegraph.com/.api/src-cli/src_linux_amd64"
SRC_SHA256_URL="https://sourcegraph.com/.api/src-cli/src_linux_amd64.sha256"
SRC_BIN="/usr/local/bin/src"
curl -L "$SRC_URL" -o /tmp/src
curl -L "$SRC_SHA256_URL" -o /tmp/src.sha256
# The checksum file contains the hash and the filename, so we need to adjust it
(cd /tmp && sha256sum -c <(sed "s| .*|  src|" src.sha256))
if [ $? -eq 0 ]; then
  mv /tmp/src "$SRC_BIN"
  chmod +x "$SRC_BIN"
  rm /tmp/src.sha256
else
  echo "Checksum verification for Sourcegraph CLI failed!" >&2
  exit 1
fi
