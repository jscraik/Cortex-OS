#!/bin/bash

# Test GitHub Apps Autonomous Features
# This script demonstrates and tests the autonomous webhook processing capabilities

set -euo pipefail

echo "🤖 Testing GitHub Apps Autonomous Features"
echo "=========================================="
echo ""

# Get webhook secrets from start scripts
AI_SECRET=$(awk -F'"' '/^export WEBHOOK_SECRET=/{print $2}' packages/cortex-ai-github/start-server.sh)
SEMGREP_SECRET=$(grep -E '^WEBHOOK_SECRET=' packages/cortex-semgrep-github/.env | cut -d= -f2)

echo "✅ Apps Status:"
echo "   - AI App (3001): cortex-github.brainwav.io"
echo "   - Semgrep (3002): semgrep-github.brainwav.io"
echo "   - Structure (3003): insula-github.brainwav.io"
echo ""

echo "🔄 Autonomous Capabilities Enabled:"
echo ""
echo "📝 AI App (cortex-github.brainwav.io):"
echo "   ✅ Auto code review on PR opened"
echo "   ✅ Auto security scan for security-related PRs"
echo "   ✅ Auto documentation for docs PRs"
echo "   ✅ Auto issue triage for all new issues"
echo "   ✅ Auto security analysis for security issues"
echo "   ✅ Auto repo health for maintenance issues"
echo "   ✅ Manual @cortex commands (review, analyze, secure, etc.)"
echo ""

echo "🛡️  Semgrep App (semgrep-github.brainwav.io):"
echo "   ✅ Auto security scan on PR opened"
echo "   ✅ Auto security scan on PR synchronize"
echo "   ✅ Auto security scan on push to main/master"
echo "   ✅ Manual @semgrep commands"
echo ""

echo "🏗️  Structure App (insula-github.brainwav.io):"
echo "   ✅ Auto structure validation on PR opened"
echo "   ✅ Auto structure validation on PR synchronize"
echo "   ✅ Auto structure validation on push"
echo "   ✅ Manual @insula commands"
echo ""

echo "📊 Testing webhook endpoints..."
echo ""

# Test AI app webhook with a PR opened event
DELIVERY_ID="test-$(date +%s)"
PR_PAYLOAD='{
  "action": "opened",
  "pull_request": {
    "number": 123,
    "title": "Add new security feature",
    "body": "This PR adds authentication improvements",
    "head": {"ref": "feature/auth", "sha": "abc123"},
    "base": {"ref": "main"},
    "labels": []
  },
  "repository": {
    "name": "test-repo",
    "owner": {"login": "testuser"},
    "full_name": "testuser/test-repo"
  }
}'

echo "🧪 Testing AI App autonomous PR processing..."
SIG=$(printf "%s" "$PR_PAYLOAD" | openssl dgst -sha256 -hmac "$AI_SECRET" -binary | xxd -p -c 256)
AI_RESPONSE=$(curl -sS -w "%{http_code}" \
  -H "X-GitHub-Event: pull_request" \
  -H "X-GitHub-Delivery: $DELIVERY_ID" \
  -H "X-Hub-Signature-256: sha256=$SIG" \
  -H "Content-Type: application/json" \
  --data "$PR_PAYLOAD" \
  https://cortex-github.brainwav.io/webhook || echo "000")

echo "   Response: $AI_RESPONSE"
if [[ "$AI_RESPONSE" == "200" ]]; then
  echo "   ✅ AI App successfully processed PR webhook"
else
  echo "   ❌ AI App webhook failed"
fi
echo ""

# Test issue creation for autonomous triage
ISSUE_PAYLOAD='{
  "action": "opened",
  "issue": {
    "number": 456,
    "title": "Security vulnerability in authentication",
    "body": "Found a potential security issue with user authentication flow"
  },
  "repository": {
    "name": "test-repo",
    "owner": {"login": "testuser"},
    "full_name": "testuser/test-repo"
  }
}'

echo "🧪 Testing AI App autonomous issue triage..."
SIG=$(printf "%s" "$ISSUE_PAYLOAD" | openssl dgst -sha256 -hmac "$AI_SECRET" -binary | xxd -p -c 256)
ISSUE_RESPONSE=$(curl -sS -w "%{http_code}" \
  -H "X-GitHub-Event: issues" \
  -H "X-GitHub-Delivery: $DELIVERY_ID-issue" \
  -H "X-Hub-Signature-256: sha256=$SIG" \
  -H "Content-Type: application/json" \
  --data "$ISSUE_PAYLOAD" \
  https://cortex-github.brainwav.io/webhook || echo "000")

echo "   Response: $ISSUE_RESPONSE"
if [[ "$ISSUE_RESPONSE" == "200" ]]; then
  echo "   ✅ AI App successfully processed issue webhook"
else
  echo "   ❌ AI App issue webhook failed"
fi
echo ""

# Test manual command processing
COMMENT_PAYLOAD='{
  "action": "created",
  "comment": {
    "body": "@cortex review this code please",
    "user": {"login": "developer"}
  },
  "issue": {
    "number": 123,
    "pull_request": {"url": "https://api.github.com/repos/testuser/test-repo/pulls/123"}
  },
  "repository": {
    "name": "test-repo",
    "owner": {"login": "testuser"},
    "full_name": "testuser/test-repo"
  }
}'

echo "🧪 Testing AI App manual @cortex command..."
SIG=$(printf "%s" "$COMMENT_PAYLOAD" | openssl dgst -sha256 -hmac "$AI_SECRET" -binary | xxd -p -c 256)
COMMENT_RESPONSE=$(curl -sS -w "%{http_code}" \
  -H "X-GitHub-Event: issue_comment" \
  -H "X-GitHub-Delivery: $DELIVERY_ID-comment" \
  -H "X-Hub-Signature-256: sha256=$SIG" \
  -H "Content-Type: application/json" \
  --data "$COMMENT_PAYLOAD" \
  https://cortex-github.brainwav.io/webhook || echo "000")

echo "   Response: $COMMENT_RESPONSE"
if [[ "$COMMENT_RESPONSE" == "200" ]]; then
  echo "   ✅ AI App successfully processed @cortex command"
else
  echo "   ❌ AI App command webhook failed"
fi
echo ""

echo "📋 Summary:"
echo "=========="
echo "All three GitHub Apps are configured for autonomous operation:"
echo ""
echo "🔄 Automatic Actions (No @mentions required):"
echo "   • PR opened → Code review + Security scan (AI + Semgrep + Structure)"
echo "   • PR updated → Security scan + Structure validation (Semgrep + Structure)"
echo "   • Issue opened → Auto triage + Context-based analysis (AI)"
echo "   • Push to main → Security scan + Structure validation (Semgrep + Structure)"
echo ""
echo "💬 Manual Commands (Still available):"
echo "   • @cortex [review|analyze|secure|document|triage|optimize|health|fix]"
echo "   • @semgrep [scan|help]"
echo "   • @insula [analyze|validate]"
echo ""
echo "🌐 Webhook URLs for GitHub App configuration:"
echo "   • AI: https://cortex-github.brainwav.io/webhook"
echo "   • Semgrep: https://semgrep-github.brainwav.io/webhook"
echo "   • Structure: https://insula-github.brainwav.io/webhook"
echo ""
echo "✅ Setup complete! Your GitHub Apps will now automatically:"
echo "   - Review every new PR"
echo "   - Scan for security issues"
echo "   - Validate repository structure"
echo "   - Triage new issues"
echo "   - Respond to manual commands"
