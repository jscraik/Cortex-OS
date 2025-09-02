import Ajv from "ajv";
import addFormats from "ajv-formats";
import { expect, test } from "vitest";

const registrySchema = await import("../../schemas/registry.schema.json");
const serverManifestSchema = await import(
	"../../schemas/server-manifest.schema.json"
);

import { validateRegistry } from "./validateRegistry.js";
import { validateServerManifest } from "./validateServerManifest.js";

function createAjv() {
	const ajv = new Ajv({ allErrors: true, verbose: true, strict: false });
	addFormats(ajv);
	ajv.addFormat("uri", {
		type: "string",
		validate: (uri: string) => {
			try {
				new URL(uri);
				return true;
			} catch {
				return false;
			}
		},
	});
	ajv.addSchema(registrySchema, "registry");
	ajv.addSchema(serverManifestSchema, "server-manifest");
	return ajv;
}

const ajv = createAjv();
const serverValidator = (m: unknown) => validateServerManifest(ajv, m);

const baseManifest = {
	id: "test",
	name: "Test Server",
	owner: "cortex",
	category: "utility",
	transports: { stdio: { command: "echo" } },
	install: { claude: "npm i test" },
	scopes: ["test:scope"],
	repo: "https://example.com",
	logo: "https://example.com/logo.png",
};

test("fails JSON schema validation", () => {
	const invalidRegistry = { servers: [baseManifest] };
	const result = validateRegistry(ajv, invalidRegistry, serverValidator);
	expect(result.valid).toBe(false);
	expect(result.errors.length).toBeGreaterThan(0);
});

test("detects duplicate server ids and count mismatch", () => {
	const registry = {
		version: "2025-01-01",
		metadata: { updatedAt: new Date().toISOString(), serverCount: 1 },
		servers: [baseManifest, { ...baseManifest }],
		signing: {
			sigstoreBundleUrl: "https://example.com/bundle",
			publicKey: "key",
		},
	};
	const result = validateRegistry(ajv, registry, serverValidator);
	expect(result.errors.some((e) => e.code === "duplicate_id")).toBe(true);
	expect(result.warnings.some((w) => w.path === "metadata.serverCount")).toBe(
		true,
	);
});
