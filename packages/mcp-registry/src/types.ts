/**
 * @file Type definitions for MCP Registry
 */

import { z } from "zod";

// Transport types
export const StdioTransportSchema = z.object({
	command: z.string().min(1),
	args: z.array(z.string()).optional(),
	env: z.record(z.string()).optional(),
});

export const SseTransportSchema = z.object({
	url: z
		.string()
		.url()
		.refine((url) => url.startsWith("https://"), {
			message: "SSE URLs must use HTTPS",
		}),
	headers: z.record(z.string()).optional(),
});

export const StreamableHttpTransportSchema = z.object({
	url: z
		.string()
		.url()
		.refine((url) => url.startsWith("https://"), {
			message: "Streamable HTTP URLs must use HTTPS",
		}),
	headers: z.record(z.string()).optional(),
});

export const TransportsSchema = z
	.object({
		stdio: StdioTransportSchema.optional(),
		sse: SseTransportSchema.optional(),
		streamableHttp: StreamableHttpTransportSchema.optional(),
	})
	.refine((transports) => Object.values(transports).some(Boolean), {
		message: "At least one transport must be defined",
	});

// Install commands
export const InstallSchema = z.object({
	claude: z.string().min(1),
	json: z.record(z.any()).optional(),
	cline: z.string().min(1).optional(),
	devin: z.string().min(1).optional(),
	cursor: z.string().min(1).optional(),
	continue: z.string().min(1).optional(),
	windsurf: z.string().min(1).optional(),
});

// OAuth configuration
export const OAuthSchema = z
	.object({
		authType: z.enum(["none", "apiKey", "oauth2", "bearer"]),
		authorizationEndpoint: z.string().url().optional(),
		tokenEndpoint: z.string().url().optional(),
		clientId: z.string().optional(),
		scopes: z.array(z.string()).optional(),
	})
	.refine(
		(oauth) => {
			if (oauth.authType === "oauth2") {
				return (
					oauth.authorizationEndpoint && oauth.tokenEndpoint && oauth.clientId
				);
			}
			return true;
		},
		{
			message:
				"OAuth2 requires authorizationEndpoint, tokenEndpoint, and clientId",
		},
	);

// Security metadata
export const SecuritySchema = z.object({
	sigstoreBundle: z.string().url().optional(),
	sbom: z.string().url().optional(),
	riskLevel: z.enum(["low", "medium", "high"]).default("medium"),
	verifiedPublisher: z.boolean().default(false),
});

// Server manifest
export const ServerManifestSchema = z.object({
	id: z
		.string()
		.regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/)
		.min(1)
		.max(63),
	name: z.string().min(1).max(100),
	owner: z.string().min(1).max(100),
	version: z
		.string()
		.regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/)
		.optional(),
	repo: z.string().url().optional(),
	homepage: z.string().url().optional(),
	logo: z.string().url().optional(),
	category: z.enum([
		"development",
		"productivity",
		"data",
		"communication",
		"finance",
		"media",
		"security",
		"testing",
		"ai-ml",
		"integration",
		"utility",
		"other",
	]),
	tags: z
		.array(z.string().regex(/^[a-z0-9-]+$/))
		.max(10)
		.optional(),
	description: z.string().min(10).max(500).optional(),
	license: z
		.enum([
			"MIT",
			"Apache-2.0",
			"GPL-3.0",
			"BSD-3-Clause",
			"ISC",
			"LGPL-2.1",
			"MPL-2.0",
			"Unlicense",
			"Proprietary",
		])
		.optional(),
	transports: TransportsSchema,
	install: InstallSchema,
	scopes: z.array(z.string().regex(/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/)).min(1),
	oauth: OAuthSchema.optional(),
	security: SecuritySchema.optional(),
	manifest: z
		.object({
			createdAt: z.string().datetime().optional(),
			updatedAt: z.string().datetime().optional(),
			digest: z
				.string()
				.regex(/^sha256:[a-f0-9]{64}$/)
				.optional(),
		})
		.optional(),
});

// Registry index
export const RegistryIndexSchema = z.object({
	version: z.string().regex(/^2025-\d{2}-\d{2}$/),
	metadata: z.object({
		updatedAt: z.string().datetime(),
		serverCount: z.number().int().min(0),
		categories: z.array(z.string()).optional(),
	}),
	servers: z.array(ServerManifestSchema),
	signing: z.object({
		sigstoreBundleUrl: z.string().url(),
		publicKey: z.string(),
		algorithm: z.enum(["Ed25519", "ECDSA-P256"]).default("Ed25519"),
	}),
});

// Type exports
export type StdioTransport = z.infer<typeof StdioTransportSchema>;
export type SseTransport = z.infer<typeof SseTransportSchema>;
export type StreamableHttpTransport = z.infer<
	typeof StreamableHttpTransportSchema
>;
export type Transports = z.infer<typeof TransportsSchema>;
export type Install = z.infer<typeof InstallSchema>;
export type OAuth = z.infer<typeof OAuthSchema>;
export type Security = z.infer<typeof SecuritySchema>;
export type ServerManifest = z.infer<typeof ServerManifestSchema>;
export type RegistryIndex = z.infer<typeof RegistryIndexSchema>;

// Validation result types
export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	warnings: ValidationWarning[];
}

export interface ValidationError {
	path: string;
	message: string;
	code: string;
}

export interface ValidationWarning {
	path: string;
	message: string;
	suggestion?: string;
}

// Client types for install command generation
export type SupportedClient =
	| "claude"
	| "cline"
	| "devin"
	| "cursor"
	| "continue"
	| "windsurf"
	| "json";

export interface InstallCommand {
	client: SupportedClient;
	command: string;
	description: string;
	transport: "stdio" | "sse" | "streamableHttp";
}
