# GitHub Copilot App Configuration Guide

## Cortex AI GitHub App (Agent Type)

### Basic Configuration (Cortex AI)

- **App Type**: Agent
- **Port**: 3001
- **URL**: <https://cortex-github.brainwav.io>

### Authorization Settings (Cortex AI)

- **Pre-authorization URL**: `https://cortex-github.brainwav.io/auth`
- **Authorization**: Not required (but recommended for better security)

### Agent Definition

- **URL**: `https://cortex-github.brainwav.io/api/agent`
- **Inference Description**:

```
AI-powered code review and automation agent using GitHub Models API. Provides:
- Intelligent code analysis and reviews
- Automated PR feedback and suggestions  
- Security vulnerability detection
- Code quality improvements
- Development best practices enforcement
- Support for TypeScript, Python, JavaScript, and more
```

### OpenID Connect Token Exchange (Cortex AI)

- **Enabled**: ✅ (Recommended for secure authentication)
- Exchange GitHub identity for third-party tokens

---

## Cortex Semgrep GitHub App (Skillset Type)

### Basic Configuration (Semgrep)

- **App Type**: Skillset
- **Port**: 3002
- **URL**: <https://semgrep-github.brainwav.io>

### Authorization Settings (Semgrep)

- **Pre-authorization URL**: `https://semgrep-github.brainwav.io/auth`
- **Authorization**: Required for accessing private repositories

### Skill Definitions

#### Skill 1: Security Scan

- **Name**: `security-scan`
- **Description**: `Comprehensive security scanning using Semgrep with OWASP Top-10 and MITRE ATLAS rules`
- **Parameters**:

```json
{
  "repository": {
    "type": "string",
    "description": "Repository name (owner/repo)",
    "required": true
  },
  "branch": {
    "type": "string", 
    "description": "Branch to scan",
    "default": "main"
  },
  "scan_type": {
    "type": "enum",
    "values": ["full", "security-only", "quick"],
    "description": "Type of scan to perform",
    "default": "security-only"
  }
}
```

#### Skill 2: Vulnerability Report

- **Name**: `vulnerability-report`
- **Description**: `Generate detailed vulnerability reports with remediation suggestions`
- **Parameters**:

```json
{
  "repository": {
    "type": "string",
    "description": "Repository name (owner/repo)",
    "required": true
  },
  "format": {
    "type": "enum",
    "values": ["json", "markdown", "html"],
    "description": "Report output format",
    "default": "markdown"
  }
}
```

#### Skill 3: Code Quality Check

- **Name**: `code-quality`
- **Description**: `Static analysis for code quality issues and best practices`
- **Parameters**:

```json
{
  "repository": {
    "type": "string",
    "description": "Repository name (owner/repo)",
    "required": true
  },
  "language": {
    "type": "enum",
    "values": ["typescript", "python", "javascript", "auto"],
    "description": "Programming language to focus on",
    "default": "auto"
  }
}
```

### OpenID Connect Token Exchange (Semgrep)

- **Enabled**: ✅ (Required for repository access)
- Exchange GitHub identity for accessing private repositories

---

## Environment Variables Required

### For Cortex AI GitHub App

```bash
GITHUB_TOKEN=your_github_token_here
WEBHOOK_SECRET=your_webhook_secret_here
PORT=3001
GITHUB_MODELS_BASE_URL=https://models.inference.ai.azure.com
```

### For Cortex Semgrep GitHub App

```bash
SEMGREP_GITHUB_TOKEN=your_github_token_here
SEMGREP_WEBHOOK_SECRET=your_webhook_secret_here
SEMGREP_APP_ID=your_github_app_id_here
SEMGREP_PRIVATE_KEY=your_github_app_private_key_here
PORT=3002
```

---

## Testing Your Configuration

### Test Cortex AI GitHub App

```bash
curl -X POST https://cortex-github.brainwav.io/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Test Cortex Semgrep GitHub App

```bash
curl -X POST https://semgrep-github.brainwav.io/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Check PM2 Status

```bash
pm2 status
pm2 logs cortex-ai-github
pm2 logs cortex-semgrep-github
```

---

## Security Considerations

1. **Use HTTPS**: Both apps are configured with Cloudflare tunnels for secure HTTPS access
2. **Webhook Secrets**: Always use strong, unique webhook secrets
3. **Token Permissions**: Use GitHub tokens with minimal required permissions
4. **Environment Variables**: Store sensitive data in environment variables, not code
5. **Rate Limiting**: Both apps implement rate limiting to prevent abuse

---

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure ports 3001 and 3002 are available
2. **Token Permissions**: Verify GitHub tokens have required repository access
3. **Webhook Delivery**: Check GitHub App webhook delivery logs
4. **PM2 Process**: Ensure both apps are running in PM2

### Debug Commands

```bash
# Check app status
pm2 status

# View real-time logs
pm2 logs cortex-ai-github --lines 50
pm2 logs cortex-semgrep-github --lines 50

# Restart if needed
pm2 restart cortex-ai-github
pm2 restart cortex-semgrep-github
```
