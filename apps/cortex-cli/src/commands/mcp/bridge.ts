import { Command } from "commander";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createMarketplaceClient } from "./marketplace-client.js";

interface BridgeConfig {
	registries: Array<{
		name: string;
		url: string;
		description?: string;
		trusted: boolean;
		addedAt: string;
	}>;
}

export const mcpBridge = new Command("bridge")
	.description("Manage custom MCP registry bridges")
	.argument("[url]", "Registry URL to add/test")
	.option("--add", "Add registry to bridge list")
	.option("--remove <name>", "Remove registry by name")
	.option("--list", "List configured registries")
	.option("--test", "Test registry connectivity")
	.option("--name <name>", "Name for the registry (required with --add)")
	.option("--description <desc>", "Description for the registry")
	.option(
		"--trusted",
		"Mark registry as trusted (enables signature verification bypass)",
	)
	.option("--json", "Output in JSON format")
	.action(async (url?: string, options: BridgeOptions = {}) => {
		try {
			const {
				list,
				remove,
				add,
				test,
				name,
				description,
				trusted = false,
				json,
			} = options;

			if (list) return await listRegistries(!!json);
			if (remove) return await removeRegistry(remove, !!json);
			if (add) {
				if (!url) throw new Error("URL is required with --add");
				if (!name) throw new Error("--name is required when adding a registry");
				return await addRegistry(url, name, description, !!trusted, !!json);
			}

			// Default test action if a URL is provided or --test is set
			if (test || url) return await testRegistry(String(url), !!json);

			// Show usage
			printUsage();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unknown error occurred";
			if (options.json) {
				process.stderr.write(
					`${JSON.stringify({ error: message }, null, 2)}\n`,
				);
			} else {
				process.stderr.write(`Error: ${message}\n`);
			}
			process.exit(1);
		}
	});

interface BridgeOptions {
	add?: boolean;
	remove?: string;
	list?: boolean;
	test?: boolean;
	name?: string;
	description?: string;
	trusted?: boolean;
	json?: boolean;
}

async function getBridgeConfigPath(): Promise<string> {
	const configDir = join(homedir(), ".cortex", "mcp");
	await fs.mkdir(configDir, { recursive: true });
	return join(configDir, "bridge-config.json");
}

async function loadBridgeConfig(): Promise<BridgeConfig> {
	const configPath = await getBridgeConfigPath();

	try {
		const data = await fs.readFile(configPath, "utf-8");
		return JSON.parse(data);
	} catch {
		// Return default config if file doesn't exist
		return { registries: [] };
	}
}

async function saveBridgeConfig(config: BridgeConfig): Promise<void> {
	const configPath = await getBridgeConfigPath();
	await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

async function listRegistries(json: boolean): Promise<void> {
	const config = await loadBridgeConfig();

	if (json) {
		process.stdout.write(
			`${JSON.stringify({ registries: config.registries }, null, 2)}\n`,
		);
	} else {
		if (config.registries.length === 0) {
			process.stdout.write("No custom registries configured.\n");
			process.stdout.write(
				"Use: cortex mcp bridge <url> --add --name <name> to add one.\n",
			);
			return;
		}

		process.stdout.write(
			`Configured registries (${config.registries.length}):\n\n`,
		);

		for (const registry of config.registries) {
			const trustedBadge = registry.trusted ? " 🔒 Trusted" : "";
			process.stdout.write(`${registry.name}${trustedBadge}\n`);
			process.stdout.write(`  URL: ${registry.url}\n`);

			if (registry.description) {
				process.stdout.write(`  Description: ${registry.description}\n`);
			}

			process.stdout.write(
				`  Added: ${new Date(registry.addedAt).toLocaleDateString()}\n\n`,
			);
		}

		process.stdout.write("Commands:\n");
		process.stdout.write(
			"  cortex mcp bridge --remove <name>    Remove registry\n",
		);
		process.stdout.write(
			"  cortex mcp search --registry <url>   Search in specific registry\n",
		);
	}
}

async function addRegistry(
	url: string,
	name: string,
	description: string | undefined,
	trusted: boolean,
	json: boolean,
): Promise<void> {
	validateUrlOrThrow(url);

	// Test registry connectivity first
	const client = createMarketplaceClient({
		registryUrl: url,
		security: { requireSignatures: !trusted },
	});

	try {
		const health = await client.healthCheck(url);
		if (!health.success) {
			throw new Error(`Registry health check failed: ${health.error.message}`);
		}
		printHealthResult({
			success: true,
			data: health.data,
		}, { json, url });
	} catch (error) {
		throw new Error(
			`Registry test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}

	// Load existing config
	const config = await loadBridgeConfig();

	// Check for duplicate names or URLs
	const existingByName = config.registries.find((r) => r.name === name);
	if (existingByName) {
		throw new Error(`Registry with name "${name}" already exists`);
	}

	const existingByUrl = config.registries.find((r) => r.url === url);
	if (existingByUrl) {
		throw new Error(
			`Registry with URL "${url}" already exists as "${existingByUrl.name}"`,
		);
	}

	// Add new registry
	config.registries.push({
		name,
		url,
		description,
		trusted,
		addedAt: new Date().toISOString(),
	});

	await saveBridgeConfig(config);

	if (json) {
		process.stdout.write(
			`${JSON.stringify(
				{
					ok: true,
					added: { name, url, description, trusted },
				},
				null,
				2,
			)}\n`,
		);
	} else {
		const trustedBadge = trusted ? " 🔒 Trusted" : "";
		process.stdout.write(`Added registry: ${name}${trustedBadge}\n`);
		process.stdout.write(`  URL: ${url}\n`);
		if (description) {
			process.stdout.write(`  Description: ${description}\n`);
		}
		process.stdout.write("\nYou can now use:\n");
		process.stdout.write(`  cortex mcp search --registry ${url}\n`);
		process.stdout.write(`  cortex mcp add <server-id> --registry ${url}\n`);
	}
}

async function removeRegistry(name: string, json: boolean): Promise<void> {
	const config = await loadBridgeConfig();

	const index = config.registries.findIndex((r) => r.name === name);
	if (index === -1) {
		throw new Error(`Registry "${name}" not found`);
	}

	const removed = config.registries.splice(index, 1)[0];
	await saveBridgeConfig(config);

	if (json) {
		process.stdout.write(
			`${JSON.stringify(
				{
					ok: true,
					removed: { name: removed.name, url: removed.url },
				},
				null,
				2,
			)}\n`,
		);
	} else {
		process.stdout.write(`Removed registry: ${removed.name}\n`);
		process.stdout.write(`  URL: ${removed.url}\n`);
	}
}

async function testRegistry(url: string, json: boolean): Promise<void> {
	validateUrlOrThrow(url);

	const client = createMarketplaceClient({
		registryUrl: url,
		security: { requireSignatures: false },
	});

	if (!json) {
		process.stdout.write(`Testing registry: ${url}\n`);
	}

	try {
		const start = Date.now();
		const health = await client.healthCheck(url);
		const elapsed = Date.now() - start;

		if (!health.success) {
			printHealthResult({
				success: false,
				data: {
					healthy: false,
					error: health.error.message,
				},
			}, { json, url, elapsed });
			return;
		}

		printHealthResult(
			{
				success: true,
				data: health.data,
			},
			{ json, url, elapsed },
		);
		if (!json && health.success && health.data.healthy) {
			process.stdout.write("\nTo add this registry:\n");
			process.stdout.write(
				`  cortex mcp bridge "${url}" --add --name <name>\n`,
			);
		}
	} catch (error) {
		if (json) {
			process.stdout.write(
				`${JSON.stringify(
					{
						test: "failed",
						url,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					null,
					2,
				)}\n`,
			);
		} else {
			throw new Error(
				`Registry test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}
}

function printUsage(): void {
	process.stdout.write("Usage:\n");
	process.stdout.write(
		"  cortex mcp bridge <url>                     Test registry connectivity\n",
	);
	process.stdout.write(
		"  cortex mcp bridge <url> --add --name <name> Add registry to bridge list\n",
	);
	process.stdout.write(
		"  cortex mcp bridge --list                    List configured registries\n",
	);
	process.stdout.write(
		"  cortex mcp bridge --remove <name>           Remove registry\n",
	);
	process.stdout.write(
		"  cortex mcp bridge <url> --test              Test registry\n",
	);
}

// Helpers
function validateUrlOrThrow(url: string): void {
	try {
		// Removed unused eslint-disable (no-new) – object construction side-effects not present.
		new URL(url);
	} catch {
		throw new Error("Invalid URL format");
	}
}

type HealthResult = {
	success: boolean;
	data: {
		healthy: boolean;
		serverCount?: number;
		lastUpdated?: string;
		error?: string;
	};
};

function printHealthResult(
	health: HealthResult,
	opts: { json: boolean; url: string; elapsed?: number },
): void {
	const { json, url, elapsed } = opts;
	if (json) {
		process.stdout.write(
			`${JSON.stringify(
				{
					test: health.success && health.data.healthy ? "passed" : "failed",
					url,
					...(typeof elapsed === "number" ? { responseTime: elapsed } : {}),
					registry: {
						serverCount: health.data.serverCount ?? 0,
						updatedAt: health.data.lastUpdated,
					},
					error: health.data.error,
				},
				null,
				2,
			)}\n`,
		);
		return;
	}

	if (health.success && health.data.healthy) {
		const prefix =
			typeof elapsed === "number"
				? `✓ Registry accessible (${elapsed}ms)`
				: "✓ Registry accessible";
		process.stdout.write(`${prefix}\n`);
		process.stdout.write(`  Servers: ${health.data.serverCount ?? 0}\n`);
		if (health.data.lastUpdated) {
			process.stdout.write(
				`  Updated: ${new Date(health.data.lastUpdated).toLocaleDateString()}\n`,
			);
		}
	} else {
		throw new Error(health.data.error || "Registry reported unhealthy");
	}
}
