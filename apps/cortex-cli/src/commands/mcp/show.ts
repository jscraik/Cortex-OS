import type { ServerManifest } from "@cortex-os/mcp-registry";

type ExtendedServerManifest = ServerManifest & {
	security?: {
		riskLevel?: string;
		verifiedPublisher?: boolean;
		sigstoreBundle?: string;
		sbom?: string;
	};
	category?: string;
	owner?: string;
	version?: string;
	repo?: string;
	homepage?: string;
	license?: string;
	scopes?: string[];
	install?: Record<string, string>;
	oauth?: {
		authType?: string;
		authorizationEndpoint?: string;
		tokenEndpoint?: string;
		scopes?: string[];
	};
};

import { Command } from "commander";
import { createMarketplaceClient } from "./marketplace-client.js";

export const mcpShow = new Command("show")
	.description("Show detailed information about an MCP server")
	.argument("<server-id>", "Server ID to display")
	.option("--registry <url>", "Custom registry URL")
	.option("--json", "Output in JSON format")
	.option(
		"--client <type>",
		"Show install command for specific client (claude, cline, devin, cursor, continue, windsurf)",
	)
	.action(async (serverId: string, options: ShowOptions) => {
		try {
			const client = createMarketplaceClient(
				options.registry ? { registryUrl: options.registry } : {},
			);

			const server = await client.getServer(serverId);

			if (!server) {
				if (options.json) {
					const payload = { error: `Server "${serverId}" not found` };
					process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
				} else {
					process.stderr.write(
						`Error: MCP server "${serverId}" not found in marketplace\n`,
					);
					process.stderr.write(
						"Try: cortex mcp search <query> to find available servers\n",
					);
				}
				process.exit(1);
			}

			if (options.json) {
				process.stdout.write(`${JSON.stringify(server, null, 2)}\n`);
			} else {
				displayServerInfo(server, options.client);
			}
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

interface ShowOptions {
	registry?: string;
	json?: boolean;
	client?: string;
}

function displayServerInfo(server: ExtendedServerManifest, showClient?: string) {
	const verifiedBadge = server.security?.verifiedPublisher ? " ✓ Verified" : "";
	const riskBadge = getRiskBadge((server.security?.riskLevel as "low" | "medium" | "high") || "medium");
	printHeader(server.name, verifiedBadge, riskBadge);
	printBasicInfo(server);
	printDescriptionAndTags(server);
	printLinks(server);
	printSecurity(server);
	printPermissions(server);
	printTransports(server);
	printAuth(server);
	printInstallation(server, showClient);
	printQuickCommands(server);
}

function getRiskBadge(riskLevel: "low" | "medium" | "high"): string {
	switch (riskLevel) {
		case "low":
			return "🟢 Low Risk";
		case "medium":
			return "🟡 Medium Risk";
		case "high":
			return "🔴 High Risk";
		default:
			return "🟡 Medium Risk";
	}
}

function isValidClient(client: string): boolean {
	return ["claude", "cline"].includes(client);
}

function printHeader(
	name: string,
	verifiedBadge: string,
	riskBadge: string,
): void {
	process.stdout.write(`${name}${verifiedBadge} ${riskBadge}\n`);
	process.stdout.write(
		`${"=".repeat(name.length + verifiedBadge.length + 2)}\n\n`,
	);
}

function printBasicInfo(server: ExtendedServerManifest): void {
	process.stdout.write(`ID: ${server.id}\n`);
	process.stdout.write(`Owner: ${server.owner}\n`);
	process.stdout.write(`Category: ${server.category}\n`);
	if (server.version) process.stdout.write(`Version: ${server.version}\n`);
	if (server.license) process.stdout.write(`License: ${server.license}\n`);
	process.stdout.write("\n");
}

function printDescriptionAndTags(server: ExtendedServerManifest): void {
	if (server.description) {
		process.stdout.write(`Description:\n${server.description}\n\n`);
	}
	if (server.tags && server.tags.length > 0) {
		process.stdout.write(`Tags: ${server.tags.join(", ")}\n\n`);
	}
}

function printLinks(server: ExtendedServerManifest): void {
	if (server.repo || server.homepage) {
		process.stdout.write("Links:\n");
		if (server.repo) process.stdout.write(`  Repository: ${server.repo}\n`);
		if (server.homepage)
			process.stdout.write(`  Homepage: ${server.homepage}\n`);
		process.stdout.write("\n");
	}
}

function printSecurity(server: ExtendedServerManifest): void {
	process.stdout.write("Security:\n");
	process.stdout.write(
		`  Risk Level: ${server.security?.riskLevel || "medium"}\n`,
	);
	process.stdout.write(
		`  Verified Publisher: ${server.security?.verifiedPublisher ? "Yes" : "No"}\n`,
	);
	if (server.security?.sigstoreBundle) {
		process.stdout.write(
			`  Sigstore Bundle: ${server.security.sigstoreBundle}\n`,
		);
	}
	if (server.security?.sbom) {
		process.stdout.write(`  SBOM: ${server.security.sbom}\n`);
	}
	process.stdout.write("\n");
}

function printPermissions(server: ExtendedServerManifest): void {
	process.stdout.write("Required Permissions:\n");
	for (const scope of server.scopes || []) {
		process.stdout.write(`  • ${scope}\n`);
	}
	process.stdout.write("\n");
}

function printTransports(server: ExtendedServerManifest): void {
	process.stdout.write("Available Transports:\n");
	if (server.transports.stdio) {
		const stdio = server.transports.stdio;
		const stdioTyped = stdio as { command?: string; args?: string[] };
		process.stdout.write(`  • stdio: ${stdioTyped.command}\n`);
		if (stdioTyped.args && stdioTyped.args.length > 0) {
			process.stdout.write(`    Args: ${stdioTyped.args.join(" ")}\n`);
		}
	}
	if (server.transports.sse) {
		process.stdout.write(`  • sse: ${(server.transports.sse as { url?: string }).url}\n`);
	}
	if (server.transports.streamableHttp) {
		process.stdout.write(
			`  • streamableHttp: ${(server.transports.streamableHttp as { url?: string }).url}\n`,
		);
	}
	process.stdout.write("\n");
}

function printAuth(server: ExtendedServerManifest): void {
	if (server.oauth && server.oauth.authType !== "none") {
		process.stdout.write("Authentication:\n");
		process.stdout.write(`  Type: ${server.oauth.authType}\n`);
		if (server.oauth.authType === "oauth2") {
			if (server.oauth.authorizationEndpoint) {
				process.stdout.write(
					`  Authorization: ${server.oauth.authorizationEndpoint}\n`,
				);
			}
			if (server.oauth.tokenEndpoint) {
				process.stdout.write(`  Token: ${server.oauth.tokenEndpoint}\n`);
			}
			if (server.oauth.scopes) {
				process.stdout.write(`  Scopes: ${server.oauth.scopes.join(", ")}\n`);
			}
		}
		process.stdout.write("\n");
	}
}

function printSpecificClientInstall(server: ExtendedServerManifest, client: string): void {
	const cmd = server.install?.[client];
	if (cmd) {
		process.stdout.write(`  ${client}: ${cmd}\n`);
	} else {
		process.stdout.write(`  ${client}: not available\n`);
	}
}

function printInstallation(server: ExtendedServerManifest, showClient?: string): void {
	process.stdout.write("Installation:\n");
	if (showClient && isValidClient(showClient)) {
		printSpecificClientInstall(server, showClient);
	} else {
		const clients = Object.keys(server.install || {});
		for (const client of clients) {
			if (client === "json") {
				process.stdout.write("  json: <configuration object>\n");
			} else {
				process.stdout.write(
					`  ${client}: ${server.install?.[client]}\n`,
				);
			}
		}
	}
	process.stdout.write("\n");
}

function printQuickCommands(server: ExtendedServerManifest): void {
	process.stdout.write("Quick Commands:\n");
	process.stdout.write(
		`  cortex mcp add ${server.id}                    Add to local registry\n`,
	);
	const clients = Object.keys(server.install || {}).filter((c) => c !== "json");
	if (clients.length > 0) {
		process.stdout.write(
			`  cortex mcp show ${server.id} --client ${clients[0]}    Show install command for ${clients[0]}\n`,
		);
	}
}
