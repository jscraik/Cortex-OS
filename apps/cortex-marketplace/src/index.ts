/**
 * @file Marketplace API Server
 * @description Entry point for MCP marketplace API server
 */

import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { build } from "./app.js";

type LoggerLevel = "debug" | "info" | "warn" | "error";

interface ServerConfig {
	port: number;
	host: string;
	registries: Record<string, string>;
	cacheDir: string;
	cacheTtl: number;
	logLevel: LoggerLevel;
}

async function loadConfig(): Promise<ServerConfig> {
	const config: ServerConfig = {
		port: parseInt(process.env.PORT || "3000", 10),
		host: process.env.HOST || "0.0.0.0",
		registries: {
			official:
				process.env.OFFICIAL_REGISTRY ||
				"https://registry.cortex-os.dev/v1/registry.json",
			community:
				process.env.COMMUNITY_REGISTRY ||
				"https://community.mcp.dev/v1/registry.json",
		},
		cacheDir:
			process.env.CACHE_DIR ||
			path.join(os.tmpdir(), "cortex-marketplace-cache"),
		cacheTtl: parseInt(process.env.CACHE_TTL || "300000", 10),
		logLevel: ((): LoggerLevel => {
			const lvl = (process.env.LOG_LEVEL || "info").toLowerCase();
			return ["debug", "info", "warn", "error"].includes(lvl)
				? (lvl as LoggerLevel)
				: "info";
		})(),
	};

	try {
		const configPath = process.env.CONFIG_FILE || "./config.json";
		const raw = await readFile(configPath, "utf-8");
		const fileConfig = JSON.parse(raw) as Partial<ServerConfig> & {
			registries?: Record<string, string>;
		};
		if (fileConfig.registries && !process.env.OFFICIAL_REGISTRY) {
			config.registries = { ...fileConfig.registries, ...config.registries };
		}
		if (fileConfig.cacheDir && !process.env.CACHE_DIR) {
			config.cacheDir = fileConfig.cacheDir;
		}
		if (fileConfig.cacheTtl && !process.env.CACHE_TTL) {
			config.cacheTtl = fileConfig.cacheTtl;
		}
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		console.log(
			"Using default configuration (config file not found or invalid):",
			msg,
		);
	}

	return config;
}

async function start(): Promise<void> {
	let server: ReturnType<typeof build> | null = null;
	try {
		const config = await loadConfig();
		console.log("Starting Cortex MCP Marketplace API...");
		console.log(`Port: ${config.port}`);
		console.log(`Host: ${config.host}`);
		console.log(`Cache Dir: ${config.cacheDir}`);
		console.log(`Cache TTL: ${config.cacheTtl}ms`);
		console.log(`Registries: ${Object.keys(config.registries).join(", ")}`);

		server = build({
			logger: config.logLevel !== "error",
			registries: config.registries,
			cacheDir: config.cacheDir,
			cacheTtl: config.cacheTtl,
			port: config.port,
			host: config.host,
		});

		const signals: NodeJS.Signals[] = ["SIGTERM", "SIGINT"];
		signals.forEach((signal) => {
			process.on(signal, async () => {
				console.log(`Received ${signal}, gracefully shutting down...`);
				try {
					if (server) {
						await server.close();
					}
					console.log("Server closed successfully");
					process.exit(0);
				} catch (err) {
					console.error("Error during shutdown:", err);
					process.exit(1);
				}
			});
		});

		process.on("uncaughtException", (error) => {
			console.error("Uncaught Exception:", error);
			process.exit(1);
		});
		process.on("unhandledRejection", (reason, promise) => {
			console.error("Unhandled Rejection at:", promise, "reason:", reason);
			process.exit(1);
		});

		await server.listen({ port: config.port, host: config.host });
		console.log("🚀 Marketplace API server started successfully!");
		console.log(
			`📖 API Documentation: http://${config.host}:${config.port}/documentation`,
		);
		console.log(`🏥 Health Check: http://${config.host}:${config.port}/health`);
	} catch (error) {
		console.error("Failed to start server:", error);
		if (server) {
			try {
				await server.close();
			} catch (closeError) {
				console.error("Error closing server:", closeError);
			}
		}
		process.exit(1);
	}
}

if (process.env.NODE_ENV !== "test") {
	start();
}
