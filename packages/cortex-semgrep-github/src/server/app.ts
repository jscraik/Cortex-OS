/**
 * @file Semgrep GitHub App Server
 * @description GitHub App for automated security scanning with Semgrep
 */

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { Octokit } from '@octokit/rest';
import { type EmitterWebhookEvent, Webhooks } from '@octokit/webhooks';
import express from 'express';
import { z } from 'zod';
import type { SecurityScanResult } from '../lib/semgrep-scanner.js';
import { generateScanComment as generateModernScanComment } from '../lib/comment-formatter.js';

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

// Resolve binaries from safe, fixed directories only (avoid PATH lookups)
const SAFE_BIN_DIRS = ['/usr/bin', '/usr/local/bin', '/opt/homebrew/bin'];
async function resolveBinary(binName: 'git' | 'semgrep'): Promise<string> {
  for (const dir of SAFE_BIN_DIRS) {
    const candidate = join(dir, binName);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // continue
    }
  }
  throw new Error(`Required binary not found in safe paths: ${binName}`);
}

// Secure Semgrep analysis execution
async function runSemgrepAnalysis(semgrepBin: string, targetDir: string): Promise<string> {
  // Use safe, built-in rulesets instead of external paths
  const rulesets = ['auto', 'security-audit', 'owasp-top-ten'];

  return new Promise((resolve, reject) => {
    const semgrep = spawn(semgrepBin, [
      '--config', rulesets.join(','),
      '--json',
      '--quiet',
      '--timeout', '300', // 5 minute timeout
      '--max-target-bytes', '10MB',
      '.'
    ], {
      cwd: targetDir,
      stdio: 'pipe',
      timeout: 300000
    });

    let stdout = '';
    let stderr = '';

    semgrep.stdout?.on('data', (data) => { stdout += data.toString(); });
    semgrep.stderr?.on('data', (data) => { stderr += data.toString(); });

    semgrep.on('close', (code) => {
      // Semgrep exits with code 1 when findings are found; treat as success
      if (code === 0 || code === 1) {
        resolve(stdout);
      } else {
        reject(new Error(`Semgrep failed with code ${code}: ${stderr}`));
      }
    });

    semgrep.on('error', (error) => {
      reject(new Error(`Semgrep execution error: ${error.message}`));
    });
  });
}

// Secure repository cloning with spawn to prevent injection
async function cloneRepository(owner: string, repo: string, sha: string): Promise<string> {
  // Comprehensive input validation to prevent injection
  const ownerPattern = /^[a-zA-Z0-9_.-]{1,39}$/; // GitHub username limits
  const repoPattern = /^[a-zA-Z0-9_.-]{1,100}$/; // GitHub repo name limits
  const shaPattern = /^[a-fA-F0-9]{40}$/;

  if (!ownerPattern.test(owner)) {
    throw new Error(`Invalid owner format: ${owner}`);
  }

  if (!repoPattern.test(repo)) {
    throw new Error(`Invalid repository name format: ${repo}`);
  }

  if (!shaPattern.test(sha)) {
    throw new Error(`Invalid SHA format: ${sha}`);
  }

  // Additional security checks
  const suspiciousPatterns = ['..', '//', '\\', '$', '`', ';', '|', '&'];
  const allInputs = [owner, repo];

  for (const input of allInputs) {
    for (const pattern of suspiciousPatterns) {
      if (input.includes(pattern)) {
        throw new Error(`Input contains suspicious pattern: ${pattern}`);
      }
    }
  }

  const tempDir = `/tmp/semgrep-scan-${Date.now()}-${require('crypto').randomUUID()}`;
  await fs.mkdir(tempDir, { recursive: true });

  const gitBin = await resolveBinary('git');
  const repoUrl = `https://github.com/${owner}/${repo}.git`;

  return new Promise((resolve, reject) => {
    const clone = spawn(gitBin, ['clone', '--depth', '1', repoUrl, tempDir], {
      stdio: 'pipe'
    });

    // Set timeout manually
    const timeout = setTimeout(() => {
      clone.kill('SIGTERM');
      reject(new Error('Clone timeout exceeded'));
    }, 300000); // 5 minutes

    let stderr = '';
    clone.stderr?.on('data', (data) => { stderr += data.toString(); });

    clone.on('close', (code) => {
      clearTimeout(timeout);

      if (code === 0) {
        // Checkout specific SHA
        const checkout = spawn(gitBin, ['checkout', sha], {
          cwd: tempDir,
          stdio: 'pipe'
        });

        const checkoutTimeout = setTimeout(() => {
          checkout.kill('SIGTERM');
          reject(new Error('Checkout timeout exceeded'));
        }, 60000); // 1 minute

        let checkoutStderr = '';
        checkout.stderr?.on('data', (data) => { checkoutStderr += data.toString(); });

        checkout.on('close', (checkoutCode) => {
          clearTimeout(checkoutTimeout);

          if (checkoutCode === 0) {
            resolve(tempDir);
          } else {
            reject(new Error(`Checkout failed: ${checkoutStderr}`));
          }
        });

        checkout.on('error', (error) => {
          clearTimeout(checkoutTimeout);
          reject(new Error(`Checkout error: ${error.message}`));
        });
      } else {
        reject(new Error(`Clone failed: ${stderr}`));
      }
    });

    clone.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Clone error: ${error.message}`));
    });
  });
}

// Semgrep scan function
async function runSemgrepScan(
  owner: string,
  repo: string,
  sha: string
): Promise<SecurityScanResult[]> {
  try {
    console.warn(`Running Semgrep scan for ${owner}/${repo} at ${sha}`);

    // Clone repository securely
    const tempDir = await cloneRepository(owner, repo, sha);

    try {

      // Run Semgrep with cortex-sec rules (secure path resolution)
      const semgrepBin = await resolveBinary('semgrep');
      const semgrepOutput = await runSemgrepAnalysis(semgrepBin, tempDir);

      // Parse Semgrep results and convert to our format
      const semgrepData = JSON.parse(semgrepOutput);
      const results: SecurityScanResult[] =
        semgrepData.results?.map(
          (result: {
            check_id: string;
            message?: string;
            extra?: {
              message?: string;
              severity?: string;
              lines?: string;
              metadata?: Record<string, unknown>;
            };
            path: string;
            start?: { line: number };
            end?: { line: number };
          }) => ({
            ruleId: result.check_id,
            message: result.extra?.message || result.message || 'Security issue detected',
            severity: mapSemgrepSeverity(result.extra?.severity || 'INFO'),
            file: result.path.replace(`${tempDir}/`, ''),
            startLine: result.start?.line,
            endLine: result.end?.line,
            evidence: result.extra?.lines || '',
            tags: result.extra?.metadata || {},
          })
        ) || [];

      return results;
    } finally {
      // Cleanup temporary directory (safe API)
      fs.rm(tempDir, { recursive: true, force: true }).catch((error) =>
        console.error('Cleanup error:', error)
      );
    }
  } catch (error) {
    console.error('Semgrep scan failed:', error);
    return [];
  }
}

// Map Semgrep severity to our format
function mapSemgrepSeverity(severity: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  switch (severity.toUpperCase()) {
    case 'ERROR':
      return 'HIGH';
    case 'WARNING':
      return 'MEDIUM';
    default:
      return 'LOW';
  }
}

// Create GitHub check run (use REST API namespace)
async function createCheckRun(
  owner: string,
  repo: string,
  headSha: string,
  results: SecurityScanResult[]
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
`
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
  }
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
  }
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
  }
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
  }
);

async function handleScanCommand(
  payload:
    | EmitterWebhookEvent<'issue_comment.created'>['payload']
    | EmitterWebhookEvent<'pull_request_review_comment.created'>['payload'],
  user: string
) {
  try {
    // Progressive status: Step 1 - Processing
    await updateProgressiveStatus(payload, 'processing');

    const scanContext = validateScanContext(payload, user);
    const prData = await fetchPRData(scanContext);

    // Progressive status: Step 2 - Working
    await updateProgressiveStatus(payload, 'working');

    const results = await runSemgrepScan(scanContext.owner, scanContext.repo, prData.data.head.sha);

    await postScanResults(scanContext, results, prData.data.head.sha, user);

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
  payload: any,
  user: string
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

function resolvePRNumber(payload: any): number | undefined {
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
  user: string
) {
  const responseComment = generateScanComment(results, user, sha);

  await octokit.rest.issues.createComment({
    owner: context.owner,
    repo: context.repo,
    issue_number: context.issueNumber,
    body: responseComment,
  });
}

async function addReaction(payload: any, reaction: string) {
  try {
    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;

    if (payload.issue) {
      // Issue comment
      await octokit.rest.reactions.createForIssueComment({
        owner,
        repo,
        comment_id: payload.comment.id,
        content: reaction as any,
      });
    } else if (payload.pull_request) {
      // PR review comment
      await octokit.rest.reactions.createForPullRequestReviewComment({
        owner,
        repo,
        comment_id: payload.comment.id,
        content: reaction as any,
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
  payload: any,
  status: 'processing' | 'working' | 'success' | 'error' | 'warning'
): Promise<void> {
  try {
    switch (status) {
      case 'processing':
        await addReaction(payload, 'eyes');
        break;
      case 'working':
        await addReaction(payload, 'gear');
        break;
      case 'success':
        await addReaction(payload, 'rocket');
        break;
      case 'error':
        await addReaction(payload, 'x');
        break;
      case 'warning':
        await addReaction(payload, 'warning');
        break;
    }
  } catch (error) {
    console.error(`Failed to update progressive status ${status}:`, error);
  }
}


async function handleScanError(error: unknown, payload: any) {
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

app.listen(port, () => {
  console.warn(`🔒 Cortex Semgrep GitHub App listening on port ${port}`);
  console.warn(`Health check: http://localhost:${port}/health`);
});

// Note: No default export to satisfy repository lint rules

// Interface update to avoid any
interface SecurityScanResult {
  ruleId: string;
  message: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  file: string;
  startLine?: number;
  endLine?: number;
  evidence?: string;
  tags?: Record<string, unknown>;
}

// Help command handler
async function handleSemgrepHelpCommand(
  payload:
    | EmitterWebhookEvent<'issue_comment.created'>['payload']
    | EmitterWebhookEvent<'pull_request_review_comment.created'>['payload'],
  user: string
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

// Generate a human-friendly scan comment
function generateScanComment(results: SecurityScanResult[], user: string, sha: string): string {
  const formatSection = (
    heading: string,
    issues: SecurityScanResult[],
    maxItems: number,
    labelForRemainder: string
  ): string => {
    if (issues.length === 0) return '';
    let section = `${heading} (${issues.length})\n`;
    issues.slice(0, maxItems).forEach((issue) => {
      section += `- **${issue.file}:${issue.startLine || '?'}** - ${issue.message}\n`;
    });
    const remaining = issues.length - maxItems;
    if (remaining > 0) section += `- ... and ${remaining} more ${labelForRemainder} issues\n`;
    section += `\n`;
    return section;
  };

  let comment = `@${user} **🛡️ Security Scan Results**\n\n`;
  comment += `**Commit:** \`${sha.substring(0, 7)}\`\n`;
  comment += `**Issues Found:** ${results.length}\n\n`;

  if (results.length === 0) {
    comment += `✅ **Excellent!** No security vulnerabilities detected.\n`;
    comment += `Your code looks secure! 🎉\n`;
  } else {
    const high = results.filter((r) => r.severity === 'HIGH');
    const medium = results.filter((r) => r.severity === 'MEDIUM');
    const low = results.filter((r) => r.severity === 'LOW');

    comment += formatSection('## 🚨 High Severity', high, 3, 'high severity');
    comment += formatSection('## ⚠️ Medium Severity', medium, 3, 'medium severity');
    comment += formatSection('## ℹ️ Low Severity', low, 2, 'low severity');
    comment += `💡 **Recommendation:** Address high and medium severity issues first.\n`;
  }

  comment += `---\n*Security scan completed at ${new Date().toISOString()}*`;
  return comment;
}
