import { execSync } from "node:child_process";

async function sign() {
	try {
		execSync("cosign version", { stdio: "inherit" });
		execSync("cosign sign-blob --yes sbom-node.json > sbom-node.json.sig", {
			shell: "/bin/bash",
		});
		execSync("cosign sign-blob --yes sbom-python.json > sbom-python.json.sig", {
			shell: "/bin/bash",
		});
		console.log("✅ SBOM signed");
	} catch (e) {
		console.error("Signing failed", e);
		process.exit(1);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) sign();
