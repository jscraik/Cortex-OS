import { createServer } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMcpClientHub } from '../../../../src/modern-agent-system/mcp-clients.js';

let server: ReturnType<typeof createServer>;
let url = '';

beforeAll(async () => {
        server = createServer((req, res) => {
                if (req.method !== 'POST') {
                        res.statusCode = 405;
                        res.end();
                        return;
                }
                const chunks: Buffer[] = [];
                req.on('data', (chunk) => chunks.push(chunk as Buffer));
                req.on('end', () => {
                        const body = JSON.parse(Buffer.concat(chunks).toString());
                        res.setHeader('content-type', 'application/json');
                        res.end(
                                JSON.stringify({
                                        result: { tool: body.tool, input: body.input },
                                        tokensUsed: 4,
                                }),
                        );
                });
        });
        await new Promise<void>((resolve) => server.listen(0, resolve));
        const address = server.address();
        if (typeof address === 'object' && address) {
                url = `http://127.0.0.1:${address.port}`;
        }
});

afterAll(async () => {
        await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('createMcpClientHub', () => {
        it('invokes streamable HTTP clients', async () => {
                const hub = createMcpClientHub({ stdio: [], streamableHttp: [{ name: 'http', url }] });
                const result = await hub.invoke({ tool: 'hello.world', input: { value: 1 } });
                expect(result.metadata?.client).toBe('http');
                expect(result.result).toMatchObject({ tool: 'hello.world', input: { value: 1 } });
                expect(result.tokensUsed).toBe(4);
        });
});
