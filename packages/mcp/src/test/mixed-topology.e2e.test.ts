import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

async function startEchoHttp() {
  const mod = await import('../../../mcp-servers/echo-js/src/http-server.ts');
  return await (mod as any).startHttpServer(0);
}

function sendStdioJsonRpc(proc: ChildProcessWithoutNullStreams, msg: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let buf = '';
    const onData = (chunk: Buffer) => {
      buf += chunk.toString('utf8');
      const idx = buf.indexOf('\n');
      if (idx !== -1) {
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        try {
          const json = JSON.parse(line);
          cleanup();
          resolve(json);
        } catch (e) {
          cleanup();
          reject(e);
        }
      }
    };
    const onErr = (e: any) => {
      cleanup();
      reject(e);
    };
    const cleanup = () => {
      proc.stdout.off('data', onData);
      proc.stderr.off('data', onErr);
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onErr);
    proc.stdin.write(JSON.stringify(msg) + '\n');
  });
}

describe('Mixed topology interop (STDIO + HTTP) - echo-js', () => {
  let httpClose: (() => void) | undefined;
  let httpUrl = '';
  let child: ChildProcessWithoutNullStreams | undefined;

  beforeAll(async () => {
    const { server, url } = await startEchoHttp();
    httpUrl = url;
    httpClose = () => server.close();

    const serverPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../mcp-servers/echo-js/dist/server.js',
    );
    child = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });
  });

  afterAll(async () => {
    if (httpClose) httpClose();
    if (child && child.pid) child.kill('SIGKILL');
  });

  it('lists tools over STDIO and HTTP', async () => {
    const stdioResp = await sendStdioJsonRpc(child!, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    });
    expect(stdioResp.result?.tools?.length).toBeGreaterThan(0);

    const res = await fetch(`${httpUrl}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
    });
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.result?.tools?.length).toBeGreaterThan(0);
  });
});
