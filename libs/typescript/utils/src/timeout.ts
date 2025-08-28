export const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  timeoutError = new Error('Operation timed out'),
): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(timeoutError), ms);
  });
  return Promise.race<T>([promise, timeout]);
};
