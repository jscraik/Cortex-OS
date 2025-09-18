/**
 * Timeout utility for operations
 */

export const withTimeout = <T>(
	promise: Promise<T>,
	timeoutMs: number,
	timeoutError: Error = new Error('Operation timed out'),
): Promise<T> => {
	const timeoutPromise = new Promise<never>((_resolve, reject) => {
		setTimeout(() => reject(timeoutError), timeoutMs);
	});

	return Promise.race([promise, timeoutPromise]);
};
