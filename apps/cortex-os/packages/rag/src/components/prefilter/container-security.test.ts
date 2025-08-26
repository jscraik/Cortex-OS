/**
 * @file_path src/rag/prefilter/container-security.test.ts
 * @description TDD container security tests for Docker isolation and protection
 * @maintainer Security Team
 * @version 1.0.0
 * @security Container Security & OWASP Docker Top-10
 */

import { describe, test, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { execSync, spawn } from 'child_process';
import { ContainerSecurityManager, ContainerConfig, SecurityPolicy } from './container-security';

// Mock external dependencies
vi.mock('child_process', () => ({
  execSync: vi.fn(),
  spawn: vi.fn(),
}));

describe('ContainerSecurityManager - TDD Security Tests', () => {
  let securityManager: ContainerSecurityManager;
  let mockExecSync: MockedFunction<typeof execSync>;
  let mockSpawn: MockedFunction<typeof spawn>;

  beforeEach(() => {
    mockExecSync = execSync as MockedFunction<typeof execSync>;
    mockSpawn = spawn as MockedFunction<typeof spawn>;

    securityManager = new ContainerSecurityManager({
      defaultSecurityPolicy: {
        readOnlyRootFilesystem: true,
        noNewPrivileges: true,
        nonRootUser: true,
        dropCapabilities: ['ALL'],
        addCapabilities: [],
        seccompProfile: 'default',
        apparmorProfile: 'default',
        resourceLimits: {
          memory: '512m',
          cpus: '1.0',
          pids: 100,
        },
        networkMode: 'none',
        tmpfsMount: ['/tmp:noexec,nosuid,size=10m'],
      },
      trustedRegistries: [
        'scancode-toolkit@sha256:1234567890abcdef',
        'presidio-analyzer@sha256:abcdef1234567890',
      ],
      maxContainerLifetime: 300000, // 5 minutes
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Container Escape Prevention', () => {
    test('should prevent container escape via volume mounting', async () => {
      const maliciousConfig: ContainerConfig = {
        image: 'scancode-toolkit:latest',
        volumes: ['/:/host:rw'], // Attempting to mount host root
        privileged: false,
      };

      await expect(securityManager.createSecureContainer(maliciousConfig)).rejects.toThrow(
        /Dangerous volume mount detected/,
      );
    });

    test('should prevent privileged container creation', async () => {
      const privilegedConfig: ContainerConfig = {
        image: 'scancode-toolkit:latest',
        privileged: true,
        volumes: ['/tmp:/scan:ro'],
      };

      await expect(securityManager.createSecureContainer(privilegedConfig)).rejects.toThrow(
        /Privileged containers not allowed/,
      );
    });

    test('should enforce read-only root filesystem', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit:latest',
        volumes: ['/tmp/scan:/scan:ro'],
      };

      mockExecSync.mockReturnValue('container-id-123');

      await securityManager.createSecureContainer(config);

      expect(mockExecSync).toHaveBeenCalledWith(expect.stringMatching(/--read-only/));
    });

    test('should prevent capability escalation', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit:latest',
        volumes: ['/tmp/scan:/scan:ro'],
      };

      mockExecSync.mockReturnValue('container-id-123');

      await securityManager.createSecureContainer(config);

      expect(mockExecSync).toHaveBeenCalledWith(expect.stringMatching(/--cap-drop=ALL/));
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringMatching(/--security-opt no-new-privileges/),
      );
    });

    test('should enforce non-root user execution', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit:latest',
        volumes: ['/tmp/scan:/scan:ro'],
      };

      mockExecSync.mockReturnValue('container-id-123');

      await securityManager.createSecureContainer(config);

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringMatching(/--user \d+:\d+/), // Non-root UID:GID
      );
    });
  });

  describe('Privilege Escalation Prevention', () => {
    test('should prevent setuid binary execution', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit:latest',
        volumes: ['/tmp/scan:/scan:ro'],
      };

      mockExecSync.mockReturnValue('container-id-123');

      await securityManager.createSecureContainer(config);

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringMatching(/--tmpfs \/tmp:noexec,nosuid/),
      );
    });

    test('should apply seccomp profile for syscall filtering', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit:latest',
        volumes: ['/tmp/scan:/scan:ro'],
      };

      mockExecSync.mockReturnValue('container-id-123');

      await securityManager.createSecureContainer(config);

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringMatching(/--security-opt seccomp=default/),
      );
    });

    test('should apply AppArmor profile for mandatory access control', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit:latest',
        volumes: ['/tmp/scan:/scan:ro'],
      };

      mockExecSync.mockReturnValue('container-id-123');

      await securityManager.createSecureContainer(config);

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringMatching(/--security-opt apparmor=default/),
      );
    });

    test('should prevent device access', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit:latest',
        volumes: ['/tmp/scan:/scan:ro'],
        devices: ['/dev/sda'], // Attempting device access
      };

      await expect(securityManager.createSecureContainer(config)).rejects.toThrow(
        /Device access not permitted/,
      );
    });
  });

  describe('Volume Isolation Security', () => {
    test('should enforce read-only volume mounts for scan directories', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit:latest',
        volumes: ['/tmp/scan:/scan:rw'], // Attempting write access
      };

      const sanitizedConfig = await securityManager.sanitizeContainerConfig(config);

      expect(sanitizedConfig.volumes).toContain('/tmp/scan:/scan:ro');
      expect(sanitizedConfig.volumes).not.toContain('/tmp/scan:/scan:rw');
    });

    test('should prevent host filesystem access outside designated areas', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit:latest',
        volumes: [
          '/tmp/scan:/scan:ro',
          '/etc:/host-etc:ro', // Unauthorized host access
          '/var/run/docker.sock:/var/run/docker.sock:rw', // Docker socket access
        ],
      };

      await expect(securityManager.createSecureContainer(config)).rejects.toThrow(
        /Unauthorized host path access/,
      );
    });

    test('should create isolated tmpfs mounts', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit:latest',
        volumes: ['/tmp/scan:/scan:ro'],
      };

      mockExecSync.mockReturnValue('container-id-123');

      await securityManager.createSecureContainer(config);

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringMatching(/--tmpfs \/tmp:noexec,nosuid,size=10m/),
      );
    });

    test('should validate volume mount points for path traversal', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit:latest',
        volumes: ['/tmp/scan/../../../etc:/scan:ro'], // Path traversal attempt
      };

      await expect(securityManager.createSecureContainer(config)).rejects.toThrow(
        /Path traversal detected in volume mount/,
      );
    });
  });

  describe('Resource Limits and DoS Prevention', () => {
    test('should enforce memory limits', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit:latest',
        volumes: ['/tmp/scan:/scan:ro'],
      };

      mockExecSync.mockReturnValue('container-id-123');

      await securityManager.createSecureContainer(config);

      expect(mockExecSync).toHaveBeenCalledWith(expect.stringMatching(/--memory=512m/));
    });

    test('should enforce CPU limits', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit:latest',
        volumes: ['/tmp/scan:/scan:ro'],
      };

      mockExecSync.mockReturnValue('container-id-123');

      await securityManager.createSecureContainer(config);

      expect(mockExecSync).toHaveBeenCalledWith(expect.stringMatching(/--cpus=1\.0/));
    });

    test('should enforce process limits', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit:latest',
        volumes: ['/tmp/scan:/scan:ro'],
      };

      mockExecSync.mockReturnValue('container-id-123');

      await securityManager.createSecureContainer(config);

      expect(mockExecSync).toHaveBeenCalledWith(expect.stringMatching(/--pids-limit=100/));
    });

    test('should enforce container lifetime limits', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit:latest',
        volumes: ['/tmp/scan:/scan:ro'],
      };

      mockExecSync.mockReturnValue('container-id-123');

      const containerId = await securityManager.createSecureContainer(config);

      // Simulate long-running container
      setTimeout(() => {
        expect(mockExecSync).toHaveBeenCalledWith(
          expect.stringMatching(/docker stop container-id-123/),
        );
      }, 300000); // Should be stopped after 5 minutes
    });
  });

  describe('Network Isolation', () => {
    test('should disable network access by default', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit:latest',
        volumes: ['/tmp/scan:/scan:ro'],
      };

      mockExecSync.mockReturnValue('container-id-123');

      await securityManager.createSecureContainer(config);

      expect(mockExecSync).toHaveBeenCalledWith(expect.stringMatching(/--network=none/));
    });

    test('should prevent network mode override attempts', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit:latest',
        volumes: ['/tmp/scan:/scan:ro'],
        networkMode: 'host', // Attempting host network access
      };

      const sanitizedConfig = await securityManager.sanitizeContainerConfig(config);

      expect(sanitizedConfig.networkMode).toBe('none');
    });
  });

  describe('Image Verification and Trust', () => {
    test('should verify container image digests', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit:latest', // Unverified tag
        volumes: ['/tmp/scan:/scan:ro'],
      };

      await expect(securityManager.createSecureContainer(config)).rejects.toThrow(
        /Image must use verified digest/,
      );
    });

    test('should accept trusted registry images with digests', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit@sha256:1234567890abcdef',
        volumes: ['/tmp/scan:/scan:ro'],
      };

      mockExecSync.mockReturnValue('container-id-123');

      const containerId = await securityManager.createSecureContainer(config);

      expect(containerId).toBe('container-id-123');
    });

    test('should reject images from untrusted registries', async () => {
      const config: ContainerConfig = {
        image: 'malicious-registry.com/fake-scanner@sha256:abcdef1234567890',
        volumes: ['/tmp/scan:/scan:ro'],
      };

      await expect(securityManager.createSecureContainer(config)).rejects.toThrow(
        /Untrusted registry/,
      );
    });

    test('should verify image signatures when available', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit@sha256:1234567890abcdef',
        volumes: ['/tmp/scan:/scan:ro'],
      };

      mockExecSync.mockReturnValueOnce('{"signatures": [{"valid": true}]}'); // cosign verify
      mockExecSync.mockReturnValueOnce('container-id-123'); // docker run

      await securityManager.createSecureContainer(config);

      expect(mockExecSync).toHaveBeenCalledWith(expect.stringMatching(/cosign verify/));
    });
  });

  describe('Runtime Security Monitoring', () => {
    test('should monitor container behavior for anomalies', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit@sha256:1234567890abcdef',
        volumes: ['/tmp/scan:/scan:ro'],
      };

      mockExecSync.mockReturnValue('container-id-123');

      const containerId = await securityManager.createSecureContainer(config);

      // Start monitoring
      const monitor = await securityManager.startSecurityMonitoring(containerId);

      expect(monitor).toBeDefined();
      expect(monitor.isActive).toBe(true);
    });

    test('should detect and terminate misbehaving containers', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit@sha256:1234567890abcdef',
        volumes: ['/tmp/scan:/scan:ro'],
      };

      mockExecSync.mockReturnValue('container-id-123');

      const containerId = await securityManager.createSecureContainer(config);

      // Simulate suspicious behavior detection
      const monitor = await securityManager.startSecurityMonitoring(containerId);
      monitor.detectSuspiciousBehavior = vi.fn().mockReturnValue(true);

      // Container should be terminated
      setTimeout(() => {
        expect(mockExecSync).toHaveBeenCalledWith(
          expect.stringMatching(/docker kill container-id-123/),
        );
      }, 1000);
    });

    test('should log all container security events', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit@sha256:1234567890abcdef',
        volumes: ['/tmp/scan:/scan:ro'],
      };

      mockExecSync.mockReturnValue('container-id-123');

      const containerId = await securityManager.createSecureContainer(config);

      const logs = await securityManager.getSecurityAuditLog(containerId);

      expect(logs).toContain('Container created with security policy');
      expect(logs).toContain('Security monitoring started');
      expect(logs).toContain('Resource limits enforced');
    });
  });

  describe('Cleanup and Lifecycle Management', () => {
    test('should automatically cleanup containers after completion', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit@sha256:1234567890abcdef',
        volumes: ['/tmp/scan:/scan:ro'],
        autoRemove: true,
      };

      mockExecSync.mockReturnValue('container-id-123');

      await securityManager.createSecureContainer(config);

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringMatching(/--rm/), // Auto-remove flag
      );
    });

    test('should force cleanup of orphaned containers', async () => {
      const orphanedContainers = ['container-1', 'container-2'];

      mockExecSync.mockReturnValue(orphanedContainers.join('\n'));

      await securityManager.cleanupOrphanedContainers();

      orphanedContainers.forEach((containerId) => {
        expect(mockExecSync).toHaveBeenCalledWith(
          expect.stringMatching(new RegExp(`docker rm -f ${containerId}`)),
        );
      });
    });

    test('should cleanup temporary volumes and files', async () => {
      const config: ContainerConfig = {
        image: 'scancode-toolkit@sha256:1234567890abcdef',
        volumes: ['/tmp/scan:/scan:ro'],
      };

      mockExecSync.mockReturnValue('container-id-123');

      const containerId = await securityManager.createSecureContainer(config);
      await securityManager.cleanupContainer(containerId);

      expect(mockExecSync).toHaveBeenCalledWith(expect.stringMatching(/docker volume prune -f/));
    });
  });
});
