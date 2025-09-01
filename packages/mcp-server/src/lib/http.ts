import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types';

const MAX_BODY_BYTES = 2 * 1024 * 1024;

export async function fetchAllowedUrlContent(urlStr: string, allowlist: string[]): Promise<string> {
  const url = new URL(urlStr);

  if (!allowlist.includes(url.hostname)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Hostname '${url.hostname}' not in allowlist. Permitted hosts: ${allowlist.join(', ')}`,
    );
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'User-Agent': 'Cortex-MCP/0.1.1' },
  });

  if (!response.ok) {
    throw new McpError(ErrorCode.InternalError, `HTTP ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? JSON.stringify(await response.json(), null, 2)
    : await response.text();

  if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
    throw new McpError(ErrorCode.InternalError, `Response body exceeds ${MAX_BODY_BYTES} bytes limit`);
  }

  return body;
}
