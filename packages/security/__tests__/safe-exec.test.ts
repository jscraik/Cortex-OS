/**
 * [brAInwav] Safe Shell Execution Tests
 * Tests for CodeQL alerts #204-209 - Shell injection vulnerabilities
 *
 * Phase 1 (RED): Write failing tests first
 *
 * These tests verify protection against shell injection attacks
 * by using execFile instead of exec and properly sanitizing arguments.
 */

import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type ExecOptions, type ExecResult, safeExecFile } from '../src/shell/safe-exec.js';

const TEST_DIR = join(tmpdir(), 'brainwav-shell-tests');

describe('[brAInwav] Safe Shell Execution', () => {
	beforeEach(async () => {
		if (existsSync(TEST_DIR)) {
			await rm(TEST_DIR, { recursive: true, force: true });
		}
		await mkdir(TEST_DIR, { recursive: true });
	});

	afterEach(async () => {
		if (existsSync(TEST_DIR)) {
			await rm(TEST_DIR, { recursive: true, force: true });
		}
	});

	describe('safeExecFile - Basic Functionality', () => {
		it('should execute simple commands safely', async () => {
			const result = await safeExecFile('echo', ['hello']);
			expect(result.stdout.trim()).toBe('hello');
			expect(result.stderr).toBe('');
		});

		it('should pass multiple arguments correctly', async () => {
			const result = await safeExecFile('echo', ['hello', 'world']);
			expect(result.stdout.trim()).toBe('hello world');
		});

		it('should capture stderr', async () => {
			// ls with non-existent file writes to stderr
			const result = await safeExecFile('ls', ['/nonexistent-brainwav-path-12345'], {
				throwOnError: false,
			});
			expect(result.stderr).toContain('No such file');
		});

		it('should return both stdout and stderr', async () => {
			const testFile = join(TEST_DIR, 'test.txt');
			await writeFile(testFile, 'content');

			const result = await safeExecFile('cat', [testFile]);
			expect(result.stdout).toBe('content');
			expect(result.stderr).toBe('');
		});

		it('should handle empty output', async () => {
			const result = await safeExecFile('true', []);
			expect(result.stdout).toBe('');
			expect(result.stderr).toBe('');
		});
	});

	describe('Shell Injection Prevention (CodeQL #204-209)', () => {
		it('should prevent command injection via arguments', async () => {
			// Attack: Try to inject additional commands via semicolon
			const maliciousArg = 'test; cat /etc/passwd';
			const result = await safeExecFile('echo', [maliciousArg]);

			// Should echo the literal string, not execute cat
			expect(result.stdout.trim()).toBe('test; cat /etc/passwd');
			expect(result.stdout).not.toContain('root:');
		});

		it('should prevent shell metacharacter exploitation', async () => {
			// Attack: Try to use && to chain commands
			const args = ['file.txt', '&&', 'rm', '-rf', '/'];
			const result = await safeExecFile('echo', args);

			// Should safely pass arguments without shell interpretation
			expect(result.stdout.trim()).toContain('&&');
			expect(result.stdout.trim()).toContain('rm');
		});

		it('should prevent backtick command substitution', async () => {
			// Attack: Try backtick substitution
			const maliciousArg = '`cat /etc/passwd`';
			const result = await safeExecFile('echo', [maliciousArg]);

			// Should echo the literal string
			expect(result.stdout.trim()).toBe('`cat /etc/passwd`');
		});

		it('should prevent $() command substitution', async () => {
			// Attack: Try $() substitution
			const maliciousArg = '$(cat /etc/passwd)';
			const result = await safeExecFile('echo', [maliciousArg]);

			// Should echo the literal string
			expect(result.stdout.trim()).toBe('$(cat /etc/passwd)');
		});

		it('should prevent pipe exploitation', async () => {
			// Attack: Try to use pipes
			const maliciousArg = 'test | cat /etc/passwd';
			const result = await safeExecFile('echo', [maliciousArg]);

			// Should echo the literal string
			expect(result.stdout.trim()).toBe('test | cat /etc/passwd');
		});

		it('should handle paths with spaces safely', async () => {
			const testFile = join(TEST_DIR, 'file with spaces.txt');
			await writeFile(testFile, 'content');

			const result = await safeExecFile('cat', [testFile]);
			expect(result.stdout).toBe('content');
		});

		it('should handle special characters in arguments', async () => {
			const specialChars = '!@#$%^&*()[]{}";\'<>?';
			const result = await safeExecFile('echo', [specialChars]);

			// Should handle without shell interpretation
			expect(result.stdout.trim()).toBe(specialChars);
		});
	});

	describe('Timeout Protection', () => {
		it('should timeout long-running commands', async () => {
			await expect(safeExecFile('sleep', ['60'], { timeout: 100 })).rejects.toThrow(/timed out/);
		}, 10000);

		it('should complete fast commands within timeout', async () => {
			const result = await safeExecFile('echo', ['fast'], { timeout: 5000 });
			expect(result.stdout.trim()).toBe('fast');
		});

		it('should use default timeout when not specified', async () => {
			// Default should be 30 seconds, so this should complete
			const result = await safeExecFile('echo', ['default-timeout']);
			expect(result.stdout.trim()).toBe('default-timeout');
		});
	});

	describe('Error Handling', () => {
		it('should throw on command not found', async () => {
			await expect(safeExecFile('nonexistent-brainwav-command-xyz', [])).rejects.toThrow();
		});

		it('should include brAInwav branding in errors', async () => {
			await expect(safeExecFile('nonexistent-brainwav-command-xyz', [])).rejects.toThrow(
				/brAInwav/,
			);
		});

		it('should throw on command failure by default', async () => {
			await expect(safeExecFile('ls', ['/nonexistent-path-xyz'])).rejects.toThrow();
		});

		it('should not throw on failure when throwOnError is false', async () => {
			const result = await safeExecFile('ls', ['/nonexistent-path-xyz'], {
				throwOnError: false,
			});
			expect(result.stderr).toBeTruthy();
		});

		it('should include command in error message', async () => {
			await expect(safeExecFile('false', [])).rejects.toThrow(/false/);
		});
	});

	describe('Options Validation', () => {
		it('should respect maxBuffer option', async () => {
			const largeOutput = 'x'.repeat(100);
			const result = await safeExecFile('echo', [largeOutput], {
				maxBuffer: 1024 * 1024,
			});
			expect(result.stdout).toContain('x');
		});

		it('should respect cwd option', async () => {
			const result = await safeExecFile('pwd', [], { cwd: TEST_DIR });
			expect(result.stdout.trim()).toBe(TEST_DIR);
		});

		it('should handle env option', async () => {
			const result = await safeExecFile('printenv', ['BRAINWAV_TEST'], {
				env: { BRAINWAV_TEST: 'test-value' },
			});
			expect(result.stdout.trim()).toBe('test-value');
		});
	});

	describe('Real-World Use Cases', () => {
		it('should safely handle user-provided search patterns (CodeQL #204-209)', async () => {
			// Simulating ripgrep/grep with user input
			const userPattern = '$(malicious)';
			const testFile = join(TEST_DIR, 'search.txt');
			await writeFile(testFile, 'safe content\n$(malicious) pattern\nmore content');

			// This should search for the literal string, not execute it
			const result = await safeExecFile('grep', [userPattern, testFile], {
				throwOnError: false,
			});
			expect(result.stdout).toContain('$(malicious) pattern');
		});

		it('should safely handle file paths from user input', async () => {
			const userPath = '../../../etc/passwd'; // Path traversal attempt
			const testFile = join(TEST_DIR, 'test.txt');
			await writeFile(testFile, 'content');

			// Using basename or validation would prevent this, but safeExecFile shouldn't execute it as shell
			const result = await safeExecFile('echo', [userPath]);
			expect(result.stdout.trim()).toBe(userPath);
		});

		it('should handle ast-grep style commands safely', async () => {
			const pattern = 'console.log($$$A)';
			const result = await safeExecFile('echo', [pattern]);
			expect(result.stdout.trim()).toBe(pattern);
		});
	});

	describe('Security Guarantees', () => {
		it('should never use shell', async () => {
			// If shell were used, this would fail differently
			const result = await safeExecFile('echo', ['$HOME'], {
				throwOnError: false,
			});
			// Should echo literal $HOME, not expand it
			expect(result.stdout.trim()).toBe('$HOME');
		});

		it('should isolate arguments from each other', async () => {
			// Arguments should not bleed into each other
			const result = await safeExecFile('echo', ['arg1', 'arg2', 'arg3']);
			expect(result.stdout.trim()).toBe('arg1 arg2 arg3');
		});

		it('should handle null bytes safely', async () => {
			// Null bytes sometimes used in injection attacks
			// Node.js execFile rejects null bytes as a security feature
			const arg = 'safe\x00injection';
			await expect(safeExecFile('echo', [arg])).rejects.toThrow(/null bytes/);
		});
	});
});
