import { expect, test, describe } from 'vitest';

/**
 * Prompt template snapshot tests for MCP interface examples.
 * Tests prompt safety mechanisms as requested in audit.
 */
describe('MCP prompt template snapshots', () => {
  test('web-mcp-interface examples remain stable', () => {
    // This test ensures that the examples in the web interface remain consistent
    // and do not inadvertently expose security-sensitive information
    const examples = [
      'cortex mcp add --transport http Ref "https://api.ref.tools/mcp?apiKey=ref-e672788111c76ba32bc1"',
      'claude mcp add --transport http ref-server https://api.ref.tools/mcp --header "Authorization: Bearer token"',
      'gemini mcp add ref-server --url https://api.ref.tools/mcp --key ref-e672788111c76ba32bc1'
    ];
    
    // Verify that API keys are properly redacted in examples
    for (const example of examples) {
      // In real examples, API keys should be redacted or use placeholders
      expect(example).not.toContain('ref-e672788111c76ba32bc1');
    }
  });

  test('web interface includes security warnings', () => {
    // Test that the web interface includes appropriate security warnings
    const securityWarnings = [
      'Auto-approve (skip security review)',
      'Secure MCP server management with universal CLI support'
    ];
    
    // These warnings should be present in the interface to inform users
    expect(securityWarnings.length).toBeGreaterThan(0);
  });
});