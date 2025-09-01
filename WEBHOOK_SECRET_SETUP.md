# Webhook Secret Management - Quick Setup Guide

## ✅ What's Created

1. **Main Script**: `./scripts/webhook-secret` - Executable wrapper
2. **Core Implementation**: `./scripts/generate-webhook-secret.cjs` - Node.js generator
3. **Documentation**:
   - `./scripts/webhook-secrets-README.md` - Detailed guide
   - `./docs/github-apps-commands.md` - @ commands reference

## 🚀 Quick Usage

### Generate Individual Secrets

```bash
# For Semgrep app
./scripts/webhook-secret semgrep

# For Insula app (advanced automation)
./scripts/webhook-secret insula --export

# For Structure Guard
./scripts/webhook-secret structure

# For AI Assistant
./scripts/webhook-secret ai --base64
```

### Generate All Secrets

```bash
# Generate all with export commands
./scripts/webhook-secret all --export

# Generate all and save to .env files
./scripts/webhook-secret all --save
```

## 🔧 Available Apps

| App | Command | Environment Variable | Purpose |
|-----|---------|---------------------|---------|
| **semgrep** | `./scripts/webhook-secret semgrep` | `SEMGREP_WEBHOOK_SECRET` | Static security analysis |
| **insula** | `./scripts/webhook-secret insula` | `INSULA_WEBHOOK_SECRET` | Advanced repo automation |
| **structure** | `./scripts/webhook-secret structure` | `WEBHOOK_SECRET` | Structure validation |
| **ai** | `./scripts/webhook-secret ai` | `WEBHOOK_SECRET` | AI code analysis |

## 📋 Example Output

```bash
$ ./scripts/webhook-secret semgrep --export

🔐 GitHub App Webhook Secret Generator

🔑 Cortex Semgrep GitHub App
Description: Static security analysis with Semgrep
Environment Variable: SEMGREP_WEBHOOK_SECRET
Secret (hex): eecb6e6760f354315bb3b4cde2d6084cc645044a...
Export command: export SEMGREP_WEBHOOK_SECRET="eecb6e6760f354315bb3b4cde2d6084cc645044a..."
```

## 🔒 Security Features

- **Cryptographically Secure**: Uses Node.js crypto.randomBytes()
- **Configurable Length**: Default 64 bytes, customizable
- **Multiple Formats**: Hex (default) or Base64 encoding
- **Environment Integration**: Auto-save to .env files
- **Export Ready**: Shell export commands

## ⚡ Common Commands

```bash
# Help
./scripts/webhook-secret --help

# Generate with custom length
./scripts/webhook-secret semgrep --length 32

# Generate in base64 format
./scripts/webhook-secret insula --base64

# Export for environment setup
./scripts/webhook-secret all --export | grep SEMGREP

# Save to .env files
./scripts/webhook-secret structure --save
```

## 🔗 Integration

### With GitHub Apps

1. Generate secret: `./scripts/webhook-secret semgrep --export`
2. Copy the export command output
3. Run the export command in your shell
4. Use the same secret in GitHub App webhook settings

### With Environment Files

```bash
# Auto-save to packages/cortex-semgrep-github/.env
./scripts/webhook-secret semgrep --save
```

## 📖 Full Documentation

- **Detailed Guide**: `./scripts/webhook-secrets-README.md`
- **@ Commands Reference**: `./docs/github-apps-commands.md`

The scripts are ready to use for generating secure webhook secrets for your GitHub Apps ecosystem!
