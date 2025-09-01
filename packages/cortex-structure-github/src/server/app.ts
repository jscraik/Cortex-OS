/**
 * Structure Guard GitHub App Server
 * Monitors repository changes and maintains organizational standards
 */

import { Octokit } from '@octokit/rest';
import { Webhooks } from '@octokit/webhooks';
import { exec } from 'child_process';
import express from 'express';
import * as fs from 'fs-extra';
import * as path from 'path';
import { promisify } from 'util';
import { z } from 'zod';
import { AutoFixEngine } from '../core/auto-fix-engine.js';
import { CORTEX_STRUCTURE_RULES, StructureValidator } from '../core/structure-validator.js';

const execAsync = promisify(exec);

// Environment validation
const envSchema = z.object({
  PORT: z.string().default('3003'),
  GITHUB_TOKEN: z.string().optional(),
  WEBHOOK_SECRET: z.string().optional(),
  STRUCTURE_APP_ID: z.string().optional(),
  STRUCTURE_PRIVATE_KEY: z.string().optional(),
  AUTO_FIX_ENABLED: z.string().default('false'),
  DRY_RUN: z.string().default('true'),
});

const env = envSchema.parse(process.env);

// Initialize services
const app = express();
const webhooks = new Webhooks({
  secret: env.WEBHOOK_SECRET || 'development-secret',
});

const octokit = new Octokit({
  auth: env.GITHUB_TOKEN,
});

const validator = new StructureValidator(CORTEX_STRUCTURE_RULES);

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'cortex-structure-github',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Structure analysis endpoint
app.post('/analyze', async (req, res) => {
  try {
    const { repository, files } = req.body;

    if (!repository) {
      return res.status(400).json({ error: 'Repository is required' });
    }

    // Perform structure analysis
    const analysis = await performStructureAnalysis(repository, files);
    return res.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Auto-fix endpoint
app.post('/auto-fix', async (req, res) => {
  try {
    const { repository, violations, dryRun = true } = req.body;

    if (!repository || !violations) {
      return res.status(400).json({ error: 'Repository and violations are required' });
    }

    // Generate auto-fix plan
    const plan = await generateAutoFixPlan(repository, violations, dryRun);
    return res.json(plan);
  } catch (error) {
    console.error('Auto-fix error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Utility functions
function verifyWebhookSignature(payload: Buffer, signature: string): boolean {
  const webhookSecret = env.WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('⚠️  No webhook secret configured, skipping signature verification');
    return true; // Allow in development
  }

  const crypto = require('crypto');
  const expectedSignature =
    'sha256=' + crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

async function handleWebhookEvent(event: any): Promise<void> {
  console.log(`📡 Handling webhook event: ${event.action || 'unknown'}`);

  // Basic event logging
  if (event.repository) {
    console.log(`📁 Repository: ${event.repository.full_name}`);
  }

  // Handle different event types
  if (event.commits) {
    console.log(`💾 Processing ${event.commits.length} commits`);
  }

  if (event.pull_request) {
    console.log(`🔄 Pull request #${event.pull_request.number}: ${event.action}`);
  }
}

async function performStructureAnalysis(repository: string, files: string[]): Promise<any> {
  console.log(`🔍 Analyzing structure for ${repository} (${files.length} files)`);

  // Mock analysis for now - this would integrate with the StructureValidator
  const violations = [];

  for (const file of files) {
    // Check for common structure violations
    if (file.includes('node_modules/')) continue;

    // Example checks
    if (
      file.startsWith('src/') &&
      !file.includes('.ts') &&
      !file.includes('.js') &&
      !file.includes('.json')
    ) {
      violations.push({
        type: 'file_extension',
        file,
        message: 'Non-standard file extension in src directory',
        severity: 'warning',
      });
    }

    if (file.includes(' ') || (file.includes('_') && file.includes('-'))) {
      violations.push({
        type: 'naming_convention',
        file,
        message: 'Inconsistent naming convention (mixing spaces, underscores, and hyphens)',
        severity: 'warning',
      });
    }
  }

  return {
    violations,
    score: Math.max(0, 100 - violations.length * 5),
    suggestions:
      violations.length > 0 ? ['Run structure validation', 'Fix naming conventions'] : [],
  };
}

async function generateAutoFixPlan(
  repository: string,
  violations: any[],
  dryRun: boolean = true
): Promise<any> {
  console.log(
    `🔧 Generating auto-fix plan for ${violations.length} violations (dry-run: ${dryRun})`
  );

  const fixes = violations
    .filter((v) => v.type === 'naming_convention')
    .slice(0, 5) // Limit fixes
    .map((violation) => ({
      type: 'rename_file',
      from: violation.file,
      to: violation.file.replace(/ /g, '-').replace(/_/g, '-'),
      description: `Rename ${violation.file} to follow naming conventions`,
    }));

  return {
    repository,
    fixes,
    dryRun,
    estimatedTime: fixes.length * 30, // seconds
    riskLevel: fixes.length > 3 ? 'medium' : 'low',
  };
}

// Webhook endpoint
app.use('/webhook', express.raw({ type: 'application/json' }));
app.post('/webhook', async (req, res) => {
  try {
    const signature = req.get('X-Hub-Signature-256');
    const payload = req.body;

    // Verify webhook signature
    if (!signature || !verifyWebhookSignature(payload, signature)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Handle webhook event
    await handleWebhookEvent(JSON.parse(payload.toString()));
    return res.status(200).json({ message: 'OK' });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle push events
webhooks.on('push', async ({ payload }) => {
  try {
    console.log(`📁 Push event received for ${payload.repository.full_name}`);

    // Get list of modified files
    const modifiedFiles = payload.commits.flatMap((commit) => [
      ...commit.added,
      ...commit.modified,
      ...commit.removed,
    ]);

    if (modifiedFiles.length === 0) {
      console.log('No files modified, skipping analysis');
      return;
    }

    // Clone repository for analysis
    const tempDir = await cloneRepository(payload.repository.clone_url, payload.after);

    try {
      // Get all files in repository
      const allFiles = await getAllFiles(tempDir);

      // Run structure analysis
      const analysis = validator.analyzeRepository(allFiles);

      console.log(`📊 Structure analysis completed:
        - Score: ${analysis.score}/100
        - Violations: ${analysis.summary.violationsCount}
        - Auto-fixable: ${analysis.summary.autoFixableCount}`);

      // Create check run with results
      await createCheckRun(payload, analysis);

      // Auto-fix if enabled and safe
      if (env.AUTO_FIX_ENABLED === 'true' && analysis.summary.autoFixableCount > 0) {
        await attemptAutoFix(payload, analysis.violations, tempDir);
      }
    } finally {
      // Cleanup temporary directory
      await fs.remove(tempDir);
    }
  } catch (error) {
    console.error('Error processing push event:', error);
  }
});

// Handle pull request events
webhooks.on(['pull_request.opened', 'pull_request.synchronize'], async ({ payload }) => {
  try {
    console.log(
      `🔍 PR event received for ${payload.repository.full_name}#${payload.pull_request.number}`
    );

    // Get PR file changes
    const prFiles = await octokit.rest.pulls.listFiles({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number: payload.pull_request.number,
    });

    const changedFiles = prFiles.data.map((file) => file.filename);

    if (changedFiles.length === 0) {
      console.log('No files changed in PR, skipping analysis');
      return;
    }

    // Clone PR branch for analysis
    const tempDir = await cloneRepository(
      payload.repository.clone_url,
      payload.pull_request.head.sha
    );

    try {
      // Analyze only changed files for PR
      const violations = changedFiles.flatMap((file) => validator.validateFile(file));

      const analysis = {
        violations,
        score: Math.max(0, 100 - violations.length * 5),
        summary: {
          totalFiles: changedFiles.length,
          violationsCount: violations.length,
          autoFixableCount: violations.filter((v) => v.autoFixable).length,
        },
      };

      console.log(`📊 PR structure analysis completed:
        - Score: ${analysis.score}/100
        - Violations: ${analysis.summary.violationsCount}
        - Auto-fixable: ${analysis.summary.autoFixableCount}`);

      // Create check run for PR
      await createCheckRun(payload, analysis);

      // Comment on PR if there are violations
      if (violations.length > 0) {
        await createPRComment(payload, analysis);
      }
    } finally {
      await fs.remove(tempDir);
    }
  } catch (error) {
    console.error('Error processing PR event:', error);
  }
});

async function cloneRepository(cloneUrl: string, sha: string): Promise<string> {
  const tempDir = path.join('/tmp', `structure-analysis-${Date.now()}`);
  await fs.ensureDir(tempDir);

  const gitUrl = cloneUrl.replace('https://github.com/', 'https://github.com/');
  await execAsync(`git clone --depth 1 ${gitUrl} ${tempDir}`);
  await execAsync(`cd ${tempDir} && git checkout ${sha}`);

  return tempDir;
}

async function getAllFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string, relativePath = '') {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativeFilePath = path.join(relativePath, entry.name);

      // Skip hidden files and node_modules
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(fullPath, relativeFilePath);
      } else {
        files.push(relativeFilePath);
      }
    }
  }

  await walk(dir);
  return files;
}

async function createCheckRun(payload: any, analysis: any) {
  try {
    const checkRun = await octokit.rest.checks.create({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      name: 'Repository Structure Guard',
      head_sha: payload.after || payload.pull_request?.head.sha,
      status: 'completed',
      conclusion: analysis.score >= 80 ? 'success' : analysis.score >= 60 ? 'neutral' : 'failure',
      output: {
        title: `Structure Score: ${analysis.score}/100`,
        summary: generateCheckSummary(analysis),
        annotations: analysis.violations.slice(0, 50).map((violation: any) => ({
          path: violation.file,
          start_line: 1,
          end_line: 1,
          annotation_level: violation.severity === 'error' ? 'failure' : 'warning',
          message: violation.message,
          title: `${violation.type}: ${violation.rule}`,
        })),
      },
    });

    console.log(`✅ Check run created: ${checkRun.data.html_url}`);
  } catch (error) {
    console.error('Error creating check run:', error);
  }
}

function generateCheckSummary(analysis: any): string {
  const { score, summary, violations } = analysis;

  let markdown = `## Repository Structure Analysis\n\n`;
  markdown += `**Score:** ${score}/100\n`;
  markdown += `**Files Analyzed:** ${summary.totalFiles}\n`;
  markdown += `**Violations Found:** ${summary.violationsCount}\n`;
  markdown += `**Auto-fixable:** ${summary.autoFixableCount}\n\n`;

  if (violations.length > 0) {
    markdown += `### Violations by Type\n\n`;

    const groupedViolations = violations.reduce((acc: any, v: any) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {});

    for (const [type, count] of Object.entries(groupedViolations)) {
      markdown += `- **${type}:** ${count}\n`;
    }

    markdown += `\n### Sample Violations\n\n`;
    violations.slice(0, 10).forEach((v: any) => {
      markdown += `- **${v.file}**: ${v.message}\n`;
      if (v.suggestedPath) {
        markdown += `  - Suggested: \`${v.suggestedPath}\`\n`;
      }
    });
  } else {
    markdown += `🎉 **Perfect!** No structural violations found.\n`;
  }

  return markdown;
}

async function createPRComment(payload: any, analysis: any) {
  try {
    const comment = `## 📁 Repository Structure Analysis

**Score:** ${analysis.score}/100
**Violations:** ${analysis.summary.violationsCount}
**Auto-fixable:** ${analysis.summary.autoFixableCount}

${
  analysis.violations.length > 0
    ? `### Issues Found:\n${analysis.violations
        .slice(0, 5)
        .map(
          (v: any) =>
            `- **${v.file}**: ${v.message}${v.suggestedPath ? `\n  - Suggested: \`${v.suggestedPath}\`` : ''}`
        )
        .join('\n')}`
    : '🎉 No structural issues found!'
}

---
*Powered by Cortex Structure Guard*`;

    await octokit.rest.issues.createComment({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.pull_request.number,
      body: comment,
    });

    console.log('✅ PR comment created');
  } catch (error) {
    console.error('Error creating PR comment:', error);
  }
}

async function attemptAutoFix(payload: any, violations: any[], tempDir: string) {
  try {
    const autoFix = new AutoFixEngine(tempDir, env.DRY_RUN === 'true');
    const plan = autoFix.generateFixPlan(violations);

    if (plan.requiresApproval) {
      console.log('Auto-fix requires approval, skipping');
      return;
    }

    if (env.DRY_RUN !== 'true') {
      const results = await autoFix.executeFixPlan(plan);
      console.log(
        `🔧 Auto-fix completed: ${results.filter((r) => r.success).length} successful fixes`
      );

      // Create PR with fixes (implementation would go here)
      // await createAutoFixPR(payload, results);
    } else {
      console.log(`🔧 Auto-fix plan generated (dry run): ${plan.fixes.length} potential fixes`);
    }
  } catch (error) {
    console.error('Error during auto-fix:', error);
  }
}

// Start server
const port = parseInt(env.PORT);
app.listen(port, () => {
  console.log(`🚀 Cortex Structure Guard GitHub App running on port ${port}`);
  console.log(`📊 Monitoring repository structure with ${CORTEX_STRUCTURE_RULES.length} rules`);
  console.log(`🔧 Auto-fix: ${env.AUTO_FIX_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
  console.log(`🧪 Dry run: ${env.DRY_RUN === 'true' ? 'Enabled' : 'Disabled'}`);
});
