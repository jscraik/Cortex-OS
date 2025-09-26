import { randomBytes, randomInt, randomUUID } from 'node:crypto';

export const createSecureId = (prefix?: string): string => {
	const core = randomUUID().replace(/-/g, '');
	return prefix ? `${prefix}-${core}` : core;
};

export const createPrefixedId = (prefix: string): string => `${prefix}-${createSecureId()}`;

export const secureInt = (min: number, max: number): number => randomInt(min, max);

export const secureRatio = (): number => {
	const buffer = randomBytes(6).readUIntBE(0, 6);
	return buffer / 0x1000000000000;
};

export const secureDelay = (minimum: number, maximum: number): number => {
	const span = Math.max(0, maximum - minimum);
	return minimum + secureInt(0, span === 0 ? 1 : span);
};
