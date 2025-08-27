import { describe, expect, test } from 'vitest';
import { redactSensitiveData } from '../mcp-transport/src/stdio';

/**
 * Data redaction tests for MCP transports.
 * Tests redaction mechanisms as requested in audit.
 */
describe('MCP data redaction', () => {
  test('stdio transport redacts sensitive data', () => {
    const sensitiveInputs = [
      '{"apiKey": "sk-1234567890abcdef"}',
      '{"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"}',
      '{"password": "supersecretpassword"}',
      '{"authorization": "Bearer sk-1234567890abcdef"}',
      '{"api_key": "sk-1234567890abcdef"}',
      '{"secret": "mysecretkey"}',
    ];
    
    for (let i = 0; i < sensitiveInputs.length; i++) {
      const redacted = redactSensitiveData(sensitiveInputs[i]);
      // Check that the redacted output contains [REDACTED]
      expect(redacted).toMatch(/\[REDACTED\]/);
    }
  });
  
  test('redaction preserves data structure', () => {
    const input = '{"apiKey": "sk-1234567890abcdef", "name": "test"}';
    const redacted = redactSensitiveData(input);
    
    // Should still be valid JSON
    expect(() => JSON.parse(redacted)).not.toThrow();
    
    // Should preserve non-sensitive data
    const parsed = JSON.parse(redacted);
    expect(parsed.name).toBe('test');
  });
});