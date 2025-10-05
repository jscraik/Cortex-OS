import type { CbomDocument } from '../types.js';

export interface CycloneDxComponent {
	type: 'application' | 'library';
	name: string;
	version?: string;
	properties?: Array<{ name: string; value: string }>;
}

export interface CycloneDxBom {
	bomFormat: 'CycloneDX';
	specVersion: '1.6';
	version: number;
	metadata: {
		tools: Array<{ vendor: string; name: string; version: string }>;
		component: CycloneDxComponent;
	};
	components: CycloneDxComponent[];
}

export function createCycloneDxExporter(document: CbomDocument): CycloneDxBom {
	const components: CycloneDxComponent[] = document.decisions.map((decision) => ({
		type: 'library',
		name: decision.name,
		version: decision.model?.version,
		properties: buildDecisionProperties(decision),
	}));

	return {
		bomFormat: 'CycloneDX',
		specVersion: '1.6',
		version: 1,
		metadata: {
			tools: [
				{
					vendor: 'Cortex-OS',
					name: 'cortex-cbom',
					version: document.version,
				},
			],
			component: {
				type: 'application',
				name: document.run.id,
				version: document.version,
				properties: [
					{ name: 'cbom.digest', value: document.run.digest },
					{ name: 'cbom.startedAt', value: document.run.startedAt },
				],
			},
		},
		components,
	};
}

function buildDecisionProperties(
	decision: CbomDocument['decisions'][number],
): Array<{ name: string; value: string }> {
	const properties: Array<{ name: string; value: string }> = [];
	if (decision.model) {
		properties.push({ name: 'genai.provider', value: decision.model.provider });
		properties.push({ name: 'genai.model', value: decision.model.name });
		if (decision.model.digest) {
			properties.push({ name: 'genai.modelDigest', value: decision.model.digest });
		}
	}
	if (decision.determinism?.mode) {
		properties.push({ name: 'cbom.determinism', value: decision.determinism.mode });
	}
	return properties;
}
