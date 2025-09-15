/**
 * Structure Guard GitHub App Server
 * Monitors repository changes and maintains organizational standards
 */

import { spawn } from 'node:child_process';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import * as path from 'node:path';
import { Octokit } from '@octokit/rest';
import { Webhooks } from '@octokit/webhooks';
import dotenv from 'dotenv';
import express from 'express';
import * as fs from 'fs-extra';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

import { AutoFixEngine } from '../core/auto-fix-engine';
import {
	CORTEX_STRUCTURE_RULES,
	StructureValidator,
} from '../core/structure-validator';
import { analyzeBackendStructure } from '../lib/backend-structure-agent';
import { ContextAnalyzer } from '../lib/context-analyzer';
import { analyzeFrontendStructure } from '../lib/frontend-structure-agent';

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
const contextAnalyzer = new ContextAnalyzer();

// Health check endpoint
app.get('/health', (_req, res) => {
	res.json({
		status: 'healthy',
		service: 'cortex-structure-github',
		timestamp: new Date().toISOString(),
		version: '1.0.0',
	});
});

// Structure analysis endpoint (use JSON body parsing for this route only)
app.post('/analyze', express.json(), async (req, res) => {
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

// Auto-fix endpoint (use JSON body parsing for this route only)
app.post('/auto-fix', express.json(), async (req, res) => {
	try {
		const { repository, violations, dryRun = true } = req.body;

		if (!repository || !violations) {
			return res
				.status(400)
				.json({ error: 'Repository and violations are required' });
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
function _verifyWebhookSignature(payload: Buffer, signature: string): boolean {
	const webhookSecret = env.WEBHOOK_SECRET;
	if (!webhookSecret) {
		console.warn(
			'⚠️  No webhook secret configured, skipping signature verification',
		);
		return true; // Allow in development
	}

	const expectedSignature = `sha256=${createHmac('sha256', webhookSecret).update(payload).digest('hex')}`;

	return timingSafeEqual(
		Buffer.from(signature),
		Buffer.from(expectedSignature),
	);
}

async function _handleWebhookEvent(event: any): Promise<void> {
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
		console.log(
			`🔄 Pull request #${event.pull_request.number}: ${event.action}`,
		);
	}
}

async function performStructureAnalysis(
	repository: string,
	files: string[],
): Promise<any> {
	console.log(
		`🔍 Analyzing structure for ${repository} (${files.length} files)`,
	);

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
				message:
					'Inconsistent naming convention (mixing spaces, underscores, and hyphens)',
				severity: 'warning',
			});
		}
	}

	return {
		violations,
		score: Math.max(0, 100 - violations.length * 5),
		suggestions:
			violations.length > 0
				? ['Run structure validation', 'Fix naming conventions']
				: [],
	};
}

async function generateAutoFixPlan(
	repository: string,
	violations: any[],
	dryRun: boolean = true,
): Promise<any> {
	console.log(
		`🔧 Generating auto-fix plan for ${violations.length} violations (dry-run: ${dryRun})`,
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

// Webhook endpoint: must receive RAW body and delegate to @octokit/webhooks
app.use('/webhook', express.raw({ type: 'application/json' }));
webhooks.onError((error) => {
	console.error('❌ Webhook handler error:', error);
	if ((error as any).event) {
		console.error('Event context:', (error as any).event.name);
	}
});
app.post('/webhook', async (req, res) => {
	try {
		const id = req.headers['x-github-delivery'] as string | undefined;
		const name = req.headers['x-github-event'] as string | undefined;
		const signature = req.headers['x-hub-signature-256'] as string | undefined;

		// Convert body to raw string for signature verification
		const rawBody = req.body as
			| Buffer
			| string
			| Record<string, unknown>
			| undefined;
		const payload = Buffer.isBuffer(rawBody)
			? rawBody.toString('utf8')
			: typeof rawBody === 'string'
				? rawBody
				: JSON.stringify(rawBody ?? {});

		await webhooks.verifyAndReceive({
			id: id || '',
			name: (name || 'unknown') as any,
			payload,
			signature: signature || '',
		});

		res.status(200).json({ ok: true });
	} catch (error) {
		console.error('Webhook error:', error);
		// Signature verification failures throw; respond 401
		res.status(401).json({ error: 'Signature verification failed' });
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
		const tempDir = await cloneRepository(
			payload.repository.clone_url,
			payload.after,
		);

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
			if (
				env.AUTO_FIX_ENABLED === 'true' &&
				analysis.summary.autoFixableCount > 0
			) {
				await attemptAutoFix(analysis.violations, tempDir);
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
webhooks.on(
	['pull_request.opened', 'pull_request.synchronize'],
	async ({ payload }) => {
		try {
			console.log(
				`🔍 PR event received for ${payload.repository.full_name}#${payload.pull_request.number}`,
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
				payload.pull_request.head.sha,
			);

			try {
				// Analyze only changed files for PR
				const violations = changedFiles.flatMap((file) =>
					validator.validateFile(file),
				);

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
	},
);

// Handle issue comment events (for @insula commands)
webhooks.on('issue_comment.created', async ({ payload }) => {
	try {
		const comment = payload.comment.body;
		const user = payload.comment.user.login;

		console.log(
			`💬 Comment received from ${user}: ${comment.substring(0, 100)}...`,
		);

		// Check for @insula commands
		if (comment.includes('@insula')) {
			console.log('🎯 @insula command detected');

			// Frontend-specific commands
			if (comment.match(/@insula\s+frontend\s+(analyze|check|review)/i)) {
				await handleFrontendAnalysis(payload, user);
			} else if (
				comment.match(/@insula\s+frontend\s+(fix|auto-fix|autofix)/i)
			) {
				await handleFrontendFix(payload, user);
			} else if (comment.match(/@insula\s+frontend\s+(scaffold|generate)/i)) {
				await handleFrontendScaffold(payload, user);
			}
			// Backend-specific commands
			else if (comment.match(/@insula\s+backend\s+(analyze|check|review)/i)) {
				await handleBackendAnalysis(payload, user);
			} else if (comment.match(/@insula\s+backend\s+(fix|auto-fix|autofix)/i)) {
				await handleBackendFix(payload, user);
			} else if (comment.match(/@insula\s+backend\s+(scaffold|generate)/i)) {
				await handleBackendScaffold(payload, user);
			}
			// General structure commands (existing functionality)
			else if (comment.match(/@insula\s+(analyze|analysis|check|review)/i)) {
				await handleAnalyzeCommand(payload, user);
			} else if (comment.match(/@insula\s+(fix|auto-fix|autofix)/i)) {
				await handleAutoFixCommand(payload, user);
			} else if (comment.match(/@insula\s+(help|commands)/i)) {
				await handleHelpCommand(payload, user);
			} else {
				// Generic @insula mention - show help
				await handleHelpCommand(payload, user);
			}
		}
	} catch (error) {
		console.error('Error processing comment event:', error);
	}
});

// Handle pull request review comment events (for @insula commands in code review)
webhooks.on('pull_request_review_comment.created', async ({ payload }) => {
	try {
		const comment = payload.comment.body;
		const user = payload.comment.user.login;

		console.log(
			`💬 Review comment received from ${user}: ${comment.substring(0, 100)}...`,
		);

		// Check for @insula commands in review comments
		if (comment.includes('@insula')) {
			console.log('🎯 @insula command detected in review comment');

			// Frontend-specific commands
			if (comment.match(/@insula\s+frontend\s+(analyze|check|review)/i)) {
				await handleFrontendAnalysis(payload, user);
			} else if (
				comment.match(/@insula\s+frontend\s+(fix|auto-fix|autofix)/i)
			) {
				await handleFrontendFix(payload, user);
			} else if (comment.match(/@insula\s+frontend\s+(scaffold|generate)/i)) {
				await handleFrontendScaffold(payload, user);
			}
			// Backend-specific commands
			else if (comment.match(/@insula\s+backend\s+(analyze|check|review)/i)) {
				await handleBackendAnalysis(payload, user);
			} else if (comment.match(/@insula\s+backend\s+(fix|auto-fix|autofix)/i)) {
				await handleBackendFix(payload, user);
			} else if (comment.match(/@insula\s+backend\s+(scaffold|generate)/i)) {
				await handleBackendScaffold(payload, user);
			}
			// General structure commands
			else if (comment.match(/@insula\s+(analyze|analysis|check|review)/i)) {
				await handleAnalyzeCommand(payload, user);
			} else if (comment.match(/@insula\s+(fix|auto-fix|autofix)/i)) {
				await handleAutoFixCommand(payload, user);
			}
		}
	} catch (error) {
		console.error('Error processing review comment event:', error);
	}
});

async function handleAnalyzeCommand(payload: any, user: string) {
	try {
		console.log(`🔍 ${user} requested structure analysis`);

		const repo = payload.repository;
		const issueNumber = payload.issue?.number || payload.pull_request?.number;

		if (!issueNumber) {
			console.error('No issue/PR number found for analysis');
			return;
		}

		// Post initial reaction to show we're working
		await octokit.rest.reactions.createForIssueComment({
			owner: repo.owner.login,
			repo: repo.name,
			comment_id: payload.comment.id,
			content: 'eyes',
		});

		// For PR comments, analyze the PR branch
		if (payload.pull_request || payload.issue?.pull_request) {
			const prNumber = payload.pull_request?.number || issueNumber;

			// Get PR details
			const prData = await octokit.rest.pulls.get({
				owner: repo.owner.login,
				repo: repo.name,
				pull_number: prNumber,
			});

			// Get PR file changes
			const prFiles = await octokit.rest.pulls.listFiles({
				owner: repo.owner.login,
				repo: repo.name,
				pull_number: prNumber,
			});

			const changedFiles = prFiles.data.map((file) => file.filename);

			// Clone PR branch for analysis
			const tempDir = await cloneRepository(
				repo.clone_url,
				prData.data.head.sha,
			);

			try {
				// Analyze changed files
				const violations = changedFiles.flatMap((file) =>
					validator.validateFile(file),
				);

				const analysis = {
					violations,
					score: Math.max(0, 100 - violations.length * 5),
					summary: {
						totalFiles: changedFiles.length,
						violationsCount: violations.length,
						autoFixableCount: violations.filter((v) => v.autoFixable).length,
					},
				};

				// Create response comment
				const responseComment = generateAnalysisComment(
					analysis,
					user,
					changedFiles,
				);

				await octokit.rest.issues.createComment({
					owner: repo.owner.login,
					repo: repo.name,
					issue_number: issueNumber,
					body: responseComment,
				});

				// Add success reaction
				await octokit.rest.reactions.createForIssueComment({
					owner: repo.owner.login,
					repo: repo.name,
					comment_id: payload.comment.id,
					content: 'rocket',
				});

				console.log('✅ Structure analysis completed and posted');
			} finally {
				await fs.remove(tempDir);
			}
		}
	} catch (error) {
		console.error('Error handling analyze command:', error);

		// Add error reaction
		try {
			await octokit.rest.reactions.createForIssueComment({
				owner: payload.repository.owner.login,
				repo: payload.repository.name,
				comment_id: payload.comment.id,
				content: 'confused',
			});
		} catch (reactionError) {
			console.error('Error adding error reaction:', reactionError);
		}
	}
}

async function handleAutoFixCommand(payload: any, user: string) {
	try {
		console.log(`🔧 ${user} requested auto-fix`);

		const repo = payload.repository;
		const issueNumber = payload.issue?.number || payload.pull_request?.number;

		// Post response about auto-fix capability
		const responseComment = `@${user} Auto-fix functionality is currently in development.

🔧 **Available soon:**
- Automatic naming convention fixes
- Directory structure reorganization
- Import statement cleanup
- File extension standardization

For now, please run \`@insula analyze\` to see what needs to be fixed manually.`;

		await octokit.rest.issues.createComment({
			owner: repo.owner.login,
			repo: repo.name,
			issue_number: issueNumber,
			body: responseComment,
		});
	} catch (error) {
		console.error('Error handling auto-fix command:', error);
	}
}

async function handleHelpCommand(payload: any, user: string) {
	try {
		console.log(`❓ ${user} requested help`);

		const repo = payload.repository;
		const issueNumber = payload.issue?.number || payload.pull_request?.number;

		const helpComment = `@${user} **Insula Structure Guard Commands:**

🔍 **General Analysis:**
- \`@insula analyze\` - Full repository structure analysis
- \`@insula check\` - Same as analyze
- \`@insula review\` - Structure review

🎨 **Frontend Commands:**
- \`@insula frontend analyze\` - Frontend-specific analysis (React/Vue/Angular)
- \`@insula frontend fix\` - Auto-fix frontend issues
- \`@insula frontend scaffold\` - Generate frontend templates (coming soon)

⚙️ **Backend Commands:**
- \`@insula backend analyze\` - Backend-specific analysis (Node.js/Python/Go)
- \`@insula backend fix\` - Auto-fix backend issues
- \`@insula backend scaffold\` - Generate backend templates (coming soon)

🔧 **Fix Commands:**
- \`@insula fix\` - Auto-fix general issues
- \`@insula autofix\` - Same as fix

❓ **Help:**
- \`@insula help\` - Show this help
- \`@insula commands\` - List all commands

I'm your repository structure guardian with specialized frontend & backend expertise! 🛡️`;

		await octokit.rest.issues.createComment({
			owner: repo.owner.login,
			repo: repo.name,
			issue_number: issueNumber,
			body: helpComment,
		});
	} catch (error) {
		console.error('Error handling help command:', error);
	}
}

// Frontend-specific command handlers
async function handleFrontendAnalysis(payload: any, user: string) {
	try {
		console.log(`🎨 ${user} requested frontend structure analysis`);

		// Progressive status: Step 1 - Processing
		await updateProgressiveStatus(payload, 'processing');

		const repo = payload.repository;
		const issueNumber = payload.issue?.number || payload.pull_request?.number;

		// Progressive status: Step 2 - Working
		await updateProgressiveStatus(payload, 'working');

		// Clone repository for analysis
		const tempDir = await cloneRepository(repo.clone_url, repo.default_branch);

		try {
			// Build context-aware command context
			const commandContext = await contextAnalyzer.buildCommandContext(
				payload,
				tempDir,
				'analyze',
				'frontend',
			);

			// Generate context-aware response first
			let responseComment = contextAnalyzer.generateContextAwareResponse(
				commandContext,
				user,
			);
			responseComment += '\n\n---\n\n';

			// Run frontend-specific analysis
			const analysis = await analyzeFrontendStructure(tempDir);

			// Append detailed analysis
			responseComment += generateFrontendAnalysisComment(analysis, user);

			await octokit.rest.issues.createComment({
				owner: repo.owner.login,
				repo: repo.name,
				issue_number: issueNumber,
				body: responseComment,
			});

			// Progressive status: Step 3 - Success
			await updateProgressiveStatus(payload, 'success');
			console.log('✅ Frontend analysis posted');
		} finally {
			await fs.remove(tempDir);
		}
	} catch (error) {
		console.error('Error handling frontend analysis:', error);
		// Progressive status: Step 3 - Error
		await updateProgressiveStatus(payload, 'error');
		await postErrorComment(payload, user, 'frontend analysis');
	}
}

async function handleFrontendFix(payload: any, user: string) {
	try {
		console.log(`🔧 ${user} requested frontend auto-fix`);

		// Progressive status: Step 1 - Processing
		await updateProgressiveStatus(payload, 'processing');

		// Clone repository for context analysis
		const tempDir = await cloneRepository(
			payload.repository.clone_url,
			payload.repository.default_branch,
		);

		try {
			// Build context-aware command context
			const commandContext = await contextAnalyzer.buildCommandContext(
				payload,
				tempDir,
				'fix',
				'frontend',
			);

			// Generate context-aware response
			const contextResponse = contextAnalyzer.generateContextAwareResponse(
				commandContext,
				user,
			);

			const responseComment = `${contextResponse}

**🎨 Frontend Auto-Fix Status:**

🔧 **Available soon:**
- Component naming convention fixes
- Hook placement optimization
- Import statement organization
- CSS/styling structure improvements
- Route organization cleanup

For now, please run \`@insula frontend analyze\` to see specific frontend issues.`;

			const repo = payload.repository;
			const issueNumber = payload.issue?.number || payload.pull_request?.number;

			await octokit.rest.issues.createComment({
				owner: repo.owner.login,
				repo: repo.name,
				issue_number: issueNumber,
				body: responseComment,
			});
		} finally {
			await fs.remove(tempDir);
		}
	} catch (error) {
		console.error('Error handling frontend fix command:', error);
	}
}

async function handleFrontendScaffold(payload: any, user: string) {
	try {
		console.log(`🏗️ ${user} requested frontend scaffolding`);

		// Progressive status: Step 1 - Processing
		await updateProgressiveStatus(payload, 'processing');

		// Clone repository for context analysis
		const tempDir = await cloneRepository(
			payload.repository.clone_url,
			payload.repository.default_branch,
		);

		try {
			// Build context-aware command context
			const commandContext = await contextAnalyzer.buildCommandContext(
				payload,
				tempDir,
				'scaffold',
				'frontend',
			);

			// Generate context-aware response
			const contextResponse = contextAnalyzer.generateContextAwareResponse(
				commandContext,
				user,
			);

			const responseComment = `${contextResponse}

**🎨 Frontend Scaffolding Status:**

🏗️ **Available soon:**
- React component templates
- Custom hook generators
- Page structure scaffolds
- Styling boilerplates (CSS modules, styled-components)
- Route configuration templates

For now, run \`@insula frontend analyze\` to understand current structure.`;

			const repo = payload.repository;
			const issueNumber = payload.issue?.number || payload.pull_request?.number;

			await octokit.rest.issues.createComment({
				owner: repo.owner.login,
				repo: repo.name,
				issue_number: issueNumber,
				body: responseComment,
			});
		} finally {
			await fs.remove(tempDir);
		}
	} catch (error) {
		console.error('Error handling frontend scaffold command:', error);
	}
}

// Backend-specific command handlers
async function handleBackendAnalysis(payload: any, user: string) {
	try {
		console.log(`⚙️ ${user} requested backend structure analysis`);

		// Progressive status: Step 1 - Processing
		await updateProgressiveStatus(payload, 'processing');

		const repo = payload.repository;
		const issueNumber = payload.issue?.number || payload.pull_request?.number;

		// Progressive status: Step 2 - Working
		await updateProgressiveStatus(payload, 'working');

		// Clone repository for analysis
		const tempDir = await cloneRepository(repo.clone_url, repo.default_branch);

		try {
			// Build context-aware command context
			const commandContext = await contextAnalyzer.buildCommandContext(
				payload,
				tempDir,
				'analyze',
				'backend',
			);

			// Generate context-aware response first
			let responseComment = contextAnalyzer.generateContextAwareResponse(
				commandContext,
				user,
			);
			responseComment += '\n\n---\n\n';

			// Run backend-specific analysis
			const analysis = await analyzeBackendStructure(tempDir);

			// Append detailed analysis
			responseComment += generateBackendAnalysisComment(analysis, user);

			await octokit.rest.issues.createComment({
				owner: repo.owner.login,
				repo: repo.name,
				issue_number: issueNumber,
				body: responseComment,
			});

			// Progressive status: Step 3 - Success
			await updateProgressiveStatus(payload, 'success');
			console.log('✅ Backend analysis posted');
		} finally {
			await fs.remove(tempDir);
		}
	} catch (error) {
		console.error('Error handling backend analysis:', error);
		// Progressive status: Step 3 - Error
		await updateProgressiveStatus(payload, 'error');
		await postErrorComment(payload, user, 'backend analysis');
	}
}

async function handleBackendFix(payload: any, user: string) {
	try {
		console.log(`🔧 ${user} requested backend auto-fix`);

		// Progressive status: Step 1 - Processing
		await updateProgressiveStatus(payload, 'processing');

		// Clone repository for context analysis
		const tempDir = await cloneRepository(
			payload.repository.clone_url,
			payload.repository.default_branch,
		);

		try {
			// Build context-aware command context
			const commandContext = await contextAnalyzer.buildCommandContext(
				payload,
				tempDir,
				'fix',
				'backend',
			);

			// Generate context-aware response
			const contextResponse = contextAnalyzer.generateContextAwareResponse(
				commandContext,
				user,
			);

			const responseComment = `${contextResponse}

**⚙️ Backend Auto-Fix Status:**

🔧 **Available soon:**
- Layer separation fixes (controller/service/model)
- API endpoint organization
- Database schema optimization
- Middleware placement corrections
- Configuration file consolidation

For now, please run \`@insula backend analyze\` to see specific backend issues.`;

			const repo = payload.repository;
			const issueNumber = payload.issue?.number || payload.pull_request?.number;

			await octokit.rest.issues.createComment({
				owner: repo.owner.login,
				repo: repo.name,
				issue_number: issueNumber,
				body: responseComment,
			});
		} finally {
			await fs.remove(tempDir);
		}
	} catch (error) {
		console.error('Error handling backend fix command:', error);
	}
}

async function handleBackendScaffold(payload: any, user: string) {
	try {
		console.log(`🏗️ ${user} requested backend scaffolding`);

		// Progressive status: Step 1 - Processing
		await updateProgressiveStatus(payload, 'processing');

		// Clone repository for context analysis
		const tempDir = await cloneRepository(
			payload.repository.clone_url,
			payload.repository.default_branch,
		);

		try {
			// Build context-aware command context
			const commandContext = await contextAnalyzer.buildCommandContext(
				payload,
				tempDir,
				'scaffold',
				'backend',
			);

			// Generate context-aware response
			const contextResponse = contextAnalyzer.generateContextAwareResponse(
				commandContext,
				user,
			);

			const responseComment = `${contextResponse}

**⚙️ Backend Scaffolding Status:**

🏗️ **Available soon:**
- Controller/Service/Model templates
- API endpoint generators
- Database migration scaffolds
- Authentication middleware templates
- Configuration boilerplates

For now, run \`@insula backend analyze\` to understand current architecture.`;

			const repo = payload.repository;
			const issueNumber = payload.issue?.number || payload.pull_request?.number;

			await octokit.rest.issues.createComment({
				owner: repo.owner.login,
				repo: repo.name,
				issue_number: issueNumber,
				body: responseComment,
			});
		} finally {
			await fs.remove(tempDir);
		}
	} catch (error) {
		console.error('Error handling backend scaffold command:', error);
	}
}

// Helper functions for specialized analysis comments
function generateFrontendAnalysisComment(analysis: any, user: string): string {
	let comment = `@${user} **🎨 Frontend Structure Analysis**\n\n`;
	comment += `**Framework:** ${analysis.framework}\n`;
	comment += `**Score:** ${analysis.score}/100 ${analysis.score >= 80 ? '🎉' : analysis.score >= 60 ? '⚠️' : '❌'}\n\n`;

	comment += `**📊 Component Analysis:**\n`;
	comment += `- Total Components: ${analysis.componentAnalysis.totalComponents}\n`;
	comment += `- Oversized: ${analysis.componentAnalysis.oversizedComponents.length}\n`;
	comment += `- Misnamed: ${analysis.componentAnalysis.misnamedComponents.length}\n\n`;

	if (analysis.framework === 'react' || analysis.framework === 'next') {
		comment += `**🪝 Hook Analysis:**\n`;
		comment += `- Custom Hooks: ${analysis.hookAnalysis.customHooks}\n`;
		comment += `- Misnamed: ${analysis.hookAnalysis.misnamedHooks.length}\n\n`;
	}

	if (analysis.violations.length > 0) {
		comment += `**🔍 Frontend Issues:**\n`;
		analysis.violations.slice(0, 5).forEach((violation: any) => {
			comment += `- **${violation.file}**: ${violation.message}\n`;
		});

		if (analysis.violations.length > 5) {
			comment += `- ... and ${analysis.violations.length - 5} more\n`;
		}
	} else {
		comment += `✅ **Excellent!** No frontend structure issues found!\n`;
	}

	comment += `\n**💡 Recommendations:**\n`;
	analysis.recommendations.forEach((rec: string) => {
		comment += `- ${rec}\n`;
	});

	return comment;
}

function generateBackendAnalysisComment(analysis: any, user: string): string {
	let comment = `@${user} **⚙️ Backend Structure Analysis**\n\n`;
	comment += `**Language:** ${analysis.language}\n`;
	comment += `**Framework:** ${analysis.framework}\n`;
	comment += `**Architecture:** ${analysis.architecture}\n`;
	comment += `**Score:** ${analysis.score}/100 ${analysis.score >= 80 ? '🎉' : analysis.score >= 60 ? '⚠️' : '❌'}\n\n`;

	comment += `**📋 Layer Analysis:**\n`;
	comment += `- Controllers: ${analysis.layerAnalysis.controllers.count} (${analysis.layerAnalysis.controllers.violations} issues)\n`;
	comment += `- Services: ${analysis.layerAnalysis.services.count} (${analysis.layerAnalysis.services.violations} issues)\n`;
	comment += `- Models: ${analysis.layerAnalysis.models.count} (${analysis.layerAnalysis.models.violations} issues)\n\n`;

	comment += `**🔒 Security Analysis:**\n`;
	comment += `- Missing Validation: ${analysis.securityAnalysis.missingValidation.length}\n`;
	comment += `- Unsafe Operations: ${analysis.securityAnalysis.unsafeOperations.length}\n\n`;

	comment += `**🧪 Test Coverage:**\n`;
	comment += `- Coverage: ${analysis.testCoverage.coveragePercentage}%\n`;
	comment += `- Untested Files: ${analysis.testCoverage.untested.length}\n\n`;

	if (analysis.violations.length > 0) {
		comment += `**🔍 Backend Issues:**\n`;
		analysis.violations.slice(0, 5).forEach((violation: any) => {
			comment += `- **${violation.file}**: ${violation.message} (${violation.layer || 'general'})\n`;
		});

		if (analysis.violations.length > 5) {
			comment += `- ... and ${analysis.violations.length - 5} more\n`;
		}
	} else {
		comment += `✅ **Excellent!** No backend structure issues found!\n`;
	}

	comment += `\n**💡 Recommendations:**\n`;
	analysis.recommendations.forEach((rec: string) => {
		comment += `- ${rec}\n`;
	});

	return comment;
}

async function postErrorComment(payload: any, user: string, operation: string) {
	try {
		const repo = payload.repository;
		const issueNumber = payload.issue?.number || payload.pull_request?.number;

		const errorComment = `@${user} ❌ Sorry, I encountered an error during ${operation}. Please try again or contact support if the issue persists.`;

		await octokit.rest.issues.createComment({
			owner: repo.owner.login,
			repo: repo.name,
			issue_number: issueNumber,
			body: errorComment,
		});
	} catch (error) {
		console.error('Error posting error comment:', error);
	}
}

function generateAnalysisComment(
	analysis: any,
	user: string,
	_changedFiles: string[],
): string {
	const { score, summary, violations } = analysis;

	let comment = `@${user} **📁 Structure Analysis Results**\n\n`;
	comment += `**Score:** ${score}/100 ${score >= 80 ? '🎉' : score >= 60 ? '⚠️' : '❌'}\n`;
	comment += `**Files Analyzed:** ${summary.totalFiles}\n`;
	comment += `**Violations Found:** ${summary.violationsCount}\n`;
	comment += `**Auto-fixable:** ${summary.autoFixableCount}\n\n`;

	if (violations.length === 0) {
		comment += `✅ **Excellent!** No structure violations found in the changed files.\n`;
		comment += `Your code follows all organizational standards! 🎉\n`;
	} else {
		comment += `## 🔍 Violations Found\n\n`;

		// Group violations by type
		const violationsByType = violations.reduce((acc: any, violation: any) => {
			if (!acc[violation.type]) acc[violation.type] = [];
			acc[violation.type].push(violation);
			return acc;
		}, {});

		for (const [type, typeViolations] of Object.entries(violationsByType)) {
			comment += `### ${type.replace(/_/g, ' ').toUpperCase()}\n`;
			(typeViolations as any[]).slice(0, 5).forEach((violation) => {
				comment += `- **${violation.file}**: ${violation.message}\n`;
			});

			if ((typeViolations as any[]).length > 5) {
				comment += `- ... and ${(typeViolations as any[]).length - 5} more\n`;
			}
			comment += `\n`;
		}

		if (summary.autoFixableCount > 0) {
			comment += `💡 **Good news!** ${summary.autoFixableCount} violations can be auto-fixed.\n`;
			comment += `Run \`@insula fix\` to apply automatic fixes.\n\n`;
		}
	}

	comment += `---\n*Analysis completed at ${new Date().toISOString()}*`;

	return comment;
}

async function cloneRepository(cloneUrl: string, sha: string): Promise<string> {
	// Import security validators
	const { validateGitHubUrl, validateCommitSha } = await import(
		'../lib/security-validators.js'
	);

	// Use strengthened security validation
	const urlValidation = validateGitHubUrl(cloneUrl);
	if (!urlValidation.valid) {
		throw new Error(`GitHub URL validation failed: ${urlValidation.error}`);
	}

	const shaValidation = validateCommitSha(sha);
	if (!shaValidation.valid) {
		throw new Error(`Commit SHA validation failed: ${shaValidation.error}`);
	}

	const tempDir = path.join(
		'/tmp',
		`structure-analysis-${Date.now()}-${randomUUID()}`,
	);
	await fs.ensureDir(tempDir);

	return new Promise((resolve, reject) => {
		const clone = spawn('git', ['clone', '--depth', '1', cloneUrl, tempDir], {
			stdio: 'pipe',
			timeout: 300000,
		});

		let stderr = '';
		clone.stderr?.on('data', (data) => {
			stderr += data.toString();
		});

		clone.on('close', (code) => {
			if (code === 0) {
				const checkout = spawn('git', ['checkout', sha], {
					cwd: tempDir,
					stdio: 'pipe',
					timeout: 60000,
				});

				let checkoutStderr = '';
				checkout.stderr?.on('data', (data) => {
					checkoutStderr += data.toString();
				});

				checkout.on('close', (checkoutCode) => {
					if (checkoutCode === 0) {
						resolve(tempDir);
					} else {
						reject(new Error(`Checkout failed: ${checkoutStderr}`));
					}
				});

				checkout.on('error', (error) => {
					reject(new Error(`Checkout error: ${error.message}`));
				});
			} else {
				reject(new Error(`Clone failed: ${stderr}`));
			}
		});

		clone.on('error', (error) => {
			reject(new Error(`Clone error: ${error.message}`));
		});
	});
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
			conclusion:
				analysis.score >= 80
					? 'success'
					: analysis.score >= 60
						? 'neutral'
						: 'failure',
			output: {
				title: `Structure Score: ${analysis.score}/100`,
				summary: generateCheckSummary(analysis),
				annotations: analysis.violations.slice(0, 50).map((violation: any) => ({
					path: violation.file,
					start_line: 1,
					end_line: 1,
					annotation_level:
						violation.severity === 'error' ? 'failure' : 'warning',
					message: violation.message,
					title: `${violation.type}: ${violation.rule || 'unknown'}`,
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
						`- **${v.file}**: ${v.message}${v.suggestedPath ? `\n  - Suggested: \`${v.suggestedPath}\`` : ''}`,
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

async function attemptAutoFix(violations: any[], tempDir: string) {
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
				`🔧 Auto-fix completed: ${results.filter((r) => r.success).length} successful fixes`,
			);

			// Create PR with fixes (implementation would go here)
			// await createAutoFixPR(payload, results);
		} else {
			console.log(
				`🔧 Auto-fix plan generated (dry run): ${plan.fixes.length} potential fixes`,
			);
		}
	} catch (error) {
		console.error('Error during auto-fix:', error);
	}
}

/**
 * Add emoji reaction to a comment to show the bot is processing
 */
async function addReaction(payload: any, reaction: string): Promise<void> {
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
	status: 'processing' | 'working' | 'success' | 'error' | 'warning',
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

// Start server
const port = parseInt(env.PORT, 10);
app.listen(port, () => {
	console.log(`🚀 Cortex Structure Guard GitHub App running on port ${port}`);
	console.log(
		`📊 Monitoring repository structure with ${CORTEX_STRUCTURE_RULES.length} rules`,
	);
	console.log(
		`🔧 Auto-fix: ${env.AUTO_FIX_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`,
	);
	console.log(`🧪 Dry run: ${env.DRY_RUN === 'true' ? 'Enabled' : 'Disabled'}`);
});
