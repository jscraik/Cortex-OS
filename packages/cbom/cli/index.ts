#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import { createCbomEmitter, writeDefaultCbom } from '../src/emitter.js';
import { createCycloneDxExporter } from '../src/exporters/cyclonedx.js';
import { CbomSigner } from '../src/signer.js';

const program = new Command('cortex-cbom');

program
	.command('record')
	.description('Capture the current run context and emit a CBOM file')
	.option(
		'--output <file>',
		'destination for the CBOM JSON',
		path.resolve('reports/cbom/latest.cbom.json'),
	)
	.option('--run-id <id>', 'override run identifier')
	.action(async (options: { output: string; runId?: string }) => {
		const emitter = createCbomEmitter({ runId: options.runId });
		const defaultPath = await writeDefaultCbom(emitter);
		const desiredPath = path.resolve(options.output);
		if (desiredPath !== defaultPath) {
			await fs.mkdir(path.dirname(desiredPath), { recursive: true });
			await fs.copyFile(defaultPath, desiredPath);
		}
	});

program
	.command('attest')
	.description('Create an in-toto attestation for a CBOM file')
	.requiredOption('--input <file>', 'CBOM file to sign')
	.option(
		'--bundle <file>',
		'where to write the attestation bundle',
		path.resolve('reports/cbom/latest.intoto.json'),
	)
	.option('--key <file>', 'PEM file to persist the Ed25519 signing key')
	.action(async (options: { input: string; bundle?: string; key?: string }) => {
		const signer = new CbomSigner();
		await signer.sign(options.input, { output: options.bundle, keyPath: options.key });
	});

program
	.command('verify')
	.description('Verify an attestation bundle produced by `attest`')
	.requiredOption('--bundle <file>', 'bundle file to verify')
	.option('--cbom <file>', 'CBOM file to compare against digest')
	.action(async (options: { bundle: string; cbom?: string }) => {
		const signer = new CbomSigner();
		await signer.verify(options.bundle, { cbomPath: options.cbom });
	});

program
	.command('export')
	.description('Export a CBOM to an industry format (CycloneDX ML-BOM)')
	.requiredOption('--input <file>', 'CBOM file to export')
	.option('--output <file>', 'output file path', path.resolve('reports/cbom/latest.cyclonedx.json'))
	.option('--format <format>', 'export format', 'cyclonedx-mlbom')
	.action(async (options: { input: string; output: string; format: string }) => {
		if (options.format !== 'cyclonedx-mlbom') {
			throw new Error(`Unsupported export format: ${options.format}`);
		}
		const payload = await fs.readFile(path.resolve(options.input), 'utf8');
		const document = JSON.parse(payload);
		const bom = createCycloneDxExporter(document);
		await fs.mkdir(path.dirname(options.output), { recursive: true });
		await fs.writeFile(options.output, JSON.stringify(bom, null, 2), 'utf8');
	});

await program.parseAsync();
