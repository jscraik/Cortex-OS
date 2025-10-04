import { randomInt } from 'node:crypto';
export const securePivot = (left, right) => {
	return left + randomInt(0, right - left + 1);
};
//# sourceMappingURL=secure-random.js.map
