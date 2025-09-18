#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function required(name) {
	const v = process.env[name];
	if (!v) throw new Error(`Missing env: ${name}`);
	return v;
}

function main() {
	const tpl = readFileSync(
		resolve('ops/observability/alloy/config.alloy.tpl'),
		'utf8',
	);
	const rendered = tpl
		.replaceAll(
			'${GCLOUD_HOSTED_METRICS_URL}',
			required('GCLOUD_HOSTED_METRICS_URL'),
		)
		.replaceAll(
			'${GCLOUD_HOSTED_METRICS_ID}',
			required('GCLOUD_HOSTED_METRICS_ID'),
		)
		.replaceAll('${GCLOUD_RW_API_KEY}', required('GCLOUD_RW_API_KEY'))
		.replaceAll('${SCRAPE_INTERVAL}', process.env.SCRAPE_INTERVAL || '15s')
		.replaceAll(
			'${GATEWAY_ADDR}',
			process.env.GATEWAY_ADDR || 'localhost:3333',
		);
	const outPath = resolve('ops/observability/alloy/config.alloy');
	writeFileSync(outPath, rendered);
	console.log('Wrote', outPath);
}

main();
