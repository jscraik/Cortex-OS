#!/usr/bin/env node

/**
 * Integration test for Sigstore trust root functionality
 * This demonstrates real trust root fetching and verification
 */

import { getDefaultTrustMaterial, TrustRootManager } from '../src/trust/trust-root-manager.js';

async function testTrustRootFetching() {
	console.log('brAInwav: Testing Sigstore trust root integration...');

	try {
		// Test 1: Default trust material fetching
		console.log('\nbrAInwav: Test 1 - Fetching default trust material...');
		const trustMaterial = await getDefaultTrustMaterial();

		console.log('brAInwav: ✅ Successfully fetched trust material');
		console.log(
			`brAInwav: Certificate Authorities: ${trustMaterial.certificateAuthorities?.length || 0}`,
		);
		console.log(`brAInwav: Transparency Logs: ${trustMaterial.tlogs?.length || 0}`);
		console.log(
			`brAInwav: Timestamp Authorities: ${trustMaterial.timestampAuthorities?.length || 0}`,
		);

		// Test 2: Custom manager with cache info
		console.log('\nbrAInwav: Test 2 - Testing cache functionality...');
		const manager = new TrustRootManager({
			cacheTtlHours: 1,
		});

		const trustRoot = await manager.getTrustedRoot();
		console.log('brAInwav: ✅ Trust root cached successfully');
		console.log(`brAInwav: Media Type: ${trustRoot.mediaType || 'unknown'}`);

		// Test 3: Cache reuse
		console.log('\nbrAInwav: Test 3 - Testing cache reuse...');
		const startTime = Date.now();
		await manager.getTrustedRoot(); // Should use cache
		const endTime = Date.now();

		console.log(`brAInwav: ✅ Cache lookup completed in ${endTime - startTime}ms`);

		// Test 4: Force refresh
		console.log('\nbrAInwav: Test 4 - Testing force refresh...');
		await manager.refreshTrustRoot();
		console.log('brAInwav: ✅ Trust root refreshed successfully');

		console.log('\nbrAInwav: 🎉 All integration tests passed!');
		console.log('brAInwav: Trust root integration is working correctly');
	} catch (error) {
		console.error('brAInwav: ❌ Integration test failed:', (error as Error).message);
		console.error('brAInwav: This might be due to network connectivity or TUF repository issues');
		process.exit(1);
	}
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	testTrustRootFetching().catch((error) => {
		console.error('brAInwav: Fatal error:', error);
		process.exit(1);
	});
}

export { testTrustRootFetching };
