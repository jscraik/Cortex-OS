/**
 * @file_path packages/a2a/tests/validation.test.ts
 * @description RED tests for CapabilityValidationService covering rules, policies, and compatibility gaps.
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-05
 * @version 0.1.0
 * @status experimental
 * @ai_generated_by github-copilot
 * @ai_provenance_hash TBD
 */

import { describe, expect, it } from 'vitest';
// Import without explicit .js extension so Vitest transpiles the up-to-date TypeScript source
import { createValidationService } from '../src/validation';

// Minimal agent capability + registration shapes aligned with validation.ts expectations
interface AgentCapability {
  id: string;
  description: string;
  permissions: string[];
  securityLevel: number; // 1-5
  rateLimit?: number;
}

interface AgentRegistration {
  agentId: string;
  name: string;
  capabilities: AgentCapability[];
  trustLevel: number; // 1-5
}

const makeAgent = (partial: Partial<AgentRegistration>): AgentRegistration => ({
  agentId: 'agent-A',
  name: 'Agent A',
  trustLevel: 3,
  capabilities: [],
  ...partial,
});

const cap = (partial: Partial<AgentCapability>): AgentCapability => ({
  id: 'test.capability',
  description: 'Test capability',
  permissions: ['read'],
  securityLevel: 2,
  ...partial,
});

describe('CapabilityValidationService (RED phase)', () => {
  // Minimal validation context (agent injected by service). Values chosen to be neutral.
  const ctx = {
    availableAgents: [],
    systemConstraints: {
      maxMemoryMB: 1024,
      maxCpuCores: 4,
      maxNetworkMbps: 100,
    },
    securityPolicies: [],
  };

  it('flags security-level-check when securityLevel outside 1-5 range', async () => {
    const svc = createValidationService();
    const agent = makeAgent({ capabilities: [cap({ securityLevel: 0 })] });
    const report = await svc.validateAgent(agent as any, ctx);
    const rule = report.capabilityResults[0].ruleResults.find(
      (r) => r.rule.id === 'security-level-check',
    );
    expect(rule?.result.valid).toBe(false); // RED structural fix: awaited
  });

  it('requires system.* capability to have securityLevel >= 4', async () => {
    const svc = createValidationService();
    const agent = makeAgent({
      capabilities: [cap({ id: 'system.reboot', securityLevel: 3 })],
    });
    const report = await svc.validateAgent(agent as any, ctx);
    const rule = report.capabilityResults[0].ruleResults.find(
      (r) => r.rule.id === 'security-level-check',
    );
    expect(rule?.result.valid).toBe(false); // RED
  });

  it('warns when permissions list empty (permission-validation)', async () => {
    const svc = createValidationService();
    const agent = makeAgent({ capabilities: [cap({ permissions: [] })] });
    const report = await svc.validateAgent(agent as any, ctx);
    const rule = report.capabilityResults[0].ruleResults.find(
      (r) => r.rule.id === 'permission-validation',
    );
    expect(rule?.result.valid).toBe(false); // RED
  });

  it('warns when wildcard * permission is used', async () => {
    const svc = createValidationService();
    const agent = makeAgent({ capabilities: [cap({ permissions: ['*'] })] });
    const report = await svc.validateAgent(agent as any, ctx);
    const rule = report.capabilityResults[0].ruleResults.find(
      (r) => r.rule.id === 'permission-validation',
    );
    expect(rule?.result.valid).toBe(false); // RED
  });

  it('flags excessive rate limit > 1000 (rate-limit-check)', async () => {
    const svc = createValidationService();
    const agent = makeAgent({ capabilities: [cap({ rateLimit: 5000 })] });
    const report = await svc.validateAgent(agent as any, ctx);
    const rule = report.capabilityResults[0].ruleResults.find(
      (r) => r.rule.id === 'rate-limit-check',
    );
    expect(rule?.result.valid).toBe(false); // RED
  });

  it('flags capability naming violations (capability-naming)', async () => {
    const svc = createValidationService();
    const agent = makeAgent({ capabilities: [cap({ id: 'InvalidName' })] });
    const report = await svc.validateAgent(agent as any, ctx);
    const rule = report.capabilityResults[0].ruleResults.find(
      (r) => r.rule.id === 'capability-naming',
    );
    expect(rule?.result.valid).toBe(false); // RED
  });

  it('produces grouped recommendations by type & priority', async () => {
    const svc = createValidationService();
    const agent = makeAgent({
      capabilities: [
        cap({ id: 'system.shutdown', securityLevel: 3 }),
        cap({ id: 'badName', permissions: [], securityLevel: 2 }),
      ],
    });
    const report = await svc.validateAgent(agent as any, ctx);
    const securityRec = report.recommendations.find((r) => r.type === 'security');
    expect(securityRec?.priority).toBe('high'); // RED
  });

  it('validateCompatibility fails when target capability absent', async () => {
    const svc = createValidationService();
    const source = makeAgent({ capabilities: [cap({ id: 'git.commit' })] });
    const target = makeAgent({ capabilities: [cap({ id: 'file.read' })] });
    const compat = await svc.validateCompatibility(source as any, target as any, 'git.commit');
    expect(compat.valid).toBe(false); // RED property fix
  });

  it('validateCompatibility fails when trustLevel < capability.securityLevel', async () => {
    const svc = createValidationService();
    const source = makeAgent({
      trustLevel: 2,
      capabilities: [cap({ id: 'secure.action', securityLevel: 3 })],
    });
    const target = makeAgent({
      capabilities: [cap({ id: 'secure.action', securityLevel: 3 })],
    });
    const compat = await svc.validateCompatibility(source as any, target as any, 'secure.action');
    expect(compat.valid).toBe(false); // RED
  });

  it('validateCompatibility fails when required permissions missing', async () => {
    const svc = createValidationService();
    const source = makeAgent({
      capabilities: [cap({ id: 'data.write', permissions: ['read'] })],
    });
    const target = makeAgent({
      capabilities: [cap({ id: 'data.write', permissions: ['write'] })],
    });
    const compat = await svc.validateCompatibility(source as any, target as any, 'data.write');
    expect(compat.valid).toBe(false); // RED
  });

  it('enforces documentation-quality rule for short descriptions (RED – rule not yet implemented)', async () => {
    const svc = createValidationService();
    const agent = makeAgent({ capabilities: [cap({ description: 'short' })] });
    const report = await svc.validateAgent(agent as any, ctx);
    const rule = report.capabilityResults[0].ruleResults.find(
      (r) => r.rule.id === 'documentation-quality',
    );
    // Expect the rule to exist and be invalid for too-short description (will currently fail: rule undefined)
    expect(rule?.result.valid).toBe(false);
  });
});

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
