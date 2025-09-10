import { describe, expect, it } from 'vitest';
import { MTLSConfigSchema } from './types.ts';

const baseConfig = {
	caCertificate: 'ca',
	clientCertificate: 'cert',
	clientKey: 'key',
};

describe('MTLSConfigSchema', () => {
	it('rejects TLSv1', () => {
		expect(() =>
			MTLSConfigSchema.parse({ ...baseConfig, minVersion: 'TLSv1' }),
		).toThrow();
		expect(() =>
			MTLSConfigSchema.parse({ ...baseConfig, maxVersion: 'TLSv1' }),
		).toThrow();
	});

	it('rejects TLSv1.1', () => {
		expect(() =>
			MTLSConfigSchema.parse({ ...baseConfig, minVersion: 'TLSv1.1' }),
		).toThrow();
		expect(() =>
			MTLSConfigSchema.parse({ ...baseConfig, maxVersion: 'TLSv1.1' }),
		).toThrow();
	});
});
