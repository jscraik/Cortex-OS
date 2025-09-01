# 🔐 Semgrep Security Bot - @ Commands

## Description

**Semgrep Security Bot** is an automated security scanning GitHub App that integrates Semgrep static analysis into your development workflow. It monitors pull requests, pushes, and can be manually triggered to identify security vulnerabilities, code quality issues, and compliance violations using Cortex-OS custom rulesets.

### Key Features

- **Automated Security Scanning**: Runs on every PR and push
- **Custom Cortex Rulesets**: Uses tailored security rules for TypeScript, JavaScript, and Python
- **Vulnerability Detection**: Identifies security hotspots, injection flaws, and authentication issues
- **Code Quality Analysis**: Detects anti-patterns and architectural violations
- **Instant Feedback**: Comments directly on PRs with findings and recommendations

---

## @ Commands

### Security Scans

#### `@semgrep scan`

Triggers a comprehensive security scan of the current branch

```bash
@semgrep scan
```

**What it does:**

- Runs full Semgrep analysis on all supported files
- Uses Cortex-OS security rulesets (JS/TS, Python, aggregate)
- Reports vulnerabilities with severity levels
- Provides fix suggestions where available

#### `@semgrep scan --files <pattern>`

Scans specific files or directories matching the pattern

```bash
@semgrep scan --files "src/**/*.ts"
@semgrep scan --files "apps/api/"
```

#### `@semgrep scan --severity <level>`

Filters scan results by severity level

```bash
@semgrep scan --severity HIGH
@semgrep scan --severity MEDIUM,HIGH
```

### Quick Actions

#### `@semgrep quick`

Performs a fast scan focusing on high-impact security rules

```bash
@semgrep quick
```

**What it does:**

- Runs abbreviated scan with critical security rules only
- Faster execution for quick feedback
- Focuses on injection, auth, and crypto vulnerabilities

#### `@semgrep diff`

Scans only the files changed in the current PR

```bash
@semgrep diff
```

**What it does:**

- Analyzes only modified files
- Compares with base branch
- Provides targeted security feedback

### Configuration

#### `@semgrep rules`

Lists available security rulesets and their descriptions

```bash
@semgrep rules
```

#### `@semgrep config`

Shows current Semgrep configuration and enabled rules

```bash
@semgrep config
```

#### `@semgrep enable <ruleset>`

Enables additional rulesets for scanning

```bash
@semgrep enable owasp-top-10
@semgrep enable secrets-detection
```

### Reporting

#### `@semgrep report`

Generates a detailed security report for the repository

```bash
@semgrep report
```

**What it does:**

- Creates comprehensive security analysis
- Includes trend analysis and metrics
- Exports findings in multiple formats

#### `@semgrep baseline`

Sets current scan results as security baseline

```bash
@semgrep baseline
```

**What it does:**

- Establishes baseline for future comparisons
- Helps track security debt over time
- Enables delta reporting

### Help & Info

#### `@semgrep help`

Shows available commands and usage examples

```bash
@semgrep help
```

#### `@semgrep status`

Displays current scan status and recent activity

```bash
@semgrep status
```

#### `@semgrep version`

Shows Semgrep bot version and ruleset versions

```bash
@semgrep version
```

---

## Usage Examples

### Common Workflows

**Pre-merge Security Check:**

```bash
@semgrep diff --severity HIGH
```

**Full Repository Audit:**

```bash
@semgrep scan
@semgrep report
```

**Quick Vulnerability Check:**

```bash
@semgrep quick
```

**Focus on Specific Directory:**

```bash
@semgrep scan --files "packages/api/**"
```

---

## Response Format

The Semgrep bot responds with:

- **Summary**: Number of issues found by severity
- **Details**: File locations, rule violations, and descriptions
- **Recommendations**: Fix suggestions and best practices
- **Links**: References to security documentation and guidelines

---

## Integration Details

- **Webhook URL**: `https://insula-semgrep.brainwav.io/webhook`
- **Port**: 3002
- **Supported Events**: `push`, `pull_request`, `issue_comment`
- **PM2 Process**: `cortex-semgrep-github`

---

## Security Rulesets

### Cortex-OS Custom Rules

1. **cortex-aggregate.yml** - Combined security patterns
2. **cortex-js-ts.yml** - JavaScript/TypeScript specific rules
3. **cortex-py.yml** - Python security patterns

### Detection Categories

- **Injection Vulnerabilities** (SQL, XSS, Command Injection)
- **Authentication & Authorization** flaws
- **Cryptographic** misuse
- **Secrets & Credentials** exposure
- **API Security** violations
- **Data Validation** issues

---

*For support or rule customization requests, contact the security team.*
