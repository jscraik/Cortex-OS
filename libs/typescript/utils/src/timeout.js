export const withTimeout = (promise, ms, timeoutError = new Error('Operation timed out')) => {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(timeoutError), ms);
  });
  return Promise.race([promise, timeout]);
};
//# sourceMappingURL=timeout.js.map
