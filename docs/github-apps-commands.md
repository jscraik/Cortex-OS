# @ Commands Reference for GitHub Apps

Quick reference guide for using @ commands to interact with the Cortex-OS GitHub Apps ecosystem.

## Overview

The @ commands provide a convenient way to interact with different GitHub Apps through comments on pull requests and issues.

## Available Apps

| App | @ Command | Purpose | Webhook URL |
|-----|-----------|---------|-------------|
| **Semgrep** | `@semgrep` | Static security analysis and code quality | `https://semgrep-github.brainwav.io/webhook` |
| **Insula** | `@insula` | Advanced repository management and automation | `https://insula-insula.brainwav.io/webhook` |
| **Structure Guard** | `@structure` | Repository structure validation and organization | `https://insula-github.brainwav.io/webhook` |
| **AI Assistant** | `@cortex-ai` | AI-powered code analysis and suggestions | `https://insula-ai.brainwav.io/webhook` |

---

## @semgrep Commands

The Semgrep GitHub App provides static security analysis and code quality checks.

### Basic Commands

```markdown
@semgrep scan
```

Triggers a full Semgrep security scan on the current pull request or branch.

```markdown
@semgrep scan --severity high
```

Scans for high-severity issues only.

```markdown
@semgrep scan --rule-set security
```

Runs security-focused rule set.

```markdown
@semgrep scan --rule-set performance
```

Runs performance-focused rule set.

### Advanced Commands

```markdown
@semgrep scan --baseline main
```

Scans only changes compared to the main branch.

```markdown
@semgrep fix
```

Attempts to auto-fix issues that have available fixes.

```markdown
@semgrep report
```

Generates a detailed security report.

```markdown
@semgrep ignore <rule-id>
```

Adds the specified rule to the ignore list for this repository.

### Configuration Commands

```markdown
@semgrep config show
```

Shows current Semgrep configuration.

```markdown
@semgrep config update
```

Updates Semgrep rules to the latest version.

### Example Usage (Insula)

```markdown
Hey @semgrep, can you scan this PR for security issues?

@semgrep scan --severity high --rule-set security
```

---

## @insula Commands

The Insula GitHub App provides advanced repository management and automation capabilities.

### Repository Management

```markdown
@insula organize
```

Automatically organizes repository structure according to defined rules.

```markdown
@insula cleanup
```

Cleans up unused files, dependencies, and outdated configurations.

```markdown
@insula validate
```

Validates repository structure and configuration files.

### Documentation Commands

```markdown
@insula docs generate
```

Auto-generates documentation based on code structure and comments.

```markdown
@insula docs update
```

Updates existing documentation to reflect current code state.

```markdown
@insula readme sync
```

Synchronizes README files across the repository.

### Dependency Management

```markdown
@insula deps audit
```

Audits dependencies for security vulnerabilities and updates.

```markdown
@insula deps update
```

Updates dependencies to their latest compatible versions.

```markdown
@insula deps optimize
```

Optimizes dependency tree and removes unused packages.

### Workflow Commands

```markdown
@insula workflows sync
```

Synchronizes GitHub Actions workflows across related repositories.

```markdown
@insula workflows validate
```

Validates GitHub Actions workflow files.

### Advanced Automation

```markdown
@insula autofix
```

Automatically fixes common issues found in the repository.

```markdown
@insula migrate --from <old-pattern> --to <new-pattern>
```

Migrates code patterns or configurations.

```markdown
@insula compliance check
```

Runs compliance checks against repository policies.

### Example Usage

```markdown
@insula, this repository structure is getting messy. Can you help organize it?

@insula organize
@insula cleanup
@insula docs generate
```

---

## Command Combinations

You can chain multiple commands or use multiple apps together:

```markdown
@semgrep scan --severity high
@insula autofix
@structure validate
```

## Response Format

Apps will respond with:

- ✅ Success indicators
- ❌ Error messages with details
- 📊 Summary reports
- 🔗 Links to detailed results
- 💡 Suggestions for improvements

## Security & Permissions

### Required Permissions

All apps require these base permissions:

- **Contents**: Read & Write (for code analysis and fixes)
- **Pull requests**: Read & Write (for comments and reviews)
- **Issues**: Read & Write (for issue tracking)
- **Checks**: Write (for status updates)

### Webhook Security

Each app uses webhook secrets for secure communication:

- Generated using `./scripts/webhook-secret <app-name>`
- Verified on every webhook request
- Rotated periodically for security

## Troubleshooting

### Common Issues

1. **App not responding**:

   ```markdown
   @<app-name> ping
   ```

2. **Permission errors**:
   - Check repository permissions
   - Verify app installation

3. **Webhook timeouts**:
   - Commands may take time for large repositories
   - Apps will update with progress indicators

### Getting Help

```markdown
@semgrep help
@insula help
@structure help
@cortex-ai help
```

Each app provides context-specific help for their available commands.

## Configuration Files

### Semgrep Configuration

```yaml
# .semgrep.yml
rules:
  - id: security-rules
    severity: high
    enabled: true
ignore:
  - "test/**"
  - "docs/**"
```

### Insula Configuration

```json
{
  "insula": {
    "organization": {
      "enabled": true,
      "rules": ["typescript-structure", "package-organization"]
    },
    "automation": {
      "auto-fix": true,
      "auto-docs": true
    }
  }
}
```

## Integration Examples

### In Pull Request Reviews

```markdown
Thanks for the PR! Let's run some checks:

@semgrep scan --severity medium
@insula validate
@structure check

Once these pass, we can proceed with the review.
```

### In Issue Comments

```markdown
Let's investigate this security concern:

@semgrep scan --rule-set security
@insula compliance check

@semgrep, can you also check for similar patterns in other files?
```

### For Maintenance Tasks

```markdown
Monthly maintenance run:

@insula deps audit
@insula cleanup
@semgrep config update
@structure validate

Please generate a summary report after completion.
```

## Best Practices

1. **Be Specific**: Use targeted commands rather than broad scans
2. **Chain Commands**: Combine related commands for efficiency
3. **Monitor Progress**: Large operations may take time
4. **Review Results**: Always review automated changes before merging
5. **Use Baselines**: Compare against main branch for incremental checks

## API Integration

For programmatic access, each app also provides REST API endpoints:

```bash
# Semgrep API
curl -X POST https://semgrep-github.brainwav.io/api/scan \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"repository": "owner/repo", "ref": "main"}'

# Insula API  
curl -X POST https://insula-insula.brainwav.io/api/organize \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"repository": "owner/repo", "action": "validate"}'
```
