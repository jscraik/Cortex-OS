# Probely CLI Integration

This repo is configured to work with Probely CLI for web application security testing alongside Semgrep and Snyk.

## Prerequisites

### Install Probely CLI
```bash
# Install via pip
pip install probely-cli

# Or via npm
npm install -g @probely/cli

# Or download from releases
curl -L -o probely https://github.com/Probely/probely-cli/releases/latest/download/probely-$(uname -s)-$(uname -m)
chmod +x probely && sudo mv probely /usr/local/bin/
```

### Authentication
1. Get an API Key from [Probely Web App](https://plus.probely.app/)
   - Sign in to your account
   - Generate an API Key (treat as password)
2. Configure authentication using one of:

#### Option A: Config file (recommended)
```bash
# Set your API key as an environment variable
export PROBELY_API_KEY="your_api_key_here"

# Use the provided script to create config securely
pnpm security:probely:config
```

#### Option B: Environment variable
```bash
export PROBELY_API_KEY="your_api_key_here"
```

#### Option C: Command line
```bash
probely targets get --api-key "your_api_key_here"
```

## Usage Scripts

### Quick Commands
- **Test authentication:**
  ```bash
  pnpm security:probely:targets
  ```
- **Setup config from env var:**
  ```bash
  pnpm security:probely:config
  ```

### Common CLI Operations
```bash
# List all targets
probely targets get

# Get target details
probely targets get --target-id <TARGET_ID>

# List scans for a target
probely scans get --target-id <TARGET_ID>

# Start a new scan
probely scans run --target-id <TARGET_ID>

# Get scan results
probely scans get --scan-id <SCAN_ID>

# Export findings (JSON format)
probely findings export --target-id <TARGET_ID> --format json
```

### CI Integration
```bash
# In your CI pipeline, set PROBELY_API_KEY as a secret
# Then configure and run scans:
pnpm security:probely:config
probely scans run --target-id "$TARGET_ID" --wait
probely findings export --target-id "$TARGET_ID" --format json > reports/probely-findings.json
```

## Security Notes
- The config file (`~/.probely/config`) is created with restricted permissions (600)
- API keys should be stored as CI secrets, not committed to code
- Config file location: `~/.probely/config` (user home directory, not in repo)

## Troubleshooting
- **"command not found: probely"**: Install the Probely CLI first
- **Authentication errors**: Verify your API key is valid and has proper permissions
- **No targets found**: Ensure you have targets configured in your Probely account

## Integration with Security Pipeline
This integrates with your existing security tools:
- **Semgrep**: Static analysis (SAST) - `pnpm security:scan:ci`
- **Snyk**: Dependencies + code + IaC - `pnpm security:snyk:ci`
- **Probely**: Web app security (DAST) - via CLI commands above

For a complete security scan, run all three tools and aggregate reports in `reports/`.
