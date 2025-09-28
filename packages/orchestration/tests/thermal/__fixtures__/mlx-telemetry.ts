import type { ThermalEvent } from '../../../src/langgraph/thermal/thermal-policy.js';

export interface ThermalFixture {
	nominal: ThermalEvent;
	warning: ThermalEvent;
	critical: ThermalEvent;
}

export function createThermalFixture(baseTimestamp = '2025-01-01T00:00:00Z'): ThermalFixture {
	const source = 'urn:brainwav:mlx:thermal';
	return {
		nominal: {
			deviceId: 'mlx:0',
			temperature: 62.5,
			threshold: 70,
			level: 'nominal',
			throttleHint: undefined,
			source,
			timestamp: baseTimestamp,
			message: 'brAInwav thermal nominal reading',
		},
		warning: {
			deviceId: 'mlx:0',
			temperature: 78.2,
			threshold: 75,
			level: 'warning',
			throttleHint: 'brAInwav:prepare-fallback',
			source,
			timestamp: baseTimestamp,
			message: 'brAInwav thermal warning reading',
		},
		critical: {
			deviceId: 'mlx:0',
			temperature: 89.7,
			threshold: 85,
			level: 'critical',
			throttleHint: 'brAInwav:reduce-load',
			source,
			timestamp: baseTimestamp,
			message: 'brAInwav thermal critical reading',
		},
	};
}
