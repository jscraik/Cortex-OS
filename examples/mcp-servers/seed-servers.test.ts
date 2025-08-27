/**
 * @file Seed Servers Validation Tests
 * @description TDD tests for seed server configurations
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { ServerManifestSchema } from '@cortex-os/mcp-registry';
import type { ServerManifest } from '@cortex-os/mcp-registry';

const SEED_SERVERS_DIR = path.join(__dirname, '.');

describe('Seed Server Configurations', () => {
  let seedServers: ServerManifest[] = [];

  beforeAll(async () => {
    // Load all seed server files
    const serverFiles = [
      'filesystem-server.json',
      'github-server.json'
    ];

    for (const file of serverFiles) {
      const filePath = path.join(SEED_SERVERS_DIR, file);
      if (existsSync(filePath)) {
        const content = await readFile(filePath, 'utf-8');
        const server = JSON.parse(content);
        seedServers.push(server);
      }
    }
  });

  describe('Schema Validation', () => {
    it('should validate all seed servers against schema', () => {
      expect(seedServers.length).toBeGreaterThan(0);

      for (const server of seedServers) {
        const result = ServerManifestSchema.safeParse(server);
        
        if (!result.success) {
          console.error(`Validation failed for ${server.id}:`, result.error.errors);
        }
        
        expect(result.success).toBe(true);
      }
    });

    it('should have unique server IDs', () => {
      const ids = seedServers.map(s => s.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid semantic versions', () => {
      for (const server of seedServers) {
        if (server.version) {
          // Semantic version regex
          const semverPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
          expect(server.version).toMatch(semverPattern);
        }
      }
    });
  });

  describe('Filesystem Server', () => {
    let filesystemServer: ServerManifest;

    beforeAll(() => {
      filesystemServer = seedServers.find(s => s.id === 'filesystem')!;
    });

    it('should have filesystem server configuration', () => {
      expect(filesystemServer).toBeDefined();
      expect(filesystemServer.name).toBe('Filesystem Server');
    });

    it('should have appropriate capabilities', () => {
      expect(filesystemServer.capabilities.tools).toBe(true);
      expect(filesystemServer.capabilities.resources).toBe(true);
      // Prompts are optional for filesystem
    });

    it('should have medium risk level for file system access', () => {
      expect(filesystemServer.security.riskLevel).toBe('medium');
    });

    it('should include file-related permissions', () => {
      const filePermissions = filesystemServer.permissions.filter(p => 
        p.startsWith('files:')
      );
      expect(filePermissions.length).toBeGreaterThan(0);
      expect(filesystemServer.permissions).toContain('files:read');
    });

    it('should have stdio transport configuration', () => {
      expect(filesystemServer.transport.stdio).toBeDefined();
      expect(filesystemServer.transport.stdio!.command).toBe('npx');
      expect(filesystemServer.transport.stdio!.args).toContain('-y');
      expect(filesystemServer.transport.stdio!.args).toContain('@modelcontextprotocol/server-filesystem');
    });

    it('should have proper install commands', () => {
      expect(filesystemServer.install.claude).toContain('claude mcp add filesystem');
      expect(filesystemServer.install.json).toBeDefined();
      expect(filesystemServer.install.json.mcpServers.filesystem).toBeDefined();
    });

    it('should be verified and featured', () => {
      expect(filesystemServer.publisher.verified).toBe(true);
      expect(filesystemServer.featured).toBe(true);
    });

    it('should have security attestations', () => {
      expect(filesystemServer.security.sigstore).toBeTruthy();
      expect(filesystemServer.security.sbom).toBeTruthy();
    });
  });

  describe('GitHub Server', () => {
    let githubServer: ServerManifest;

    beforeAll(() => {
      githubServer = seedServers.find(s => s.id === 'github')!;
    });

    it('should have github server configuration', () => {
      expect(githubServer).toBeDefined();
      expect(githubServer.name).toBe('GitHub Integration');
    });

    it('should have comprehensive capabilities', () => {
      expect(githubServer.capabilities.tools).toBe(true);
      expect(githubServer.capabilities.resources).toBe(true);
      expect(githubServer.capabilities.prompts).toBe(true);
    });

    it('should have low risk level for API integration', () => {
      expect(githubServer.security.riskLevel).toBe('low');
    });

    it('should include network permissions', () => {
      expect(githubServer.permissions).toContain('network:http');
      expect(githubServer.permissions).toContain('network:https');
    });

    it('should support both stdio and HTTP transports', () => {
      expect(githubServer.transport.stdio).toBeDefined();
      expect(githubServer.transport.streamableHttp).toBeDefined();
    });

    it('should have OAuth2 configuration for HTTP transport', () => {
      expect(githubServer.transport.streamableHttp!.auth).toBeDefined();
      expect(githubServer.transport.streamableHttp!.auth!.type).toBe('oauth2');
      expect(githubServer.transport.streamableHttp!.auth!.clientId).toBeTruthy();
      expect(githubServer.transport.streamableHttp!.auth!.scopes).toBeDefined();
    });

    it('should require GitHub token for stdio transport', () => {
      expect(githubServer.transport.stdio!.env).toBeDefined();
      expect(githubServer.transport.stdio!.env!.GITHUB_PERSONAL_ACCESS_TOKEN).toBeTruthy();
    });

    it('should have higher download count', () => {
      expect(githubServer.downloads).toBeGreaterThan(20000);
    });

    it('should have excellent rating', () => {
      expect(githubServer.rating).toBeGreaterThan(4.5);
    });
  });

  describe('Security Compliance', () => {
    it('should have security metadata for all servers', () => {
      for (const server of seedServers) {
        expect(server.security).toBeDefined();
        expect(server.security.riskLevel).toMatch(/^(low|medium|high)$/);
        
        // Featured servers should have attestations
        if (server.featured) {
          expect(server.security.sigstore).toBeTruthy();
          expect(server.security.sbom).toBeTruthy();
        }
      }
    });

    it('should have appropriate permissions for risk levels', () => {
      for (const server of seedServers) {
        if (server.security.riskLevel === 'high') {
          // High risk servers should have explicit dangerous permissions
          const dangerousPermissions = server.permissions.filter(p => 
            p.includes('exec') || p.includes('admin') || p.includes('system')
          );
          expect(dangerousPermissions.length).toBeGreaterThan(0);
        }

        if (server.security.riskLevel === 'low') {
          // Low risk servers should not have system execution permissions
          const systemPermissions = server.permissions.filter(p => 
            p.includes('system:exec')
          );
          expect(systemPermissions.length).toBe(0);
        }
      }
    });
  });

  describe('Transport Configuration', () => {
    it('should have at least one transport per server', () => {
      for (const server of seedServers) {
        const hasStdio = !!server.transport.stdio;
        const hasHttp = !!server.transport.streamableHttp;
        
        expect(hasStdio || hasHttp).toBe(true);
      }
    });

    it('should have valid stdio commands', () => {
      for (const server of seedServers) {
        if (server.transport.stdio) {
          expect(server.transport.stdio.command).toBeTruthy();
          expect(server.transport.stdio.command.length).toBeGreaterThan(0);
          
          // Should use npx for official servers
          if (server.publisher.verified) {
            expect(['npx', 'node', 'python', 'python3']).toContain(server.transport.stdio.command);
          }
        }
      }
    });

    it('should have HTTPS URLs for remote transports', () => {
      for (const server of seedServers) {
        if (server.transport.streamableHttp) {
          expect(server.transport.streamableHttp.url).toMatch(/^https:\/\//);
        }
      }
    });
  });

  describe('Install Commands', () => {
    it('should have claude install commands', () => {
      for (const server of seedServers) {
        expect(server.install.claude).toBeTruthy();
        expect(server.install.claude).toContain('claude mcp add');
        expect(server.install.claude).toContain(server.id);
      }
    });

    it('should have JSON configurations', () => {
      for (const server of seedServers) {
        expect(server.install.json).toBeDefined();
        expect(server.install.json.mcpServers).toBeDefined();
        expect(server.install.json.mcpServers[server.id]).toBeDefined();
      }
    });

    it('should have consistent transport commands', () => {
      for (const server of seedServers) {
        // If server has stdio transport, JSON config should match
        if (server.transport.stdio) {
          const jsonConfig = server.install.json.mcpServers[server.id];
          expect(jsonConfig.command || jsonConfig.serverUrl).toBeDefined();
          
          if (jsonConfig.command) {
            expect(jsonConfig.command).toBe(server.transport.stdio.command);
          }
        }
      }
    });
  });

  describe('Marketplace Metadata', () => {
    it('should have proper categories', () => {
      const validCategories = [
        'development', 'productivity', 'data', 'communication',
        'finance', 'media', 'security', 'ai-ml', 'integration', 'utility'
      ];

      for (const server of seedServers) {
        expect(validCategories).toContain(server.category);
      }
    });

    it('should have descriptive names and descriptions', () => {
      for (const server of seedServers) {
        expect(server.name.length).toBeGreaterThan(3);
        expect(server.description.length).toBeGreaterThan(10);
        expect(server.description.length).toBeLessThan(500);
      }
    });

    it('should have realistic download counts', () => {
      for (const server of seedServers) {
        expect(server.downloads).toBeGreaterThan(0);
        expect(server.downloads).toBeLessThan(1000000); // Reasonable upper bound
      }
    });

    it('should have valid ratings if present', () => {
      for (const server of seedServers) {
        if (server.rating) {
          expect(server.rating).toBeGreaterThan(0);
          expect(server.rating).toBeLessThanOrEqual(5);
        }
      }
    });

    it('should have valid update timestamps', () => {
      for (const server of seedServers) {
        const updateDate = new Date(server.updatedAt);
        expect(updateDate.getTime()).toBeGreaterThan(new Date('2024-01-01').getTime());
        expect(updateDate.getTime()).toBeLessThan(Date.now() + 86400000); // Not future
      }
    });
  });
});