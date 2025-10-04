/**
 * @file MCP Server with Zero-Trust A2A Integration
 * @description Secure MCP server with integrated A2A gateway for zero-trust authorization
 */

import { FastMCP } from 'fastmcp';
import type { Logger } from 'pino';
import { pino } from 'pino';
import { A2AGateway } from '../a2a-gateway/gateway.js';
import type { A2AGatewayConfig, RequestEnvelope } from '../a2a-gateway/types.js';
import type { CapabilityIssuerConfig } from '../capabilities/capability-service.js';
import { CapabilityIssuerService } from '../capabilities/capability-service.js';
import type { SandboxConfig } from '../isolation/execution-isolator.js';
import { ExecutionIsolator } from '../isolation/execution-isolator.js';

const DEFAULT_BRANDING = 'brAInwav Secure MCP Server';

export interface SecureMCPServerConfig {
    /** A2A Gateway configuration */
    a2a_gateway: A2AGatewayConfig;
    /** Capability issuer configuration */
    capability_issuer: CapabilityIssuerConfig;
    /** Execution sandbox configuration */
    sandbox: SandboxConfig;
    /** MCP server configuration */
    mcp: {
        name: string;
        version: string;
        host?: string;
        port?: number;
        api_key?: string;
    };
    /** Tool-specific configurations */
    tool_configs?: {
        [tool_name: string]: {
            requires_sandbox: boolean;
            risk_level: 'low' | 'medium' | 'high';
            required_capabilities: string[];
        };
    };
}

export class SecureMCPServer {
    private readonly logger: Logger;
    private readonly gateway: A2AGateway;
    private readonly capabilityIssuer: CapabilityIssuerService;
    private readonly executionIsolator: ExecutionIsolator;
    private readonly mcpServer: FastMCP;
    private readonly toolRegistry = new Map<string, ToolHandler>();

    constructor(private readonly config: SecureMCPServerConfig) {
        this.logger = pino({ level: process.env.LOG_LEVEL || 'info' }).child({
            component: 'secure-mcp-server',
            branding: DEFAULT_BRANDING,
        });

        // Initialize security components
        this.gateway = new A2AGateway(config.a2a_gateway, this.logger);
        this.capabilityIssuer = new CapabilityIssuerService(config.capability_issuer, this.logger);
        this.executionIsolator = new ExecutionIsolator(config.sandbox, this.logger);

        // Initialize MCP server with zero-trust authentication
        this.mcpServer = new FastMCP({
            name: config.mcp.name,
            version: config.mcp.version,
            authenticate: this.authenticateRequest.bind(this),
        });

        this.setupSecurityMiddleware();
    }

    /**
     * Register a secure tool handler
     */
    registerTool(config: ToolConfig): void {
        const handler = new ToolHandler(config, this.logger);
        this.toolRegistry.set(config.name, handler);

        this.mcpServer.addTool({
            name: config.name,
            description: config.description,
            parameters: config.parameters,
            annotations: {
                ...config.annotations,
                branding: DEFAULT_BRANDING,
            },
            execute: async (args: any, context: any) => {
                return await this.executeToolSecurely(config.name, args, context);
            },
        });

        this.logger.info(
            {
                tool_name: config.name,
                risk_level: config.risk_level,
                requires_sandbox: config.requires_sandbox,
                branding: DEFAULT_BRANDING,
            },
            'Secure tool registered',
        );
    }

    /**
     * Start the secure MCP server
     */
    async start(): Promise<void> {
        const port = this.config.mcp.port || 3000;
        const host = this.config.mcp.host || '0.0.0.0';

        await this.mcpServer.serve({
            transport: 'sse',
            port,
            host,
            path: '/mcp',
        });

        this.logger.info(
            {
                host,
                port,
                path: '/mcp',
                branding: DEFAULT_BRANDING,
            },
            'brAInwav secure MCP server started',
        );
    }

    /**
     * Graceful shutdown
     */
    async shutdown(): Promise<void> {
        this.logger.info({ branding: DEFAULT_BRANDING }, 'brAInwav shutting down secure MCP server');

        // Kill any active sandboxes
        await this.executionIsolator.killAllSandboxes();

        // Additional cleanup if needed
        this.logger.info(
            { branding: DEFAULT_BRANDING },
            'brAInwav secure MCP server shutdown complete',
        );
    }

    private async authenticateRequest(req: any): Promise<any> {
        try {
            // Extract A2A envelope from request
            const envelope = this.extractEnvelope(req);
            if (!envelope) {
                throw new Error('brAInwav A2A envelope required');
            }

            // Authorize through A2A gateway
            const decision = await this.gateway.authorize(envelope);
            if (!decision.allow) {
                throw new Error(`brAInwav access denied: ${decision.reason}`);
            }

            return {
                user: envelope.agent_id,
                tenant: envelope.context.tenant,
                envelope,
                decision,
                timestamp: new Date().toISOString(),
                branding: DEFAULT_BRANDING,
            };
        } catch (error) {
            this.logger.error(
                {
                    error: error instanceof Error ? error.message : 'unknown auth error',
                    branding: DEFAULT_BRANDING,
                },
                'brAInwav MCP authentication failed',
            );
            throw error;
        }
    }

    private extractEnvelope(req: any): RequestEnvelope | null {
        // Try multiple extraction methods

        // 1. Request body (for POST requests)
        if (req.body && this.isValidEnvelope(req.body)) {
            return req.body as RequestEnvelope;
        }

        // 2. Custom header
        const envelopeHeader = req.headers?.['x-brainwav-a2a-envelope'];
        if (typeof envelopeHeader === 'string') {
            try {
                const decoded = Buffer.from(envelopeHeader, 'base64').toString('utf8');
                const parsed = JSON.parse(decoded);
                if (this.isValidEnvelope(parsed)) {
                    return parsed as RequestEnvelope;
                }
            } catch {
                // Invalid header format
            }
        }

        // 3. Query parameter (for GET requests)
        const envelopeQuery = req.query?.envelope;
        if (typeof envelopeQuery === 'string') {
            try {
                const parsed = JSON.parse(Buffer.from(envelopeQuery, 'base64').toString('utf8'));
                if (this.isValidEnvelope(parsed)) {
                    return parsed as RequestEnvelope;
                }
            } catch {
                // Invalid query format
            }
        }

        return null;
    }

    private isValidEnvelope(obj: any): boolean {
        return !!(
            obj &&
            typeof obj === 'object' &&
            obj.req_id &&
            obj.agent_id &&
            obj.action &&
            obj.resource &&
            obj.context &&
            obj.capabilities &&
            obj.sig
        );
    }

    private async executeToolSecurely(toolName: string, args: any, context: any): Promise<string> {
        const startTime = Date.now();

        try {
            const handler = this.toolRegistry.get(toolName);
            if (!handler) {
                throw new Error(`brAInwav tool not found: ${toolName}`);
            }

            const toolConfig = this.config.tool_configs?.[toolName];
            const envelope = context.envelope as RequestEnvelope;

            this.logger.info(
                {
                    tool_name: toolName,
                    agent_id: envelope.agent_id,
                    tenant: envelope.context.tenant,
                    requires_sandbox: toolConfig?.requires_sandbox,
                    branding: DEFAULT_BRANDING,
                },
                'brAInwav executing secure tool',
            );

            // Check if tool requires sandbox
            if (toolConfig?.requires_sandbox) {
                return await this.executeToolInSandbox(handler, args, context);
            } else {
                return await handler.execute(args, context);
            }
        } catch (error) {
            const duration = Date.now() - startTime;

            this.logger.error(
                {
                    tool_name: toolName,
                    agent_id: context.envelope?.agent_id,
                    error: error instanceof Error ? error.message : 'unknown tool error',
                    duration_ms: duration,
                    branding: DEFAULT_BRANDING,
                },
                'brAInwav secure tool execution failed',
            );

            throw error;
        }
    }

    private async executeToolInSandbox(
        handler: ToolHandler,
        args: any,
        context: any,
    ): Promise<string> {
        // Create sandbox execution request
        const executionRequest = {
            command: 'node',
            args: ['-e', this.createSandboxScript(handler, args, context)],
            timeout_seconds: 30,
            environment: {
                NODE_ENV: 'sandbox',
                BRAINWAV_SANDBOX: 'true',
            },
        };

        const result = await this.executionIsolator.executeIsolated(executionRequest);

        if (result.exit_code !== 0) {
            throw new Error(`brAInwav sandbox execution failed: ${result.stderr}`);
        }

        return result.stdout;
    }

    private createSandboxScript(handler: ToolHandler, args: any, context: any): string {
        // Create a safe execution script for the sandbox
        return `
      const handler = ${handler.toString()};
      const args = ${JSON.stringify(args)};
      const context = ${JSON.stringify(context)};
      
      handler.execute(args, context)
        .then(result => console.log(result))
        .catch(error => {
          console.error('brAInwav sandbox error:', error.message);
          process.exit(1);
        });
    `;
    }

    private setupSecurityMiddleware(): void {
        // Add security headers and monitoring
        this.mcpServer.addMiddleware?.((req: any, res: any, next: any) => {
            // Add brAInwav security headers
            res.setHeader('X-brAInwav-Security', 'enabled');
            res.setHeader('X-brAInwav-Server', DEFAULT_BRANDING);
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');

            // Log request for audit
            this.logger.debug(
                {
                    method: req.method,
                    path: req.path || req.url,
                    user_agent: req.headers?.['user-agent'],
                    branding: DEFAULT_BRANDING,
                },
                'brAInwav MCP request received',
            );

            next();
        });
    }
}

interface ToolConfig {
    name: string;
    description: string;
    parameters: any;
    annotations?: any;
    risk_level: 'low' | 'medium' | 'high';
    requires_sandbox: boolean;
    execute: (args: any, context: any) => Promise<string>;
}

class ToolHandler {
    constructor(
        private readonly config: ToolConfig,
        private readonly logger: Logger,
    ) { }

    async execute(args: any, context: any): Promise<string> {
        return await this.config.execute(args, context);
    }

    toString(): string {
        return this.config.execute.toString();
    }
}
