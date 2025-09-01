import { generateKeyPairSync, sign } from 'crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { PluginValidator } from '../plugin-validator.js';
import type { PluginMetadata } from '../types.js';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const trustedKeys = {
  'Test Author': publicKey.export({ type: 'spki', format: 'pem' }).toString(),
};

// Helper function to create a valid plugin metadata object
const createValidPlugin = (overrides: Partial<PluginMetadata> = {}): PluginMetadata => {
  const plugin: PluginMetadata = {
    name: 'test-plugin',
    version: '1.0.0',
    description: 'A test plugin',
    author: 'Test Author',
    homepage: 'https://example.com',
    repository: 'https://github.com/test/plugin',
    license: 'MIT',
    keywords: ['test'],
    category: 'utilities',
    dependencies: [],
    cortexOsVersion: '>=1.0.0',
    mcpVersion: '1.0.0',
    capabilities: ['read'],
    permissions: [],
    entrypoint: 'index.js',
    downloadUrl: 'https://plugins.brainwav.ai/test-plugin',
    installSize: 1024,
    created: '2025-01-01T00:00:00Z',
    updated: '2025-01-01T00:00:00Z',
    verified: true,
    ...overrides,
  };
  const data = JSON.stringify({
    name: plugin.name,
    version: plugin.version,
    entrypoint: plugin.entrypoint,
  });
  plugin.signature = Object.hasOwn(overrides, 'signature')
    ? (overrides as any).signature
    : sign(null, Buffer.from(data), privateKey).toString('base64');
  return plugin;
};

describe('PluginValidator', () => {
  let validator: PluginValidator;

  beforeEach(() => {
    validator = new PluginValidator(trustedKeys);
  });

  describe('validatePlugin', () => {
    it('should validate a complete plugin metadata', async () => {
      const validPlugin = createValidPlugin();

      const result = await validator.validatePlugin(validPlugin);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.securityScore).toBeGreaterThan(90);
    });

    it('should detect missing required fields', async () => {
      const incompletePlugin = {
        ...createValidPlugin(),
        description: undefined,
        author: undefined,
        entrypoint: undefined,
      } as unknown as PluginMetadata;

      const result = await validator.validatePlugin(incompletePlugin);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate version format', async () => {
      const invalidVersionPlugin = createValidPlugin({
        version: 'not-a-version',
      });

      const result = await validator.validatePlugin(invalidVersionPlugin);
      expect(result.warnings.some((warning) => warning.includes('version'))).toBe(true);
    });

    it('should flag dangerous permissions', async () => {
      const dangerousPlugin = createValidPlugin({
        permissions: ['filesystem.root', 'network.unrestricted'],
        verified: false,
      });

      const result = await validator.validatePlugin(dangerousPlugin);
      expect(result.securityScore).toBeLessThan(100);
      expect(
        result.warnings.some(
          (warning) => warning.includes('dangerous') || warning.includes('permission'),
        ),
      ).toBe(true);
    });

    it('should detect suspicious keywords', async () => {
      const suspiciousPlugin = createValidPlugin({
        name: 'crypto-miner',
        description: 'A plugin for crypto mining and bitcoin operations',
        author: 'Unknown Author',
        keywords: ['crypto', 'mining', 'bitcoin'],
        verified: false,
      });

      const result = await validator.validatePlugin(suspiciousPlugin);
      expect(result.securityScore).toBeLessThan(100);
    });

    it('should flag oversized plugins', async () => {
      const oversizedPlugin = createValidPlugin({
        name: 'huge-plugin',
        description: 'A very large plugin',
        installSize: 100 * 1024 * 1024, // 100MB (over 50MB limit)
      });

      const result = await validator.validatePlugin(oversizedPlugin);
      expect(result.warnings.some((warning) => warning.includes('size'))).toBe(true);
    });

    it('should handle plugins without signature', async () => {
      const noSignaturePlugin = createValidPlugin({
        signature: undefined,
        verified: false,
      });

      const result = await validator.validatePlugin(noSignaturePlugin);
      expect(result.details?.hasSignature).toBe(false);
      expect(result.warnings.some((warning) => warning.includes('signed'))).toBe(true);
    });

    it('should reject plugins with invalid download URLs', async () => {
      const invalidUrlPlugin = createValidPlugin({
        downloadUrl: 'http://suspicious-site.com/malware.zip', // HTTP instead of HTTPS
      });

      const result = await validator.validatePlugin(invalidUrlPlugin);
      expect(result.valid).toBe(false);
      expect(result.errors.some((error) => error.includes('URL'))).toBe(true);
    });

    it('should handle invalid plugin metadata gracefully', async () => {
      const invalidPlugin = {
        ...createValidPlugin(),
        permissions: undefined,
        dependencies: undefined,
      } as unknown as PluginMetadata;

      const result = await validator.validatePlugin(invalidPlugin);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validatePlugins (batch validation)', () => {
    it('should validate multiple plugins', async () => {
      const plugins: PluginMetadata[] = [
        createValidPlugin({
          name: 'plugin-1',
          description: 'First plugin',
        }),
        createValidPlugin({
          name: 'plugin-2',
          version: '2.0.0',
          description: 'Second plugin',
          verified: false,
          signature: undefined,
        }),
      ];

      const results = await validator.validatePlugins(plugins);
      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(true); // Should be valid despite no signature
    });

    it('should handle validation errors in batch processing', async () => {
      const plugins: PluginMetadata[] = [
        {} as PluginMetadata, // Invalid plugin
        createValidPlugin({
          name: 'valid-plugin',
          description: 'A valid plugin',
        }),
      ];

      const results = await validator.validatePlugins(plugins);
      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(false); // Invalid plugin
      expect(results[1].valid).toBe(true); // Valid plugin
    });
  });

  describe('getSecurityRecommendations', () => {
    it('should provide recommendations for low security score', () => {
      const plugin = createValidPlugin({
        name: 'insecure-plugin',
        description: 'An insecure plugin',
        author: 'Unknown Author',
        verified: false,
        signature: undefined,
      });

      const validationResult = {
        valid: false,
        errors: ['Multiple security issues'],
        warnings: ['Low security score'],
        securityScore: 30,
      };

      const recommendations = validator.getSecurityRecommendations(plugin, validationResult);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some((rec) => rec.includes('security concerns'))).toBe(true);
      expect(recommendations.some((rec) => rec.includes('not verified'))).toBe(true);
      expect(recommendations.some((rec) => rec.includes('digital signatures'))).toBe(true);
    });

    it('should provide minimal recommendations for secure plugins', () => {
      const plugin = createValidPlugin({
        name: 'secure-plugin',
        description: 'A secure plugin',
        author: 'Cortex OS Team',
        keywords: ['official'],
      });

      const validationResult = {
        valid: true,
        errors: [],
        warnings: [],
        securityScore: 100,
      };

      const recommendations = validator.getSecurityRecommendations(plugin, validationResult);
      expect(recommendations.length).toBe(0);
    });
  });

  describe('signature verification', () => {
    it('should accept valid signatures', async () => {
      const plugin = createValidPlugin();
      const result = await validator.validatePlugin(plugin);
      expect(result.valid).toBe(true);
    });

    it('should reject tampered signatures', async () => {
      const plugin = createValidPlugin();
      plugin.signature = plugin.signature!.slice(0, -2) + 'ab';
      const result = await validator.validatePlugin(plugin);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('signature'))).toBe(true);
    });
  });
});
