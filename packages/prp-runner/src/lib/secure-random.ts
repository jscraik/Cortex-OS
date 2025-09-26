import { randomBytes, randomUUID } from 'node:crypto';

export const createSecureId = (prefix?: string): string => {
	const core = randomUUID().replace(/-/g, '');
	return prefix ? `${prefix}-${core}` : core;
};

export const secureRatio = (): number => {
	const buffer = randomBytes(6).readUIntBE(0, 6);
	return buffer / 0x1000000000000;
};
