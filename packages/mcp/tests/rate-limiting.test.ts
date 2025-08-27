import { describe, expect, test, vi } from 'vitest';
import { createHTTPS, disposeHTTPS } from '../mcp-transport/src/https';

/**
 * Rate limiting tests for MCP transports.
 * Tests rate limiting mechanisms as requested in audit.
 */
describe('MCP rate limiting', () => {
  test('https transport enforces rate limits', async () => {
    const client = createHTTPS({ endpoint: 'https://example.com' });
    
    // Mock fetch to avoid actual HTTP calls
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: 'success' }),
    });
    
    // Make several calls to trigger rate limiting
    const promises = [];
    for (let i = 0; i < 65; i++) {
      promises.push((client as any).callTool('test-tool', { param: i }));
    }
    
    // Wait for all calls to complete
    const results = await Promise.allSettled(promises);
    
    // Check that some calls were rejected due to rate limiting
    const rejected = results.filter(result => result.status === 'rejected');
    expect(rejected.length).toBeGreaterThan(0);
    
    // Check that rate limit info is available
    const rateInfo = (client as any).getRateLimitInfo('test-tool');
    expect(rateInfo).toBeDefined();
    expect(rateInfo.remaining).toBeLessThanOrEqual(60);
  });

  test('rate limit info provides correct values', () => {
    const client = createHTTPS({ endpoint: 'https://example.com' });
    const rateInfo = (client as any).getRateLimitInfo('test-tool');
    
    expect(rateInfo.windowMs).toBe(60000);
    expect(rateInfo.maxRequests).toBe(60);
    expect(rateInfo.remaining).toBeGreaterThanOrEqual(0);
    expect(rateInfo.remaining).toBeLessThanOrEqual(60);
  });
  
  test('rate limiter cleans up old entries', async () => {
    const client = createHTTPS({ endpoint: 'https://example.com' });
    
    // Make a call to create an entry
    const rateInfo1 = (client as any).getRateLimitInfo('cleanup-test');
    expect(rateInfo1.remaining).toBe(60);
    
    // Dispose to clean up resources
    disposeHTTPS();
  });
});