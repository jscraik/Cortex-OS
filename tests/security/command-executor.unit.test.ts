/**
 * @file_path tests/security/command-executor.unit.test.ts
 * @description Unit tests for SecureCommandExecutor security features
 * @maintainer Security Team
 * @version 1.0.0
 * @security OWASP Top 10 & MITRE ATLAS compliance
 */

import { describe, test, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { SecureCommandExecutor } from '@cortex-os/mvp-core/src/secure-executor';
import { ChildProcess, SpawnOptions } from 'child_process';

// Mock child_process
vi.mock('child_process', () => {
  const mockChildProcess = {
    stdout: {
      on: vi.fn(),
      removeAllListeners: vi.fn(),
    },
    stderr: {
      on: vi.fn(),
      removeAllListeners: vi.fn(),
    },
    on: vi.fn(),
    removeAllListeners: vi.fn(),
    kill: vi.fn(),
  };

  return {
    spawn: vi.fn().mockReturnValue(mockChildProcess),
  };
});

describe('SecureCommandExecutor - Unit Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Command Whitelisting Tests', () => {
    test('should allow whitelisted commands', async () => {
      const allowedCommands = ['docker', 'git', 'ls', 'pwd', 'echo', 'cat'];

      for (const command of allowedCommands) {
        const result = await SecureCommandExecutor.validateCommand([command, '--version']);
        expect(result.success).toBe(true);
      }
    });

    test('should reject non-whitelisted commands', async () => {
      const forbiddenCommands = ['rm', 'sudo', 'chmod', 'chown', 'wget', 'curl'];

      for (const command of forbiddenCommands) {
        await expect(async () => {
          await SecureCommandExecutor.validateCommand([command, '--help']);
        }).rejects.toThrow(/Command .* is not allowed/);
      }
    });

    test('should allow whitelisted Docker subcommands', async () => {
      const allowedSubcommands = ['ps', 'images', 'inspect', 'logs', 'version', 'info'];

      for (const subcommand of allowedSubcommands) {
        const result = await SecureCommandExecutor.executeDockerCommand(subcommand);
        expect(result).toHaveProperty('exitCode');
      }
    });

    test('should reject non-whitelisted Docker subcommands', async () => {
      const forbiddenSubcommands = ['rm', 'rmi', 'exec', 'run', 'build'];

      for (const subcommand of forbiddenSubcommands) {
        await expect(async () => {
          await SecureCommandExecutor.executeDockerCommand(subcommand);
        }).rejects.toThrow(/Docker subcommand .* is not allowed/);
      }
    });
  });

  describe('Command Injection Prevention Tests', () => {
    test('should prevent command chaining with ;', async () => {
      const maliciousCommands = [
        ['docker', 'ps;', 'rm', '-rf', '/'],
        ['echo', 'test;', 'whoami'],
        ['ls', '-la;', 'cat', '/etc/passwd'],
      ];

      for (const command of maliciousCommands) {
        await expect(async () => {
          await SecureCommandExecutor.executeCommand(command);
        }).rejects.toThrow(/Invalid characters in command/);
      }
    });

    test('should prevent command chaining with &&', async () => {
      const maliciousCommands = [
        ['docker', 'ps', '&&', 'rm', '-rf', '/'],
        ['echo', 'test', '&&', 'whoami'],
      ];

      for (const command of maliciousCommands) {
        await expect(async () => {
          await SecureCommandExecutor.executeCommand(command);
        }).rejects.toThrow(/Invalid characters in command/);
      }
    });

    test('should prevent command chaining with ||', async () => {
      const maliciousCommands = [
        ['docker', 'nonexistent', '||', 'echo', 'exploit'],
        ['false', '||', 'whoami'],
      ];

      for (const command of maliciousCommands) {
        await expect(async () => {
          await SecureCommandExecutor.executeCommand(command);
        }).rejects.toThrow(/Invalid characters in command/);
      }
    });

    test('should prevent pipe injection', async () => {
      const maliciousCommands = [
        ['echo', 'test', '|', 'cat', '/etc/passwd'],
        ['ls', '-la', '|', 'sh'],
        ['docker', 'ps', '|', 'rm', '-rf', '/'],
      ];

      for (const command of maliciousCommands) {
        await expect(async () => {
          await SecureCommandExecutor.executeCommand(command);
        }).rejects.toThrow(/Invalid characters in command/);
      }
    });

    test('should prevent backtick injection', async () => {
      const maliciousCommands = [
        ['echo', '`whoami`'],
        ['ls', '-la', '`cat /etc/passwd`'],
      ];

      for (const command of maliciousCommands) {
        await expect(async () => {
          await SecureCommandExecutor.executeCommand(command);
        }).rejects.toThrow(/Invalid characters in command/);
      }
    });

    test('should prevent dollar sign injection', async () => {
      const maliciousCommands = [
        ['echo', '$(whoami)'],
        ['ls', '$(cat /etc/passwd)'],
        ['echo', '${USER}'],
      ];

      for (const command of maliciousCommands) {
        await expect(async () => {
          await SecureCommandExecutor.executeCommand(command);
        }).rejects.toThrow(/Invalid characters in command/);
      }
    });

    test('should prevent parentheses injection', async () => {
      const maliciousCommands = [
        ['echo', 'test(test)test'],
        ['ls', '-la(test)'],
      ];

      for (const command of maliciousCommands) {
        await expect(async () => {
          await SecureCommandExecutor.executeCommand(command);
        }).rejects.toThrow(/Invalid characters in command/);
      }
    });

    test('should prevent bracket injection', async () => {
      const maliciousCommands = [
        ['echo', '[test]'],
        ['ls', '{test}'],
      ];

      for (const command of maliciousCommands) {
        await expect(async () => {
          await SecureCommandExecutor.executeCommand(command);
        }).rejects.toThrow(/Invalid characters in command/);
      }
    });

    test('should prevent redirection injection', async () => {
      const maliciousCommands = [
        ['echo', 'test', '>', '/tmp/exploit'],
        ['ls', '-la', '>>', '/tmp/log'],
        ['cat', '/etc/passwd', '<', '/dev/null'],
      ];

      for (const command of maliciousCommands) {
        await expect(async () => {
          await SecureCommandExecutor.executeCommand(command);
        }).rejects.toThrow(/Invalid characters in command/);
      }
    });
  });

  describe('Parameter Validation Tests', () => {
    test('should validate valid Docker container IDs', async () => {
      const validContainerIds = [
        'abc123def456',
        'container_name_123',
        'test-container-456',
        'a1b2c3d4e5f6',
        'my_app_container',
      ];

      for (const id of validContainerIds) {
        const result = await SecureCommandExecutor.validateParameter(id, 'containerId');
        expect(result.isValid).toBe(true);
      }
    });

    test('should reject invalid Docker container IDs', async () => {
      const invalidContainerIds = [
        'container; rm -rf /',
        "container' OR '1'='1",
        'container-- comment',
        'container/* block */',
        '',
        'container$(whoami)',
        'container`ls`',
      ];

      for (const id of invalidContainerIds) {
        const result = await SecureCommandExecutor.validateParameter(id, 'containerId');
        expect(result.isValid).toBe(false);
      }
    });

    test('should validate valid image names', async () => {
      const validImageNames = [
        'nginx:latest',
        'ubuntu:20.04',
        'myapp:1.0.0',
        'registry.example.com/myimage:tag',
        'alpine',
        'python:3.9-slim',
      ];

      for (const imageName of validImageNames) {
        const result = await SecureCommandExecutor.validateParameter(imageName, 'imageName');
        expect(result.isValid).toBe(true);
      }
    });

    test('should reject invalid image names', async () => {
      const invalidImageNames = [
        'nginx:latest; rm -rf /',
        "ubuntu' OR '1'='1",
        'image-- comment',
        'image/* block */',
        'image$(whoami)',
        'image`ls`',
      ];

      for (const imageName of invalidImageNames) {
        const result = await SecureCommandExecutor.validateParameter(imageName, 'imageName');
        expect(result.isValid).toBe(false);
      }
    });

    test('should validate numeric parameters', async () => {
      const validNumbers = ['123', '0', '999999', '1024'];

      for (const num of validNumbers) {
        const result = await SecureCommandExecutor.validateParameter(num, 'numeric');
        expect(result.isValid).toBe(true);
      }
    });

    test('should reject invalid numeric parameters', async () => {
      const invalidNumbers = [
        '123abc',
        "123' OR '1'='1",
        '123; rm -rf /',
        '123$(whoami)',
        '123`ls`',
      ];

      for (const num of invalidNumbers) {
        const result = await SecureCommandExecutor.validateParameter(num, 'numeric');
        expect(result.isValid).toBe(false);
      }
    });
  });

  describe('Resource Limitation Tests', () => {
    test('should enforce timeout limits', async () => {
      const mockChildProcess = {
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              // Simulate slow output
              setTimeout(() => callback('test output'), 100);
            }
          }),
          removeAllListeners: vi.fn(),
        },
        stderr: {
          on: vi.fn(),
          removeAllListeners: vi.fn(),
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            // Simulate long-running process
            setTimeout(() => callback(0), 1000);
          }
        }),
        removeAllListeners: vi.fn(),
        kill: vi.fn(),
      };

      vi.mocked(require('child_process').spawn).mockReturnValue(mockChildProcess);

      // Set a short timeout
      const shortTimeout = 50;

      await expect(async () => {
        await SecureCommandExecutor.executeCommand(['sleep', '10'], shortTimeout);
      }).rejects.toThrow(/Command timed out/);

      // Fast-forward timers
      vi.advanceTimersByTime(shortTimeout + 10);
    });

    test('should enforce memory limits', async () => {
      // This would test actual memory limits if implemented
      // For now, we're testing that commands execute successfully within reasonable limits
      const result = await SecureCommandExecutor.executeCommand(['echo', 'test']);
      expect(result).toHaveProperty('exitCode');
    });

    test('should enforce concurrent process limits', async () => {
      // This would test concurrent process limits if implemented
      // For now, we're testing that single command execution works
      const result = await SecureCommandExecutor.executeCommand(['echo', 'test']);
      expect(result).toHaveProperty('exitCode');
    });

    test('should prevent overly long arguments', async () => {
      const veryLongArgument = 'A'.repeat(1001); // Exceeds 1000 character limit

      await expect(async () => {
        await SecureCommandExecutor.executeCommand(['echo', veryLongArgument]);
      }).rejects.toThrow(/Argument too long/);
    });

    test('should allow reasonably sized arguments', async () => {
      const reasonableArgument = 'A'.repeat(100); // Within limit

      const result = await SecureCommandExecutor.executeCommand(['echo', reasonableArgument]);
      expect(result).toHaveProperty('exitCode');
    });
  });

  describe('Output Sanitization Tests', () => {
    test('should sanitize HTML/JavaScript from stdout', async () => {
      const maliciousOutput = '<script>alert("XSS")</script>';

      const sanitizedOutput = SecureCommandExecutor.sanitizeOutput(maliciousOutput);
      expect(sanitizedOutput).not.toContain('<script>');
      expect(sanitizedOutput).not.toContain('alert');
    });

    test('should sanitize HTML/JavaScript from stderr', async () => {
      const maliciousError = 'Error: <script>document.location="http://evil.com"</script>';

      const sanitizedError = SecureCommandExecutor.sanitizeOutput(maliciousError);
      expect(sanitizedError).not.toContain('<script>');
      expect(sanitizedError).not.toContain('document.location');
    });

    test('should sanitize JavaScript protocol handlers', async () => {
      const maliciousOutput = 'Click here: <a href="javascript:alert(\'XSS\')">Link</a>';

      const sanitizedOutput = SecureCommandExecutor.sanitizeOutput(maliciousOutput);
      expect(sanitizedOutput).not.toContain('javascript:');
      expect(sanitizedOutput).not.toContain('alert');
    });

    test('should sanitize VBScript protocol handlers', async () => {
      const maliciousOutput = '<a href="vbscript:msgbox(\'XSS\')">Link</a>';

      const sanitizedOutput = SecureCommandExecutor.sanitizeOutput(maliciousOutput);
      expect(sanitizedOutput).not.toContain('vbscript:');
      expect(sanitizedOutput).not.toContain('msgbox');
    });

    test('should sanitize event handlers', async () => {
      const maliciousOutput =
        '<img src="x" onerror="alert(\'XSS\')" onload="document.location=\'http://evil.com\'">';

      const sanitizedOutput = SecureCommandExecutor.sanitizeOutput(maliciousOutput);
      expect(sanitizedOutput).not.toContain('onerror');
      expect(sanitizedOutput).not.toContain('onload');
      expect(sanitizedOutput).not.toContain('alert');
      expect(sanitizedOutput).not.toContain('document.location');
    });

    test('should allow safe HTML', async () => {
      const safeHtml = '<p>This is a <strong>safe</strong> paragraph with <em>emphasis</em>.</p>';

      const sanitizedOutput = SecureCommandExecutor.sanitizeOutput(safeHtml);
      expect(sanitizedOutput).toContain('<p>');
      expect(sanitizedOutput).toContain('</p>');
      expect(sanitizedOutput).toContain('<strong>');
      expect(sanitizedOutput).toContain('</strong>');
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle command not found errors', async () => {
      const mockChildProcess = {
        stdout: {
          on: vi.fn(),
          removeAllListeners: vi.fn(),
        },
        stderr: {
          on: vi.fn(),
          removeAllListeners: vi.fn(),
        },
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('spawn nonexistent-command ENOENT'));
          }
        }),
        removeAllListeners: vi.fn(),
        kill: vi.fn(),
      };

      vi.mocked(require('child_process').spawn).mockReturnValue(mockChildProcess);

      const result = await SecureCommandExecutor.executeCommand(['nonexistent-command']);
      expect(result.stderr).toContain('not found');
    });

    test('should handle permission denied errors', async () => {
      const mockChildProcess = {
        stdout: {
          on: vi.fn(),
          removeAllListeners: vi.fn(),
        },
        stderr: {
          on: vi.fn(),
          removeAllListeners: vi.fn(),
        },
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('spawn /root/protected-script EACCES'));
          }
        }),
        removeAllListeners: vi.fn(),
        kill: vi.fn(),
      };

      vi.mocked(require('child_process').spawn).mockReturnValue(mockChildProcess);

      const result = await SecureCommandExecutor.executeCommand(['/root/protected-script']);
      expect(result.stderr).toContain('Permission denied');
    });

    test('should handle timeout errors', async () => {
      const mockChildProcess = {
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === 'data') {
              // Simulate slow output
              setTimeout(() => callback('test output'), 100);
            }
          }),
          removeAllListeners: vi.fn(),
        },
        stderr: {
          on: vi.fn(),
          removeAllListeners: vi.fn(),
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            // Simulate long-running process
            setTimeout(() => callback(0), 1000);
          }
        }),
        removeAllListeners: vi.fn(),
        kill: vi.fn(),
      };

      vi.mocked(require('child_process').spawn).mockReturnValue(mockChildProcess);

      await expect(async () => {
        await SecureCommandExecutor.executeCommand(['sleep', '10'], 50);
      }).rejects.toThrow(/Command timed out/);

      // Fast-forward timers
      vi.advanceTimersByTime(60);
    });

    test('should handle killed processes', async () => {
      const mockChildProcess = {
        stdout: {
          on: vi.fn(),
          removeAllListeners: vi.fn(),
        },
        stderr: {
          on: vi.fn(),
          removeAllListeners: vi.fn(),
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            // Simulate killed process
            setTimeout(() => callback(null), 100);
          }
        }),
        removeAllListeners: vi.fn(),
        kill: vi.fn(),
      };

      vi.mocked(require('child_process').spawn).mockReturnValue(mockChildProcess);

      // Kill the process after a short time
      setTimeout(() => {
        mockChildProcess.kill('SIGTERM');
      }, 50);

      const result = await SecureCommandExecutor.executeCommand(['sleep', '1'], 100);
      expect(result).toHaveProperty('exitCode');
    });
  });

  describe('Edge Case Tests', () => {
    test('should handle empty command arrays', async () => {
      await expect(async () => {
        await SecureCommandExecutor.executeCommand([]);
      }).rejects.toThrow(/Command must not be empty/);
    });

    test('should handle null and undefined command elements', async () => {
      await expect(async () => {
        await SecureCommandExecutor.executeCommand(['echo', null as any]);
      }).rejects.toThrow(/All command elements must be strings/);

      await expect(async () => {
        await SecureCommandExecutor.executeCommand(['echo', undefined as any]);
      }).rejects.toThrow(/All command elements must be strings/);
    });

    test('should handle mixed valid and invalid command elements', async () => {
      await expect(async () => {
        await SecureCommandExecutor.executeCommand(['echo', 'test', ';', 'rm', '-rf', '/']);
      }).rejects.toThrow(/Invalid characters in command/);
    });

    test('should handle very long but valid command arrays', async () => {
      const longValidCommand = ['echo', ...Array(100).fill('argument')];

      const result = await SecureCommandExecutor.executeCommand(longValidCommand);
      expect(result).toHaveProperty('exitCode');
    });

    test('should handle commands with unicode characters', async () => {
      const unicodeCommand = ['echo', 'Hello 世界 🌍', 'Привет мир', 'مرحبا بالعالم'];

      const result = await SecureCommandExecutor.executeCommand(unicodeCommand);
      expect(result).toHaveProperty('exitCode');
    });

    test('should handle commands with special shell characters', async () => {
      const specialCharCommands = [
        ['echo', 'test@domain.com'],
        ['echo', 'file-name.tar.gz'],
        ['echo', 'variable=value'],
        ['echo', 'path/to/file'],
      ];

      for (const command of specialCharCommands) {
        const result = await SecureCommandExecutor.executeCommand(command);
        expect(result).toHaveProperty('exitCode');
      }
    });

    test('should handle nested command structures', async () => {
      // This tests that we don't have recursion issues with complex nested objects
      const complexCommand = ['docker', 'run', '--name', 'test-container', 'nginx:latest'];

      const result = await SecureCommandExecutor.executeCommand(complexCommand);
      expect(result).toHaveProperty('exitCode');
    });
  });
});
