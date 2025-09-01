# Cortex Structure Guard GitHub App

A sophisticated GitHub App that automatically monitors and maintains repository structure and organization standards. Acts as a "structure guard" that keeps your codebase clean and well-organized.

## 🎯 Purpose

The Structure Guard GitHub App helps maintain clean architecture by:

- **Monitoring file placement**: Ensures files are in the correct directories
- **Enforcing naming conventions**: Validates file and directory naming standards
- **Detecting clutter**: Identifies when directories become disorganized
- **Auto-fixing issues**: Automatically moves misplaced files when safe to do so
- **Providing feedback**: Creates check runs and PR comments with structural analysis

## 🏗️ Features

### 📁 Structure Validation

- **File Placement Rules**: Applications in `apps/`, packages in `packages/`, libraries in `libs/`
- **TypeScript Organization**: Proper source file organization with naming conventions
- **Configuration Management**: Keeps config files organized and prevents clutter
- **Documentation Structure**: Ensures docs are properly organized in `docs/`
- **Test Organization**: Validates test file placement alongside source code

### 🔧 Auto-Fix Engine

- **Safe File Moving**: Automatically moves misplaced files to correct locations
- **Directory Creation**: Creates missing directories as needed
- **Risk Assessment**: Evaluates safety of auto-fixes before execution
- **Dry Run Mode**: Test auto-fixes without making actual changes
- **Approval Required**: High-risk changes require manual approval

### 📊 Analysis & Reporting

- **Structure Score**: 0-100 score based on organizational compliance
- **Violation Detection**: Identifies and categorizes structural issues
- **GitHub Check Runs**: Integrates with GitHub's check system
- **PR Comments**: Provides feedback on pull requests
- **Detailed Reports**: Shows violations with suggested fixes

## 🚀 Getting Started

### Installation

1. **Install dependencies**:

   ```bash
   cd packages/cortex-structure-github
   pnpm install
   ```

2. **Configure environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your GitHub token and webhook secret
   ```

3. **Start the app**:

   ```bash
   ./start.sh
   ```

The app will run on port 3003 and integrate with PM2 for process management.

### GitHub App Setup

1. **Create GitHub App** with these permissions:
   - Repository: Contents (read/write)
   - Repository: Pull requests (read/write)
   - Repository: Issues (read/write)
   - Repository: Checks (write)

2. **Configure webhooks** for:
   - Push events
   - Pull request events

3. **Set webhook URL**: `https://your-domain.com/webhook`

## 📋 Structure Rules

### Core Organizational Rules

#### Applications Placement

- **Pattern**: `**/*{app,application,cli,tui,webui,api}*`
- **Allowed**: `apps/**/*`
- **Auto-fix**: ✅

#### Package Organization

- **Pattern**: `**/*{package,feature,module}*`
- **Allowed**: `packages/**/*`
- **Auto-fix**: ✅

#### Libraries Placement

- **Pattern**: `**/*{lib,shared,common,util,helper}*`
- **Allowed**: `libs/**/*`
- **Auto-fix**: ✅

#### TypeScript Files

- **Pattern**: `**/*.ts`
- **Allowed**: `apps/**/*.ts`, `packages/**/*.ts`, `libs/**/*.ts`
- **Naming**: `^[a-z0-9-.]+\.ts$`
- **Auto-fix**: ✅

#### Configuration Files

- **Pattern**: `**/{*.config.*,*.json,*.yaml,*.yml}`
- **Max per directory**: 20 files
- **Auto-fix**: ❌ (requires manual review)

#### Documentation

- **Pattern**: `**/*.md`
- **Allowed**: `docs/**/*.md`, `**/README.md`, `*.md`
- **Max per directory**: 15 files
- **Auto-fix**: ✅

#### Test Files

- **Pattern**: `**/*{test,spec}.{ts,js}`
- **Allowed**: `tests/**/*`, `**/*.test.{ts,js}`, `**/*.spec.{ts,js}`
- **Auto-fix**: ✅

#### Scripts Organization

- **Pattern**: `**/*.{sh,bash,py,js}`
- **Allowed**: `scripts/**/*`, `bin/**/*`
- **Disallowed**: Root directory scripts
- **Auto-fix**: ✅

### Advanced Rules

#### Deep Nesting Prevention

- **Maximum depth**: 6 levels
- **Action**: Warning for excessive nesting

#### Required Package Files

- **Pattern**: `packages/*/package.json`
- **Required**: `package.json`, `README.md`
- **Auto-fix**: ❌ (creates missing files)

## 🔧 Configuration

### Environment Variables

```bash
# Required
GITHUB_TOKEN=ghp_your_token_here
WEBHOOK_SECRET=your_webhook_secret_here

# Optional
STRUCTURE_APP_ID=your_github_app_id_here
STRUCTURE_PRIVATE_KEY=your_github_app_private_key_here
PORT=3003

# Auto-fix settings
AUTO_FIX_ENABLED=false
DRY_RUN=true
```

### Custom Rules

You can customize structure rules by modifying `src/core/structure-validator.ts`:

```typescript
export const CUSTOM_STRUCTURE_RULES: StructureRule[] = [
  {
    name: 'custom-rule',
    description: 'Custom organizational rule',
    pattern: '**/*.custom',
    allowedPaths: ['custom/**/*'],
    autoFix: true,
  },
  // Add more rules...
];
```

## 📊 API Endpoints

### Health Check

```bash
GET /health
```

Returns service status and health information.

### Structure Analysis

```bash
POST /analyze
{
  "repository": "owner/repo",
  "files": ["path/to/file1.ts", "path/to/file2.js"]
}
```

Analyzes repository structure and returns violations.

### Auto-Fix Planning

```bash
POST /auto-fix
{
  "repository": "owner/repo",
  "violations": [...],
  "dryRun": true
}
```

Generates and optionally executes auto-fix plan.

### Webhook Handler

```bash
POST /webhook
```

Handles GitHub webhook events (push, pull_request).

## 🔄 Integration Workflows

### Push Event Flow

1. Receive push webhook
2. Clone repository at commit SHA
3. Analyze all files for structural violations
4. Create GitHub check run with results
5. Auto-fix violations if enabled and safe
6. Clean up temporary files

### Pull Request Flow

1. Receive PR webhook
2. Get list of changed files
3. Clone PR branch
4. Analyze only changed files
5. Create check run and PR comment
6. Suggest improvements

## 🛡️ Safety Features

### Auto-Fix Safety

- **File existence checks**: Never overwrite existing files
- **Critical file protection**: Protects `package.json`, `README.md`, etc.
- **Risk assessment**: Evaluates potential impact before fixes
- **Dry run mode**: Test changes without executing them
- **Approval gates**: High-risk changes require manual approval

### Error Handling

- **Graceful failures**: Continues analysis even if individual rules fail
- **Cleanup guaranteed**: Always removes temporary files
- **Detailed logging**: Comprehensive error tracking and debugging
- **Rate limiting**: Respects GitHub API limits

## 📈 Monitoring

### PM2 Process Management

```bash
# View status
pm2 status cortex-structure-github

# View logs
pm2 logs cortex-structure-github

# Restart service
pm2 restart cortex-structure-github

# Stop service
pm2 stop cortex-structure-github
```

### Health Monitoring

```bash
# Check health endpoint
curl http://localhost:3003/health

# Test webhook endpoint
curl -X POST http://localhost:3003/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## 🚦 GitHub Copilot Integration

### Skillset Configuration

- **App Type**: Skillset
- **Skills**: Structure analysis, auto-fix planning, organization enforcement
- **URL**: `https://structure-github.brainwav.io/api/skills`

### Available Skills

#### 1. Structure Analysis

```json
{
  "name": "analyze-structure",
  "description": "Analyze repository structure and identify organizational issues",
  "parameters": {
    "repository": { "type": "string", "required": true },
    "focus": { "type": "enum", "values": ["all", "typescript", "docs", "config"] }
  }
}
```

#### 2. Auto-Fix Planning

```json
{
  "name": "plan-auto-fix",
  "description": "Generate plan to automatically fix structural violations",
  "parameters": {
    "repository": { "type": "string", "required": true },
    "dry_run": { "type": "boolean", "default": true }
  }
}
```

#### 3. Organization Report

```json
{
  "name": "organization-report",
  "description": "Generate comprehensive repository organization report",
  "parameters": {
    "repository": { "type": "string", "required": true },
    "format": { "type": "enum", "values": ["json", "markdown"], "default": "markdown" }
  }
}
```

## 🔍 Troubleshooting

### Common Issues

#### App Not Starting

```bash
# Check logs
pm2 logs cortex-structure-github

# Verify environment variables
cat .env

# Test port availability
lsof -i :3003
```

#### Webhook Not Receiving Events

1. Verify webhook URL in GitHub App settings
2. Check webhook secret matches environment variable
3. Ensure app has required permissions
4. Test webhook delivery in GitHub App settings

#### Auto-Fix Not Working

1. Verify `AUTO_FIX_ENABLED=true`
2. Check `DRY_RUN=false` for actual fixes
3. Review file permissions in repository
4. Check auto-fix safety rules

### Debug Mode

```bash
# Enable verbose logging
NODE_ENV=development npm run dev

# Run single analysis
curl -X POST http://localhost:3003/analyze \
  -H "Content-Type: application/json" \
  -d '{"repository": "test/repo", "files": ["test.ts"]}'
```

## 🔮 Future Enhancements

- **Custom rule configuration via API**
- **Integration with code formatters (Prettier, ESLint)**
- **Advanced auto-fix with branch creation**
- **Bulk repository analysis**
- **Organization-wide structure enforcement**
- **ML-based structural pattern recognition**

## 📄 License

This project is part of the Cortex-OS ecosystem and follows the same licensing terms.
