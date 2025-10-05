#!/usr/bin/env node

/**
 * Example CLI tool demonstrating Sigstore trust root usage
 * This script shows how to:
 * 1. Fetch and cache Sigstore trust roots
 * 2. Verify attestations with real trust materials
 * 3. Manage trust root cache
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
	createProofEnvelope,
	defaultTrustRootManager,
	TrustRootManager,
	verifyCosignAttestations,
} from '@cortex-os/proof-artifacts';
import { program } from 'commander';

program
	.name('sigstore-trust-demo')
	.description('brAInwav Sigstore Trust Root Demo')
	.version('1.0.0');

program
	.command('fetch-trust-root')
	.description('Fetch and display Sigstore trust root information')
	.option('--cache-dir <dir>', 'Custom cache directory')
	.option('--refresh', 'Force refresh the cache')
	.action(async (options) => {
		try {
			const manager = options.cacheDir
				? new TrustRootManager({ cacheDir: options.cacheDir })
				: defaultTrustRootManager;

			console.log('brAInwav: Fetching Sigstore trust root...');

			const trustRoot = options.refresh
				? await manager.refreshTrustRoot()
				: await manager.getTrustedRoot();

			console.log('brAInwav: Trust root fetched successfully');
			console.log('Media Type:', trustRoot.mediaType);
			console.log(
				'Certificate Authorities:',
				(trustRoot.certificateAuthorities as unknown[]).length,
			);
			console.log('Transparency Logs:', (trustRoot.tlogs as unknown[]).length);
			console.log('Timestamp Authorities:', (trustRoot.timestampAuthorities as unknown[]).length);

			if (options.refresh) {
				console.log('brAInwav: Trust root cache refreshed');
			}
		} catch (error) {
			console.error('brAInwav: Error fetching trust root:', (error as Error).message);
			process.exit(1);
		}
	});

program
	.command('verify-proof')
	.description('Verify a proof envelope with real Sigstore trust roots')
	.argument('<proof-file>', 'Path to proof envelope JSON file')
	.option('--skip-verification', 'Skip cryptographic verification')
	.option('--trust-bundle <url>', 'Custom trust bundle URL')
	.action(async (proofFile, options) => {
		try {
			console.log(`brAInwav: Loading proof envelope from ${proofFile}`);
			const proofContent = await readFile(proofFile, 'utf-8');
			const envelope = JSON.parse(proofContent);

			console.log('brAInwav: Verifying Sigstore attestations...');

			const verifyOptions = {
				skipVerification: options.skipVerification,
				...(options.trustBundle && {
					useRealTrustRoots: true,
				}),
			};

			if (options.trustBundle) {
				const manager = new TrustRootManager({
					trustBundleUrl: options.trustBundle,
				});
				verifyOptions.trustMaterial = await manager.getTrustMaterial();
			}

			const attestations = await verifyCosignAttestations(envelope, verifyOptions);

			console.log(`brAInwav: Successfully verified ${attestations.length} attestation(s)`);

			for (const attestation of attestations) {
				console.log(`  - Issuer: ${attestation.signing.issuer}`);
				console.log(`  - Predicate: ${attestation.predicateType}`);
			}
		} catch (error) {
			console.error('brAInwav: Verification failed:', (error as Error).message);
			process.exit(1);
		}
	});

program
	.command('create-test-proof')
	.description('Create a test proof envelope for demonstration')
	.argument('<artifact-file>', 'Path to artifact file to create proof for')
	.option('--output <file>', 'Output file for proof envelope', 'test-proof.json')
	.action(async (artifactFile, options) => {
		try {
			console.log(`brAInwav: Creating proof envelope for ${artifactFile}`);

			const artifactContent = await readFile(artifactFile, 'utf-8');
			const crypto = await import('node:crypto');
			const contentHash = crypto.createHash('sha256').update(artifactContent).digest('hex');

			const envelope = createProofEnvelope({
				artifact: {
					uri: `file://${artifactFile}`,
					mime: 'text/plain',
					contentHash: { alg: 'sha256', hex: contentHash },
				},
				actor: { agent: 'sigstore-trust-demo', role: 'example' },
				context: { public: { demo: true } },
				evidence: [],
				runtime: { model: 'trust-root-demo-v1' },
			});

			await writeFile(options.output, JSON.stringify(envelope, null, 2));
			console.log(`brAInwav: Created proof envelope: ${options.output}`);
			console.log(`brAInwav: Proof ID: ${envelope.id}`);
		} catch (error) {
			console.error('brAInwav: Error creating proof:', (error as Error).message);
			process.exit(1);
		}
	});

program
	.command('cache-info')
	.description('Display trust root cache information')
	.option('--cache-dir <dir>', 'Custom cache directory')
	.action(async (options) => {
		try {
			// Access cache file path directly since we only need to read it
			const cacheFilePath = join(
				options.cacheDir || join(process.env.HOME || '~', '.cortex-os', 'sigstore-trust'),
				'trusted_root_cache.json',
			);

			try {
				const cacheContent = await readFile(cacheFilePath, 'utf-8');
				const cache = JSON.parse(cacheContent);

				console.log('brAInwav: Trust root cache information:');
				console.log(`  Cache file: ${cacheFilePath}`);
				console.log(`  Fetched at: ${cache.fetchedAt}`);
				console.log(`  Expires at: ${cache.expiresAt}`);
				console.log(`  Status: ${new Date() < new Date(cache.expiresAt) ? 'Valid' : 'Expired'}`);
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
					console.log('brAInwav: No trust root cache found');
				} else {
					throw error;
				}
			}
		} catch (error) {
			console.error('brAInwav: Error accessing cache:', (error as Error).message);
			process.exit(1);
		}
	});

program
	.command('clear-cache')
	.description('Clear the trust root cache')
	.option('--cache-dir <dir>', 'Custom cache directory')
	.action(async (options) => {
		try {
			const manager = options.cacheDir
				? new TrustRootManager({ cacheDir: options.cacheDir })
				: defaultTrustRootManager;

			await manager.clearCache();
			console.log('brAInwav: Trust root cache cleared successfully');
		} catch (error) {
			console.error('brAInwav: Error clearing cache:', (error as Error).message);
			process.exit(1);
		}
	});

// Show help by default
if (process.argv.length === 2) {
	program.help();
}

program.parse();
