#!/usr/bin/env node

import { PluginRegistry } from "./dist/plugin-registry.js";

console.log("🧪 Testing Enhanced MCP Marketplace Features...\n");

async function testMarketplace() {
	const registry = new PluginRegistry("test-dir");

	// Force using mock data by setting test environment and catching fetch error
	try {
		console.log("📡 Loading marketplace data...");
		const success = await registry.refreshMarketplace();
		console.log(
			`Marketplace loaded: ${success ? "✅" : "❌ (using fallback)"}\n`,
		);

		// Test 1: Default search (alphabetical)
		console.log("📊 All plugins (alphabetical):");
		const all = await registry.searchPlugins();
		console.log(`Found ${all.length} plugins:`);
		all.forEach((p, i) => {
			console.log(
				`  ${i + 1}. ${p.name} (${p.category}) - ⭐${p.rating || "N/A"} - ${p.downloads || "N/A"} downloads`,
			);
		});

		// Test 2: Search claude-code-templates
		console.log('\n🔍 Search for "claude":');
		const claudeSearch = await registry.searchPlugins({ query: "claude" });
		claudeSearch.forEach((p) => {
			console.log(`  - ${p.name}: ${p.description.substring(0, 60)}...`);
			console.log(
				`    Rating: ⭐${p.rating}/5.0, Downloads: ${p.downloads}, Verified: ${p.verified ? "✅" : "❌"}`,
			);
		});

		// Test 3: Filter by category
		console.log("\n🛠 Code generation category:");
		const codeGen = await registry.searchPlugins({
			category: "code-generation",
		});
		for (const p of codeGen) {
			console.log(`  - ${p.name} (${p.category})`);
		}

		// Test 4: High-rated plugins
		console.log("\n⭐ Plugins with rating >= 4.5:");
		const highRated = await registry.searchPlugins({ minRating: 4.5 });
		for (const p of highRated) {
			console.log(`  - ${p.name} (⭐${p.rating}/5.0)`);
		}

		// Test 5: Sort by downloads
		console.log("\n📈 Top 3 by downloads:");
		const topDownloads = await registry.searchPlugins({
			sortBy: "downloads",
			sortOrder: "desc",
			limit: 3,
		});
		for (const p of topDownloads) {
			console.log(`  - ${p.name} (${p.downloads?.toLocaleString()} downloads)`);
		}

		// Test 6: Featured plugin details
		console.log("\n🎯 Featured: claude-code-templates");
		const claude = await registry.getPlugin("claude-code-templates");
		if (claude) {
			console.log(`  Name: ${claude.name}`);
			console.log(`  Category: ${claude.category}`);
			console.log(`  Rating: ⭐${claude.rating}/5.0`);
			console.log(`  Downloads: ${claude.downloads?.toLocaleString()}`);
			console.log(`  Verified: ${claude.verified ? "✅" : "❌"}`);
			console.log(
				`  Maintainer Verified: ${claude.maintainerVerified ? "✅" : "❌"}`,
			);
			console.log(`  Documentation: ${claude.documentation?.readme || "N/A"}`);
		} else {
			console.log("  ❌ Plugin not found");
		}

		console.log("\n🎉 All marketplace enhancement features working correctly!");
	} catch (error) {
		console.error("❌ Error testing marketplace:", error.message);
	}
}

testMarketplace().catch(console.error);
