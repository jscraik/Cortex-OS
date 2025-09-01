# 🤖 Cortex-OS GitHub Apps - Bot Commands Reference

## Overview

Cortex-OS includes two specialized GitHub Apps that provide automated code quality and structure management:

### 🔐 **Semgrep Security Bot** (`@semgrep`)

Automated security scanning and vulnerability detection using custom Cortex-OS rulesets.

### 🏗️ **Insula Structure Guard** (`@insula`)

Repository organization and architecture enforcement to maintain clean, well-structured codebases.

---

## Quick Command Reference

### Security Commands (`@semgrep`)

| Command | Description | Usage |
|---------|-------------|-------|
| `@semgrep scan` | Full security scan | `@semgrep scan` |
| `@semgrep quick` | Fast critical scan | `@semgrep quick` |
| `@semgrep diff` | Scan changed files only | `@semgrep diff` |
| `@semgrep report` | Generate security report | `@semgrep report` |
| `@semgrep rules` | List available rulesets | `@semgrep rules` |

### Structure Commands (`@insula`)

| Command | Description | Usage |
|---------|-------------|-------|
| `@insula analyze` | Structure analysis | `@insula analyze` |
| `@insula fix` | Generate fix suggestions | `@insula fix` |
| `@insula fix --apply` | Apply fixes (creates PR) | `@insula fix --apply` |
| `@insula score` | Show compliance score | `@insula score` |
| `@insula rules` | List structure rules | `@insula rules` |

---

## Integration Status

### Production Deployment

Both apps are deployed and accessible via Cloudflare tunnels:

- **Semgrep Bot**: `https://insula-semgrep.brainwav.io` (Port 3002)
- **Insula Guard**: `https://insula-github.brainwav.io` (Port 3003)

### PM2 Process Management

```bash
# Check status of all GitHub apps
pm2 status

# View logs for specific app
pm2 logs cortex-semgrep-github
pm2 logs cortex-structure-github

# Restart apps
pm2 restart cortex-semgrep-github
pm2 restart cortex-structure-github
```

### Health Check Endpoints

```bash
# Semgrep Bot Health
curl https://insula-semgrep.brainwav.io/health

# Insula Guard Health  
curl https://insula-github.brainwav.io/health
```

---

## Workflow Integration

### Pull Request Workflow

1. **Automated Triggers**: Both apps automatically run on PR creation/updates
2. **Security Scanning**: Semgrep analyzes code for vulnerabilities
3. **Structure Validation**: Insula checks file organization and naming
4. **Feedback**: Both apps comment on PRs with findings and suggestions

### Manual Triggers

Use @ commands in PR comments or issues to manually trigger scans:

```markdown
@semgrep scan --severity HIGH
@insula analyze --path "packages/"
```

### Pre-merge Checklist

```bash
# Security check
@semgrep diff --severity HIGH

# Structure validation  
@insula quick

# If issues found, generate fixes
@insula fix --apply
```

---

## Configuration

### Environment Variables

#### Semgrep Bot

```bash
GITHUB_TOKEN=<github_pat>
WEBHOOK_SECRET=<webhook_secret>
SEMGREP_APP_ID=<app_id>
SEMGREP_PRIVATE_KEY=<private_key>
```

#### Insula Guard

```bash
GITHUB_TOKEN=<github_pat>
WEBHOOK_SECRET=<webhook_secret>
STRUCTURE_APP_ID=<app_id>
STRUCTURE_PRIVATE_KEY=<private_key>
AUTO_FIX_ENABLED=true
DRY_RUN=false
```

### GitHub App Setup

Both apps require GitHub App registration with these permissions:

- **Contents**: Read & Write
- **Pull Requests**: Read & Write  
- **Issues**: Read & Write
- **Repository Administration**: Read

---

## Best Practices

### Security with Semgrep

1. **Run early and often**: Use `@semgrep quick` during development
2. **Focus on high severity**: Use `--severity HIGH` for critical issues
3. **Review before merge**: Always run `@semgrep diff` on final PR
4. **Establish baselines**: Use `@semgrep baseline` for tracking progress

### Structure with Insula

1. **Regular health checks**: Monitor `@insula score` weekly
2. **Incremental fixes**: Use `@insula fix` to preview before applying
3. **Path-specific analysis**: Focus on problem areas with `--path`
4. **Architecture compliance**: Run full `@insula analyze` on major changes

### Combined Workflow

```bash
# Development phase
@semgrep quick
@insula quick

# Pre-PR review
@semgrep diff
@insula analyze

# Final pre-merge
@semgrep scan --severity HIGH
@insula fix --apply
```

---

## Troubleshooting

### Common Issues

**Bot not responding:**

1. Check PM2 status: `pm2 status`
2. Verify webhook connectivity
3. Check GitHub App installation

**Permission errors:**

1. Verify GitHub App permissions
2. Check environment variable configuration
3. Ensure webhook secrets match

**High false positives:**

1. Customize rulesets for your project
2. Use severity filtering
3. Establish project baselines

### Support

For technical support or feature requests:

- **Security Issues**: Contact security team
- **Structure Rules**: Contact development team  
- **Bot Configuration**: Check documentation in respective package directories

---

## Related Documentation

- [Semgrep Commands](packages/cortex-semgrep-github/SEMGREP_COMMANDS.md)
- [Insula Commands](packages/cortex-structure-github/INSULA_COMMANDS.md)
- [Security Implementation](SECURITY.md)
- [Architecture Guidelines](docs/architecture/)

---

*Last updated: September 1, 2025*
