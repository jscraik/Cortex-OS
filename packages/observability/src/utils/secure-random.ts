import { randomInt } from 'node:crypto';

export const securePivot = (left: number, right: number): number => {
	return left + randomInt(0, right - left + 1);
};
