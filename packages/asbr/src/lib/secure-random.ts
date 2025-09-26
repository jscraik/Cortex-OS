import { randomBytes, randomUUID } from 'node:crypto';

export const createSecureId = (prefix?: string): string => {
	const core = randomUUID().replace(/-/g, '');
	return prefix ? `${prefix}-${core}` : core;
};

export const secureHex = (length: number): string => {
	const bytes = randomBytes(Math.ceil(length / 2));
	return bytes.toString('hex').slice(0, length);
};
