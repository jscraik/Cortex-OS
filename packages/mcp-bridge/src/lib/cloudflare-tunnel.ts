import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

export interface TunnelResult {
  url: string;
}
export interface StartedTunnel extends TunnelResult {
  child: ChildProcess;
}

const CF_URL_REGEXES = [
  /(https?:\/\/[\w.-]+\.trycloudflare\.com)/i,
  /"url":"(https?:\\\/\\\/[\w.-]+\\\.trycloudflare\\\.com)"/i,
];

export async function waitForTunnelUrl(
  child: ReturnType<typeof spawn>,
  timeoutMs = 15000
): Promise<TunnelResult> {
  let buffer = '';
  const onData = (chunk: Buffer) => {
    const text = chunk.toString();
    buffer += text;
    for (const re of CF_URL_REGEXES) {
      const m = re.exec(text) || re.exec(buffer);
      if (m?.[1]) {
        cleanup();
        resolve({ url: m[1].replaceAll('\\/', '/') });
        return;
      }
    }
  };
  let resolve!: (t: TunnelResult) => void;
  let reject!: (e: Error) => void;
  const cleanup = () => {
    child.stdout?.off('data', onData);
    child.stderr?.off('data', onData);
  };
  const p = new Promise<TunnelResult>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  const timer = setTimeout(() => {
    cleanup();
    reject(new Error('Timed out waiting for Cloudflare Tunnel URL'));
  }, timeoutMs);
  child.stdout?.on('data', onData);
  child.stderr?.on('data', onData);
  child.once('exit', (code) => {
    clearTimeout(timer);
    cleanup();
    reject(new Error(`cloudflared exited with code ${code}`));
  });
  return p;
}

export async function startCloudflareTunnel(port: number): Promise<StartedTunnel> {
  const token = process.env.CLOUDFLARE_TUNNEL_TOKEN;
  const args = token
    ? ['tunnel', 'run', '--token', token]
    : [
        'tunnel',
        '--no-autoupdate',
        '--edge-ip-version',
        'auto',
        '--url',
        `http://127.0.0.1:${port}`,
      ];

  const cf = spawn('cloudflared', args, { stdio: ['ignore', 'pipe', 'pipe'] });

  if (!token) {
    const { url } = await waitForTunnelUrl(cf);
    return { url, child: cf };
  }

  await Promise.race([once(cf, 'spawn'), new Promise((r) => setTimeout(r, 500))]);
  const namedHost = process.env.CLOUDFLARE_TUNNEL_HOSTNAME || process.env.TUNNEL_HOSTNAME;
  if (namedHost) {
    const url = namedHost.startsWith('http') ? namedHost : `https://${namedHost}`;
    return { url, child: cf };
  }
  throw new Error(
    'Named Cloudflare Tunnel started, but no hostname provided. Set CLOUDFLARE_TUNNEL_HOSTNAME to your public hostname.'
  );
}
