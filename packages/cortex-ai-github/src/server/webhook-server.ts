/**
 * Webhook Server for Cortex AI GitHub App
 * Handles GitHub webhook events and comment-as-API triggers
 */

import crypto from 'crypto';
import { EventEmitter } from 'node:events';
import express from 'express';
import { z } from 'zod';
import type { CortexAiGitHubApp } from '../core/ai-github-app';
import { type CommentTrigger, type GitHubContext } from '../types/github-models';

interface WebhookEvents {
  'comment:trigger': [trigger: CommentTrigger, context: GitHubContext, user: string];
  'webhook:verified': [event: string, delivery: string];
  'webhook:invalid': [reason: string, headers: Record<string, string>];
}

export class CortexWebhookServer extends EventEmitter<WebhookEvents> {
  private app: express.Application;
  private aiApp: CortexAiGitHubApp;
  private webhookSecret: string;
  private triggers: CommentTrigger[];
  private server?: import('http').Server;

  constructor(aiApp: CortexAiGitHubApp, webhookSecret: string, _port: number = 3000) {
    super();

    this.aiApp = aiApp;
    this.webhookSecret = webhookSecret;
    this.app = express();
    this.triggers = this.initializeDefaultTriggers();

    this.setupMiddleware();
    this.setupRoutes();
  }

  private initializeDefaultTriggers(): CommentTrigger[] {
    return [
      {
        pattern: /@cortex\s+review/i,
        taskType: 'code_review',
        description: 'Perform AI code review on PR',
        requiredPermissions: ['read'],
      },
      {
        pattern: /@cortex\s+analyze/i,
        taskType: 'pr_analysis',
        description: 'Comprehensive PR analysis',
        requiredPermissions: ['read'],
      },
      {
        pattern: /@cortex\s+secure/i,
        taskType: 'security_scan',
        description: 'Security vulnerability analysis',
        requiredPermissions: ['read'],
      },
      {
        pattern: /@cortex\s+document/i,
        taskType: 'documentation',
        description: 'Generate documentation',
        requiredPermissions: ['write'],
      },
      {
        pattern: /@cortex\s+triage/i,
        taskType: 'issue_triage',
        description: 'Intelligent issue triage',
        requiredPermissions: ['read'],
      },
      {
        pattern: /@cortex\s+optimize/i,
        taskType: 'workflow_optimize',
        description: 'Workflow optimization analysis',
        requiredPermissions: ['read'],
      },
      {
        pattern: /@cortex\s+health/i,
        taskType: 'repo_health',
        description: 'Repository health check',
        requiredPermissions: ['read'],
      },
      {
        pattern: /@cortex\s+fix(?:\s+(.+))?/i,
        taskType: 'auto_fix',
        description: 'Automated code fixes',
        requiredPermissions: ['write', 'admin'],
      },
    ];
  }

  private setupMiddleware(): void {
    // Raw body parsing for webhook signature verification
    this.app.use('/webhook', express.raw({ type: 'application/json' }));

    // Standard JSON parsing for other endpoints
    this.app.use(express.json());

    // Security headers
    this.app.use((_req, res, next) => {
      res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        queueSize: this.aiApp.queueSize,
        activeTaskCount: this.aiApp.activeTaskCount,
        rateLimit: this.aiApp.rateLimit,
      });
    });

    // Main webhook endpoint
    this.app.post('/webhook', async (req, res) => {
      try {
        const signature = req.get('X-Hub-Signature-256');
        const delivery = req.get('X-GitHub-Delivery');
        const event = req.get('X-GitHub-Event');

        if (!signature || !delivery || !event) {
          this.emit(
            'webhook:invalid',
            'Missing required headers',
            req.headers as Record<string, string>
          );
          return res.status(400).json({ error: 'Missing required webhook headers' });
        }

        if (!this.verifyWebhookSignature(req.body, signature)) {
          this.emit('webhook:invalid', 'Invalid signature', { signature, delivery, event });
          return res.status(401).json({ error: 'Invalid webhook signature' });
        }

        this.emit('webhook:verified', event, delivery);

        const payload = JSON.parse(req.body.toString());
        await this.handleWebhookEvent(event, payload);

        res.status(200).json({ received: true, delivery });
      } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Trigger management endpoints
    this.app.get('/triggers', (_req, res) => {
      res.json({
        triggers: this.triggers.map((t) => ({
          pattern: t.pattern.source,
          taskType: t.taskType,
          description: t.description,
          requiredPermissions: t.requiredPermissions,
        })),
      });
    });

    this.app.post('/triggers', (req, res) => {
      try {
        const triggerSchema = z.object({
          pattern: z.string(),
          taskType: z.enum([
            'code_review',
            'pr_analysis',
            'security_scan',
            'documentation',
            'issue_triage',
            'workflow_optimize',
            'repo_health',
            'auto_fix',
          ]),
          description: z.string(),
          requiredPermissions: z.array(z.enum(['read', 'write', 'admin'])),
        });

        const validated = triggerSchema.parse(req.body);

        const newTrigger: CommentTrigger = {
          pattern: new RegExp(validated.pattern, 'i'),
          taskType: validated.taskType,
          description: validated.description,
          requiredPermissions: validated.requiredPermissions,
        };

        this.triggers.push(newTrigger);

        res.status(201).json({
          message: 'Trigger added successfully',
          trigger: {
            pattern: newTrigger.pattern.source,
            taskType: newTrigger.taskType,
            description: newTrigger.description,
            requiredPermissions: newTrigger.requiredPermissions,
          },
        });
      } catch (error) {
        res.status(400).json({
          error: 'Invalid trigger configuration',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  private verifyWebhookSignature(payload: Buffer, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      const expected = `sha256=${expectedSignature}`;
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  private async handleWebhookEvent(event: string, payload: any): Promise<void> {
    switch (event) {
      case 'issue_comment':
        if (payload.action === 'created') {
          await this.handleCommentCreated(payload);
        }
        break;

      case 'pull_request_review_comment':
        if (payload.action === 'created') {
          await this.handleReviewCommentCreated(payload);
        }
        break;

      case 'pull_request':
        if (['opened', 'synchronize'].includes(payload.action)) {
          await this.handlePullRequestEvent(payload);
        }
        break;

      case 'issues':
        if (payload.action === 'opened') {
          await this.handleIssueOpened(payload);
        }
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }
  }

  private async handleCommentCreated(payload: any): Promise<void> {
    const comment = payload.comment.body;
    const user = payload.comment.user.login;

    for (const trigger of this.triggers) {
      if (trigger.pattern.test(comment)) {
        const context = this.buildGitHubContext(payload);

        this.emit('comment:trigger', trigger, context, user);

        try {
          const taskId = await this.aiApp.queueTask({
            taskType: trigger.taskType,
            githubContext: context,
            instructions: this.extractInstructions(comment, trigger.pattern),
          });

          console.log(`Queued ${trigger.taskType} task ${taskId} for ${user}`);
        } catch (error) {
          console.error(`Failed to queue ${trigger.taskType} task:`, error);
        }

        break; // Only process first matching trigger
      }
    }
  }

  private async handleReviewCommentCreated(payload: any): Promise<void> {
    // Similar to handleCommentCreated but for PR review comments
    await this.handleCommentCreated(payload);
  }

  private async handlePullRequestEvent(payload: any): Promise<void> {
    // Auto-trigger analysis for new/updated PRs if configured
    const context = this.buildGitHubContext(payload);

    // Example: Auto-review for PRs with specific labels
    if (payload.pull_request.labels?.some((label: any) => label.name === 'auto-review')) {
      await this.aiApp.queueTask({
        taskType: 'code_review',
        githubContext: context,
        instructions: 'Automated review triggered by PR label',
      });
    }
  }

  private async handleIssueOpened(payload: any): Promise<void> {
    // Auto-triage for new issues if configured
    const context = this.buildGitHubContext(payload);

    if (
      payload.repository.name.includes('support') ||
      payload.issue.title.toLowerCase().includes('bug')
    ) {
      await this.aiApp.queueTask({
        taskType: 'issue_triage',
        githubContext: context,
        instructions: 'Automated triage for new issue',
      });
    }
  }

  private buildGitHubContext(payload: any): GitHubContext {
    const context: GitHubContext = {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
    };

    if (payload.pull_request) {
      context.pr = {
        number: payload.pull_request.number,
        title: payload.pull_request.title,
        body: payload.pull_request.body || '',
        base: payload.pull_request.base.ref,
        head: payload.pull_request.head.ref,
        files: [], // Would need additional API call to fetch files
      };
    }

    if (payload.issue && !payload.pull_request) {
      context.issue = {
        number: payload.issue.number,
        title: payload.issue.title,
        body: payload.issue.body || '',
        labels: payload.issue.labels?.map((label: any) => label.name) || [],
      };
    }

    return context;
  }

  private extractInstructions(comment: string, pattern: RegExp): string | undefined {
    const match = comment.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
    return undefined;
  }

  public addTrigger(trigger: CommentTrigger): void {
    this.triggers.push(trigger);
  }

  public removeTrigger(pattern: string): boolean {
    const initialLength = this.triggers.length;
    this.triggers = this.triggers.filter((t) => t.pattern.source !== pattern);
    return this.triggers.length < initialLength;
  }

  public async start(port: number = 3000): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, () => {
          console.log(`Cortex AI GitHub webhook server running on port ${port}`);
          resolve();
        });

        this.server.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Cortex AI GitHub webhook server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
