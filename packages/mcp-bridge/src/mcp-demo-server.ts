/** @file_path apps/cortex-os/packages/mcp/src/mcp-demo-server.ts
 * @description Demo Express server for universal MCP management
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-20
 * @version 1.0.0
 * @status active
 */

import { pathToFileURL } from "node:url";
import express from "express";
import type {
	NextFunction,
	Request,
	Response,
} from "express-serve-static-core";
import { startCloudflareTunnel } from "./lib/cloudflare-tunnel.js";
import { webMcpInterface } from "./web-mcp-interface.js";

/**
 * Demo server for universal MCP management
 * Provides REST API and web interface for testing
 */
class McpDemoServer {
	private readonly app: express.Express;
	private readonly port: number;
	// eslint-disable-next-line @typescript-eslint/prefer-readonly
	private tunnelProc?: import("node:child_process").ChildProcess;
	private publicUrl: string | null = null;

	constructor(port = 3000) {
		this.app = express() as express.Express;
		this.port = port;
		this.setupMiddleware();
		this.setupRoutes();
	}

	private setupMiddleware(): void {
		this.app.use(express.json());
		this.app.use(express.urlencoded({ extended: true }));

		// CORS for development
		this.app.use((req: Request, res: Response, next: NextFunction) => {
			res.header("Access-Control-Allow-Origin", "*");
			res.header(
				"Access-Control-Allow-Methods",
				"GET, POST, PUT, DELETE, OPTIONS",
			);
			res.header(
				"Access-Control-Allow-Headers",
				"Origin, X-Requested-With, Content-Type, Accept, Authorization",
			);

			if (req.method === "OPTIONS") {
				res.sendStatus(200);
			} else {
				next();
			}
		});
	}

	private setupRoutes(): void {
		// Serve the test interface
		this.app.get("/", (_req, res) => {
			res.send(webMcpInterface.generateTestInterface());
		});

		// API Routes
		this.app.post("/api/mcp/add", async (req, res) => {
			const { command, frontend, autoApprove } = req.body;

			if (!command) {
				return res.status(400).json({
					success: false,
					message: "Command is required",
				});
			}

			const result = await webMcpInterface.handleAddServer({
				command,
				frontend,
				autoApprove,
			});

			res.status(result.status).json(result.body);
		});

		this.app.post("/api/mcp/approve", async (req, res) => {
			const { command, frontend, force } = req.body;

			if (!command) {
				return res.status(400).json({
					success: false,
					message: "Command is required",
				});
			}

			const result = await webMcpInterface.handleApproveServer({
				command,
				frontend,
				force: force || false,
			});

			res.status(result.status).json(result.body);
		});

		this.app.get("/api/mcp/list", async (_req, res) => {
			const result = await webMcpInterface.handleListServers();
			res.status(result.status).json(result.body);
		});

		this.app.get("/api/mcp/check/:nameOrUrl", async (req, res) => {
			const { nameOrUrl } = req.params;

			if (!nameOrUrl) {
				return res.status(400).json({
					success: false,
					message: "Server name or URL is required",
				});
			}

			const result = await webMcpInterface.handleCheckServer({ nameOrUrl });
			res.status(result.status).json(result.body);
		});

		this.app.delete("/api/mcp/remove/:serverName", async (req, res) => {
			const { serverName } = req.params;

			if (!serverName) {
				return res.status(400).json({
					success: false,
					message: "Server name is required",
				});
			}

			const result = await webMcpInterface.handleRemoveServer(serverName);
			res.status(result.status).json(result.body);
		});

		this.app.get("/api/mcp/status/:serverName?", async (req, res) => {
			const { serverName } = req.params;
			const result = await webMcpInterface.handleServerStatus(serverName);
			res.status(result.status).json(result.body);
		});

		// Health check
		this.app.get("/health", (_req, res) => {
			res.json({
				status: "healthy",
				timestamp: new Date().toISOString(),
				version: "1.0.0",
			});
		});

		// API documentation
		this.app.get("/api/docs", (_req, res) => {
			res.json({
				title: "Universal MCP Manager API",
				version: "1.0.0",
				description: "Secure MCP server management with universal CLI support",
				endpoints: {
					"POST /api/mcp/add": {
						description: "Add a new MCP server",
						body: {
							command: "string (required) - MCP command in any CLI format",
							frontend: "string (optional) - Frontend identifier",
							autoApprove: "boolean (optional) - Skip security review",
						},
						responses: {
							200: "Server added successfully",
							202: "Server requires confirmation",
							400: "Invalid request",
							500: "Server error",
						},
					},
					"POST /api/mcp/approve": {
						description: "Approve a pending server addition",
						body: {
							command: "string (required) - Original MCP command",
							frontend: "string (optional) - Frontend identifier",
							force: "boolean (required) - Force approval",
						},
						responses: {
							200: "Server approved and added",
							400: "Invalid request",
							500: "Server error",
						},
					},
					"GET /api/mcp/list": {
						description: "List all configured MCP servers",
						responses: {
							200: "List of servers",
							500: "Server error",
						},
					},
					"GET /api/mcp/check/:nameOrUrl": {
						description: "Check if an MCP server is already installed",
						params: {
							nameOrUrl: "string (required) - Server name or URL to check",
						},
						responses: {
							200: "Installation status information",
							400: "Invalid request",
							500: "Server error",
						},
					},
					"DELETE /api/mcp/remove/:serverName": {
						description: "Remove an MCP server",
						params: {
							serverName: "string (required) - Name of server to remove",
						},
						responses: {
							200: "Server removed successfully",
							400: "Invalid request",
							500: "Server error",
						},
					},
					"GET /api/mcp/status/:serverName?": {
						description: "Get server status",
						params: {
							serverName: "string (optional) - Specific server name",
						},
						responses: {
							200: "Server status information",
							500: "Server error",
						},
					},
				},
				examples: {
					"Add server": {
						url: "POST /api/mcp/add",
						body: {
							command:
								'cortex mcp add --transport http Ref "https://api.ref.tools/mcp?apiKey=ref-e672788111c76ba32bc1"',
							frontend: "cortex-cli",
							autoApprove: false,
						},
					},
					"Approve server": {
						url: "POST /api/mcp/approve",
						body: {
							command:
								'cortex mcp add --transport http Ref "https://api.ref.tools/mcp?apiKey=ref-e672788111c76ba32bc1"',
							frontend: "cortex-cli",
							force: true,
						},
					},
				},
			});
		});

		// 404 handler
		this.app.use("*", (_req, res) => {
			res.status(404).json({
				success: false,
				message: "Endpoint not found",
				availableEndpoints: [
					"GET /",
					"GET /api/docs",
					"POST /api/mcp/add",
					"POST /api/mcp/approve",
					"GET /api/mcp/list",
					"DELETE /api/mcp/remove/:serverName",
					"GET /api/mcp/status/:serverName?",
					"GET /health",
				],
			});
		});

		// Error handler
		this.app.use(
			(
				err: Error,
				_req: express.Request,
				res: express.Response,
				_next: express.NextFunction,
			) => {
				console.error("Server error:", err);
				res.status(500).json({
					success: false,
					message: "Internal server error",
					error:
						process.env.NODE_ENV === "development" ? err.message : undefined,
				});
			},
		);
	}

	/**
	 * Start the server
	 */
	async start(): Promise<void> {
		return new Promise((resolve) => {
			this.app.listen(this.port, async () => {
				// eslint-disable-next-line no-console
				console.log(
					`🔒 Universal MCP Manager running on http://localhost:${this.port}`,
				);
				// eslint-disable-next-line no-console
				console.log(
					`📚 API Documentation: http://localhost:${this.port}/api/docs`,
				);
				// eslint-disable-next-line no-console
				console.log(`🏥 Health Check: http://localhost:${this.port}/health`);

				// Always start Cloudflare Tunnel for public access (built-in server interface)
				try {
					const { url, child } = await startCloudflareTunnel(this.port);
					this.tunnelProc = child;
					this.publicUrl = url;
					// Propagate for downstream consumers if they prefer env
					process.env.CORTEX_MCP_PUBLIC_URL = url;
					// eslint-disable-next-line no-console
					console.log(`🌐 Cloudflare Tunnel (public): ${url}`);
					// eslint-disable-next-line no-console
					console.log(`🔗 Public API Documentation: ${url}/api/docs`);
					// eslint-disable-next-line no-console
					console.log(`🩺 Public Health Check: ${url}/health`);
				} catch (err) {
					const strict = process.env.CORTEX_MCP_TUNNEL_STRICT === "1";
					const message =
						"Failed to start Cloudflare Tunnel. Falling back to local-only mode.";
					console.error(`❌ ${message}`);
					console.error(String(err instanceof Error ? err.message : err));
					const localUrl = `http://localhost:${this.port}`;
					this.publicUrl = localUrl;
					process.env.CORTEX_MCP_PUBLIC_URL = localUrl;
					// Optionally emit an A2A event via env-based side channel (runtime may publish separately)
					// eslint-disable-next-line no-console
					console.warn(`🛟 Tunnel fallback active. Local URL: ${localUrl}`);
					try {
						globalThis.__CORTEX_A2A_PUBLISH__?.(
							"mcp.tunnel.failed",
							{
								port: this.port,
								reason: err instanceof Error ? err.message : String(err),
							},
							"urn:cortex-os:mcp-manager",
						);
					} catch {
						// ignore optional publish errors
					}
					if (strict) {
						// In strict mode, exit after starting server logs so operators see why it failed
						// eslint-disable-next-line no-console
						console.error(
							"CORTEX_MCP_TUNNEL_STRICT=1 set. Exiting due to tunnel failure.",
						);
						process.exit(1);
					}
				}

				resolve();
			});
		});
	}

	/** Stop server resources (tunnel, etc.) */
	stop(): void {
		try {
			this.tunnelProc?.kill("SIGINT");
		} catch (e) {
			// eslint-disable-next-line no-console
			console.warn("Failed to stop tunnel process cleanly:", e);
		}
	}

	/**
	 * Get the Express app instance
	 */
	getApp(): express.Application {
		return this.app;
	}

	/**
	 * Get the public URL provided by Cloudflare Tunnel, if available
	 */
	getPublicUrl(): string | null {
		return this.publicUrl;
	}
}

// CLI runner (ESM-safe)
const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (invokedPath && import.meta.url === invokedPath) {
	const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
	const server = new McpDemoServer(port);

	server.start().catch((error) => {
		console.error("Failed to start server:", error);
		process.exit(1);
	});

	// Graceful shutdown
	process.on("SIGINT", () => {
		// eslint-disable-next-line no-console
		console.log("\n🛑 Shutting down server...");
		server.stop();
		process.exit(0);
	});
}

export { McpDemoServer };
