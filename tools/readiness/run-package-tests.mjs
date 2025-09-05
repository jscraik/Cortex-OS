#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execa } from "execa";
import fg from "fast-glob";

// Runs vitest with coverage inside each package directory that has a package.json
// Produces coverage/coverage-summary.json in each package, so check-readiness can enforce thresholds.

function log(msg) {
	// eslint-disable-next-line no-console
	console.log(`[readiness:test] ${msg}`);
}

function findPackageRoots() {
        const workspaceRoot = process.cwd();
        const patterns = [
                "packages/**/package.json",
                "apps/**/package.json",
                "servers/**/package.json",
                "services/**/package.json",
                "libs/**/package.json",
        ];
        const entries = fg.sync(patterns, {
                cwd: workspaceRoot,
                ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
                dot: false,
        });
        const rootPkg = path.join(workspaceRoot, "package.json");
        const pkgDirs = entries
                .map((p) => path.dirname(path.resolve(workspaceRoot, p)))
                // filter only real directories excluding workspace root
                .filter(
                        (dir) =>
                                dir !== workspaceRoot &&
                                fs.existsSync(dir) &&
                                fs.statSync(dir).isDirectory(),
                );
        // de-duplicate in case of overlaps
        return Array.from(new Set(pkgDirs));
}

async function runCoverage(pkgDir) {
	log(`Running coverage in ${path.relative(process.cwd(), pkgDir)}`);
	// Prefer pnpm exec vitest to ensure local version; add json-summary for check-readiness
	try {
		await execa(
			"pnpm",
			[
				"exec",
				"vitest",
				"run",
				"--coverage",
				"--coverage.reporter=json-summary",
				"--coverage.reporter=text-summary",
			],
			{ cwd: pkgDir, stdio: "inherit" },
		);
		return true;
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error(
			`[readiness:test] tests failed in ${pkgDir}: ${err?.shortMessage || err?.message}`,
		);
		return false;
	}
}

async function main() {
	const pkgDirs = findPackageRoots();
	log(`Found ${pkgDirs.length} package(s)`);
	let anyFailed = false;
	for (const dir of pkgDirs) {
		const ok = await runCoverage(dir);
		if (!ok) anyFailed = true;
	}
	if (anyFailed) {
		log("One or more package tests failed.");
		// Propagate failure so CI surfaces the error
		process.exitCode = 1;
	} else {
		log("All package tests completed.");
	}
}

main().catch((e) => {
	// eslint-disable-next-line no-console
	console.error("[readiness:test] fatal error", e);
	process.exit(1);
});
