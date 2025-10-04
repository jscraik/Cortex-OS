import { spawn } from 'node:child_process';
import { once } from 'node:events';
import {
        type ToolInvocationRequest,
        type ToolInvocationResult,
} from './types.js';

export interface McpClient {
        name: string;
        invoke: (request: ToolInvocationRequest) => Promise<ToolInvocationResult>;
}

export interface McpClientHub {
        invoke: (request: ToolInvocationRequest) => Promise<ToolInvocationResult>;
        listClients: () => string[];
}

interface StdIoConfig {
        name: string;
        command: string;
        args?: string[];
        cwd?: string;
}

interface StreamableHttpConfig {
        name: string;
        url: string;
        headers?: Record<string, string>;
}

const estimateTokens = (value: unknown): number => {
        const json = JSON.stringify(value ?? {});
        return Math.max(1, Math.ceil(json.length / 4));
};

const createStdIoClient = (config: StdIoConfig): McpClient => {
        const invoke = async (request: ToolInvocationRequest): Promise<ToolInvocationResult> => {
                const child = spawn(config.command, config.args ?? [], { cwd: config.cwd });
                const stdout: Buffer[] = [];
                const stderr: Buffer[] = [];
                child.stdout.on('data', (chunk) => stdout.push(chunk));
                child.stderr.on('data', (chunk) => stderr.push(chunk));
                child.stdin.write(
                        JSON.stringify({ tool: request.tool, input: request.input, kind: request.kind ?? 'analysis' }),
                );
                child.stdin.end();
                const [code] = (await once(child, 'close')) as [number];
                if (code !== 0) {
                        const message = Buffer.concat(stderr).toString() || 'unknown error';
                        throw new Error(
                                `brAInwav modern-agent-system: stdio MCP client "${config.name}" failed: ${message}`,
                        );
                }
                const payloadText = Buffer.concat(stdout).toString() || '{}';
                const payload = JSON.parse(payloadText) as Record<string, unknown>;
                const result = 'result' in payload ? payload.result : payload;
                const tokens =
                        typeof payload.tokensUsed === 'number' ? payload.tokensUsed : estimateTokens(payload.result ?? payload);
                return {
                        tool: request.tool,
                        result,
                        tokensUsed: tokens,
                        metadata: { transport: 'stdio', client: config.name },
                } satisfies ToolInvocationResult;
        };
        return { name: config.name, invoke };
};

const callStreamableHttp = async (
        config: StreamableHttpConfig,
        request: ToolInvocationRequest,
): Promise<ToolInvocationResult> => {
        const response = await fetch(config.url, {
                method: 'POST',
                headers: {
                        'content-type': 'application/json',
                        'x-brainwav-tool': request.tool,
                        ...config.headers,
                },
                body: JSON.stringify({ tool: request.tool, input: request.input, kind: request.kind ?? 'analysis' }),
        });
        if (!response.ok) {
                throw new Error(
                        `brAInwav modern-agent-system: HTTP MCP client "${config.name}" failed with ${response.status}`,
                );
        }
        const payload = (await response.json()) as Record<string, unknown>;
        const result = 'result' in payload ? payload.result : payload;
        const tokens = typeof payload.tokensUsed === 'number' ? payload.tokensUsed : estimateTokens(payload);
        return {
                tool: request.tool,
                result,
                tokensUsed: tokens,
                metadata: { transport: 'streamable-http', client: config.name },
        } satisfies ToolInvocationResult;
};

const createHttpClient = (config: StreamableHttpConfig): McpClient => ({
        name: config.name,
        invoke: (request) => callStreamableHttp(config, request),
});

export const createMcpClientHub = (
        options: { stdio: StdIoConfig[]; streamableHttp: StreamableHttpConfig[] },
): McpClientHub => {
        const clients = [
                ...options.stdio.map((config) => createStdIoClient(config)),
                ...options.streamableHttp.map((config) => createHttpClient(config)),
        ];
        const invoke = async (request: ToolInvocationRequest) => {
                if (!clients.length) {
                        throw new Error('brAInwav modern-agent-system: no MCP clients configured');
                }
                const errors: unknown[] = [];
                for (const client of clients) {
                        try {
                                return await client.invoke(request);
                        } catch (error) {
                                errors.push({ client: client.name, error });
                        }
                }
                throw new AggregateError(errors, 'brAInwav modern-agent-system: all MCP clients failed');
        };
        const listClients = () => clients.map((client) => client.name);
        return { invoke, listClients };
};
