import { beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { sleep } from '../test-setup';

let stdioServer: ChildProcess;
let httpServer: ChildProcess;

beforeAll(async () => {
  // Start MCP server in STDIO mode for testing
  stdioServer = spawn('node', [
    '../mcp-server/dist/index.js',
    '--transport', 'stdio',
  ], {
    stdio: 'pipe',
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      QDRANT_URL: 'http://localhost:6333',
      QDRANT_COLLECTION: 'parity-test-stdio',
    },
  });

  // Start MCP server in HTTP mode for testing
  httpServer = spawn('node', [
    '../mcp-server/dist/index.js',
    '--transport', 'http',
    '--port', '9603',
    '--host', '0.0.0.0'
  ], {
    stdio: 'pipe',
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      QDRANT_URL: 'http://localhost:6333',
      QDRANT_COLLECTION: 'parity-test-http',
    },
  });

  // Wait for servers to start
  await sleep(3000);
}, 60000);

afterAll(async () => {
  // Clean up test processes
  if (stdioServer) {
    stdioServer.kill('SIGTERM');
    await sleep(1000);
    stdioServer.kill('SIGKILL');
  }

  if (httpServer) {
    httpServer.kill('SIGTERM');
    await sleep(1000);
    httpServer.kill('SIGKILL');
  }

  // Clean up test collections
  const { execSync } = require('child_process');
  try {
    execSync('curl -X DELETE http://localhost:6333/collections/parity-test-stdio', { stdio: 'ignore' });
    execSync('curl -X DELETE http://localhost:6333/collections/parity-test-http', { stdio: 'ignore' });
  } catch {
    // Ignore cleanup errors
  }
});