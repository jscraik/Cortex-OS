import Redis from 'ioredis';

let cached: Redis | undefined;

export const getRedisFromEnv = (): Redis | undefined => {
	const url = process.env.PRP_REDIS_URL || process.env.REDIS_URL;
	if (!url) return undefined;
	if (cached) return cached;
	try {
		cached = new Redis(url);
		return cached;
	} catch {
		return undefined;
	}
};

export const closeRedis = async (): Promise<void> => {
	if (cached) {
		try {
			await cached.quit();
		} catch {
			// ignore
		}
		cached = undefined;
	}
};
