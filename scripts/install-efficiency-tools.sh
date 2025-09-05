#!/usr/bin/env bash
set -euo pipefail

# Ensure apt packages
sudo apt-get update
sudo apt-get install -y ripgrep universal-ctags hyperfine git-delta gitleaks

# Install Node-based CLIs
npm install -g @ast-grep/cli jscodeshift sonar-scanner @withgraphite/graphite-cli

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
curl -L https://sourcegraph.com/.api/src-cli/src_linux_amd64 -o /usr/local/bin/src
chmod +x /usr/local/bin/src
