import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

async function main() {
	console.log("Generating SBOM(s)...");
	// Node via cyclonedx bom (installed as @cyclonedx/bom exposes CLI 'cyclonedx-bom' if needed).
	// Here we call library through npx to keep script simple.
	try {
		const nodeBom = execSync(
			"npx -y @cyclonedx/cyclonedx-npm --output-format json",
			{
				encoding: "utf8",
			},
		);
		writeFileSync("sbom-node.json", nodeBom);
	} catch {
		console.warn(
			"Node SBOM generation failed.\n" +
				"To fix this, install the CycloneDX npm CLI by running:\n" +
				"  npm install -g @cyclonedx/cyclonedx-npm\n" +
				"Or, if you prefer a local install:\n" +
				"  npm install --save-dev @cyclonedx/cyclonedx-npm\n" +
				"Then re-run this script.",
		);
	}

	// Python via uv list
	execSync("uv pip list --format json > pip-list.json");
	const deps = JSON.parse(readFileSync("pip-list.json", "utf8"));
	const components = (Array.isArray(deps) ? deps : []).map((d: unknown) => {
		const rec = (
			typeof d === "object" && d !== null ? (d as Record<string, unknown>) : {}
		) as Record<string, unknown>;
		const nameVal = rec.name ?? rec.project;
		const name = typeof nameVal === "string" ? nameVal : "unknown";
		const versionVal = rec.version;
		const version = typeof versionVal === "string" ? versionVal : "unknown";
		return {
			type: "library",
			name,
			version,
		};
	});
	const pythonBom = {
		bomFormat: "CycloneDX",
		specVersion: "1.5",
		version: 1,
		components,
	};
	writeFileSync("sbom-python.json", JSON.stringify(pythonBom, null, 2));

	// Unified
	let nodeComponents: unknown[] = [];
	try {
		const nodeBom = JSON.parse(readFileSync("sbom-node.json", "utf8"));
		nodeComponents = nodeBom.components || [];
	} catch {}
	const unified = {
		bomFormat: "CycloneDX",
		specVersion: "1.5",
		version: 1,
		components: [...nodeComponents, ...components],
	};
	writeFileSync("sbom-unified.json", JSON.stringify(unified, null, 2));
	console.log("SBOM complete");
}
main().catch((e) => {
	console.error(e);
	process.exit(1);
});
