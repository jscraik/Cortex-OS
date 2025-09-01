/**
 * @file Semgrep GitHub App Server
 * @description GitHub App for automated security scanning with Semgrep
 */

import { Octokit } from '@octokit/rest';
import { Webhooks } from '@octokit/webhooks';
import { exec } from 'child_process';
import { createHash, createHmac } from 'crypto';
import express from 'express';
import { promises as fs } from 'fs';
import { join } from 'path';
import { z } from 'zod';

const app = express();
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

// Middleware
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'cortex-semgrep-github',
    timestamp: new Date().toISOString(),
  });
});

// Security scan interface
interface SecurityScanResult {
  ruleId: string;
  message: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  file: string;
  startLine?: number;
  endLine?: number;
  evidence?: string;
  tags?: Record<string, any>;
}

// Semgrep scan function
async function runSemgrepScan(
  owner: string,
  repo: string,
  sha: string
): Promise<SecurityScanResult[]> {
  try {
    console.log(`Running Semgrep scan for ${owner}/${repo} at ${sha}`);

    // Create temporary directory for scanning
    const tempDir = `/tmp/semgrep-scan-${Date.now()}`;
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // Clone the repository at the specific SHA
      await new Promise<void>((resolve, reject) => {
        exec(`git clone https://github.com/${owner}/${repo}.git ${tempDir}`, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      // Checkout specific SHA
      await new Promise<void>((resolve, reject) => {
        exec(`cd ${tempDir} && git checkout ${sha}`, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      // Run Semgrep with cortex-sec rules
      const cortexSecPath = join(process.cwd(), '../../cortex-sec/rulesets/semgrep');
      const semgrepConfig = [
        `${cortexSecPath}/cortex-aggregate.yml`,
        `${cortexSecPath}/cortex-js-ts.yml`,
        `${cortexSecPath}/cortex-py.yml`,
      ].join(',');

      const semgrepOutput = await new Promise<string>((resolve, reject) => {
        exec(
          `cd ${tempDir} && semgrep --config=${semgrepConfig} --json --quiet .`,
          { maxBuffer: 1024 * 1024 * 10 }, // 10MB buffer
          (error, stdout, stderr) => {
            if (error && error.code !== 1) {
              // Semgrep exits with code 1 when findings are found, which is normal
              reject(error);
            } else {
              resolve(stdout);
            }
          }
        );
      });

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
      // Cleanup temporary directory
      exec(`rm -rf ${tempDir}`, (error) => {
        if (error) console.error('Cleanup error:', error);
      });
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

// Create GitHub check run
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

  await octokit.checks.create({
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
webhooks.on('pull_request.opened', async ({ payload }) => {
  const { pull_request, repository } = payload;

  console.log(`PR opened: ${repository.full_name}#${pull_request.number}`);

  const results = await runSemgrepScan(
    repository.owner.login,
    repository.name,
    pull_request.head.sha
  );

  await createCheckRun(repository.owner.login, repository.name, pull_request.head.sha, results);
});

webhooks.on('pull_request.synchronize', async ({ payload }) => {
  const { pull_request, repository } = payload;

  console.log(`PR updated: ${repository.full_name}#${pull_request.number}`);

  const results = await runSemgrepScan(
    repository.owner.login,
    repository.name,
    pull_request.head.sha
  );

  await createCheckRun(repository.owner.login, repository.name, pull_request.head.sha, results);
});

webhooks.on('push', async ({ payload }) => {
  const { repository, head_commit } = payload;

  // Only scan main/master branch pushes
  if (!['main', 'master'].includes(payload.ref.replace('refs/heads/', ''))) {
    return;
  }

  if (!head_commit) return;

  console.log(`Push to ${repository.full_name}: ${head_commit.id}`);

  const results = await runSemgrepScan(repository.owner.login, repository.name, head_commit.id);

  await createCheckRun(repository.owner.login, repository.name, head_commit.id, results);
});

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const body = req.body;

  try {
    await webhooks.verifyAndReceive({
      id: req.headers['x-github-delivery'] as string,
      name: req.headers['x-github-event'] as any,
      signature,
      payload: body.toString(),
    });

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send('Bad Request');
  }
});

// Manual scan endpoint
app.post('/scan', async (req, res) => {
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
  console.log(`🔒 Cortex Semgrep GitHub App listening on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});

export default app;
