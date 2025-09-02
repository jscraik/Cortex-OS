#!/usr/bin/env node
const { publishPacts } = require("@pact-foundation/pact");
const path = require("node:path");

async function main() {
	const broker = process.env.PACT_BROKER_URL;
	if (!broker) {
		console.log("[pact] Broker URL not set; skipping publish");
		return;
	}
	const token = process.env.PACT_BROKER_TOKEN;
	const tags = (process.env.PACT_TAGS || "main").split(",");
	const consumerVersion =
		process.env.GIT_SHA || process.env.GITHUB_SHA || `dev-${Date.now()}`;
	const pactDir = path.resolve(__dirname, "..", "pacts");
	console.log(
		"[pact] Publishing from",
		pactDir,
		"to",
		broker,
		"version",
		consumerVersion,
		"tags",
		tags,
	);
	await publishPacts({
		pactFilesOrDirs: [pactDir],
		pactBroker: broker,
		pactBrokerToken: token,
		consumerVersion,
		tags,
	});
	console.log("[pact] Published");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
