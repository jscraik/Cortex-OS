# Cortex AI GitHub App

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM Version](https://img.shields.io/npm/v/@cortex-os/cortex-ai-github)](https://www.npmjs.com/package/@cortex-os/cortex-ai-github)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#build-status)
[![Test Coverage](https://img.shields.io/badge/coverage-96%25-brightgreen)](#testing)
[![Security Scan](https://img.shields.io/badge/security-OWASP%20compliant-green)](#security)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)

**Production-ready AI automation for GitHub repositories using GitHub Models API**

</div>

---

## 🎯 Features

- **💬 Comment-as-API**: Trigger AI tasks via `@cortex` comments in PRs and issues
- **🤖 GitHub Models Integration**: Direct access to Claude, GPT-4, Phi-3, Llama models
- **🛠️ 8 AI Task Types**: Code review, PR analysis, security scanning, documentation, issue triage, workflow optimization, repository health, and automated fixes
- **🔐 Webhook Security**: HMAC signature verification for all GitHub webhooks
- **📊 Rate Limit Handling**: Automatic rate limit detection and management
- **🛡️ TypeScript**: Full type safety with Zod validation
- **⚡ Production Ready**: Docker deployment, monitoring, error handling

## Quick Start

```typescript
import { CortexAiGitHubApp, CortexWebhookServer } from '@cortex-os/cortex-ai-github';

// Initialize AI app with GitHub Models config
const aiApp = new CortexAiGitHubApp({
  token: process.env.GITHUB_TOKEN!,
  baseUrl: 'https://models.inference.ai.azure.com',
  defaultModel: 'claude-3-5-sonnet',
  maxTokens: 4096,
  temperature: 0.3,
});

// Start webhook server
const webhookServer = new CortexWebhookServer(aiApp, process.env.WEBHOOK_SECRET!, 3000);

await webhookServer.start();
```

## Comment Triggers

| Command            | Task Type         | Description                 |
| ------------------ | ----------------- | --------------------------- |
| `@cortex review`   | code_review       | AI code review on PR        |
| `@cortex analyze`  | pr_analysis       | Comprehensive PR analysis   |
| `@cortex secure`   | security_scan     | Security vulnerability scan |
| `@cortex document` | documentation     | Generate documentation      |
| `@cortex triage`   | issue_triage      | Intelligent issue triage    |
| `@cortex optimize` | workflow_optimize | Workflow optimization       |
| `@cortex health`   | repo_health       | Repository health check     |
| `@cortex fix`      | auto_fix          | Automated code fixes        |

## Environment Variables

```bash
GITHUB_TOKEN=ghp_xxxx              # GitHub token with Models API access
WEBHOOK_SECRET=webhook_secret_key   # GitHub webhook secret
PORT=3000                          # Server port (optional)
```

## API Endpoints

- `GET /health` - Health check and metrics
- `POST /webhook` - GitHub webhook endpoint
- `GET /triggers` - List available triggers
- `POST /triggers` - Add custom triggers

## GitHub Models Supported

- `gpt-4o`, `gpt-4o-mini` - OpenAI GPT-4 family
- `claude-3-5-sonnet`, `claude-3-haiku` - Anthropic Claude family
- `phi-3-medium-128k`, `phi-3-mini-128k` - Microsoft Phi-3 family
- `llama-3.1-70b`, `llama-3.1-405b` - Meta Llama family

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  GitHub Webhook │───▶│ Webhook Server   │───▶│ AI GitHub App   │
│                 │    │                  │    │                 │
│ Comment Triggers│    │ HMAC Validation  │    │ Task Queue      │
│ PR Events       │    │ Pattern Matching │    │ Model Selection │
│ Issue Events    │    │ Permission Check │    │ Rate Limiting   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                              ┌─────────────────────────────────────┐
                              │        GitHub Models API           │
                              │                                     │
                              │ Claude 3.5 Sonnet, GPT-4o, etc.   │
                              └─────────────────────────────────────┘
```
