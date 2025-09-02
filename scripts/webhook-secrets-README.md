# GitHub App Webhook Secret Management

This directory contains tools for managing webhook secrets for GitHub Apps in the Cortex-OS ecosystem.

## Quick Start

```bash
# Generate a secret for the Semgrep app
./scripts/webhook-secret semgrep

# Generate and export shell command for Insula app
./scripts/webhook-secret insula --export

# Generate base64 secret with custom length
./scripts/webhook-secret ai --base64 --length 32

# Generate secrets for all apps and save to .env files
./scripts/webhook-secret all --save
```

## Available Apps

| App | Description | Environment Variable |
|-----|-------------|---------------------|
| `ai` | AI-powered code analysis and suggestions | `WEBHOOK_SECRET` |
| `semgrep` | Static security analysis with Semgrep | `SEMGREP_WEBHOOK_SECRET` |
| `structure` | Repository structure validation and organization | `WEBHOOK_SECRET` |
| `insula` | Advanced repository management and automation | `INSULA_WEBHOOK_SECRET` |

## Scripts

### `webhook-secret` (Main Script)

```bash
Usage: ./scripts/webhook-secret [options] [app]

Options:
  --length, -l <number>    Secret length in bytes (default: 64)
  --base64, -b            Generate base64 encoded secret instead of hex
  --save, -s              Save to .env files in app packages
  --export, -e            Export as shell commands
  --help, -h              Show this help
```

### `generate-webhook-secret.cjs` (Core Implementation)

Node.js script that handles the actual secret generation and management.

## Examples

### 1. Generate Secret for Semgrep App

```bash
./scripts/webhook-secret semgrep
```

Output:

```text
🔐 GitHub App Webhook Secret Generator

🔑 Cortex Semgrep GitHub App
Description: Static security analysis with Semgrep
Environment Variable: SEMGREP_WEBHOOK_SECRET
Secret (hex): 0bc7c0e52e24d2b2efd505078910debe...
```

### 2. Generate and Export for Environment Setup

```bash
./scripts/webhook-secret insula --export
```

Output:

```text
🔑 Insula GitHub App
Description: Advanced repository management and automation
Environment Variable: INSULA_WEBHOOK_SECRET
Secret (hex): c8228973ef9f0fb9bdc205e3162084865...
Export command: export INSULA_WEBHOOK_SECRET="c8228973ef9f0fb9bdc205e3162084865..."
```

### 3. Generate Base64 Secret with Custom Length

```bash
./scripts/webhook-secret ai --base64 --length 32
```

Output:

```text
🔑 Cortex AI GitHub App
Description: AI-powered code analysis and suggestions
Environment Variable: WEBHOOK_SECRET
Secret (base64): 2U3NI3ILgZXZyRodb2r2Y8Z5FlIjoVeOWDdzEXBrKb8=
```

### 4. Generate All Secrets and Save to .env Files

```bash
./scripts/webhook-secret all --save
```

This will:

- Generate secrets for all GitHub Apps
- Automatically save them to the respective `.env` files in each app package
- Create or update existing `.env` files

## Security Best Practices

1. **Keep Secrets Secure**: Never commit webhook secrets to version control
2. **Environment Separation**: Use different secrets for dev, staging, and production
3. **Regular Rotation**: Rotate secrets periodically for enhanced security
4. **Consistent Configuration**: Ensure the same secret is used in both your app and GitHub webhook settings

## Integration with GitHub Apps

### Setting Up Webhook Secrets

1. **Generate Secret**:

   ```bash
   ./scripts/webhook-secret semgrep --export
   ```

2. **Set Environment Variable**:

   ```bash
   export SEMGREP_WEBHOOK_SECRET="your_generated_secret_here"
   ```

3. **Configure GitHub App**:
   - Go to your GitHub App settings
   - Navigate to "Webhook" section
   - Enter the same secret in the "Webhook secret" field

### Webhook URLs

| App | Webhook URL |
|-----|-------------|
| AI | `https://insula-ai.brainwav.io/webhook` |
| Semgrep | `https://semgrep-github.brainwav.io/webhook` |
| Structure | `https://insula-github.brainwav.io/webhook` |
| Insula | `https://insula-insula.brainwav.io/webhook` |

## Troubleshooting

### Common Issues

1. **Permission Denied**:

   ```bash
   chmod +x ./scripts/webhook-secret
   ```

2. **Node.js Not Found**:

   ```bash
   # Install Node.js via your package manager
   brew install node  # macOS
   ```

3. **ES Module Errors**:
   The script uses CommonJS (`.cjs` extension) to avoid ES module conflicts.

### Environment Variables

Check current webhook secrets:

```bash
# For Semgrep
echo $SEMGREP_WEBHOOK_SECRET

# For AI
echo $WEBHOOK_SECRET

# For Insula  
echo $INSULA_WEBHOOK_SECRET
```

### Validation

Test webhook secret with curl:

```bash
# Test webhook endpoint (should return "Unauthorized" without proper signature)
curl -s -X POST https://semgrep-github.brainwav.io/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## Files

- `scripts/webhook-secret` - Main executable wrapper script
- `scripts/generate-webhook-secret.cjs` - Core Node.js implementation
- `scripts/webhook-secrets/README.md` - This documentation

## Contributing

When adding new GitHub Apps:

1. Update the `APPS` object in `generate-webhook-secret.cjs`
2. Add the new app to this README documentation
3. Update webhook URL mappings
4. Test secret generation for the new app
