/**
 * Quality Gate Infrastructure Tests
 * Tests the brAInwav quality gate configuration and basic functionality
 * Following TDD methodology with red-green-refactor cycle
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Quality Gate Infrastructure', () => {
  describe('Configuration Validation', () => {
    it('should have quality gate configuration file', () => {
      const configPath = join(process.cwd(), '.eng', 'quality_gate.json');
      expect(existsSync(configPath)).toBe(true);
    });

    it('should have valid quality gate configuration structure', () => {
      const configPath = join(process.cwd(), '.eng', 'quality_gate.json');
      const content = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);

      // Validate required brAInwav structure
      expect(config.name).toBe('brAInwav Cortex-OS Quality Gates');
      expect(config.version).toBe('1.0.0');
      expect(config.enforcer).toBe('brAInwav Development Team');
      expect(config.branding.organization).toBe('brAInwav');
    });

    it('should have correct brAInwav threshold requirements', () => {
      const configPath = join(process.cwd(), '.eng', 'quality_gate.json');
      const content = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);

      // Validate brAInwav production standards
      expect(config.thresholds.coverage.line).toBe(95);
      expect(config.thresholds.coverage.branch).toBe(95);
      expect(config.thresholds.mutation.score).toBe(80);
      expect(config.thresholds.security.criticalVulnerabilities).toBe(0);
      expect(config.thresholds.security.highVulnerabilities).toBe(0);
    });

    it('should enforce brAInwav branding requirements', () => {
      const configPath = join(process.cwd(), '.eng', 'quality_gate.json');
      const content = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config.branding.enforceInLogs).toBe(true);
      expect(config.branding.enforceInErrors).toBe(true);
      expect(config.branding.enforceInMetrics).toBe(true);
      expect(config.branding.brandingMessage).toContain('brAInwav');
    });

    it('should have operational readiness requirements', () => {
      const configPath = join(process.cwd(), '.eng', 'quality_gate.json');
      const content = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config.thresholds.operationalReadiness.healthCheckCoverage).toBe(100);
      expect(config.thresholds.operationalReadiness.gracefulShutdown).toBe('required');
      expect(config.thresholds.operationalReadiness.observabilityScore).toBe(95);
      expect(config.thresholds.operationalReadiness.loggingStandard).toBe('brAInwav');
    });

    it('should have proper enforcement settings', () => {
      const configPath = join(process.cwd(), '.eng', 'quality_gate.json');
      const content = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config.enforcement.prGate.enabled).toBe(true);
      expect(config.enforcement.releaseGate.enabled).toBe(true);
      expect(config.enforcement.ratcheting.enabled).toBe(true);
      expect(config.enforcement.ratcheting.allowRegresssion).toBe(false);
    });
  });

  describe('Quality Gate Enforcer Script', () => {
    it('should have quality gate enforcer script', () => {
      const scriptPath = join(process.cwd(), 'scripts', 'ci', 'quality-gate-enforcer.ts');
      expect(existsSync(scriptPath)).toBe(true);
    });

    it('should contain brAInwav branding in enforcer script', () => {
      const scriptPath = join(process.cwd(), 'scripts', 'ci', 'quality-gate-enforcer.ts');
      const content = readFileSync(scriptPath, 'utf-8');

      expect(content).toContain('brAInwav Quality Gate');
      expect(content).toContain('brAInwav: Coverage metrics');
      expect(content).toContain('brAInwav: Mutation score');
      expect(content).toContain('brAInwav: Security scan');
    });

    it('should follow CODESTYLE.md patterns in enforcer script', () => {
      const scriptPath = join(process.cwd(), 'scripts', 'ci', 'quality-gate-enforcer.ts');
      const content = readFileSync(scriptPath, 'utf-8');

      // Check for named exports (CODESTYLE.md requirement)
      expect(content).toContain('export const loadQualityGateConfig');
      expect(content).toContain('export const validateCoverageThresholds');
      expect(content).toContain('export const runQualityGateEnforcement');

      // Check for functional patterns (no classes for business logic)
      expect(content).not.toContain('class ');

      // Check for proper error handling with brAInwav branding
      expect(content).toContain('brAInwav Quality Gate: Configuration not found');
      expect(content).toContain('brAInwav Quality Gate: Invalid configuration');
    });
  });

  describe('brAInwav Production Standards Compliance', () => {
    it('should reject configurations missing brAInwav branding', () => {
      const configPath = join(process.cwd(), '.eng', 'quality_gate.json');
      const content = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);

      // Every violation message should include brAInwav
      expect(config.branding.organization).toBe('brAInwav');
      expect(config.enforcer).toContain('brAInwav');
    });

    it('should enforce strict thresholds aligned with TDD plan', () => {
      const configPath = join(process.cwd(), '.eng', 'quality_gate.json');
      const content = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);

      // From TDD plan: 95/95 coverage, 80% mutation score
      expect(config.thresholds.coverage.line).toBeGreaterThanOrEqual(95);
      expect(config.thresholds.coverage.branch).toBeGreaterThanOrEqual(95);
      expect(config.thresholds.mutation.score).toBeGreaterThanOrEqual(80);
      expect(config.thresholds.security.criticalVulnerabilities).toBe(0);
    });

    it('should require comprehensive quality checks', () => {
      const configPath = join(process.cwd(), '.eng', 'quality_gate.json');
      const content = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);

      const requiredChecks = [
        'coverage',
        'mutation',
        'security',
        'operationalReadiness'
      ];

      requiredChecks.forEach(check => {
        expect(config.enforcement.releaseGate.requiredChecks).toContain(check);
      });
    });
  });

  describe('Mock Production Claim Validation', () => {
    it('should not claim production readiness with placeholder implementations', () => {
      const configPath = join(process.cwd(), '.eng', 'quality_gate.json');
      const content = readFileSync(configPath, 'utf-8');

      // Config should not claim production readiness if it's a mock
      expect(content).not.toContain('Math.random()');
      expect(content).not.toContain('Mock adapter response');
      expect(content).not.toContain('TODO:');
    });

    it('should enforce real implementation validation', () => {
      const configPath = join(process.cwd(), '.eng', 'quality_gate.json');
      const content = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);

      // Enforcement should be strict, not lenient for mocks
      expect(config.enforcement.prGate.enabled).toBe(true);
      expect(config.enforcement.releaseGate.enabled).toBe(true);
      expect(config.thresholds.codeQuality.enforceCodeStyle).toBe(true);
    });
  });
});