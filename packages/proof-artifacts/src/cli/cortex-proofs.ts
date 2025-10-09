#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { createProofEnvelope } from '../createProof.js';
import { signEnvelopeWithCosign, verifyCosignAttestations } from '../signing/cosign.js';
import type { ProofEnvelope } from '../types.js';
import { verifyProofEnvelope } from '../verifyProof.js';

const parseJson = <T>(raw: string, label: string): T => {
	try {
		return JSON.parse(raw) as T;
	} catch (error) {
		throw new Error(`brAInwav: invalid ${label} JSON: ${(error as Error).message}`);
	}
};

const loadEnvelope = (filePath: string) => {
	const data = readFileSync(filePath, 'utf-8');
	return JSON.parse(data) as ProofEnvelope;
};

const writeEnvelope = (filePath: string, envelope: ProofEnvelope) => {
	writeFileSync(filePath, `${JSON.stringify(envelope, null, 2)}\n`);
};

interface CreateOptions {
	artifact: string;
	out?: string;
	mime: string;
	context: string;
	sealedRef?: string;
	evidence: string;
	runtime: string;
	trace?: string;
	policy?: string;
	bundle?: string[];
}

const runCreate = (options: CreateOptions) => {
	const artifactPath = resolvePath(options.artifact);
	const outputPath = resolvePath(options.out ?? `${artifactPath}.proof.json`);
	const envelope = createProofEnvelope({
		artifactPath,
		artifactMime: options.mime,
		publicContext: parseJson<Record<string, unknown>>(options.context, 'context'),
		sealedContextRef: options.sealedRef ? parseJson(options.sealedRef, 'sealedRef') : undefined,
		evidence: parseJson(options.evidence, 'evidence'),
		runtime: parseJson(options.runtime, 'runtime'),
		trace: options.trace ? parseJson(options.trace, 'trace') : undefined,
		policyReceipts: options.policy ? parseJson(options.policy, 'policy') : undefined,
		bundlePaths: options.bundle?.map((entry) => resolvePath(entry)),
	});
	writeEnvelope(outputPath, envelope);
	console.log(`brAInwav: proof created at ${outputPath}`);
};

const runVerify = async (paths: string[]) => {
	const failures: string[] = [];
	paths.forEach((filePath) => {
		const envelope = loadEnvelope(filePath);
		const result = verifyProofEnvelope(envelope);
		if (!result.valid) {
			failures.push(`${filePath}: ${result.issues.join(', ')}`);
		}
	});
	if (failures.length > 0) {
		console.error('brAInwav: proof verification failed');
		failures.forEach((entry) => console.error(entry));
		process.exitCode = 1;
		return;
	}
	console.log('brAInwav: all proofs verified');
};

const runSign = async (paths: string[], issuer: string, identityToken?: string) => {
	await Promise.all(
		paths.map(async (filePath) => {
			const envelope = loadEnvelope(filePath);
			const signed = await signEnvelopeWithCosign(envelope, { issuer, identityToken });
			writeEnvelope(filePath, signed);
			await verifyCosignAttestations(signed);
			console.log(`brAInwav: attestation added to ${filePath}`);
		}),
	);
};

const discoverProofFiles = (root: string) => {
	const results: string[] = [];
	const stack = [root];
	while (stack.length > 0) {
		const current = stack.pop()!;
		const entries = readdirSync(current, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.name === 'node_modules' || entry.name === '.git') continue;
			const fullPath = resolvePath(current, entry.name);
			if (entry.isDirectory()) stack.push(fullPath);
			else if (entry.isFile() && entry.name.endsWith('.proof.json')) results.push(fullPath);
		}
	}
	return results;
};

const resolveProofTargets = async (args: string[], scanAll: boolean) => {
	if (!scanAll) return args.map((path) => resolvePath(path));
	return discoverProofFiles(process.cwd());
};

const program = new Command();
program.name('cortex-proofs').description('brAInwav proof artifact CLI');

program
	.command('create')
	.requiredOption('--artifact <path>')
	.requiredOption('--mime <type>')
	.requiredOption('--context <json>')
	.requiredOption('--runtime <json>')
	.option('--evidence <json>', 'JSON array of evidence entries', '[]')
	.option('--policy <json>', 'JSON array of policy receipts', '[]')
	.option('--trace <json>', 'JSON trace payload')
	.option('--sealed-ref <json>', 'JSON sealed context reference')
	.option('--bundle <paths...>', 'Extra bundle files')
	.option('--out <path>', 'Output proof file path')
	.action(runCreate);

program
	.command('verify')
	.argument('[proofs...]')
	.option('--all', 'Verify all *.proof.json files from cwd', false)
	.action(async (proofs: string[], opts: { all?: boolean }) => {
		const targets = await resolveProofTargets(proofs, Boolean(opts.all));
		if (targets.length === 0) {
			console.warn('brAInwav: no proof files found');
			return;
		}
		await runVerify(targets);
	});

program
	.command('sign')
	.argument('[proofs...]')
	.requiredOption('--issuer <issuer>', 'Issuer identifier recorded in attestation')
	.option('--identity-token <token>', 'OIDC identity token for Sigstore')
	.option('--all', 'Sign all *.proof.json files from cwd', false)
	.action(
		async (proofs: string[], opts: { all?: boolean; issuer: string; identityToken?: string }) => {
			const targets = await resolveProofTargets(proofs, Boolean(opts.all));
			if (targets.length === 0) {
				console.warn('brAInwav: no proof files found to sign');
				return;
			}
			await runSign(targets, opts.issuer, opts.identityToken);
		},
	);

const isExecutedDirectly = (() => {
	const modulePath = fileURLToPath(import.meta.url);
	const invoked = process.argv[1] ? resolvePath(process.argv[1]) : undefined;
	return invoked !== undefined && resolvePath(modulePath) === invoked;
})();

if (isExecutedDirectly) {
	program.parseAsync().catch((error) => {
		console.error(`brAInwav: ${error.message}`);
		process.exitCode = 1;
	});
}

export {
	loadEnvelope,
	parseJson,
	program,
	resolveProofTargets,
	runCreate,
	runSign,
	runVerify,
	writeEnvelope,
};
