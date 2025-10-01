/**
 * @file Semgrep GitHub App Server
 * @description GitHub App for automated security scanning with Semgrep
 */

import { Octokit } from '@octokit/rest';
import { type EmitterWebhookEvent, Webhooks } from '@octokit/webhooks';
import dotenv from 'dotenv';
import express from 'express';
import { z } from 'zod';
import { generateScanComment } from '../lib/comment-formatter.js';
import { runSemgrepScan, type SecurityScanResult } from '../lib/semgrep-scanner.js';

// Load environment variables from .env file
dotenv.config();

const app = express();
// Security: do not reveal Express signature header
app.disable('x-powered-by');
const port = process.env.PORT || 3002;

// Environment validation
const EnvSchema = z.object({
  GITHUB_TOKEN: z.string(),
  WEBHOOK_SECRET: z.string(),
  SEMGREP_APP_ID: z.string().optional(),
  SEMGREP_PRIVATE_KEY: z.string().optional(),
});

const env = EnvSchema.parse(process.env);

// Initialize GitHub client
const octokit = new Octokit({
  auth: env.GITHUB_TOKEN,
});

// Initialize webhooks
const webhooks = new Webhooks({
  secret: env.WEBHOOK_SECRET,
});

// Middleware: ensure raw body ONLY for /webhook; avoid global JSON that breaks signature verification
app.use('/webhook', express.raw({ type: 'application/json' }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'cortex-semgrep-github',
    timestamp: new Date().toISOString(),
  });
});

type CommentPayload =
  | EmitterWebhookEvent<'issue_comment.created'>['payload']
  | EmitterWebhookEvent<'pull_request_review_comment.created'>['payload'];

type ReactionContent = '+1' | '-1' | 'confused' | 'heart' | 'hooray' | 'laugh' | 'rocket' | 'eyes';
// Create GitHub check run (use REST API namespace)
async function createCheckRun(
  owner: string,
  repo: string,
  headSha: string,
  results: SecurityScanResult[],
): Promise<void> {
  const criticalCount = results.filter((r) => r.severity === 'HIGH').length;
  const mediumCount = results.filter((r) => r.severity === 'MEDIUM').length;
  const lowCount = results.filter((r) => r.severity === 'LOW').length;

  const conclusion = criticalCount > 0 ? 'failure' : 'success';
  const title =
    criticalCount > 0
      ? `🚨 Security issues found (${criticalCount} critical, ${mediumCount} medium, ${lowCount} low)`
      : `✅ No critical security issues (${mediumCount} medium, ${lowCount} low)`;

  const summary = `
## 🔒 Cortex Semgrep Security Scan Results

**Critical Issues**: ${criticalCount}
**Medium Issues**: ${mediumCount}
**Low Issues**: ${lowCount}

${results.length > 0 ? '### Issues Found:' : '### No issues found! 🎉'}

${results
      .slice(0, 10)
      .map(
        (result) => `
**${result.ruleId}** (${result.severity})
- **File**: \`${result.file}\`${result.startLine ? ` (line ${result.startLine})` : ''}
- **Issue**: ${result.message}
${result.evidence ? `- **Evidence**: \`${result.evidence}\`` : ''}
`,
      )
      .join('\n')}

${results.length > 10 ? `\n*... and ${results.length - 10} more issues*` : ''}

---
*Powered by Cortex Semgrep GitHub App*
  `.trim();

  await octokit.rest.checks.create({
    owner,
    repo,
    name: 'Cortex Semgrep Security Scan',
    head_sha: headSha,
    status: 'completed',
    conclusion,
    output: {
      title,
      summary,
    },
  });
}

// Webhook handlers
webhooks.on(
  'pull_request.opened',
  async ({ payload }: EmitterWebhookEvent<'pull_request.opened'>) => {
    const { pull_request, repository } = payload;

    console.warn(`PR opened: ${repository.full_name}#${pull_request.number}`);

    const ownerLogin = repository.owner?.login;
    if (!ownerLogin) return;

    const results = await runSemgrepScan(ownerLogin, repository.name, pull_request.head.sha);

    await createCheckRun(ownerLogin, repository.name, pull_request.head.sha, results);
  },
);

webhooks.on(
  'pull_request.synchronize',
  async ({ payload }: EmitterWebhookEvent<'pull_request.synchronize'>) => {
    const { pull_request, repository } = payload;

    console.warn(`PR updated: ${repository.full_name}#${pull_request.number}`);

    const ownerLogin = repository.owner?.login;
    if (!ownerLogin) return;

    const results = await runSemgrepScan(ownerLogin, repository.name, pull_request.head.sha);

    await createCheckRun(ownerLogin, repository.name, pull_request.head.sha, results);
  },
);

webhooks.on('push', async ({ payload }: EmitterWebhookEvent<'push'>) => {
  const { repository, head_commit } = payload;

  // Only scan main/master branch pushes
  if (!['main', 'master'].includes(payload.ref.replace('refs/heads/', ''))) {
    return;
  }

  if (!head_commit) return;

  console.warn(`Push to ${repository.full_name}: ${head_commit.id}`);

  const ownerLogin = repository.owner?.login;
  if (!ownerLogin) return;

  const results = await runSemgrepScan(ownerLogin, repository.name, head_commit.id);

  await createCheckRun(ownerLogin, repository.name, head_commit.id, results);
});

// Handle issue comment events (for @semgrep commands)
webhooks.on(
  'issue_comment.created',
  async ({ payload }: EmitterWebhookEvent<'issue_comment.created'>) => {
    try {
      if (!payload.comment || !payload.repository || !payload.comment.user) return;
      const comment = payload.comment.body || '';
      const user = payload.comment.user.login || 'unknown';

      console.warn(`💬 Comment received from ${user}: ${comment.substring(0, 100)}...`);

      // Check for @semgrep commands
      if (comment.includes('@semgrep')) {
        console.warn('🎯 @semgrep command detected');

        // Add reaction to show we're working
        const ownerLogin = payload.repository.owner?.login;
        if (!ownerLogin) return;
        await octokit.rest.reactions.createForIssueComment({
          owner: ownerLogin,
          repo: payload.repository.name,
          comment_id: payload.comment.id,
          content: 'eyes',
        });

        const scanRe = /@semgrep\s+(scan|security|check|analyze)/i;
        const helpRe = /@semgrep\s+(help|commands)/i;

        if (scanRe.exec(comment)) {
          await handleScanCommand(payload, user);
        } else if (helpRe.exec(comment)) {
          await handleSemgrepHelpCommand(payload, user);
        } else {
          // Generic @semgrep mention - show help
          await handleSemgrepHelpCommand(payload, user);
        }
      }
    } catch (error) {
      console.error('Error processing comment event:', error);
    }
  },
);

// Handle pull request review comment events
webhooks.on(
  'pull_request_review_comment.created',
  async ({ payload }: EmitterWebhookEvent<'pull_request_review_comment.created'>) => {
    try {
      if (!payload.comment || !payload.repository || !payload.comment.user) return;
      const comment = payload.comment.body || '';
      const user = payload.comment.user.login || 'unknown';

      console.warn(`💬 Review comment received from ${user}: ${comment.substring(0, 100)}...`);

      // Check for @semgrep commands in review comments
      if (comment.includes('@semgrep')) {
        console.warn('🎯 @semgrep command detected in review comment');

        const scanRe = /@semgrep\s+(scan|security|check|analyze)/i;
        if (scanRe.exec(comment)) {
          await handleScanCommand(payload, user);
        }
      }
    } catch (error) {
      console.error('Error processing review comment event:', error);
    }
  },
);

async function handleScanCommand(
  payload:
    | EmitterWebhookEvent<'issue_comment.created'>['payload']
    | EmitterWebhookEvent<'pull_request_review_comment.created'>['payload'],
  user: string,
) {
  try {
    // Progressive status: Step 1 - Processing
    await updateProgressiveStatus(payload, 'processing');

    const scanContext = validateScanContext(payload, user);
    const prData = await fetchPRData(scanContext);

    // Progressive status: Step 2 - Working
    await updateProgressiveStatus(payload, 'working');

    const results = await runSemgrepScan(scanContext.owner, scanContext.repo, prData.data.head.sha);

    await postScanResults(scanContext, results, prData.data.head.sha);

    // Progressive status: Step 3 - Success
    await updateProgressiveStatus(payload, 'success');

    console.warn('✅ Security scan completed and posted');
  } catch (error) {
    // Progressive status: Step 3 - Error
    await updateProgressiveStatus(payload, 'error');
    await handleScanError(error, payload);
  }
}

function validateScanContext(
  payload: CommentPayload,
  user: string,
): { owner: string; repo: string; issueNumber: number; prNumber: number } {
  console.warn(`🔍 ${user} requested security scan`);

  const repo = payload.repository;
  const ownerLogin = repo.owner?.login;
  if (!ownerLogin) {
    throw new Error('Repository owner.login not available');
  }

  let issueNumber: number | undefined;
  if ('issue' in payload && payload.issue) {
    issueNumber = payload.issue.number;
  } else if ('pull_request' in payload && payload.pull_request) {
    issueNumber = payload.pull_request.number;
  }

  if (!issueNumber) {
    throw new Error('No issue/PR number found for scan');
  }

  const prNumber = resolvePRNumber(payload);
  if (!prNumber) {
    throw new Error('No PR number found for scan');
  }

  return { owner: ownerLogin, repo: repo.name, issueNumber, prNumber };
}

function resolvePRNumber(payload: CommentPayload): number | undefined {
  if ('pull_request' in payload && payload.pull_request) {
    return payload.pull_request.number;
  }
  if ('issue' in payload && payload.issue && 'pull_request' in payload.issue) {
    return payload.issue.number;
  }
  return undefined;
}

async function fetchPRData(context: { owner: string; repo: string; prNumber: number }) {
  return octokit.rest.pulls.get({
    owner: context.owner,
    repo: context.repo,
    pull_number: context.prNumber,
  });
}

async function postScanResults(
  context: { owner: string; repo: string; issueNumber: number },
  results: SecurityScanResult[],
  sha: string,
): Promise<void> {
  const responseComment = generateScanComment(results, context.owner, context.repo, sha);

  await octokit.rest.issues.createComment({
    owner: context.owner,
    repo: context.repo,
    issue_number: context.issueNumber,
    body: responseComment,
  });
}

async function addReaction(payload: CommentPayload, reaction: ReactionContent): Promise<void> {
  try {
    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;

    if ('issue' in payload && payload.issue) {
      await octokit.rest.reactions.createForIssueComment({
        owner,
        repo,
        comment_id: payload.comment.id,
        content: reaction,
      });
    } else if ('pull_request' in payload && payload.pull_request) {
      await octokit.rest.reactions.createForPullRequestReviewComment({
        owner,
        repo,
        comment_id: payload.comment.id,
        content: reaction,
      });
    }
  } catch (error) {
    console.error(`Failed to add ${reaction} reaction:`, error);
    // Don't throw - reactions are non-critical
  }
}

/**
 * Progressive status update system - Copilot-inspired feedback
 * Updates reactions in sequence: 👀 → ⚙️ → 🚀/❌
 */
async function updateProgressiveStatus(
  payload: CommentPayload,
  status: 'processing' | 'working' | 'success' | 'error' | 'warning',
): Promise<void> {
  try {
    switch (status) {
      case 'processing':
        await addReaction(payload, 'eyes');
        break;
      case 'working':
        await addReaction(payload, 'eyes');
        break;
      case 'success':
        await addReaction(payload, 'rocket');
        break;
      case 'error':
        await addReaction(payload, '-1');
        break;
      case 'warning':
        await addReaction(payload, 'confused');
        break;
    }
  } catch (error) {
    console.error(`Failed to update progressive status ${status}:`, error);
  }
}

async function handleScanError(error: unknown, payload: CommentPayload) {
  console.error('Error handling scan command:', error);

  try {
    const repoOwnerLogin = payload.repository.owner?.login;
    if (repoOwnerLogin) {
      await octokit.rest.reactions.createForIssueComment({
        owner: repoOwnerLogin,
        repo: payload.repository.name,
        comment_id: payload.comment.id,
        content: 'confused',
      });
    }
  } catch (reactionError) {
    console.error('Error adding error reaction:', reactionError);
  }
}

// Webhook error logging
webhooks.onError((error) => {
  console.error('❌ Webhook handler error (semgrep):', error);
});

// Webhook endpoint: verify signature and dispatch using raw payload
app.post('/webhook', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  const id = req.headers['x-github-delivery'] as string | undefined;
  const name = req.headers['x-github-event'] as string | undefined;
  const rawBody = req.body as Buffer | string | Record<string, unknown> | undefined;
  let payload: string;
  if (Buffer.isBuffer(rawBody)) {
    payload = rawBody.toString('utf8');
  } else if (typeof rawBody === 'string') {
    payload = rawBody;
  } else {
    payload = JSON.stringify(rawBody ?? {});
  }

  try {
    await webhooks.verifyAndReceive({
      id: id || '',
      name: name || 'unknown',
      signature: signature || '',
      payload,
    });

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(401).send('Unauthorized');
  }
});

// Manual scan endpoint (JSON body)
app.post('/scan', express.json(), async (req, res) => {
  const { owner, repo, sha } = req.body;

  if (!owner || !repo || !sha) {
    return res.status(400).json({ error: 'Missing required parameters: owner, repo, sha' });
  }

  try {
    const results = await runSemgrepScan(owner, repo, sha);
    await createCheckRun(owner, repo, sha, results);

    res.json({
      success: true,
      results: results.length,
      message: 'Scan completed and check run created',
    });
  } catch (error) {
    console.error('Manual scan error:', error);
    res.status(500).json({ error: 'Scan failed' });
  }
});

// Export the Express app so integration tests can import it without starting the server
export { app };

// Only start the HTTP server when not running tests to avoid EADDRINUSE in CI/test environments
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.warn(`🔒 Cortex Semgrep GitHub App listening on port ${port}`);
    console.warn(`Health check: http://localhost:${port}/health`);
  });
}

// Note: No default export to satisfy repository lint rules

// Type imported from ../lib/semgrep-scanner.js is used directly

// Help command handler
async function handleSemgrepHelpCommand(
  payload:
    | EmitterWebhookEvent<'issue_comment.created'>['payload']
    | EmitterWebhookEvent<'pull_request_review_comment.created'>['payload'],
  user: string,
) {
  try {
    console.warn(`❓ ${user} requested Semgrep help`);

    const repo = payload.repository;
    const ownerLogin = repo.owner?.login;
    if (!ownerLogin) return;

    let issueNumber: number | undefined;
    if ('issue' in payload && payload.issue) {
      issueNumber = payload.issue.number;
    } else if ('pull_request' in payload && payload.pull_request) {
      issueNumber = payload.pull_request.number;
    }

    const helpComment = `@${user} **🛡️ Semgrep Security Scanner Commands:**

🔍 **Security Scanning:**
- \`@semgrep scan\` - Run security analysis
- \`@semgrep security\` - Same as scan
- \`@semgrep check\` - Security check
- \`@semgrep analyze\` - Analyze for vulnerabilities

❓ **Help:**
- \`@semgrep help\` - Show this help
- \`@semgrep commands\` - List all commands

**What I scan for:**
- SQL injection vulnerabilities
- XSS (Cross-site scripting)
- Authentication bypasses
- Hardcoded secrets
- Insecure cryptography
- Path traversal attacks
- And much more!

I'm your security guardian, keeping your code safe from vulnerabilities! 🔒`;

    if (issueNumber) {
      await octokit.rest.issues.createComment({
        owner: ownerLogin,
        repo: repo.name,
        issue_number: issueNumber,
        body: helpComment,
      });
    }
  } catch (error) {
    console.error('Error handling Semgrep help command:', error);
  }
}
