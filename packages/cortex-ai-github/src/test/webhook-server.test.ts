/**
 * Comprehensive test suite for CortexWebhookServer
 * Following TDD principles with 90%+ coverage target
 */

import { createHmac } from "node:crypto.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest.js";
import { CortexAiGitHubApp } from "../core/ai-github-app.js";
import { CortexWebhookServer } from "../server/webhook-server.js";
import type { GitHubModelsConfig } from "../types/github-models.js";

// Test utilities
const createValidSignature = (payload: string, secret: string): string => {
	const signature = createHmac("sha256", secret).update(payload).digest("hex");
	return `sha256=${signature}`;
};

const createMockAiApp = (): CortexAiGitHubApp => {
	const mockConfig: GitHubModelsConfig = {
		token: "test-token",
		baseUrl: "https://test.api.com",
		defaultModel: "gpt-4o-mini",
		maxTokens: 1000,
		temperature: 0.3,
	};

	const app = new CortexAiGitHubApp(mockConfig);

	// Mock the queueTask method
	vi.spyOn(app, "queueTask").mockResolvedValue("test-task-id");

	return app;
};

const createPRCommentPayload = (commentBody: string) => ({
	action: "created",
	comment: {
		id: 123,
		body: commentBody,
		user: { login: "testuser" },
	},
	issue: {
		number: 456,
		pull_request: { url: "https://api.github.com/repos/owner/repo/pulls/456" },
	},
	repository: {
		name: "test-repo",
		owner: { login: "test-owner" },
	},
});

const createPREventPayload = (action: string = "opened") => ({
	action,
	pull_request: {
		number: 789,
		title: "Test PR",
		body: "Test PR description",
		base: { ref: "main" },
		head: { ref: "feature-branch", sha: "abc123" },
		labels: [],
	},
	repository: {
		name: "test-repo",
		owner: { login: "test-owner" },
	},
});

describe("CortexWebhookServer", () => {
	let server: CortexWebhookServer;
	let mockAiApp: CortexAiGitHubApp;
	const testSecret = "test-webhook-secret.js";
	const testPort = 3001;

	beforeEach(() => {
		mockAiApp = createMockAiApp();
		server = new CortexWebhookServer(mockAiApp, testSecret, testPort);

		// Reset all mocks
		vi.clearAllMocks();
	});

	afterEach(async () => {
		await server.stop();
	});

	describe("Constructor and Initialization", () => {
		it("should initialize with correct parameters", () => {
			expect(server).toBeInstanceOf(CortexWebhookServer);
			expect(server.queueSize).toBe(0);
		});

		it("should initialize default triggers", () => {
			// Access private method for testing
			const triggers = (server as any).triggers;
			expect(triggers).toHaveLength(8);
			expect(triggers.map((t: any) => t.taskType)).toContain("code_review");
		});
	});

	describe("Signature Verification", () => {
		it("should accept valid signatures", () => {
			const payload = Buffer.from('{"test": true}');
			const validSignature = createValidSignature(
				payload.toString(),
				testSecret,
			);

			const result = (server as any).verifyWebhookSignature(
				payload,
				validSignature,
			);
			expect(result).toBe(true);
		});

		it("should reject invalid signatures", () => {
			const payload = Buffer.from('{"test": true}');
			const invalidSignature = "sha256=invalid.js";

			const result = (server as any).verifyWebhookSignature(
				payload,
				invalidSignature,
			);
			expect(result).toBe(false);
		});

		it("should reject malformed signatures", () => {
			const payload = Buffer.from('{"test": true}');
			const malformedSignature = "invalid-format.js";

			const result = (server as any).verifyWebhookSignature(
				payload,
				malformedSignature,
			);
			expect(result).toBe(false);
		});

		it("should handle empty payload gracefully", () => {
			const payload = Buffer.from("");
			const signature = createValidSignature("", testSecret);

			const result = (server as any).verifyWebhookSignature(payload, signature);
			expect(result).toBe(true);
		});
	});

	describe("Command Processing", () => {
		it("should queue code review task for @cortex review", async () => {
			const payload = createPRCommentPayload("@cortex review this code");

			await (server as any).handleCommentCreated(payload);

			expect(mockAiApp.queueTask).toHaveBeenCalledWith({
				taskType: "code_review",
				githubContext: expect.objectContaining({
					owner: "test-owner",
					repo: "test-repo",
				}),
				instructions: "this code",
			});
		});

		it("should queue security scan for @cortex secure", async () => {
			const payload = createPRCommentPayload("@cortex secure");

			await (server as any).handleCommentCreated(payload);

			expect(mockAiApp.queueTask).toHaveBeenCalledWith({
				taskType: "security_scan",
				githubContext: expect.any(Object),
				instructions: undefined,
			});
		});

		it("should handle multiple commands correctly", async () => {
			const reviewPayload = createPRCommentPayload("@cortex review");
			const analyzePayload = createPRCommentPayload("@cortex analyze");

			await (server as any).handleCommentCreated(reviewPayload);
			await (server as any).handleCommentCreated(analyzePayload);

			expect(mockAiApp.queueTask).toHaveBeenCalledTimes(2);
			expect(mockAiApp.queueTask).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					taskType: "code_review",
				}),
			);
			expect(mockAiApp.queueTask).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					taskType: "pr_analysis",
				}),
			);
		});

		it("should ignore non-command comments", async () => {
			const payload = createPRCommentPayload("This is just a regular comment");

			await (server as any).handleCommentCreated(payload);

			expect(mockAiApp.queueTask).not.toHaveBeenCalled();
		});

		it("should extract instructions from commands", async () => {
			const payload = createPRCommentPayload(
				"@cortex fix security issues in auth module",
			);

			await (server as any).handleCommentCreated(payload);

			expect(mockAiApp.queueTask).toHaveBeenCalledWith(
				expect.objectContaining({
					instructions: "security issues in auth module",
				}),
			);
		});
	});

	describe("Pull Request Event Handling", () => {
		it("should auto-trigger code review for new PRs", async () => {
			const payload = createPREventPayload("opened");

			await (server as any).handlePullRequestEvent(payload);

			expect(mockAiApp.queueTask).toHaveBeenCalledWith({
				taskType: "code_review",
				githubContext: expect.objectContaining({
					pr: expect.objectContaining({
						number: 789,
						title: "Test PR",
					}),
				}),
				instructions: "Automated code review for new PR",
			});
		});

		it("should trigger security scan for security-related PRs", async () => {
			const securityPayload = createPREventPayload("opened");
			securityPayload.pull_request.title =
				"Fix authentication vulnerability.js";

			await (server as any).handlePullRequestEvent(securityPayload);

			expect(mockAiApp.queueTask).toHaveBeenCalledWith(
				expect.objectContaining({ taskType: "code_review" }),
			);
			expect(mockAiApp.queueTask).toHaveBeenCalledWith(
				expect.objectContaining({ taskType: "security_scan" }),
			);
		});

		it("should trigger documentation task for docs PRs", async () => {
			const docsPayload = createPREventPayload("opened");
			docsPayload.pull_request.title = "Update API documentation.js";

			await (server as any).handlePullRequestEvent(docsPayload);

			expect(mockAiApp.queueTask).toHaveBeenCalledWith(
				expect.objectContaining({ taskType: "documentation" }),
			);
		});

		it("should handle PR synchronize events", async () => {
			const payload = createPREventPayload("synchronize");
			payload.pull_request.body = "Added security improvements.js";

			await (server as any).handlePullRequestEvent(payload);

			expect(mockAiApp.queueTask).toHaveBeenCalled();
		});
	});

	describe("Issue Event Handling", () => {
		const createIssuePayload = (title: string, body = "") => ({
			action: "opened",
			issue: {
				number: 123,
				title,
				body,
				labels: [],
			},
			repository: {
				name: "test-repo",
				owner: { login: "test-owner" },
			},
		});

		it("should auto-triage new issues", async () => {
			const payload = createIssuePayload("Bug report");

			await (server as any).handleIssueOpened(payload);

			expect(mockAiApp.queueTask).toHaveBeenCalledWith(
				expect.objectContaining({ taskType: "issue_triage" }),
			);
		});

		it("should trigger security analysis for security issues", async () => {
			const payload = createIssuePayload("Security vulnerability in login");

			await (server as any).handleIssueOpened(payload);

			expect(mockAiApp.queueTask).toHaveBeenCalledWith(
				expect.objectContaining({ taskType: "security_scan" }),
			);
		});

		it("should trigger repo health check for performance issues", async () => {
			const payload = createIssuePayload("App is running slow");

			await (server as any).handleIssueOpened(payload);

			expect(mockAiApp.queueTask).toHaveBeenCalledWith(
				expect.objectContaining({ taskType: "repo_health" }),
			);
		});
	});

	describe("Context Building", () => {
		it("should build PR context correctly", () => {
			const payload = createPREventPayload();

			const context = (server as any).buildGitHubContext(payload);

			expect(context).toEqual({
				owner: "test-owner",
				repo: "test-repo",
				pr: {
					number: 789,
					title: "Test PR",
					body: "Test PR description",
					base: "main",
					head: "feature-branch",
					files: [],
				},
			});
		});

		it("should build issue context correctly", () => {
			const payload = {
				issue: {
					number: 456,
					title: "Test Issue",
					body: "Issue description",
					labels: [{ name: "bug" }, { name: "priority-high" }],
				},
				repository: {
					name: "test-repo",
					owner: { login: "test-owner" },
				},
			};

			const context = (server as any).buildGitHubContext(payload);

			expect(context).toEqual({
				owner: "test-owner",
				repo: "test-repo",
				issue: {
					number: 456,
					title: "Test Issue",
					body: "Issue description",
					labels: ["bug", "priority-high"],
				},
			});
		});
	});

	describe("Trigger Management", () => {
		it("should add custom triggers", () => {
			const customTrigger = {
				pattern: /@cortex\s+custom/i,
				taskType: "code_review" as const,
				description: "Custom trigger",
				requiredPermissions: ["read" as const],
			};

			server.addTrigger(customTrigger);

			const triggers = (server as any).triggers;
			expect(triggers).toContainEqual(customTrigger);
		});

		it("should remove triggers by pattern", () => {
			const patternToRemove = /@cortex\s+review/i;

			const removed = server.removeTrigger(patternToRemove.source);

			expect(removed).toBe(true);

			const triggers = (server as any).triggers;
			expect(
				triggers.find((t: any) => t.pattern.source === patternToRemove.source),
			).toBeUndefined();
		});
	});

	describe("Error Handling", () => {
		it("should handle AI app errors gracefully", async () => {
			vi.spyOn(mockAiApp, "queueTask").mockRejectedValue(
				new Error("AI service unavailable"),
			);

			const payload = createPRCommentPayload("@cortex review");

			// Should not throw
			await expect(
				(server as any).handleCommentCreated(payload),
			).resolves.toBeUndefined();
		});

		it("should handle malformed payloads gracefully", async () => {
			const malformedPayload = { invalid: "payload" };

			// Should not throw
			await expect(
				(server as any).handleCommentCreated(malformedPayload),
			).resolves.toBeUndefined();
		});
	});

	describe("Server Lifecycle", () => {
		it("should start server on specified port", async () => {
			const startPromise = server.start(testPort);

			await expect(startPromise).resolves.toBeUndefined();
		});

		it("should stop server gracefully", async () => {
			await server.start(testPort);

			const stopPromise = server.stop();

			await expect(stopPromise).resolves.toBeUndefined();
		});

		it("should handle multiple stop calls gracefully", async () => {
			await server.start(testPort);

			await server.stop();
			const secondStop = server.stop();

			await expect(secondStop).resolves.toBeUndefined();
		});
	});
});
