import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { createInterface as createReadlineInterface } from 'readline';
import { MemoryStoreInput, MemorySearchInput } from '@cortex-os/tool-spec';
import { sleep } from '../test-setup';

describe('8-Hour Soak Tests', () => {
  const SOAK_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
  const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
  const BURST_SIZE = 10; // Number of operations per burst
  const MAX_FAILURES = 5; // Maximum allowed failures
  const MAX_LATENCY_MS = 5000; // Maximum acceptable latency

  let stdioProcess: ChildProcess;
  let httpProcess: ChildProcess;
  let stdioRL: ReturnType<typeof createReadlineInterface>;
  let httpPort = 9604;
  let messageId = 1;
  let failureCount = 0;
  let latencySamples: number[] = [];
  let operationCount = 0;
  let lastMemoryId: string | null = null;

  beforeAll(async () => {
    console.log('\n=== Starting 8-Hour Soak Test ===');
    console.log(`Start time: ${new Date().toISOString()}`);
    console.log(`Expected end: ${new Date(Date.now() + SOAK_DURATION).toISOString()}`);

    // Start MCP server in STDIO mode
    stdioProcess = spawn('node', [
      '../mcp-server/dist/index.js',
      '--transport', 'stdio'
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        QDRANT_URL: 'http://localhost:6333',
        QDRANT_COLLECTION: 'soak-test',
      },
    });

    // Start MCP server in HTTP mode
    httpProcess = spawn('node', [
      '../mcp-server/dist/index.js',
      '--transport', 'http',
      '--port', String(httpPort),
      '--host', '0.0.0.0'
    ], {
      stdio: 'pipe',
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        QDRANT_URL: 'http://localhost:6333',
        QDRANT_COLLECTION: 'soak-test',
      },
    });

    stdioRL = createReadlineInterface({
      input: stdioProcess.stdout!,
      output: stdioProcess.stdin!,
    });

    // Wait for initialization
    await sleep(3000);

    // Set up process monitoring
    stdioProcess.on('error', (error) => {
      console.error('STDIO process error:', error);
      failureCount++;
    });

    httpProcess.on('error', (error) => {
      console.error('HTTP process error:', error);
      failureCount++;
    });

    stdioProcess.on('exit', (code) => {
      console.error(`STDIO process exited with code ${code}`);
      failureCount++;
    });

    httpProcess.on('exit', (code) => {
      console.error(`HTTP process exited with code ${code}`);
      failureCount++;
    });
  }, 30000);

  afterAll(async () => {
    console.log('\n=== Soak Test Complete ===');
    console.log(`Total operations: ${operationCount}`);
    console.log(`Failures: ${failureCount}`);
    console.log(`Average latency: ${latencySamples.length > 0 ? latencySamples.reduce((a, b) => a + b) / latencySamples.length : 0}ms`);
    console.log(`Max latency: ${Math.max(...latencySamples, 0)}ms`);
    console.log(`Min latency: ${Math.min(...latencySamples, Infinity)}ms`);

    // Clean up
    if (stdioProcess) {
      stdioProcess.kill('SIGTERM');
      await sleep(1000);
    }

    if (httpProcess) {
      httpProcess.kill('SIGTERM');
      await sleep(1000);
    }

    if (stdioRL) {
      stdioRL.close();
    }

    // Clean up test collection
    const { execSync } = require('child_process');
    try {
      execSync('curl -X DELETE http://localhost:6333/collections/soak-test', { stdio: 'ignore' });
    } catch {
      // Ignore cleanup errors
    }
  });

  async function sendStdioRequest(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        id: messageId++,
        method,
        params,
      };

      let response = '';
      let timeoutId: NodeJS.Timeout;

      const onData = (line: string) => {
        response += line;
        try {
          const parsed = JSON.parse(response);
          clearTimeout(timeoutId);
          stdioProcess.stdout!.removeListener('data', onData);
          if (parsed.error) {
            reject(new Error(parsed.error.message));
          } else {
            resolve(parsed.result);
          }
        } catch {
          // Continue reading
        }
      };

      timeoutId = setTimeout(() => {
        stdioProcess.stdout!.removeListener('data', onData);
        reject(new Error('STDIO request timeout'));
      }, MAX_LATENCY_MS);

      stdioProcess.stdout!.on('data', onData);
      stdioProcess.stdin!.write(JSON.stringify(request) + '\n');
    });
  }

  async function sendHttpRequest(method: string, params?: any): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MAX_LATENCY_MS);

    try {
      const response = await fetch(`http://localhost:${httpPort}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: messageId++,
          method,
          params,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async function performOperation(transport: 'stdio' | 'http', operation: string): Promise<{ success: boolean; latency: number }> {
    const start = Date.now();
    let success = false;

    try {
      switch (operation) {
        case 'store':
          const storeInput: MemoryStoreInput = {
            content: `Soak test memory ${Date.now()} ${Math.random()}`,
            importance: Math.floor(Math.random() * 10) + 1,
            tags: ['soak', 'test', transport, `batch-${Math.floor(Date.now() / CHECK_INTERVAL)}`],
            domain: 'testing',
          };

          if (transport === 'stdio') {
            const result = await sendStdioRequest('tools/call', {
              name: 'memory.store',
              arguments: storeInput,
            });
            lastMemoryId = result.data.id;
          } else {
            const result = await sendHttpRequest('tools/call', {
              name: 'memory.store',
              arguments: storeInput,
            });
            lastMemoryId = result.data.id;
          }
          break;

        case 'search':
          const searchInput: MemorySearchInput = {
            query: `soak test ${transport}`,
            searchType: 'keyword',
            limit: 5,
          };

          if (transport === 'stdio') {
            await sendStdioRequest('tools/call', {
              name: 'memory.search',
              arguments: searchInput,
            });
          } else {
            await sendHttpRequest('tools/call', {
              name: 'memory.search',
              arguments: searchInput,
            });
          }
          break;

        case 'analysis':
          if (transport === 'stdio') {
            await sendStdioRequest('tools/call', {
              name: 'memory.analysis',
              arguments: { analysisType: 'frequency' },
            });
          } else {
            await sendHttpRequest('tools/call', {
              name: 'memory.analysis',
              arguments: { analysisType: 'frequency' },
            });
          }
          break;

        case 'stats':
          if (transport === 'stdio') {
            await sendStdioRequest('tools/call', {
              name: 'memory.stats',
              arguments: {},
            });
          } else {
            await sendHttpRequest('tools/call', {
              name: 'memory.stats',
              arguments: {},
            });
          }
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      success = true;
    } catch (error) {
      console.error(`${transport} ${operation} failed:`, (error as Error).message);
      failureCount++;
    }

    const latency = Date.now() - start;
    latencySamples.push(latency);
    operationCount++;

    return { success, latency };
  }

  async function performBurst(): Promise<void> {
    const operations = ['store', 'search', 'analysis', 'stats'];
    const transports = ['stdio', 'http'];

    const promises: Promise<{ success: boolean; latency: number; transport: string; operation: string }>[] = [];

    for (const transport of transports) {
      for (let i = 0; i < BURST_SIZE; i++) {
        const operation = operations[Math.floor(Math.random() * operations.length)];
        promises.push(
          performOperation(transport as 'stdio' | 'http', operation).then(result => ({
            ...result,
            transport,
            operation,
          }))
        );
      }
    }

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;
    const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
    const maxLatency = Math.max(...results.map(r => r.latency));

    console.log(`[${new Date().toISOString()}] Burst complete: ${successCount}/${results.length} successful, avg latency: ${avgLatency}ms, max: ${maxLatency}ms`);

    // Check for excessive failures
    if (failureCount > MAX_FAILURES) {
      throw new Error(`Too many failures: ${failureCount} > ${MAX_FAILURES}`);
    }

    // Check for excessive latency
    const highLatencyCount = results.filter(r => r.latency > MAX_LATENCY_MS).length;
    if (highLatencyCount > results.length * 0.1) { // More than 10% slow operations
      console.warn(`High latency detected: ${highLatencyCount}/${results.length} operations exceeded ${MAX_LATENCY_MS}ms`);
    }
  }

  it('should maintain reliability over 8 hours', async () => {
    const startTime = Date.now();
    let burstCount = 0;

    // Run bursts continuously for 8 hours
    while (Date.now() - startTime < SOAK_DURATION) {
      burstCount++;
      console.log(`\n[${new Date().toISOString()}] Starting burst #${burstCount}`);
      console.log(`Time elapsed: ${Math.floor((Date.now() - startTime) / 60000)} minutes`);
      console.log(`Operations so far: ${operationCount}`);
      console.log(`Failures so far: ${failureCount}`);

      await performBurst();

      // Wait between bursts
      await sleep(1000);
    }

    console.log(`\nCompleted ${burstCount} bursts over 8 hours`);
    console.log(`Total operations: ${operationCount}`);
    console.log(`Total failures: ${failureCount}`);
    console.log(`Success rate: ${((operationCount - failureCount) / operationCount * 100).toFixed(2)}%`);

    // Verify overall reliability
    const successRate = (operationCount - failureCount) / operationCount;
    expect(successRate).toBeGreaterThan(0.95); // 95% success rate
    expect(failureCount).toBeLessThan(MAX_FAILURES);

    // Verify latency performance
    const avgLatency = latencySamples.reduce((a, b) => a + b) / latencySamples.length;
    const p95Latency = latencySamples.sort((a, b) => a - b)[Math.floor(latencySamples.length * 0.95)];

    expect(avgLatency).toBeLessThan(MAX_LATENCY_MS / 2); // Average should be well below max
    expect(p95Latency).toBeLessThan(MAX_LATENCY_MS); // 95th percentile should be below max

    console.log(`Average latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`95th percentile latency: ${p95Latency.toFixed(2)}ms`);
  }, SOAK_DURATION + 60000); // Add 60 seconds buffer

  it('should handle memory growth gracefully', async () => {
    // Monitor memory usage during the soak test
    const initialMemory = process.memoryUsage();
    console.log(`Initial memory usage: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);

    let maxMemory = initialMemory.heapUsed;

    const memoryMonitor = setInterval(() => {
      const currentMemory = process.memoryUsage();
      maxMemory = Math.max(maxMemory, currentMemory.heapUsed);

      console.log(`Current memory: ${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB, Max: ${Math.round(maxMemory / 1024 / 1024)}MB`);

      // Check for memory leaks (memory growing too much)
      const memoryGrowth = maxMemory - initialMemory.heapUsed;
      if (memoryGrowth > 100 * 1024 * 1024) { // More than 100MB growth
        console.warn(`High memory usage detected: ${Math.round(memoryGrowth / 1024 / 1024)}MB growth`);
      }
    }, 60000); // Check every minute

    // Run for a shorter duration for memory monitoring
    const memoryTestDuration = 30 * 60 * 1000; // 30 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < memoryTestDuration) {
      await performBurst();
      await sleep(2000); // Slightly longer pause for memory monitoring
    }

    clearInterval(memoryMonitor);

    const finalMemory = process.memoryUsage();
    const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

    console.log(`Memory growth: ${Math.round(memoryGrowth / 1024 / 1024)}MB over ${Math.round(memoryTestDuration / 60000)} minutes`);

    // Memory growth should be reasonable
    expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
  }, 35 * 60 * 1000); // 35 minutes total

  it('should recover from temporary Qdrant outage', async () => {
    console.log('\n=== Testing Qdrant outage recovery ===');

    // Store some initial data
    await performOperation('stdio', 'store');
    await performOperation('http', 'store');

    // Simulate Qdrant outage by stopping Qdrant
    console.log('Stopping Qdrant...');
    const { execSync } = require('child_process');
    try {
      execSync('docker stop cortex-test-qdrant', { stdio: 'pipe' });
    } catch {
      // Qdrant might already be stopped
    }

    // Wait for outage to be detected
    await sleep(5000);

    // Operations should still work (fallback to SQLite)
    console.log('Testing operations during Qdrant outage...');
    const outageResults = [];
    for (let i = 0; i < 5; i++) {
      const result = await performOperation('stdio', 'store');
      outageResults.push(result.success);
      await sleep(1000);
    }

    const outageSuccessRate = outageResults.filter(r => r).length / outageResults.length;
    console.log(`Success rate during outage: ${outageSuccessRate * 100}%`);

    // Restart Qdrant
    console.log('Restarting Qdrant...');
    execSync('docker run -d --name cortex-test-qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant:v1.8.3', { stdio: 'pipe' });

    // Wait for Qdrant to be ready
    await sleep(10000);

    // Operations should work normally again
    console.log('Testing operations after Qdrant recovery...');
    const recoveryResults = [];
    for (let i = 0; i < 5; i++) {
      const result = await performOperation('stdio', 'store');
      recoveryResults.push(result.success);
      await sleep(1000);
    }

    const recoverySuccessRate = recoveryResults.filter(r => r).length / recoveryResults.length;
    console.log(`Success rate after recovery: ${recoverySuccessRate * 100}%`);

    expect(outageSuccessRate).toBeGreaterThan(0.8); // Should still work with fallback
    expect(recoverySuccessRate).toBe(1); // Should fully recover
  }, 60000);

  it('should handle high concurrency without deadlocks', async () => {
    console.log('\n=== Testing high concurrency ===');

    const concurrentOperations = 50;
    const promises: Promise<any>[] = [];

    // Launch many concurrent operations
    for (let i = 0; i < concurrentOperations; i++) {
      promises.push(performOperation('stdio', 'store'));
      promises.push(performOperation('http', 'search'));
    }

    // All operations should complete without timeout
    const startTime = Date.now();
    const results = await Promise.allSettled(promises);
    const duration = Date.now() - startTime;

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Concurrency test completed in ${duration}ms`);
    console.log(`Successful: ${successful}, Failed: ${failed}`);

    expect(successful).toBeGreaterThan(concurrentOperations * 0.9); // At least 90% success
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
  }, 60000);
});