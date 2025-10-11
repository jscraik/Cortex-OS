import type { ConnectorServiceMap } from '@cortex-os/asbr-schemas';
import { ASBRError, ValidationError } from '../types/index.js';
import {
	attachSignature,
	buildConnectorServiceMap,
	ConnectorsManifestError,
	loadConnectorsManifest,
	signConnectorServiceMap,
} from './manifest.js';

const BRAND = 'brAInwav' as const;

export async function loadConnectorServiceMap(): Promise<ConnectorServiceMap> {
	const signatureKey = process.env.CONNECTORS_SIGNATURE_KEY;

	if (!signatureKey) {
		throw new ASBRError(
			'CONNECTORS_SIGNATURE_KEY is not configured',
			'CONNECTORS_SIGNATURE_KEY_MISSING',
			503,
			{
				brand: BRAND,
				component: 'connectors',
			},
		);
	}

	try {
		const manifest = await loadConnectorsManifest();
		const payload = buildConnectorServiceMap(manifest);
		const signature = signConnectorServiceMap(payload, signatureKey);
		return attachSignature(payload, signature);
	} catch (error) {
		if (error instanceof ConnectorsManifestError) {
			throw new ValidationError('Connectors manifest validation failed', {
				brand: BRAND,
				component: 'connectors',
				attempts: error.attempts.map((attempt) => ({
					path: attempt.path,
					error: attempt.error instanceof Error ? attempt.error.message : String(attempt.error),
				})),
			});
		}

		if (error instanceof ValidationError || error instanceof ASBRError) {
			throw error;
		}

		throw new ASBRError(
			'Failed to load connectors service map',
			'CONNECTORS_SERVICE_MAP_FAILURE',
			503,
			{
				brand: BRAND,
				component: 'connectors',
				error: error instanceof Error ? error.message : String(error),
			},
		);
	}
}
